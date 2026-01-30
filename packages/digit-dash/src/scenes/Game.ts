import {
  BaseScene,
  ScoreHelper,
  ButtonHelper,
  i18n,
  ScoreCoins,
  VolumeSlider,
  ExpressionUtils,
  createFocusTrap,
  ImageOverlay,
  announceToScreenReader,
  focusToGameContainer,
  AnalyticsHelper,
  GameConfigManager,
} from '@k8-games/sdk';
import { markLevelCompleted } from './MainMenu';
import Phaser from 'phaser';
import * as CONFIG from '../config/common';
import { MechanicsManager, MechanicConfig, generateRoundNumbers } from '../mechanics/Mechanic';
import { parseFraction } from '../utils/mechanics';

// Check if browser supports named capture groups in regex (not supported in Safari < 16.4)
function supportsNamedCaptureGroups(): boolean {
  try {
    new RegExp('(?<test>test)');
    return true;
  } catch {
    return false;
  }
}

const SUPPORTS_NAMED_GROUPS = supportsNamedCaptureGroups();

// Core data objects
type Obstacle = { sprite: Phaser.GameObjects.Image; size: number };
type Enemy = {
  sprite: Phaser.GameObjects.Sprite;
  size: number;
  speed: number;
  detourDir?: number;
  mode?: 'chase' | 'detour';
  followObstacle?: Obstacle | null;
  losClearFrames?: number;
  lastPos?: Phaser.Math.Vector2;
  stuckTime?: number;
  patrolPath?: Phaser.Math.Vector2[]; // diamond waypoints
  pathIndex?: number;
  isLooking?: boolean;
  turnPause?: number; // pause while corner flip animation plays
};

// main game scene
export class Game extends BaseScene {
  // State
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private currentLevel: number = 1;
  private questionsCorrect: number = 0;
  private questionsPerLevel: number = 4;
  private mechanics!: MechanicsManager;
  private mechanicIndex: number = 0;
  private difficultyIndex: number = 0;
  private currentMechanic?: MechanicConfig;
  private scoreHelper!: ScoreHelper;
  private analyticsHelper!: AnalyticsHelper;
  private topic: string = '';

  // Analytics tracking
  private selectedNumbers: Array<{ value: number | string; isTarget: boolean }> = [];
  private initialNumbersSnapshot: Array<{ value: number | string; isTarget: boolean }> = [];

  private player!: { sprite: Phaser.GameObjects.Sprite; size: number; speed: number };
  private enemies: Array<Enemy>;

  private obstacles: Array<Obstacle>;
  private numbers: Array<{
    sprite: Phaser.GameObjects.Container;
    size: number;
    value: number | string;
    isTarget: boolean;
  }>;

  private livesText!: Phaser.GameObjects.Container;
  private scoreCoins!: ScoreCoins;

  private score: number = 0;
  private lives: number = 3;

  private touchKeys = { up: false, down: false, left: false, right: false };

  private uiBarHeight = CONFIG.UI_TOP_BAR_HEIGHT;
  private bottomBarHeight = CONFIG.UI_BOTTOM_BAR_HEIGHT;
  private padRects?: {
    up: Phaser.GameObjects.Rectangle;
    down: Phaser.GameObjects.Rectangle;
    left: Phaser.GameObjects.Rectangle;
    right: Phaser.GameObjects.Rectangle;
  };
  private padDefaultColor = 0x3a3a3a;
  private padActiveColor = 0x555555;
  private lastPadState = { up: false, down: false, left: false, right: false };
  private isEnding = false;
  private isInitialized = false;
  private isPaused = false;
  private sidePadding = CONFIG.SIDE_PADDING_DEFAULT;
  private playfield!: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
    radius: number;
  };
  private settingsModal?: Phaser.GameObjects.Container;
  private endOverlay?: Phaser.GameObjects.Container;
  private cleanupFocusTrap: (() => void) | null = null;
  private enemySizeMultiplier = CONFIG.ENEMY_SIZE_MULTIPLIER;
  private restrictedZones: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  private playerStun = 0;
  private invulnTimer = 0;
  private isMobile: boolean = false;
  private pendingEndComplete: boolean = false;
  private pauseBtn?: Phaser.GameObjects.Container;
  private muteBtn?: Phaser.GameObjects.Container;
  private settingsBtn?: Phaser.GameObjects.Container;
  private helpBtn?: Phaser.GameObjects.Container;
  // Auto-move state for keyboard selection
  private isAutoMoving: boolean = false;
  private autoMoveTarget: Phaser.GameObjects.Container | null = null;
  // Animation sequencing flags
  private awaitingHeroAnim: boolean = false;
  private awaitingFinalRockAnim: boolean = false;
  private pendingGameOver: boolean = false;
  private showTutorialOnStart: boolean = false;
  // Announcement throttling state
  private lastAnnounceAt: number = 0;
  private pendingAnnounceEvent: Phaser.Time.TimerEvent | null = null;
  // For unique screen reader announcements
  private announceCount: number = 0;
  // Separate queues so different message classes don't cancel each other
  private lastOverlayAnnounceAt: number = 0;
  private pendingOverlayEvent: Phaser.Time.TimerEvent | null = null;

  // Accessibility features
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private numberOverlays: Map<any, ImageOverlay> = new Map();
  private setNumbersAriaHidden(hidden: boolean) {
    // Before hiding elements, check if any currently has focus and blur it
    if (hidden) {
      let foundFocusedElement = false;
      this.numberOverlays.forEach((overlay: any) => {
        try {
          const domElement = (overlay as any).domElement;
          const htmlElement = domElement?.node as HTMLElement | undefined;
          if (htmlElement && document.activeElement === htmlElement) {
            // This element currently has focus - blur it
            htmlElement.blur();
            foundFocusedElement = true;
          }
        } catch {}
      });
      
      // If we found and blurred a focused element, move focus to game container
      if (foundFocusedElement) {
        try {
          focusToGameContainer();
        } catch {}
      }
    }

    // Now proceed with the normal hiding/showing logic
    this.numberOverlays.forEach((overlay: any) => {
      try {
        overlay.setAriaHidden(hidden);
        if (overlay.element) {
          overlay.element.style.pointerEvents = hidden ? 'none' : 'auto';
          // Prevent keyboard access when hidden
          try {
            (overlay.element as any).tabIndex = hidden ? -1 : 0;
          } catch {}
        }
      } catch {}
    });
  }

  // destroy hud buttons
  private destroyHudButtons(includePause: boolean = true) {
    const list = [includePause ? this.pauseBtn : undefined, this.muteBtn, this.settingsBtn, this.helpBtn];
    list.forEach((b) => {
      if (b) b.destroy(true);
    });
    if (includePause) this.pauseBtn = undefined;
    this.muteBtn = this.settingsBtn = this.helpBtn = undefined;
  }

  // toggle non-pause hud
  private setNonPauseHudVisible(visible: boolean) {
    [this.muteBtn, this.settingsBtn, this.helpBtn].forEach((b) => b && b.setVisible(visible));
  }

  // init scene
  constructor() {
    super('GameScene');
    this.enemies = [];
    this.obstacles = [];
    this.numbers = [];
  }

  // Override the base isTouchDevice to properly detect iPads and iOS devices
  public isTouchDevice(): boolean {
    // Check multiple conditions to properly detect all touch devices including iPads
    const hasTouch = (
      super.isTouchDevice() || // Use base Phaser detection
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (navigator as any).msMaxTouchPoints > 0
    );
    
    // Additional check for iPads in desktop mode (iPadOS 13+)
    // iPads in desktop mode may not report touch but have high-res screens
    const userAgent = navigator.userAgent.toLowerCase();
    const isIPad = /ipad/.test(userAgent) || 
                  (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    
    return hasTouch || isIPad;
  }

  // init state
  init(data?: {
    level?: number;
    mechanicIndex?: number;
    difficultyIndex?: number;
    scoreHelper?: ScoreHelper;
    skipTutorial?: boolean;
  }) {
    this.isMobile = this.isTouchDevice();
    this.currentLevel = data?.level || 1;
    this.scoreHelper = data?.scoreHelper || new ScoreHelper(2);
    this.questionsCorrect = 0;
    this.isInitialized = false;
    this.isPaused = false;
    this.isEnding = false;
    this.children.removeAll();
    this.enemies = [];
    this.obstacles = [];
    this.numbers = [];
    // Reset analytics tracking
    this.selectedNumbers = [];
    this.initialNumbersSnapshot = [];
    if (typeof data?.mechanicIndex === 'number') {
      this.mechanicIndex = Math.max(0, data!.mechanicIndex);
    } else {
      this.mechanicIndex = Math.max(0, this.currentLevel - 1);
    }
    this.difficultyIndex = Math.max(0, Math.min(2, data?.difficultyIndex ?? 0));
    this.showTutorialOnStart = !data?.skipTutorial; // only from main menu starts (no skip flag)
    
    const gameConfigManager = GameConfigManager.getInstance();
    this.topic = gameConfigManager.get('topic') || '';
    
    // Initialize analytics
    if (!data?.skipTutorial) {
      const _analyticsHelper = AnalyticsHelper.getInstance();
      if (_analyticsHelper) {
        this.analyticsHelper = _analyticsHelper;
        if (this.topic === 'grade4_topic6') {
          this.analyticsHelper?.createSession('game.dino_muncher.default');
        } else {
          this.analyticsHelper?.createSession('game.multiverse.dino_muncher');
        }
      } else {
        console.error('AnalyticsHelper not found');
      }
    }   

    this.events.once('shutdown', () => {
      if (this.cleanupFocusTrap) {
        this.cleanupFocusTrap();
        this.cleanupFocusTrap = null;
      }
    });
  }

  // create scene
  create() {
    ScoreCoins.init(this);
    this.mechanics = new MechanicsManager();
    this.currentMechanic = this.mechanics.getMechanic(this.mechanicIndex);
    this.scoreHelper = new ScoreHelper(2);
    this.audioManager.initialize(this);
    this.createInternal();
    this.setupLevel();
    this.audioManager.playBackgroundMusic('bg-music', true);
    // Hide HTML overlay; optionally build in‑canvas d-pad
    const controls = document.getElementById('controls');
    if (controls) controls.style.display = 'none';
    if (this.isMobile) this.createDpad();
    // Auto-launch tutorial once per fresh game start (skipped for level transitions / restarts via skipTutorial flag)
    if (this.showTutorialOnStart) {
      this.scene.pause();
      // Hide numbers while tutorial overlays the game
      this.setNumbersAriaHidden(true);
      this.scene.launch('TutorialScene', {
        parentScene: 'GameScene',
        mechanicId: this.currentMechanic?.id,
        autoStart: true,
      });
      const tut = this.scene.get('TutorialScene') as Phaser.Scene | undefined;
      if (tut) {
        tut.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
          this.setNumbersAriaHidden(false);
        });
      }
      this.scene.bringToTop('TutorialScene');
    }
  }

  // internal world create
  public createInternal() {
    this.isEnding = false;
    this.score = 0;
    this.playerStun = 0;
    this.invulnTimer = 0;
    this.lives = 3;
    this.enemies = [];
    this.obstacles = [];
    this.numbers = [];
    this.touchKeys = { up: false, down: false, left: false, right: false };

    // Reset accessibility state - ImageOverlays handle their own state

    const { width, height } = this.display;

    if (this.cameras && this.cameras.main) {
      this.cameras.main.setBackgroundColor('#101010');
    }
    const bg = this.addImage(width / 2, height / 2, 'bg');
    bg.setDepth(-20);
    this.buildPlayfield();

    this.children.getByName('ruleText')?.destroy();
    this.addText(width / 2, 60, `${i18n.t('game.findPrefix')} ...`, {
      font: '700 40px Exo',
      color: '#ffffff',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    })
      .setOrigin(0.5, 0.5)
      .setDepth(60)
      .setName('ruleText');

    this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
    this.scoreCoins.create(this.getScaledValue(87), this.getScaledValue(62));
    this.scoreCoins.setScore(0);
    this.scoreCoins.setComboText('', false);
    this.scoreCoins.setFrame('coin0000');
    // Hearts (top-right)
    const pauseX = width - 120;
    const pauseY = 65;
    const gapToPause = CONFIG.HEARTS_TO_PAUSE_GAP;
    this.livesText = this.add.container(this.getScaledValue(pauseX - gapToPause), this.getScaledValue(pauseY));
    this.livesText.setDepth(60);
    this.updateHeartsUI();
    
    // Announce total lives after a short delay to let everything settle
    this.time.delayedCall(1500, () => {
      const totalLivesText = i18n.t('game.totalLives') || 'Total lives';
      this.announceWithGap(`${totalLivesText}: ${this.lives}`, 'polite', 400, 0);
    });
    
    // Zones & player spawn
    this.buildRestrictedZones();
    const playerSize = CONFIG.PLAYER_SIZE;
    const centerSpawn = {
      x: this.playfield.left + this.playfield.width / 2,
      y: this.playfield.top + this.playfield.height / 2,
    };
    this.setupHeroAnimations();
    this.player = {
      sprite: this.addSprite(centerSpawn.x, centerSpawn.y, 'hero_stand_1').setOrigin(0.5),
      size: playerSize,
      speed: this.getScaledValue(CONFIG.PLAYER_BASE_SPEED),
    };
    // Uniform hero scale across all animation frames (stand, run, negative)
    const heroFrameKeys = [
      'hero_stand_1',
      'hero_stand_2',
      'hero_stand_3',
      'hero_stand_4',
      'hero_run_1',
      'hero_run_2',
      'hero_run_3',
      'hero_run_4',
      'hero_run_5',
      'hero_negative_1',
      'hero_negative_2',
      'hero_negative_3',
    ];
    const heroMaxDim = heroFrameKeys.reduce((m, k) => {
      const tex = this.textures.get(k);
      if (!tex || !(tex as any).source || !tex.getSourceImage()) return m;
      const img: any = tex.getSourceImage();
      const w = img?.width || 0;
      const h = img?.height || 0;
      return Math.max(m, w, h);
    }, 0);
    const playerScale = (playerSize * 2) / Math.max(heroMaxDim, 1);
    this.player.sprite.setScale(playerScale * 1.3).setDepth(5);
    if (this.player?.sprite?.anims) this.player.sprite.anims.play('hero_stand');
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.setupAccessibilityControls();
    this.bindDpadControls();
    // Don't create controls here - they should be created after numbers for proper tab order
  }

  // configure level
  private setupLevel() {
    this.setupLevelContent();
    this.nudgePlayerToSafe();
    // Create controls AFTER numbers are placed so they come later in tab order
    this.createTopRightControls();
  }

  // build top-right ui
  private createTopRightControls() {
    const pauseBtn = ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: 'icon_pause',
      label: i18n.t('common.pause'),
      x: this.display.width - 60,
      y: 60,
      raisedOffset: 3.5,
      onClick: () => {
        if (this.isPaused && this.endOverlay) {
          this.resumeGame(pauseBtn);
        } else if (!this.isPaused) {
          this.pauseGame(pauseBtn);
        }
      },
    });
    pauseBtn.setDepth(1);
    this.pauseBtn = pauseBtn;
    // Ensure HUD buttons are later in tab order than numbers
    const pauseOv = (pauseBtn as any).buttonOverlay;
    if (pauseOv?.element) pauseOv.element.tabIndex = 50;

    const muteBtn = ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: this.audioManager.getIsAllMuted() ? 'icon_mute' : 'icon_unmute',
      label: this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute'),
      ariaLive: 'off',
      x: this.display.width - 60,
      y: 150,
      raisedOffset: 3.5,
      onClick: () => {
        const newMuted = !this.audioManager.getIsAllMuted();
        this.audioManager.setMute(newMuted);
        const iconKey = newMuted ? 'icon_mute' : 'icon_unmute';
        (muteBtn.list[1] as Phaser.GameObjects.Image).setTexture(iconKey);
        (muteBtn as any).buttonOverlay?.setLabel(newMuted ? i18n.t('common.unmute') : i18n.t('common.mute'));
      },
    });
    muteBtn.setDepth(1);
    this.muteBtn = muteBtn;
    const muteOv = (muteBtn as any).buttonOverlay;
    if (muteOv?.element) muteOv.element.tabIndex = 50;

    const settingsBtn = ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: 'icon_settings',
      label: i18n.t('common.settings'),
      x: this.display.width - 60,
      y: 240,
      raisedOffset: 3.5,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.toggleSettingsModal();
      },
    });
    settingsBtn.setDepth(1);
    this.settingsBtn = settingsBtn;
    const settingsOv = (settingsBtn as any).buttonOverlay;
    if (settingsOv?.element) settingsOv.element.tabIndex = 50;

    const helpBtn = ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: 'icon_help',
      label: i18n.t('common.help'),
      x: this.display.width - 60,
      y: 330,
      raisedOffset: 3.5,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.scene.pause();
        // Hide number overlays while tutorial is open
        this.setNumbersAriaHidden(true);
        this.scene.launch('TutorialScene', { parentScene: 'GameScene', mechanicId: this.currentMechanic?.id });
        const tut = this.scene.get('TutorialScene') as Phaser.Scene | undefined;
        if (tut) {
          tut.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.setNumbersAriaHidden(false);
          });
        }
        this.scene.bringToTop('TutorialScene');
      },
    });
    helpBtn.setDepth(1);
    this.helpBtn = helpBtn;
    const helpOv = (helpBtn as any).buttonOverlay;
    if (helpOv?.element) helpOv.element.tabIndex = 50;
  }

  // setup accessibility keyboard controls
  private setupAccessibilityControls() {
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.escapeKey.on('down', (event: KeyboardEvent) => {
      event.preventDefault();
      this.exitAccessibilityMode();
    });
  }

  // create on-screen dpad
  private createDpad() {
    const baseX = this.display.width - 150;
    const baseY = this.display.height - 150;
    const offset = 48;
    const arrowScale = 0.7;
    this.addImage(baseX, baseY, 'circle').setOrigin(0.5).setScale(0.95).setDepth(1);
    const makeArrow = (x: number, y: number, rot: number) =>
      this.addImage(x, y, 'arrow')
        .setOrigin(0.5)
        .setScale(arrowScale)
        .setRotation(rot)
        .setInteractive({ useHandCursor: true })
        .setDepth(2);
    const up = makeArrow(baseX, baseY - offset, Math.PI / 2);
    const down = makeArrow(baseX, baseY + offset, -Math.PI / 2);
    const left = makeArrow(baseX - offset, baseY, 0);
    const right = makeArrow(baseX + offset, baseY, Math.PI);
    const press = (k: keyof typeof this.touchKeys, downState: boolean) => {
      this.touchKeys[k] = downState;
    };
    const bind = (img: Phaser.GameObjects.Image | undefined, key: keyof typeof this.touchKeys) => {
      if (!img) return;
      img.on('pointerdown', () => press(key, true));
      img.on('pointerup', () => press(key, false));
      img.on('pointerout', () => press(key, false));
      img.on('pointerupoutside', () => press(key, false));
    };
    bind(up, 'up');
    bind(down, 'down');
    bind(left, 'left');
    bind(right, 'right');
  }

  // compute playfield bounds
  private buildPlayfield() {
    const width = this.display.width;
    const height = this.display.height;
    const gutter = Math.max(72, Math.min(this.sidePadding, Math.floor(width * 0.14)));
    const top = this.uiBarHeight;
    const bottom = height - this.bottomBarHeight;
    const left = gutter;
    const right = width - gutter;
    const pfWidth = Math.max(120, right - left);
    const pfHeight = Math.max(120, bottom - top);
    const radius = CONFIG.PLAYFIELD_CORNER_RADIUS;
    this.playfield = { left, right, top, bottom, width: pfWidth, height: pfHeight, radius };
  }

  // init restricted zones
  private buildRestrictedZones() {
    this.restrictedZones = [];
  }

  // rect containment test
  private pointInRect(x: number, y: number, r: { x1: number; y1: number; x2: number; y2: number }): boolean {
    return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
  }

  // restricted area check
  private isInRestricted(x: number, y: number): boolean {
    for (const rz of this.restrictedZones) if (this.pointInRect(x, y, rz)) return true;
    return false;
  }

  // find safe spawn
  private findSafeSpawn(): { x: number; y: number } {
    const pf = this.playfield;
    const r = this.player?.size ?? 26;
    const center = { x: pf.left + pf.width * 0.5, y: pf.top + pf.height * 0.5 };
    const clampPoint = (px: number, py: number) => ({
      x: Phaser.Math.Clamp(px, pf.left + r, pf.right - r),
      y: Phaser.Math.Clamp(py, pf.top + r, pf.bottom - r),
    });
    const isFree = (x: number, y: number) => {
      if (this.isInRestricted(this.getScaledValue(x), this.getScaledValue(y))) return false;
      return !this.collidesWithAnyObstacle(
        this.getScaledValue(x),
        this.getScaledValue(y),
        r,
        CONFIG.COLLISION_FUDGE_DEFAULT,
      );
    };
    const cc = clampPoint(center.x, center.y);
    if (isFree(cc.x, cc.y)) return cc;
    const maxRadius = Math.min(pf.width, pf.height) * 0.4;
    const stepR = Math.max(8, Math.floor(r * 0.75));
    const stepTheta = Math.PI / 12;
    for (let rad = stepR; rad <= maxRadius; rad += stepR) {
      for (let theta = 0; theta < Math.PI * 2; theta += stepTheta) {
        const px = cc.x + rad * Math.cos(theta);
        const py = cc.y + rad * Math.sin(theta);
        const p = clampPoint(px, py);
        if (isFree(p.x, p.y)) return p;
      }
    }
    const steps = 6;
    for (let iy = 1; iy < steps; iy++) {
      for (let ix = 1; ix < steps; ix++) {
        const x = pf.left + (pf.width * ix) / steps;
        const y = pf.top + (pf.height * iy) / steps;
        const p = clampPoint(x, y);
        if (isFree(p.x, p.y)) return p;
      }
    }
    return cc;
  }

  // If the player starts in a restricted area or overlapping, move to a safe spot
  // ensure safe position
  private nudgePlayerToSafe(): void {
    if (!this.player) return;
    const overlapping = this.collidesWithAnyObstacle(
      this.player.sprite.x,
      this.player.sprite.y,
      this.player.size,
      CONFIG.COLLISION_FUDGE_DEFAULT,
    );
    if (this.isInRestricted(this.player.sprite.x, this.player.sprite.y) || overlapping) {
      const p = this.findSafeSpawn();
      // p is in logical playfield units; convert to scaled display units
      this.player.sprite.setPosition(this.getScaledValue(p.x), this.getScaledValue(p.y));
    }
  }

  // toggle settings modal
  private toggleSettingsModal() {
    if (this.settingsModal) {
      this.closeSettingsModal();
      return;
    }
    this.openSettingsModal();
  }
  // open settings ui
  private openSettingsModal() {
    const container = this.add.container(0, 0).setDepth(1400);
    const btnX = this.display.width - 60;
    const btnY = 240;
    const vol = new VolumeSlider(this);
    const sliderContainer = vol.create(btnX - 180, btnY + 40, 'purple', i18n.t('common.volume') || 'Volume');
    container.add(sliderContainer);
    vol.open();
    const overlay = (vol as any).overlay as Phaser.GameObjects.Rectangle | undefined;
    if (overlay) overlay.setVisible(false);
    const closer = (pointer: Phaser.Input.Pointer) => {
      if (!sliderContainer.getBounds().contains(pointer.x, pointer.y)) {
        vol.close();
        this.closeSettingsModal();
        this.input.off('pointerdown', closer);
      }
    };
    this.input.on('pointerdown', closer);
    this.settingsModal = container;
    // Hide number overlays while settings are open
    this.setNumbersAriaHidden(true);
  }
  // close settings ui
  private closeSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.destroy(true);
      this.settingsModal = undefined;
    }
    // Restore number overlays visibility when settings close
    this.setNumbersAriaHidden(false);
  }
  // build level content
  private setupLevelContent() {
    if (this.isInitialized) return;
    const m = this.currentMechanic;
    if (!m) {
      this.placeNumbers({ count: 12, range: [1, 40], rule: (n: number) => n % 2 === 0 });
      this.placeChasers(
        1,
        Math.floor(this.player.size * this.enemySizeMultiplier),
        CONFIG.DEFAULT_MONSTER_SPEED_L1,
      );
      // Reset analytics tracking for new level (fallback case)
      this.selectedNumbers = [];
      this.initialNumbersSnapshot = this.numbers.map((n) => ({
        value: n.value,
        isTarget: n.isTarget,
      }));
      this.isInitialized = true;
      return;
    }
    this.children.getByName('ruleText')?.destroy();
    const levelNumber = this.difficultyIndex + 1;
    const ruleY = 65;
    const ruleStyle = {
      font: '700 40px Exo',
      color: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 4, fill: true },
    } as const;
    const ruleTextObj = this.addText(
      this.display.width / 2,
      ruleY,
      `${i18n.t('game.levelPrefix')} ${levelNumber}`,
      ruleStyle,
    )
      .setOrigin(0.5, 0.5)
      .setDepth(60)
      .setName('ruleText');
    // Timings from shared constants SHOW_LEVEL_MS / FADE_MS
    this.time.delayedCall(CONFIG.SHOW_LEVEL_MS, () => {
      if (!this.scene.isActive() || !ruleTextObj.active) return;
      this.tweens.add({
        targets: ruleTextObj,
        duration: CONFIG.FADE_MS,
        alpha: 0,
        ease: 'Quad.Out',
        onComplete: () => {
          if (!this.scene.isActive() || !ruleTextObj.active) return;
          if (ruleTextObj) ruleTextObj.destroy();
          const label = `${i18n.t('game.findPrefix')} ${m.label}`;
          
          // Use ExpressionUtils only if browser supports named capture groups (Safari 16.4+)
          if (SUPPORTS_NAMED_GROUPS) {
            const expr = new ExpressionUtils(this, this.display.width / 2, ruleY, label, {
              font: '700 36px Exo',
              fontColor: 0xffffff,
              spacing: 8,
              fractionLinePadding: 20,
              alignment: 'center',
            });
            const exprContainer = expr.getContainer();
            exprContainer.setDepth(60);
            exprContainer.setName('ruleText');
            exprContainer.setAlpha(0);
            this.tweens.add({ targets: exprContainer, duration: CONFIG.FADE_MS, alpha: 1, ease: 'Quad.In' });
          } else {
            // Fallback to simple text for older devices
            const simpleText = this.addText(this.display.width / 2, ruleY, label, {
              font: '700 36px Exo',
              color: '#ffffff',
            }).setOrigin(0.5);
            simpleText.setDepth(60);
            simpleText.setName('ruleText');
            simpleText.setAlpha(0);
            this.tweens.add({ targets: simpleText, duration: CONFIG.FADE_MS, alpha: 1, ease: 'Quad.In' });
          }
        },
      });
    });
    const diff = m.difficulties[Math.max(0, Math.min(m.difficulties.length - 1, this.difficultyIndex))];
    this.placeObstacles(diff.obstacles, 40, diff.obstaclePositions);
    const roundNumbers = generateRoundNumbers(m, 9, 4);
    this.placeNumbersFromList(roundNumbers, diff.numberPositions);
    this.numbers = this.numbers.map((n) => ({ ...n, isTarget: m.check(n.value) }));
    this.placeChasers(
      diff.monsterCount,
      Math.floor(this.player.size * this.enemySizeMultiplier),
      diff.monsterSpeed,
    );
    this.questionsPerLevel = this.numbers.filter((n) => n.isTarget).length;
    
    // Reset analytics tracking for new level
    this.selectedNumbers = [];
    this.initialNumbersSnapshot = this.numbers.map((n) => ({
      value: n.value,
      isTarget: n.isTarget,
    }));
    
    this.isInitialized = true;
  }

  // place specific numbers
  private placeNumbersFromList(numberList: (number | string)[], overridePositions?: [number, number][]) {
    if (this.numbers) {
      this.numbers.forEach((num) => {
        if (num && num.sprite) {
          // Clean up accessibility overlay
          const overlay = this.numberOverlays.get(num.sprite);
          if (overlay) {
            overlay.destroy();
            this.numberOverlays.delete(num.sprite);
          }
          num.sprite.destroy();
        }
      });
    }
    this.numbers = [];

    // Reset accessibility state when numbers change
    this.exitAccessibilityMode();

    const numberSize = CONFIG.NUMBER_ROCK_SIZE;
    const m = this.currentMechanic;
    const positions = overridePositions ?? m?.difficulties?.[this.difficultyIndex]?.numberPositions;
    if (positions && positions.length > 0) {
      const posList = positions;
      numberList.forEach((value, idx) => {
        const pick = idx % posList.length;
        const px = Phaser.Math.Clamp(posList[pick][0], 0, 1);
        const py = Phaser.Math.Clamp(posList[pick][1], 0, 1);
        const x = this.playfield.left + px * this.playfield.width;
        const y = this.playfield.top + py * this.playfield.height;
        const container = this.createNumberContainer(x, y, value, numberSize);
        const isTarget = this.currentMechanic ? !!this.currentMechanic.check(value) : false;
        const collisionSize = Math.floor(numberSize * 1.25);
        this.numbers.push({ sprite: container, size: collisionSize, value, isTarget });

        // Update accessibility overlay without leaking correctness
        const overlay = this.numberOverlays.get(container);
        if (overlay) {
          const domElement = (overlay as any).domElement;
          if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            const numberLabel = i18n.t('game.accessibility.numberLabel', { value });
            const moveInstruction = i18n.t('game.accessibility.moveHere');
            htmlElement.setAttribute('aria-label', `${numberLabel}, ${moveInstruction}`);
          }
        }
      });
      return;
    }
    const n = numberList.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const spacingX = this.playfield.width / (cols + 1);
    const spacingY = this.playfield.height / (rows + 1);
    numberList.forEach((value, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = this.playfield.left + spacingX * (col + 1);
      const y = this.playfield.top + spacingY * (row + 1);
      const container = this.createNumberContainer(x, y, value, numberSize);
      const isTarget = this.currentMechanic
        ? !!this.currentMechanic.check(value)
        : (() => {
            const n = typeof value === 'number' ? value : parseInt(String(value), 10);
            return Number.isInteger(n) && n % 2 === 0;
          })();
      const collisionSize = Math.floor(numberSize * 1.25);
      this.numbers.push({ sprite: container, size: collisionSize, value, isTarget });

      // Update accessibility overlay without leaking correctness
      const overlay = this.numberOverlays.get(container);
      if (overlay) {
        const domElement = (overlay as any).domElement;
        if (domElement?.node) {
          const htmlElement = domElement.node as HTMLElement;
          const numberLabel = i18n.t('game.accessibility.numberLabel', { value });
          const moveInstruction = i18n.t('game.accessibility.moveHere');
          htmlElement.setAttribute('aria-label', `${numberLabel}, ${moveInstruction}`);
        }
      }
    });
  }

  // create number rock
  public createNumberContainer(
    x: number,
    y: number,
    value: number | string,
    size: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(this.getScaledValue(x), this.getScaledValue(y));
    const rock = this.addImage(0, 0, 'rock');
    const scaleBoost = CONFIG.ROCK_SCALE_BOOST;
    const rockScale = ((size * 2.5) / Math.max(rock.width, rock.height)) * scaleBoost;
    rock.setScale(rockScale);
    container.add(rock);
    (container as any).dd_rock = rock;
    (container as any).dd_baseScaleX = rockScale;
    (container as any).dd_baseScaleY = rockScale;
    (container as any).dd_collected = false;
    const breathDuration = Phaser.Math.Between(CONFIG.ROCK_BREATH_MIN_MS, CONFIG.ROCK_BREATH_MAX_MS);
    const breathDelay = Phaser.Math.Between(0, CONFIG.ROCK_BREATH_DELAY_MAX_MS);
    const amp = CONFIG.ROCK_BREATH_SCALE_AMP_MIN + Math.random() * CONFIG.ROCK_BREATH_SCALE_AMP_EXTRA;
    const breath = this.tweens.add({
      targets: rock,
      duration: breathDuration,
      delay: breathDelay,
      scaleY: this.getScaledValue(rockScale * amp),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    (container as any).dd_breathTween = breath;
    // Render number or fraction. Fractions are shown with numerator above
    // denominator and a thin vinculum between them.
    const frac = typeof value === 'string' ? parseFraction(value) : null;
    if (frac && SUPPORTS_NAMED_GROUPS) {
      const [num, den] = frac;
      const baseFontSize = 18;
      const fracStr = `${num}/${den}`;
      const expr = new ExpressionUtils(this, 0, 0, fracStr, {
        font: `700 ${baseFontSize}px Exo`,
        fontColor: 0xffffff,
        spacing: 6,
        fractionLinePadding: 14,
        alignment: 'center',
      });
      const exprContainer = expr.getContainer();
      // Scale expression to roughly match previous sizing inside rock
      const bounds = exprContainer.getBounds();
      const maxForRock = rock.displayWidth * 0.75;
      let scaleFactor = 1;
      if (bounds.width > 0 && bounds.width > maxForRock) scaleFactor = maxForRock / bounds.width;
      exprContainer.setScale(scaleBoost * 0.8 * scaleFactor);
      container.add(exprContainer);
      (container as any).dd_label = exprContainer;
      (container as any).dd_expression = expr;
    } else {
      // For numbers or fractions on older browsers, use simple text
      const displayValue = frac ? `${frac[0]}/${frac[1]}` : value.toString();
      const numberText = this.addText(0, 2, displayValue, {
        font: '700 30px Exo',
        color: '#ffffff',
      }).setOrigin(0.5);
      numberText.setScale(scaleBoost);
      container.add(numberText);
      (container as any).dd_label = numberText;
    }

    // Create accessibility overlay for screen reader navigation
    const overlay = new ImageOverlay(this, rock, {
      label: i18n.t('game.accessibility.numberLabel', { value }),
      cursor: 'pointer',
    });

    // Store the overlay reference so we can manage it later
    this.numberOverlays.set(container, overlay);

    // Make it focusable via tab and add keyboard interaction
    const domElement = (overlay as any).domElement;
    if (domElement?.node) {
      const htmlElement = domElement.node as HTMLElement;
      htmlElement.setAttribute('tabindex', '0');
      htmlElement.setAttribute('role', 'button');

      // We'll determine if it's correct/incorrect when we have the mechanic info
      // This will be updated in placeNumbersFromList where we know isTarget
      const numberLabel = i18n.t('game.accessibility.numberLabel', { value });
      const moveInstruction = i18n.t('game.accessibility.moveHere');
      htmlElement.setAttribute('aria-label', `${numberLabel}, ${moveInstruction}`);

      // Add keyboard event listener for Enter key
      htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          // Keep focus within the game so announcements are not interrupted
          try {
            focusToGameContainer();
          } catch {}
          // Find this number in our numbers array and simulate dinosaur movement
          const numberData = this.numbers.find((n) => n.sprite === container);
          if (numberData) {
            this.movePlayerToTarget(numberData);
          }
        }
      });
    }

    return container;
  }

  // scene update
  update(time: number, delta: number): void {
    this.updateGame(time, delta);
  }

  // refresh hearts ui
  private updateHeartsUI() {
    if (this.livesText) {
      this.livesText.removeAll(true);
      const heartSpacing = CONFIG.HEART_SPACING;
      for (let i = 0; i < 3; i++) {
        const x = -i * heartSpacing;
        const y = 0;
        const heartIndex = 2 - i;
        if (heartIndex < this.lives) {
          const heart = this.addImage(x, y, 'heart');
          heart.setOrigin(0.5);
          this.livesText.add(heart);
        } else {
          const emptyHeart = this.addImage(x, y, 'empty_heart');
          emptyHeart.setOrigin(0.5);
          this.livesText.add(emptyHeart);
        }
      }
    }
  }

  // grant invulnerability
  private grantInvuln(seconds: number) {
    this.invulnTimer = Math.max(this.invulnTimer, seconds);
  }

  // handle life loss
  private loseHeart(reason: 'enemy' | 'wrong') {
    if (this.isEnding) return;
    this.audioManager.playSoundEffect('heart-lost');
    this.lives = Math.max(0, this.lives - 1);
    this.updateHeartsUI();
    // Announce remaining lives to screen reader
    const livesLeft = this.lives;
    const livesMsg =
      livesLeft === 1
        ? i18n.t('game.attemptRemaining', { attempts: livesLeft })
        : i18n.t('game.attemptsRemaining', { attempts: livesLeft });
    const englishFallback = livesLeft === 1 ? `${livesLeft} life remaining` : `${livesLeft} lives remaining`;
    const spoken =
      typeof livesMsg === 'string' && !/attemptsRemaining|attemptRemaining/.test(livesMsg)
        ? livesMsg
        : englishFallback;
    // Ensure focus stays within the game when the focused element is removed
  const announceLives = () => {
      try { focusToGameContainer(); } catch {}
      this.announceWithGap(spoken, 'polite', 500, 0);
    };
    // If heart loss was due to a wrong answer, delay the lives announcement slightly so it doesn't override
    // the preceding assertive "incorrect" message in some screen readers.
    if (this.lives === 0) {
      // Let the Game Over overlay title speak first
      this.time.delayedCall(1000, announceLives);
    } else if (reason === 'wrong') {
      // Ensure incorrect gets read first
      this.time.delayedCall(650, announceLives);
    } else {
      announceLives();
    }
    this.grantInvuln(1.0);
    this.tweens.add({
      targets: this.player.sprite,
      duration: 80,
      y: this.player.sprite.y - 6,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeOut',
    });
    // Trigger negative reaction animation for all heart losses
    const spr = this.player?.sprite;
    const endIfNeeded = () => {
      if (this.pendingGameOver && !this.isEnding) {
        this.pendingGameOver = false;
        this.endLevel(false);
      }
    };
    if (this.lives <= 0) {
      // Defer game over overlay until negative reaction finishes
      this.pendingGameOver = true;
      if (this.awaitingHeroAnim && spr?.anims.currentAnim?.key === 'hero_negative') {
        // Already animating; attach a one-time listener
        spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'hero_negative', endIfNeeded);
      } else {
        this.playHeroNegativeReaction(endIfNeeded);
      }
    } else {
      this.playHeroNegativeReaction();
    }
  }

  // Placement helpers
  // place obstacles
  private placeObstacles(count: number, size: number, overridePositions?: [number, number][]) {
    const m = this.currentMechanic;
    const treeVisualSize = Math.floor(size * 2.2);
    const positions = overridePositions ?? m?.difficulties?.[this.difficultyIndex]?.obstaclePositions;
    if (positions && positions.length > 0) {
      const take = Math.max(0, Math.min(count, positions.length));
      const indices = positions.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const list = indices.slice(0, take).map((i) => positions[i]);
      for (const p of list) {
        const nx = Phaser.Math.Clamp(p[0], 0, 1);
        const ny = Phaser.Math.Clamp(p[1], 0, 1);
        const x = this.playfield.left + nx * this.playfield.width;
        const y = this.playfield.top + ny * this.playfield.height;
        const sprite = this.addImage(x, y, 'tree').setOrigin(0.5);
        const treeScale = treeVisualSize / Math.max(sprite.width, sprite.height);
        sprite.setScale(treeScale);
        sprite.setDepth(-2);
        const collSize = Math.floor(size * 0.9);
        this.obstacles.push({ sprite, size: collSize });
      }
      return;
    }
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const spacingX = this.playfield.width / (cols + 1);
    const spacingY = this.playfield.height / (rows + 1);
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = this.playfield.left + spacingX * (col + 1);
      const y = this.playfield.top + spacingY * (row + 1);
      const sprite = this.addImage(x, y, 'tree').setOrigin(0.5);
      const treeScale = treeVisualSize / Math.max(sprite.width, sprite.height);
      sprite.setScale(treeScale);
      sprite.setDepth(-2);
      const collSize = Math.floor(size * 1.05);
      this.obstacles.push({ sprite, size: collSize });
    }
  }

  // place one number
  private placeNumber(value: number, isTarget: boolean, size: number) {
    const numberSize = size;
    const positions = this.currentMechanic?.difficulties?.[this.difficultyIndex]?.numberPositions;
    if (positions && positions.length > 0) {
      const idx = this.numbers.length % positions.length;
      const px = Phaser.Math.Clamp(positions[idx][0], 0, 1);
      const py = Phaser.Math.Clamp(positions[idx][1], 0, 1);
      const x = this.playfield.left + px * this.playfield.width;
      const y = this.playfield.top + py * this.playfield.height;
      const container = this.createNumberContainer(x, y, value, numberSize);
      const collisionSize = Math.floor(numberSize * 1.25);
      this.numbers.push({ sprite: container, size: collisionSize, value, isTarget });
      return;
    }
    const idx = this.numbers.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, idx + 1))));
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const spacingX = this.playfield.width / (cols + 1);
    const spacingY = this.playfield.height / (cols + 1);
    const x = this.playfield.left + spacingX * (col + 1);
    const y = this.playfield.top + spacingY * (row + 1);
    const container = this.createNumberContainer(x, y, value, numberSize);
    const collisionSize = Math.floor(numberSize * 1.25);
    this.numbers.push({ sprite: container, size: collisionSize, value, isTarget });
  }

  // generate numbers
  private placeNumbers(cfg: { count: number; range: [number, number]; rule: (n: number) => boolean }) {
    const targetNeeded = Math.floor(cfg.count / 2);
    const distractorNeeded = cfg.count - targetNeeded;
    const targets = new Set<number>();
    const distractors = new Set<number>();

    let attempts = 0;
    while (targets.size < targetNeeded && attempts++ < 800) {
      const n = Phaser.Math.Between(cfg.range[0], cfg.range[1]);
      if (cfg.rule(n)) targets.add(n);
    }
    attempts = 0;
    while (distractors.size < distractorNeeded && attempts++ < 800) {
      const n = Phaser.Math.Between(cfg.range[0], cfg.range[1]);
      if (!cfg.rule(n) && n > 0) distractors.add(n);
    }

    const size = 30;
    for (const n of targets) this.placeNumber(n, true, size);
    for (const n of distractors) this.placeNumber(n, false, size);
  }

  // spawn enemies
  private placeChasers(count: number, size: number, speed: number) {
    const pathTemplate = this.buildDiamondPathForSize(size);
    const corners = pathTemplate;
    for (let i = 0; i < count; i++) {
      const cornerIndex = i % corners.length;
      const spawn = corners[cornerIndex];
      const sprite = this.addSprite(spawn.x, spawn.y, 'monster').setOrigin(0.5);
      // Uniform monster scale across base + animation frames
      const monsterFrameKeys = ['monster', 'monster_1', 'monster_2', 'monster_3'];
      const monsterMaxDim = monsterFrameKeys.reduce((m, k) => {
        const tex = this.textures.get(k);
        if (!tex || !tex.getSourceImage()) return m;
        const img: any = tex.getSourceImage();
        const w = img?.width || 0;
        const h = img?.height || 0;
        return Math.max(m, w, h);
      }, 0);
      const monsterScale = (size * 2) / Math.max(monsterMaxDim, 1);
      sprite.setScale(monsterScale);
      if (sprite.anims) sprite.anims.play('monster_move');
      const path = this.buildDiamondPathForSize(size);
      const startIndex = cornerIndex;
      this.enemies.push({
        sprite,
        size,
        speed: this.getScaledValue(speed),
        patrolPath: path,
        pathIndex: startIndex,
        lastPos: new Phaser.Math.Vector2(sprite.x, sprite.y),
      });
    }
  }

  // build diamond path
  private buildDiamondPathForSize(radius: number): Phaser.Math.Vector2[] {
    const pf = this.playfield;
    const top = new Phaser.Math.Vector2(pf.left + pf.width * 0.5, pf.top + radius);
    const right = new Phaser.Math.Vector2(pf.right - radius, pf.top + pf.height * 0.5);
    const bottom = new Phaser.Math.Vector2(pf.left + pf.width * 0.5, pf.bottom - radius);
    const left = new Phaser.Math.Vector2(pf.left + radius, pf.top + pf.height * 0.5);
    return [top, right, bottom, left];
  }

  // obstacle collision test
  private collidesWithAnyObstacle(x: number, y: number, r: number, fudge: number = 6): boolean {
    const rScaled = this.getScaledValue(r);
    const fudgeScaled = this.getScaledValue(fudge);
    for (const o of this.obstacles) {
      const oScaled = this.getScaledValue(o.size);
      const dist = Phaser.Math.Distance.Between(x, y, o.sprite.x, o.sprite.y);
      const overlap = rScaled + oScaled - dist;
      if (overlap > fudgeScaled) return true;
    }
    return false;
  }

  // attempt enemy move
  private tryEnemyMove(e: Enemy, vx: number, vy: number, dt: number): boolean {
    let nx = e.sprite.x + vx * dt;
    let ny = e.sprite.y + vy * dt;
    nx = Phaser.Math.Clamp(
      nx,
      this.getScaledValue(this.playfield.left + e.size),
      this.getScaledValue(this.playfield.right - e.size),
    );
    ny = Phaser.Math.Clamp(
      ny,
      this.getScaledValue(this.playfield.top + e.size),
      this.getScaledValue(this.playfield.bottom - e.size),
    );
    if (this.isInRestricted(nx, ny)) return false;
    e.sprite.x = nx;
    e.sprite.y = ny;
    return true;
  }

  // main game loop
  public updateGame(timeMs: number, delta: number) {
    if (this.isEnding) return;
    if (this.isPaused) return;
    const dt = delta / 1000;
    if (!this.cursors) return;
    if (!this.isInitialized) return;
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.invulnTimer > 0) {
      const blinkOn = Math.floor(timeMs / 100) % 2 === 0;
      this.player.sprite.setAlpha(blinkOn ? 0.4 : 0.9);
    } else {
      this.player.sprite.setAlpha(1);
    }
    // Player movement
    const speed = this.player.speed;
    const prev = new Phaser.Math.Vector2(this.player.sprite.x, this.player.sprite.y);
    let vx = 0,
      vy = 0;
    if (this.playerStun > 0) {
      this.playerStun = Math.max(0, this.playerStun - dt);
    } else if (this.isAutoMoving) {
      // Tween controls movement while auto-moving; ignore manual input
      vx = 0;
      vy = 0;
    } else {
      if (this.cursors.left?.isDown || this.touchKeys.left) vx -= 1;
      if (this.cursors.right?.isDown || this.touchKeys.right) vx += 1;
      if (this.cursors.up?.isDown || this.touchKeys.up) vy -= 1;
      if (this.cursors.down?.isDown || this.touchKeys.down) vy += 1;
      if (vx !== 0 || vy !== 0) {
        const len = Math.hypot(vx, vy);
        vx /= len;
        vy /= len;
      }
      this.player.sprite.x += vx * speed * dt;
      this.player.sprite.y += vy * speed * dt;
    }
    this.updateHeroAnim(this.playerStun <= 0 && (vx !== 0 || vy !== 0), vx);
    // D-pad highlight
    const cur = {
      up: !!(this.cursors.up?.isDown || this.touchKeys.up),
      down: !!(this.cursors.down?.isDown || this.touchKeys.down),
      left: !!(this.cursors.left?.isDown || this.touchKeys.left),
      right: !!(this.cursors.right?.isDown || this.touchKeys.right),
    };
    if (this.padRects) {
      if (cur.up !== this.lastPadState.up)
        this.padRects.up.setFillStyle(cur.up ? this.padActiveColor : this.padDefaultColor);
      if (cur.down !== this.lastPadState.down)
        this.padRects.down.setFillStyle(cur.down ? this.padActiveColor : this.padDefaultColor);
      if (cur.left !== this.lastPadState.left)
        this.padRects.left.setFillStyle(cur.left ? this.padActiveColor : this.padDefaultColor);
      if (cur.right !== this.lastPadState.right)
        this.padRects.right.setFillStyle(cur.right ? this.padActiveColor : this.padDefaultColor);
      this.lastPadState = cur;
    }
    this.player.sprite.x = Phaser.Math.Clamp(
      this.player.sprite.x,
      this.getScaledValue(this.playfield.left + this.player.size),
      this.getScaledValue(this.playfield.right - this.player.size),
    );
    this.player.sprite.y = Phaser.Math.Clamp(
      this.player.sprite.y,
      this.getScaledValue(this.playfield.top + this.player.size),
      this.getScaledValue(this.playfield.bottom - this.player.size),
    );

    if (this.isInRestricted(this.player.sprite.x, this.player.sprite.y)) {
      this.player.sprite.x = prev.x;
      this.player.sprite.y = prev.y;
    }
    // Player vs trees
    for (const o of this.obstacles) {
      const treeOffset = 30; // offset to allow movement below the tree
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        o.sprite.x,
        o.sprite.y - this.getScaledValue(treeOffset),
      );
      // consider only top part of tree for collision - o.size / 2
      const overlap = this.getScaledValue(this.player.size) + this.getScaledValue(o.size / 2) - dist;
      if (overlap > this.getScaledValue(CONFIG.OBSTACLE_SEPARATION_FUDGE)) {
        this.player.sprite.x = prev.x;
        this.player.sprite.y = prev.y;
        break;
      }
    }
    // Enemy patrol
    for (const e of this.enemies) {
      if (!e.patrolPath || e.patrolPath.length < 2) {
        e.patrolPath = this.buildDiamondPathForSize(e.size);
        e.pathIndex = 0;
      }
      const idx = e.pathIndex ?? 0;
      const target = e.patrolPath![idx];
      const ex = e.sprite.x,
        ey = e.sprite.y;
      const dx = this.getScaledValue(target.x) - ex;
      const dy = this.getScaledValue(target.y) - ey;
      const dist = Math.hypot(dx, dy);
      const arrive = this.getScaledValue(4);
      if (e.turnPause && e.turnPause > 0) {
        e.turnPause = Math.max(0, e.turnPause - dt);
        continue;
      }
      if (dist <= arrive) {
        e.sprite.x = this.getScaledValue(target.x);
        e.sprite.y = this.getScaledValue(target.y);
        const nextIndex = (idx + 1) % e.patrolPath!.length;
        const next = e.patrolPath![nextIndex];
        const ndx = next.x - target.x;
        const goingRight = ndx > 0;
        const spr = e.sprite as Phaser.GameObjects.Image & { setFlipX?: (v: boolean) => any };
        const initialDelay = CONFIG.ENEMY_TURN_LOOK_INITIAL_DELAY_MS;
        const step = CONFIG.ENEMY_TURN_LOOK_STEP_MS;
        const finalHold = CONFIG.ENEMY_TURN_LOOK_FINAL_HOLD_MS;
        e.turnPause = (initialDelay + step * 3 + finalHold) / 1000;
        if (goingRight) {
          this.time.delayedCall(initialDelay + 0 * step, () => spr.setFlipX(true)); // right
          this.time.delayedCall(initialDelay + 1 * step, () => spr.setFlipX(false)); // left
          this.time.delayedCall(initialDelay + 2 * step, () => spr.setFlipX(true)); // right
        } else {
          this.time.delayedCall(initialDelay + 0 * step, () => spr.setFlipX(false)); // left
          this.time.delayedCall(initialDelay + 1 * step, () => spr.setFlipX(true)); // right
          this.time.delayedCall(initialDelay + 2 * step, () => spr.setFlipX(false)); // left
        }
        e.pathIndex = nextIndex;
      } else {
        const vx = (dx / (dist || 1)) * e.speed;
        const vy = (dy / (dist || 1)) * e.speed;
        if (!this.tryEnemyMove(e, vx, vy, dt)) {
          e.pathIndex = (idx + 1) % e.patrolPath!.length;
        }
      }
    }
    // Number collection
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      if (!n || !n.sprite) {
        console.warn('Invalid number object at index', i);
        this.numbers.splice(i, 1);
        continue;
      }
      // During auto-move, ignore collisions with any number except the intended target
      if (this.isAutoMoving && this.autoMoveTarget && n.sprite !== this.autoMoveTarget) {
        continue;
      }
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, n.sprite.x, n.sprite.y);
      if (d < this.getScaledValue(this.player.size) + this.getScaledValue(n.size)) {
        const container: any = n.sprite as any;
        if (container.dd_collected) {
          continue;
        }
        container.dd_collected = true;
        if (container.dd_breathTween) {
          if (container.dd_breathTween?.stop) container.dd_breathTween.stop();
          container.dd_breathTween = undefined;
        }
        const rock: Phaser.GameObjects.Image | undefined = container.dd_rock;
        const rawLabel: any = container.dd_label;
        const fractionParts: Phaser.GameObjects.GameObject[] = [];
        // If label was rendered by ExpressionUtils, it will be a Container with children (Texts/Rectangles)
        if (rawLabel && rawLabel.list && Array.isArray(rawLabel.list)) {
          const gather = (node: any) => {
            if (!node) return;
            if (node instanceof Phaser.GameObjects.Text || node instanceof Phaser.GameObjects.Rectangle)
              fractionParts.push(node);
            if (node.list && Array.isArray(node.list)) node.list.forEach(gather);
          };
          rawLabel.list.forEach(gather);
        } else if (rawLabel && rawLabel.numText && rawLabel.denText) {
          // Legacy fraction structure
          if (rawLabel.numText) fractionParts.push(rawLabel.numText);
          if (rawLabel.denText) fractionParts.push(rawLabel.denText);
          if (rawLabel.vinculum) fractionParts.push(rawLabel.vinculum);
        } else if (rawLabel) {
          fractionParts.push(rawLabel as Phaser.GameObjects.GameObject);
        }
        // Track selected number for analytics
        this.selectedNumbers.push({
          value: n.value,
          isTarget: n.isTarget,
        });
        
        if (n.isTarget) {
          this.score += 10;
          this.scoreHelper.answerCorrectly();
          this.audioManager.playSoundEffect('correct-sound');
          // Ensure focus remains in game, then announce correct feedback after hit
          // Wrap in function and delay like lives announcement does
          const announceCorrect = () => {
            try { focusToGameContainer(); } catch {}
            this.announceWithGap(i18n.t('common.correct'), 'assertive', 500, 0);
          };
          this.time.delayedCall(50, announceCorrect);
          this.questionsCorrect++;
          const isFinal = this.questionsCorrect >= this.questionsPerLevel;
          if (isFinal) this.awaitingFinalRockAnim = true; // gate end overlay until rock tween completes
          if (rock) {
            rock.setTexture('rock_correct');
            const baseX = rock.scaleX,
              baseY = rock.scaleY;
            this.tweens.add({
              targets: rock,
              duration: 170,
              scaleX: baseX * 1.1,
              scaleY: baseY * 1.12,
              ease: 'Back.Out',
              onComplete: () => {
                const labelTargets = fractionParts.filter(Boolean) as any;
                if (labelTargets.length) {
                  this.tweens.add({
                    targets: labelTargets,
                    duration: 140,
                    scaleX: 0,
                    scaleY: 0,
                    alpha: 0,
                    ease: 'Quad.In',
                    onComplete: () => {
                      this.tweens.add({
                        targets: rock,
                        duration: 180,
                        scaleX: 0,
                        scaleY: 0,
                        ease: 'Quad.In',
                        onComplete: () => {
                          if (container && !container.destroyed) container.destroy(true);
                          if (isFinal) {
                            this.awaitingFinalRockAnim = false;
                            this.pendingEndComplete = true;
                            this.attemptLevelEnd();
                          }
                        },
                      });
                    },
                  });
                } else {
                  this.tweens.add({
                    targets: rock,
                    duration: 220,
                    scaleX: 0,
                    scaleY: 0,
                    ease: 'Quad.In',
                    onComplete: () => {
                      if (container && !container.destroyed) container.destroy(true);
                      if (isFinal) {
                        this.awaitingFinalRockAnim = false;
                        this.pendingEndComplete = true;
                        this.attemptLevelEnd();
                      }
                    },
                  });
                }
              },
            });
          } else {
            container.destroy(true);
            if (isFinal) {
              this.awaitingFinalRockAnim = false;
              this.pendingEndComplete = true;
              this.attemptLevelEnd();
            }
          }
          this.numbers.splice(i, 1);
          i--;
        } else {
          this.scoreHelper.answerIncorrectly();
          this.audioManager.playSoundEffect('wrong-sound');
          // Ensure focus remains in game, then announce incorrect feedback after hit
          // Wrap in function and delay like lives announcement does
          const announceIncorrect = () => {
            try { focusToGameContainer(); } catch {}
            this.announceWithGap(i18n.t('common.incorrect'), 'assertive', 500, 0);
          };
          this.time.delayedCall(50, announceIncorrect);
          this.loseHeart('wrong');
          this.playerStun = Math.max(this.playerStun, 0.25);
          this.tweens.add({
            targets: this.player.sprite,
            duration: 80,
            y: this.player.sprite.y + 8,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut',
          });
          this.tweens.add({
            targets: this.player.sprite,
            duration: 60,
            x: this.player.sprite.x + 6,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
          });
          if (rock) {
            rock.setTexture('rock_incorrect');
            const targets = [rock, ...fractionParts].filter(Boolean) as any;
            // Apply a shake (horizontal) to each target; Phaser tween will modify x relative to current
            this.tweens.add({
              targets,
              duration: 60,
              x: (targets[0] as any).x + 5,
              yoyo: true,
              repeat: 3,
              ease: 'Sine.InOut',
              onComplete: () => {
                if (container && !container.destroyed) container.destroy(true);
              },
            });
          } else {
            container.destroy(true);
          }
          this.numbers.splice(i, 1);
          i--;
        }
      }
    }
    const catchPadding = CONFIG.ENEMY_CATCH_PADDING;
    if (!this.isAutoMoving) {
      for (const e of this.enemies) {
        const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, e.sprite.x, e.sprite.y);
        if (
          d <
          this.getScaledValue(this.player.size) + this.getScaledValue(e.size) - this.getScaledValue(catchPadding)
        ) {
          if (this.invulnTimer <= 0) {
            this.loseHeart('enemy');
          }
        }
      }
    }
    const anyTargetsLeft = this.numbers.some((n) => n.isTarget);
    if (!anyTargetsLeft && this.numbers.length > 0 && !this.isEnding && !this.awaitingFinalRockAnim) {
      // Safety net (should normally be handled in collection logic)
      this.pendingEndComplete = true;
    }
    this.scoreCoins.setScore(this.score);
    this.scoreCoins.setComboText('', false);
    this.scoreCoins.setFrame('coin0000');
    this.updateHeartsUI();
    if (this.pendingEndComplete && !this.isEnding) {
      this.attemptLevelEnd();
    }
  }

  // preload assets
  static _preload(scene: BaseScene) {
    ScoreCoins.preload(scene, 'purple');
    (VolumeSlider as any)?.preload?.(scene, 'purple');
    scene.load.setPath('assets/images/game_screen');
    scene.load.image('bg', 'bg.png');
    scene.load.image('tree', 'tree.png');
    scene.load.image('hero', 'hero.png');
    scene.load.image('hero_stand_1', 'hero_stand_1.png');
    scene.load.image('hero_stand_2', 'hero_stand_2.png');
    scene.load.image('hero_stand_3', 'hero_stand_3.png');
    scene.load.image('hero_stand_4', 'hero_stand_4.png');
    scene.load.image('hero_run_1', 'hero_run_1.png');
    scene.load.image('hero_run_2', 'hero_run_2.png');
    scene.load.image('hero_run_3', 'hero_run_3.png');
    scene.load.image('hero_run_4', 'hero_run_4.png');
    scene.load.image('hero_run_5', 'hero_run_5.png');
    scene.load.image('monster', 'monster.png');
    scene.load.image('monster_1', 'monster_1.png');
    scene.load.image('monster_2', 'monster_2.png');
    scene.load.image('monster_3', 'monster_3.png');
    scene.load.image('hero_negative_1', 'hero_negative_1.png');
    scene.load.image('hero_negative_2', 'hero_negative_2.png');
    scene.load.image('hero_negative_3', 'hero_negative_3.png');
    scene.load.image('rock', 'rock.png');
    scene.load.image('rock_correct', 'rock_correct.png');
    scene.load.image('rock_incorrect', 'rock_incorrect.png');
    scene.load.image('heart', 'heart.png');
    scene.load.image('empty_heart', 'empty_heart.png');
    scene.load.image('scoreBg', 'scoreBg.png');
    scene.load.image('coin', 'coin.png');
    scene.load.setPath('assets/audios');
    scene.load.audio('bg-music', 'bg-music.mp3');
    scene.load.setPath('assets/components/button/audios');
    scene.load.audio('button_click', 'button_click.mp3');
    scene.load.setPath('assets/components/button/images/purple');
    scene.load.image('icon_btn_default', 'icon_btn_default.png');
    scene.load.image('icon_btn_hover', 'icon_btn_hover.png');
    scene.load.image('icon_btn_pressed', 'icon_btn_pressed.png');
    scene.load.image('icon_pause', 'icon_pause.png');
    scene.load.image('icon_resume', 'icon_resume.png');
    scene.load.image('icon_mute', 'icon_mute.png');
    scene.load.image('icon_unmute', 'icon_unmute.png');
    scene.load.image('icon_settings', 'icon_settings.png');
    scene.load.image('icon_help', 'icon_help.png');
    scene.load.setPath('assets/audios/game');
    scene.load.audio('correct-sound', 'correct.mp3');
    scene.load.audio('wrong-sound', 'wrong.mp3');
    scene.load.audio('heart-lost', 'heart-lost.mp3');
  }

  // end level flow
  private endLevel(isComplete: boolean) {
    if (this.isEnding) return;
    this.isEnding = true;
    
    // Create analytics trial for the level
    const questionText = this.currentMechanic?.label || 'Unknown';
    
    const studentResponse = this.selectedNumbers.map((n) => n.value.toString()).join(', ');
    
    const totalSelected = this.selectedNumbers.length;
    const totalCorrectSelected = this.selectedNumbers.filter((n) => n.isTarget).length;
    const accuracyPercentage = totalSelected > 0 
      ? Math.round((totalCorrectSelected / totalSelected) * 100) 
      : 0;
    
    // Create options display from initial numbers snapshot
    const optionsDisplay = this.initialNumbersSnapshot.map((n) => ({
      option: n.value.toString(),
      isCorrect: n.isTarget,
    }));

    this.analyticsHelper?.createTrial({
      questionMaxPoints: 1,
      achievedPoints: isComplete ? 1 : 0,
      questionText: questionText,
      isCorrect: isComplete,
      questionMechanic: 'default',
      gameLevelInfo: this.topic === 'grade4_topic6' ? 'game.dino_muncher.default' : 'game.multiverse.dino_muncher',
      studentResponse: studentResponse,
      studentResponseAccuracyPercentage: accuracyPercentage + '%',
      optionsDisplay: optionsDisplay,
    });

    this.padRects = undefined;
    this.lastPadState = { up: false, down: false, left: false, right: false };
    const controls = document.getElementById('controls');
    if (controls) controls.style.display = 'none';
    const currentLevelForUI = this.mechanicIndex + 1;
    const maxDifficulty = (this.currentMechanic?.difficulties?.length ?? 3) - 1;
    const atFinalDifficulty = this.difficultyIndex >= maxDifficulty;
    if (isComplete) {
      markLevelCompleted(currentLevelForUI);
    }
    this.isPaused = true;
    this.showEndOverlay(isComplete, atFinalDifficulty);
    if (this.player?.sprite?.anims) {
      this.player.sprite.anims.play('hero_stand', true);
    }
  }

  // show end overlay
  private showEndOverlay(isComplete: boolean, atFinalDifficulty: boolean) {
    if (this.endOverlay) {
      if (this.endOverlay) this.endOverlay.destroy(true);
      this.endOverlay = undefined;
    }
    // Remove HUD buttons so clicks can't reach them
  this.destroyHudButtons();
  // Hide number overlays while end overlay is visible (do this early so DOM settles before announcements)
  this.setNumbersAriaHidden(true);
  // Hide score/multiplier accessibility overlays during end overlay
  this.hideScoreAndMultiplierAccessibility();
    const { width, height } = this.display;
    const container = this.add.container(0, 0).setDepth(1000);
    const backdrop = this.addRectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setInteractive();
    container.add(backdrop);

  const title = isComplete ? i18n.t('game.levelCompleteShort') : i18n.t('game.gameOverShort');
    const titleY = height / 2 - CONFIG.END_OVERLAY_TITLE_OFFSET_Y;
    const titleText = this.addText(width / 2, titleY, title, {
      font: '800 52px Exo',
      color: '#ffffff',
      shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);
  container.add(titleText);
    if (!isComplete) {
      const heartsY = titleY + 50; // move hearts up
      const heartSpacing = CONFIG.OVERLAY_HEART_SPACING;
      const heartKeys = ['empty_heart', 'empty_heart', 'empty_heart'];
      const startX = width / 2 - heartSpacing;
      heartKeys.forEach((k, idx) => {
        const h = this.addImage(startX + idx * heartSpacing, heartsY, k)
          .setOrigin(0.5)
          .setScale(0.9);
        container.add(h);
      });
      const infoText = this.addText(width / 2, heartsY + 42, i18n.t('game.usedUpLives'), {
        font: '400 24px Exo',
        color: '#ffffff',
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 4, fill: true },
      }).setOrigin(0.5);
  container.add(infoText);
    }

    const extraOffset = !isComplete ? CONFIG.END_OVERLAY_EXTRA_OFFSET_ON_FAIL : 0;
    const baseY = height / 2 + CONFIG.END_OVERLAY_BASE_OFFSET_Y + extraOffset;
    const gap = CONFIG.END_OVERLAY_BUTTON_GAP;

    if (isComplete && atFinalDifficulty) {
      const backBtn = ButtonHelper.createButton({
        scene: this,
        imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
        text: i18n.t('menu.backToLevels'),
        label: i18n.t('menu.backToLevels'),
        textStyle: { font: '700 26px Exo', color: '#ffffff' },
        imageScale: 0.92,
        raisedOffset: 3.5,
        x: width / 2,
        y: baseY,
        onClick: () => {
          this.audioManager.playSoundEffect('button_click');
          this.audioManager.stopBackgroundMusic();
          this.scene.start('MainMenu');

          const analyticsHelper = AnalyticsHelper.getInstance();
          if (analyticsHelper) {
              analyticsHelper.endLevelSession();
          }
        },
      });
      container.add(backBtn);
      ButtonHelper.startBreathingAnimation(backBtn, { scale: 1.04, duration: 1050, ease: 'Sine.easeInOut' });
      // Do not auto-focus; let title announcement be read first.
    } else {
      let primaryLabel: string;
      if (isComplete) {
        primaryLabel = i18n.t('game.nextLevel');
      } else {
        primaryLabel = i18n.t('common.playAgain');
      }
      const primaryBtn = ButtonHelper.createButton({
        scene: this,
        imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
        text: primaryLabel,
        label: primaryLabel,
        textStyle: { font: '700 26px Exo', color: '#ffffff' },
        imageScale: 0.92,
        raisedOffset: 3.5,
        x: width / 2,
        y: baseY,
        onClick: () => {
          this.audioManager.playSoundEffect('button_click');
          if (isComplete) {
            this.audioManager.stopBackgroundMusic();
            this.scene.start('GameScene', {
              mechanicIndex: this.mechanicIndex,
              difficultyIndex: this.difficultyIndex + 1,
              scoreHelper: new ScoreHelper(2),
              skipTutorial: true,
            });
          } else {
            this.audioManager.stopBackgroundMusic();
            this.scene.start('GameScene', {
              mechanicIndex: this.mechanicIndex,
              difficultyIndex: this.difficultyIndex,
              scoreHelper: new ScoreHelper(2),
              skipTutorial: true,
            });
          }
        },
      });
      container.add(primaryBtn);
      ButtonHelper.startBreathingAnimation(primaryBtn, { scale: 1.04, duration: 1000, ease: 'Sine.easeInOut' });

      const backBtn = ButtonHelper.createButton({
        scene: this,
        imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
        text: i18n.t('menu.backToLevels'),
        label: i18n.t('menu.backToLevels'),
        textStyle: { font: '700 26px Exo', color: '#ffffff' },
        imageScale: 0.9,
        raisedOffset: 3.5,
        x: width / 2,
        y: baseY + gap,
        onClick: () => {
          this.audioManager.playSoundEffect('button_click');
          this.audioManager.stopBackgroundMusic();
          this.scene.start('MainMenu');

          const analyticsHelper = AnalyticsHelper.getInstance();
          if (analyticsHelper) {
              analyticsHelper.endLevelSession();
          }
        },
      });
      container.add(backBtn);
      ButtonHelper.startBreathingAnimation(backBtn, { scale: 1.03, duration: 1100, ease: 'Sine.easeInOut' });
      // Do not auto-focus; let title announcement be read first.
    }

    this.endOverlay = container;
    // After a short delay (DOM settled), move focus and announce title.
    this.time.delayedCall(120, () => {
      try { focusToGameContainer(); } catch {}
      // Announce the title first (works for both Level Complete and Game Over)
      this.overlayAnnounceWithGap(title, 'assertive', 350, 0);
      if (!isComplete) {
        // Then, announce the supporting text after a larger gap to avoid stepping on the title
        this.time.delayedCall(900, () => {
          this.overlayAnnounceWithGap(i18n.t('game.usedUpLives'), 'polite', 400, 0);
        });
      }
    });
  }

  // enter pause state
  private pauseGame(pauseBtn: Phaser.GameObjects.Container) {
    this.isPaused = true;
    // Hide (do not destroy) other HUD buttons so they come back on resume
    this.setNonPauseHudVisible(false);
    this.audioManager.pauseAll();
    (pauseBtn.list[1] as Phaser.GameObjects.Image).setTexture('icon_resume');
    (pauseBtn as any).buttonOverlay?.setLabel(i18n.t('common.resume'));
    this.showPauseOverlay(pauseBtn);
    if (this.player?.sprite) this.player.sprite.anims.play('hero_stand', true);
    // Hide number overlays while paused
    this.setNumbersAriaHidden(true);
  }

  // resume from pause
  private resumeGame(pauseBtn: Phaser.GameObjects.Container) {
    this.isPaused = false;
    this.audioManager.resumeAll();
    (pauseBtn.list[1] as Phaser.GameObjects.Image).setTexture('icon_pause');
    (pauseBtn as any).buttonOverlay?.setLabel(i18n.t('common.pause') || 'Pause');
    if (this.endOverlay) {
      this.endOverlay.destroy(true);
      this.endOverlay = undefined;
    }
    // If other HUD buttons were only hidden, show them again
    this.setNonPauseHudVisible(true);
    // If any got destroyed (e.g. after end overlay), recreate them
    if (!this.muteBtn || !this.settingsBtn || !this.helpBtn) {
      const needPause = !this.pauseBtn; // avoid duplicate pause button
      const existingPause = this.pauseBtn;
      // Recreate full set (will make a new pause button). If we already have one, destroy it first to avoid overlap.
      if (!needPause && existingPause) {
        existingPause.destroy(true);
        this.pauseBtn = undefined;
      }
      this.createTopRightControls();
    }

    if (pauseBtn) {
      const overlay = (pauseBtn as any).buttonOverlay;
      if (overlay && overlay.element) {
        overlay.element.focus({ preventScroll: true });
      }
    }
    // Restore number overlays after resume
    this.setNumbersAriaHidden(false);
  }

  // show pause overlay
  private showPauseOverlay(pauseBtn: Phaser.GameObjects.Container) {
    if (this.endOverlay) {
      this.endOverlay.destroy(true);
      this.endOverlay = undefined;
    }
    // Other HUD buttons already removed; pause button retained
    const { width, height } = this.display;
    const container = this.add.container(0, 0).setDepth(1000);
    const backdrop = this.addRectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setInteractive();
    container.add(backdrop);
    const titleText = this.addText(
      width / 2,
      height / 2 - CONFIG.PAUSE_OVERLAY_TITLE_OFFSET_Y,
      i18n.t('game.paused'),
      {
        font: '800 52px Exo',
        color: '#ffffff',
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 8, fill: true },
      },
    ).setOrigin(0.5);
    container.add(titleText);

    const baseY = height / 2 + CONFIG.PAUSE_OVERLAY_BASE_OFFSET_Y;
    const gap = CONFIG.PAUSE_OVERLAY_BUTTON_GAP;

    const resumeBtn = ButtonHelper.createButton({
      scene: this,
      imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
      text: i18n.t('common.resume'),
      label: i18n.t('common.resume'),
      textStyle: { font: '700 26px Exo', color: '#ffffff' },
      imageScale: 0.92,
      raisedOffset: 3.5,
      x: width / 2,
      y: baseY,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.resumeGame(pauseBtn);
      },
    });
    container.add(resumeBtn);
    ButtonHelper.startBreathingAnimation(resumeBtn, { scale: 1.04, duration: 1000, ease: 'Sine.easeInOut' });

    const backBtn = ButtonHelper.createButton({
      scene: this,
      imageKeys: { default: 'btn_default', hover: 'btn_hover', pressed: 'btn_pressed' },
      text: i18n.t('menu.backToLevels'),
      label: i18n.t('menu.backToLevels'),
      textStyle: { font: '700 26px Exo', color: '#ffffff' },
      imageScale: 0.9,
      raisedOffset: 3.5,
      x: width / 2,
      y: baseY + gap,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.audioManager.stopBackgroundMusic();
        this.scene.start('MainMenu');

        const analyticsHelper = AnalyticsHelper.getInstance();
        if (analyticsHelper) {
            analyticsHelper.endLevelSession();
        }
      },
    });
    container.add(backBtn);
    ButtonHelper.startBreathingAnimation(backBtn, { scale: 1.03, duration: 1100, ease: 'Sine.easeInOut' });

    this.endOverlay = container;

    const focusableElements = [resumeBtn, backBtn];

    this.cleanupFocusTrap = createFocusTrap(focusableElements);
  }

  // bind html dpad
  private bindDpadControls() {
    const map: Record<string, keyof typeof this.touchKeys> = {
      'btn-up': 'up',
      'btn-down': 'down',
      'btn-left': 'left',
      'btn-right': 'right',
    };
    const setKey = (key: keyof typeof this.touchKeys, down: boolean) => {
      this.touchKeys[key] = down;
    };
    const addHandlers = (el: HTMLElement | null, key: keyof typeof this.touchKeys) => {
      if (!el) return;
      if (el.getAttribute('data-dd-bound') === '1') return;
      el.setAttribute('data-dd-bound', '1');
      el.addEventListener('mousedown', () => setKey(key, true));
      el.addEventListener('mouseup', () => setKey(key, false));
      el.addEventListener('mouseleave', () => setKey(key, false));
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        setKey(key, true);
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        setKey(key, false);
      });
      el.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        setKey(key, false);
      });
    };
    Object.entries(map).forEach(([id, key]) => addHandlers(document.getElementById(id), key));

    window.addEventListener('blur', () => {
      this.touchKeys.up = this.touchKeys.down = this.touchKeys.left = this.touchKeys.right = false;
    });
  }

  // define hero animations
  public setupHeroAnimations() {
    if (!this.anims.exists('hero_stand')) {
      this.anims.create({
        key: 'hero_stand',
        frames: [
          { key: 'hero_stand_1' },
          { key: 'hero_stand_2' },
          { key: 'hero_stand_3' },
          { key: 'hero_stand_4' },
        ],
        frameRate: 8,
        repeat: -1,
        skipMissedFrames: false,
      });
    }
    if (!this.anims.exists('hero_run')) {
      this.anims.create({
        key: 'hero_run',
        frames: [
          { key: 'hero_run_1' },
          { key: 'hero_run_2' },
          { key: 'hero_run_3' },
          { key: 'hero_run_4' },
          { key: 'hero_run_5' },
        ],
        frameRate: 18,
        repeat: -1,
        skipMissedFrames: false,
      });
    }
    if (!this.anims.exists('hero_negative')) {
      this.anims.create({
        key: 'hero_negative',
        frames: [{ key: 'hero_negative_1' }, { key: 'hero_negative_2' }, { key: 'hero_negative_3' }],
        frameRate: 8,
        repeat: 0,
        skipMissedFrames: false,
      });
    }
    if (!this.anims.exists('monster_move')) {
      this.anims.create({
        key: 'monster_move',
        frames: [{ key: 'monster_1' }, { key: 'monster_2' }, { key: 'monster_3' }],
        frameRate: 6,
        repeat: -1,
        skipMissedFrames: false,
      });
    }
  }

  // update hero anim
  private updateHeroAnim(moving: boolean, vx: number) {
    const spr = this.player.sprite;
    if (!spr) return;
    if (this.awaitingHeroAnim && spr.anims.currentAnim?.key === 'hero_negative') return; // lock during reaction
    if (moving) {
      if (spr.anims.currentAnim?.key !== 'hero_run') {
        spr.anims.play('hero_run', true);
      }
      if (vx !== 0) spr.setFlipX(vx < 0);
    } else {
      if (spr.anims.currentAnim?.key !== 'hero_stand') {
        spr.anims.play('hero_stand', true);
      }
    }
  }

  // play negative anim
  private playHeroNegativeReaction(onComplete?: () => void) {
    if (this.awaitingHeroAnim) return;
    const spr = this.player.sprite;
    if (!spr || !this.anims.exists('hero_negative')) {
      if (onComplete) onComplete();
      return;
    }
    this.awaitingHeroAnim = true;
    try {
      spr.anims.play('hero_negative');
    } catch {
      this.awaitingHeroAnim = false;
      if (onComplete) onComplete();
      return;
    }
    spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE_KEY + 'hero_negative', () => {
      this.awaitingHeroAnim = false;
      spr.anims.play('hero_stand');
      this.attemptLevelEnd();
      if (onComplete) onComplete();
    });
  }

  // attempt level completion
  private attemptLevelEnd() {
    if (this.pendingEndComplete && !this.awaitingHeroAnim && !this.awaitingFinalRockAnim && !this.isEnding) {
      this.pendingEndComplete = false;
      this.endLevel(true);
    }
  }

  // Accessibility Methods

  // Announce to screen readers with a guaranteed minimum gap between messages.
  // Also clears the region briefly to force re-reads on some SRs.
  private announceWithGap(
    text: string,
    politeness: 'polite' | 'assertive' = 'assertive',
    minGapMs: number = 600,
    extraDelayMs: number = 0,
  ) {
    const now = Date.now();
    const since = now - (this.lastAnnounceAt || 0);
    const wait = Math.max(minGapMs - since, 0) + (extraDelayMs || 0);

    if (this.pendingAnnounceEvent) {
      this.pendingAnnounceEvent.remove(false);
      this.pendingAnnounceEvent = null;
    }

    // Clear then set text to retrigger SR reliably
    this.pendingAnnounceEvent = this.time.delayedCall(wait, () => {
      try { announceToScreenReader(''); } catch {}
      this.time.delayedCall(60, () => {
        // Add zero-width spaces to force unique announcement
        this.announceCount = (this.announceCount || 0) + 1;
        const invisibleSuffix = '\u200B'.repeat(this.announceCount);
        announceToScreenReader(text + invisibleSuffix, politeness);
        this.lastAnnounceAt = Date.now();
      });
    });
  }

  // Dedicated queue for overlay titles and overlay texts (e.g., Game Over)
  private overlayAnnounceWithGap(
    text: string,
    politeness: 'polite' | 'assertive' = 'assertive',
    minGapMs: number = 400,
    extraDelayMs: number = 0,
  ) {
    const now = Date.now();
    const since = now - (this.lastOverlayAnnounceAt || 0);
    const wait = Math.max(minGapMs - since, 0) + (extraDelayMs || 0);

    if (this.pendingOverlayEvent) {
      this.pendingOverlayEvent.remove(false);
      this.pendingOverlayEvent = null;
    }

    this.pendingOverlayEvent = this.time.delayedCall(wait, () => {
      try { announceToScreenReader(''); } catch {}
      this.time.delayedCall(60, () => {
        announceToScreenReader(text, politeness);
        this.lastOverlayAnnounceAt = Date.now();
      });
    });
  }

  // Move player smoothly to target number
  private movePlayerToTarget(targetNumber: any) {
    if (!this.player || !this.player.sprite || !targetNumber.sprite) return;

    const targetX = targetNumber.sprite.x;
    const targetY = targetNumber.sprite.y;

    // Calculate movement duration based on distance
    const distance = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, targetX, targetY);
    const duration = Math.max(500, Math.min(2000, distance * 2)); // 500ms to 2s

    // Animate player movement
    // Begin auto-move: mark state & grant temporary invulnerability
    this.isAutoMoving = true;
    this.autoMoveTarget = targetNumber.sprite;
    this.grantInvuln(duration / 1000 + 0.1);
    this.tweens.add({
      targets: this.player.sprite,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Power2',
      onUpdate: () => {
        // Update player animation during movement
        const vx = targetX - this.player.sprite.x;
        this.updateHeroAnim(true, vx);
      },
      onComplete: () => {
        this.updateHeroAnim(false, 0); // Stop movement animation
        this.isAutoMoving = false;
        this.autoMoveTarget = null;
        // The existing collision detection in the update loop will handle collection
      },
    });

    // Log movement for debugging
    console.log(`Moving dinosaur to ${targetNumber.value}`);
  }

  // Exit accessibility mode
  private exitAccessibilityMode() {}

  // Hide score/multiplier overlays during end screens
  private hideScoreAndMultiplierAccessibility() {
    try {
      // Destroy score/multiplier text overlays completely
      const scoreOverlay = (this.scoreCoins as any)?.scoreOverlay;
      const comboOverlay = (this.scoreCoins as any)?.comboOverlay;
      
      if (scoreOverlay && typeof scoreOverlay.destroy === 'function') {
        scoreOverlay.destroy();
      }
      if (comboOverlay && typeof comboOverlay.destroy === 'function') {
        comboOverlay.destroy();
      }
      
      // Also hide the ScoreCoins DOM element if it exists
      const scoreEl = (this.scoreCoins as any)?.domElement?.node as HTMLElement | undefined;
      if (scoreEl) {
        scoreEl.setAttribute('aria-hidden', 'true');
        scoreEl.tabIndex = -1;
        scoreEl.style.pointerEvents = 'none';
      }
      
      // Find and hide any remaining text overlays with score/multiplier in their label
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        const allElements = gameContainer.querySelectorAll('[aria-label], [role]');
        allElements.forEach((el) => {
          const label = (el as HTMLElement).getAttribute('aria-label') || '';
          if (/score|multiplier/i.test(label)) {
            el.setAttribute('aria-hidden', 'true');
            (el as HTMLElement).tabIndex = -1;
            (el as HTMLElement).style.pointerEvents = 'none';
          }
        });
      }
    } catch (err) {
      // Silently fail if DOM elements not found
    }
  }
}
