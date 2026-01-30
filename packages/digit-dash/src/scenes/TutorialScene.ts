import { BaseScene, ButtonHelper, i18n, setSceneBackground, ExpressionUtils, TextOverlay, announceToScreenReader, focusToGameContainer, ButtonOverlay, VolumeSlider } from '@k8-games/sdk';
import { getTutorialMechanic, MechanicsManager } from '../mechanics/Mechanic';
import { parseFraction, eqDenoms } from '../utils/mechanics';
import * as CONFIG from '../config/common';

// tutorial gameplay scene
export class TutorialScene extends BaseScene {
  private playfield!: { left: number; top: number; width: number; height: number; right: number; bottom: number };
  private isMobile: boolean = false;
  private playButton?: Phaser.GameObjects.Container;
  private skipBtn!: Phaser.GameObjects.Container;
  private volumeSlider!: VolumeSlider;
  private muteBtn!: Phaser.GameObjects.Container;
  private circleBase?: Phaser.GameObjects.Image;
  private arrowUp?: Phaser.GameObjects.Image;
  private arrowDown?: Phaser.GameObjects.Image;
  private arrowLeft?: Phaser.GameObjects.Image;
  private arrowRight?: Phaser.GameObjects.Image;
  private hero?: Phaser.GameObjects.Sprite;
  private monster?: Phaser.GameObjects.Image; // radius derived from CONFIG.PLAYER_SIZE * CONFIG.ENEMY_SIZE_MULTIPLIER and stored via setData('radius')
  private monsterPath: Phaser.Math.Vector2[] = [];
  private monsterPathIndex: number = 0;
  private rocks: Phaser.GameObjects.Container[] = [];
  private obstacles: Array<{ sprite: Phaser.GameObjects.Image; size: number }> = [];
  private parentScene: string = '';
  private mechanicId?: string;
  private mechanicsManager?: MechanicsManager;
  // Tutorial steps
  private instructionText?: Phaser.GameObjects.Text;
  private dynamicInstructionContainer?: Phaser.GameObjects.Container;
  private currentStepIndex = 0;
  private stepPulse?: Phaser.Tweens.Tween;
  private collectedFirst = false;
  private collectedSecond = false;
  private firstTarget?: Phaser.GameObjects.Container;
  private secondTarget?: Phaser.GameObjects.Container;
  private firstTargetOverlay?: ButtonOverlay;
  private secondTargetOverlay?: ButtonOverlay;
  private stepAutoTimer?: Phaser.Time.TimerEvent;
  private allowedDirections: { [k: string]: boolean } = { up: false, down: false, left: false, right: false };
  // Movement/input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private touchKeys = { up: false, down: false, left: false, right: false };
  private currentStepVoice?: Phaser.Sound.WebAudioSound;
  private autoStart?: boolean;
  private delayedCalls: Phaser.Time.TimerEvent[] = [];

  static _preload(scene: BaseScene) {
    scene.load.setPath('assets/images/game_screen');
    scene.load.image('bg', 'bg.png');
    scene.load.image('tree', 'tree.png');
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
    scene.load.image('rock', 'rock.png');
    scene.load.image('rock_correct', 'rock_correct.png');
    scene.load.image('rock_incorrect', 'rock_incorrect.png');
    scene.load.setPath('assets/images/tutorial_screen');
    scene.load.image('tutorial_bg', 'bg.png');
    scene.load.image('circle', 'circle.png');
    scene.load.image('arrow', 'arrow.png');
    scene.load.setPath('assets/components/button/images/purple');
    scene.load.image('btn_default', 'btn_default.png');
    scene.load.image('btn_hover', 'btn_hover.png');
    scene.load.image('btn_pressed', 'btn_pressed.png');
    scene.load.image('half_button_default', 'half_button_default.png');
    scene.load.image('half_button_hover', 'half_button_hover.png');
    scene.load.image('half_button_pressed', 'half_button_pressed.png');
    scene.load.image('half_button_disabled', 'half_button_disabled.png');
    scene.load.setPath('assets/audios/tutorial');
    scene.load.audio('tut_step1_en', 'step1_en.mp3');
    scene.load.audio('tut_step2_en', 'step2_en.mp3');
    scene.load.audio('tut_step2_en_mobile', 'step2_en_mobile.mp3');
    scene.load.audio('tut_step3_en', 'step3_en.mp3');
    scene.load.audio('tut_step4_en', 'step4_en.mp3');
    scene.load.audio('tut_step5_en', 'step5_en.mp3');
    scene.load.audio('tut_step1_es', 'step1_es.mp3');
    scene.load.audio('tut_step2_es', 'step2_es.mp3');
    scene.load.audio('tut_step2_es_mobile', 'step2_es_mobile.mp3');
    scene.load.audio('tut_step3_es', 'step3_es.mp3');
    scene.load.audio('tut_step4_es', 'step4_es.mp3');
    scene.load.audio('tut_step5_es', 'step5_es.mp3');
    
    VolumeSlider.preload(scene, 'blue');
  }

  constructor() {
    super('TutorialScene');
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
    const userAgent = navigator.userAgent.toLowerCase();
    const isIPad = /ipad/.test(userAgent) || 
                  (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    
    return hasTouch || isIPad;
  }

  init(data?: { parentScene?: string; mechanicId?: string; autoStart?: boolean }) {
    this.isMobile = this.isTouchDevice();
    this.audioManager.initialize(this);
    this.audioManager.stopBackgroundMusic();
    if (data) {
      this.parentScene = data.parentScene || '';
      this.mechanicId = data.mechanicId;
      this.autoStart = data.autoStart || false;
    }
    this.mechanicsManager = new MechanicsManager();
  }

  create() {
    setSceneBackground('assets/images/tutorial_screen/bg.png');
    const inIframe = this.isInsideIframe();
    if (this.parentScene === 'GameScene' && !this.autoStart) {
      // Update parent iframe label first
      if (inIframe){
        window.parent.postMessage({ 
          type: 'UPDATE_IFRAME_LABEL', 
          label: i18n.t('tutorial.helpPage') 
        }, '*');
      }
      
      focusToGameContainer();
      this.time.delayedCall(1000, () => {
        announceToScreenReader(i18n.t('tutorial.helpPage'));
      });
    }

    // Audio controls
    this.createMuteButton();
    this.createVolumeControls();

    this.addImage(this.display.width / 2, this.display.height / 2, 'tutorial_bg')
      .setOrigin(0.5)
      .setDepth(-20);
    const howToPlayText = this.addText(this.display.width / 2, 60, i18n.t('tutorial.howToPlay'), {
      font: '800 30px Exo',
      color: '#ffffff',
    }).setOrigin(0.5);
    new TextOverlay(this, howToPlayText, {
      label: i18n.t('tutorial.howToPlay'),
      tag: 'h1',
      role: 'heading',
    });
    this.instructionText = this.addText(this.display.width / 2, 110, '', {
      font: '600 28px Exo',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: this.display.width * 0.8 },
    }).setOrigin(0.5);
    const instructionOverlay = new TextOverlay(this, this.instructionText, {
      label: '',
      announce: true,
    });
    this.instructionText.setData('overlay', instructionOverlay);
    this.createSkipButton();
    if (this.isMobile) this.setupMovementControls();
    this.buildMiniDemo();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.startStep(0);
  }

  private isInsideIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      console.log('Iframe error', e);
      return true;
    }
  }

  private createSkipButton() {
    this.skipBtn = ButtonHelper.createButton({
      scene: this,
      imageKeys: { default: 'half_button_default', hover: 'half_button_hover', pressed: 'half_button_pressed' },
      text: i18n.t('common.skip'),
      label: i18n.t('common.skip'),
      textStyle: { font: '700 32px Exo', color: '#FFFFFF' },
      x: this.display.width - 55,
      y: 90,
      imageScale: 1,
      padding: 18,
      raisedOffset: 3.5,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.goBack();
      },
    });
    this.skipBtn.setDepth(10);
  }

  private createPlayButton() {
    // Create "Let's Play" button
    this.playButton = ButtonHelper.createButton({
      scene: this,
      imageKeys: {
        default: 'btn_default',
        hover: 'btn_hover',
        pressed: 'btn_pressed',
      },
      text: i18n.t('tutorial.playButton'),
      label: i18n.t('tutorial.playButton'),
      textStyle: { font: '800 32px Exo', color: '#ffffff' },
      imageScale: 0.9,
      raisedOffset: 3.5,
      x: this.display.width / 2,
      y: this.display.height - 100,
      onClick: () => {
        this.audioManager.playSoundEffect('button_click');
        this.goBack();
      },
    });
    this.playButton.setDepth(10);
  }

  private buildMiniDemo() {
    // Determine which mechanic we are tutoring for dynamic text & rock values.
    let mechanic = getTutorialMechanic();
    if (this.mechanicId) {
      const m = this.mechanicsManager?.getAll().find((m) => m.id === this.mechanicId);
      if (m) {
        // Keep original tutorial numbers for the 'even' mechanic to preserve authored layout (4 then 20).
        const base = getTutorialMechanic();
        if (this.mechanicId !== 'even') {
          const diff = base.difficulties[0];
          const count = diff.numberPositions ? diff.numberPositions.length : diff.numbers?.length || 6;
          if (this.mechanicId === 'eqHalf' || this.mechanicId === 'eqQuarter') {
            // Build fraction universe like generateRoundNumbers does
            const universe: string[] = [];
            for (const den of eqDenoms) {
              for (let num = 1; num < den; num++) universe.push(`${num}/${den}`);
            }
            const valid = universe.filter((f) => m.check(f));
            const invalid = universe.filter((f) => !m.check(f));
            // Pick first two valid (sorted numerically) for deterministic tutorial path
            const toNum = (f: string) => {
              const [a, b] = f.split('/').map(Number);
              return a / b;
            };
            valid.sort((a, b) => toNum(a) - toNum(b));
            const firstTwo = valid.slice(0, 2);
            // Fill remainder alternating invalid then valid to mix
            const remaining: string[] = [];
            let vi = 0,
              ii = 0;
            while (firstTwo.length + remaining.length < count) {
              if (ii < invalid.length) {
                remaining.push(invalid[ii++]);
              }
              if (firstTwo.length + remaining.length >= count) break;
              if (vi < valid.length) {
                const candidate = valid[vi++];
                if (!firstTwo.includes(candidate)) remaining.push(candidate);
              }
              if (vi >= valid.length && ii >= invalid.length) break;
            }
            diff.numbers = [...firstTwo, ...remaining].slice(0, count) as any;
          } else {
            // Numeric mechanics
            const corrects: number[] = [];
            for (let n = 0; corrects.length < 2 && n <= m.numberLimit; n++) if (m.check(n)) corrects.push(n);
            while (corrects.length < 2) corrects.push(corrects.length);
            const values: number[] = [...corrects];
            let cur = 0;
            while (values.length < count) {
              if (m.check(cur) && !corrects.includes(cur)) values.push(cur);
              else if (!m.check(cur)) values.push(cur);
              cur++;
              if (cur > m.numberLimit) break;
            }
            diff.numbers = values.slice(0, count);
          }
        }
        (base as any).check = m.check;
        mechanic = base;
      }
    }
    const sidePad = CONFIG.SIDE_PADDING_DEFAULT,
      topPad = CONFIG.TUTORIAL_TOP_PAD,
      bottomPad = CONFIG.TUTORIAL_BOTTOM_PAD;
    const left = sidePad,
      top = topPad,
      width = this.display.width - sidePad * 2,
      height = this.display.height - topPad - bottomPad;
    this.playfield = {
      left,
      top,
      width,
      height,
      get right() {
        return left + width;
      },
      get bottom() {
        return top + height;
      },
    } as any;
    this.ensureHeroAnimations();
    const playerSize = CONFIG.PLAYER_SIZE;
    let heroX = left + width * 0.25;
    let heroY = top + height * 0.5;
    if (mechanic?.heroSpawnPoint) {
      heroX = left + Phaser.Math.Clamp(mechanic.heroSpawnPoint[0], 0, 1) * width;
      heroY = top + Phaser.Math.Clamp(mechanic.heroSpawnPoint[1], 0, 1) * height;
    }
    this.hero = this.addSprite(heroX, heroY, 'hero_stand_1').setOrigin(0.5);
    const playerScale = (playerSize * 2) / Math.max(this.hero.width, this.hero.height);
    this.hero.setScale(playerScale * 1.3).setDepth(5);
    this.hero.anims.play('hero_stand');
    if (mechanic) {
      const diffCfg = mechanic.difficulties[0];
      const positions = diffCfg.obstaclePositions || [];
      const size = CONFIG.TUTORIAL_OBSTACLE_SIZE;
      const treeVisualSize = Math.floor(size * 2.2);
      const desired = Math.min(diffCfg.obstacles ?? positions.length, positions.length);
      for (let i = 0; i < desired; i++) {
        const p = positions[i];
        const nx = Phaser.Math.Clamp(p[0], 0, 1);
        const ny = Phaser.Math.Clamp(p[1], 0, 1);
        const x = left + nx * width;
        const y = top + ny * height;
        const sprite = this.addImage(x, y, 'tree').setOrigin(0.5);
        const treeScale = treeVisualSize / Math.max(sprite.width, sprite.height);
        sprite.setScale(treeScale).setDepth(-2);
        this.obstacles.push({ sprite, size: Math.floor(size * 0.9) });
      }
      const numberCfg = mechanic.difficulties[0];
      const numberSize = CONFIG.TUTORIAL_NUMBER_SIZE;
      let assignedTargets = 0;
      (numberCfg.numberPositions || []).forEach((p, idx) => {
        if (!numberCfg?.numbers || idx >= numberCfg.numbers.length) return;
        const value = numberCfg?.numbers[idx];
        const x = left + Phaser.Math.Clamp(p[0], 0, 1) * width;
        const y = top + Phaser.Math.Clamp(p[1], 0, 1) * height;
        const c = this.createNumberContainer(x, y, value, numberSize);
        c.setDepth(0);
        const isCorrect = mechanic.check(value);
        if (!isCorrect) {
          c.setAlpha(0.55);
        }
        const rockImg = c.list.find((o) => (o as any).texture?.key === 'rock') as
          | Phaser.GameObjects.Image
          | undefined;
        if (rockImg) rockImg.setTint(0xffffff);
        this.rocks.push(c);
        if (isCorrect && assignedTargets < 2) {
          if (assignedTargets === 0) this.firstTarget = c;
          else this.secondTarget = c;
          assignedTargets++;
        }
      });
    }
    let monsterX = left + width * 0.75;
    let monsterY = top + height * 0.5;
    if (mechanic?.monsterSpawnPoint) {
      monsterX = left + Phaser.Math.Clamp(mechanic.monsterSpawnPoint[0], 0, 1) * width;
      monsterY = top + Phaser.Math.Clamp(mechanic.monsterSpawnPoint[1], 0, 1) * height;
    }
    this.monster = this.addImage(monsterX, monsterY, 'monster').setOrigin(0.5);
    const enemySizeMultiplier = CONFIG.ENEMY_SIZE_MULTIPLIER;
    const playerSizeLogical = CONFIG.PLAYER_SIZE;
    const monsterLogical = Math.floor(playerSizeLogical * enemySizeMultiplier);
    const monsterScale = (monsterLogical * 2) / Math.max(this.monster.width, this.monster.height);
    this.monster.setScale(monsterScale).setDepth(5);
    this.monster.setData('radius', monsterLogical);
    this.buildMonsterDiamondPath();

    // After building rocks, attach accessibility overlays to the two guided targets
    this.setupTargetOverlays();
  }

  private setupTargetOverlays() {
    // Clean up any existing overlays
    if (this.firstTargetOverlay) { this.firstTargetOverlay.cleanup?.(); this.firstTargetOverlay = undefined; }
    if (this.secondTargetOverlay) { this.secondTargetOverlay.cleanup?.(); this.secondTargetOverlay = undefined; }
    const handleActivate = (target: Phaser.GameObjects.Container | undefined, isFirst: boolean) => {
      if (!target) return;
      // Only allow activation on the relevant step
      const steps = this.getSteps();
      const step = steps[this.currentStepIndex];
      const expectedType = isFirst ? 'moveFirst' : 'moveSecond';
      if (!step || step.type !== expectedType) return;
      // Teleport hero to target before collecting (like Game scene)
      this.teleportHeroToTarget(target);
      // Collect and advance
      this.animateCollected(target, true);
      if (isFirst) {
        this.collectedFirst = true;
      } else {
        this.collectedSecond = true;
      }
      this.stopPulse();
      this.advanceStep();
    };
    if (this.firstTarget) {
      // Provide a simple label and make it focusable; no correctness mention
      const label = i18n.t('game.accessibility.numberLabel', { value: this.getRockValue(this.firstTarget) }) || i18n.t('tutorial.firstTarget');
      this.firstTargetOverlay = new ButtonOverlay(this, this.firstTarget, {
        label,
        onKeyDown: () => handleActivate(this.firstTarget, true),
      });
      // Also allow mouse click on the target container
      const size = 100; // Large touch target
      this.firstTarget.setInteractive(new Phaser.Geom.Rectangle(-size/2, -size/2, size, size), Phaser.Geom.Rectangle.Contains);
      this.firstTarget.on('pointerdown', () => handleActivate(this.firstTarget, true));
    }
    if (this.secondTarget) {
      const label = i18n.t('game.accessibility.numberLabel', { value: this.getRockValue(this.secondTarget) }) || i18n.t('tutorial.secondTarget');
      this.secondTargetOverlay = new ButtonOverlay(this, this.secondTarget, {
        label,
        onKeyDown: () => handleActivate(this.secondTarget, false),
      });
      const size = 100; // Large touch target
      this.secondTarget.setInteractive(new Phaser.Geom.Rectangle(-size/2, -size/2, size, size), Phaser.Geom.Rectangle.Contains);
      this.secondTarget.on('pointerdown', () => handleActivate(this.secondTarget, false));
    }
  }

  private teleportHeroToTarget(target: Phaser.GameObjects.Container) {
    if (!this.hero) return;
    const tx = target.x;
    const ty = target.y;
    // Clamp within playfield if available
    if (this.playfield) {
      this.hero.x = Phaser.Math.Clamp(tx, this.getScaledValue(this.playfield.left + 20), this.getScaledValue(this.playfield.left + this.playfield.width - 20));
      this.hero.y = Phaser.Math.Clamp(ty, this.getScaledValue(this.playfield.top + 20), this.getScaledValue(this.playfield.top + this.playfield.height - 20));
    } else {
      this.hero.x = tx;
      this.hero.y = ty;
    }
  }

  private getRockValue(container: Phaser.GameObjects.Container | undefined): string | number {
    if (!container) return '';
    // Try to find a Text child (simple numbers case)
    const t = container.list.find((o: any) => o instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
    if (t) return t.text;
    // Otherwise, attempt to infer from ExpressionUtils container by reading any text children
    const c = container.list.find((o: any) => !!(o?.list && o.list.length)) as Phaser.GameObjects.Container | undefined;
    if (c) {
      const texts: string[] = [];
      const collect = (node: any) => {
        if (!node) return;
        if (node instanceof Phaser.GameObjects.Text) texts.push(node.text);
        if (node.list) node.list.forEach(collect);
      };
      c.list.forEach(collect);
      if (texts.length) return texts.join(' ');
    }
    return '';
  }

  private buildMonsterDiamondPath() {
    if (!this.playfield || !this.monster) return;
    const r = this.monster.getData('radius');
    const pf: any = this.playfield;
    const top = new Phaser.Math.Vector2(pf.left + pf.width * 0.5, pf.top + r);
    const right = new Phaser.Math.Vector2(pf.left + pf.width - r, pf.top + pf.height * 0.5);
    const bottom = new Phaser.Math.Vector2(pf.left + pf.width * 0.5, pf.top + pf.height - r);
    const left = new Phaser.Math.Vector2(pf.left + r, pf.top + pf.height * 0.5);
    this.monsterPath = [top, right, bottom, left];
    if (this.monster) {
      let best = 0;
      let bestDist = Number.MAX_VALUE;
      for (let i = 0; i < this.monsterPath.length; i++) {
        const p = this.monsterPath[i];
        const d = Phaser.Math.Distance.Between(
          this.getScaledValue(p.x),
          this.getScaledValue(p.y),
          this.monster.x,
          this.monster.y,
        );
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      this.monsterPathIndex = best;
    }
  }

  private setupMovementControls() {
    const baseX = this.display.width - 150;
    const baseY = this.display.height - 150;
    this.circleBase = this.addImage(baseX, baseY, 'circle').setOrigin(0.5).setScale(0.95);
    const offset = 48;
    const arrowScale = 0.7;
    this.arrowUp = this.addImage(baseX, baseY - offset, 'arrow')
      .setOrigin(0.5)
      .setScale(arrowScale)
      .setRotation(Math.PI / 2);
    this.arrowDown = this.addImage(baseX, baseY + offset, 'arrow')
      .setOrigin(0.5)
      .setScale(arrowScale)
      .setRotation(-Math.PI / 2);
    this.arrowLeft = this.addImage(baseX - offset, baseY, 'arrow')
      .setOrigin(0.5)
      .setScale(arrowScale)
      .setRotation(0);
    this.arrowRight = this.addImage(baseX + offset, baseY, 'arrow')
      .setOrigin(0.5)
      .setScale(arrowScale)
      .setRotation(Math.PI);
    // Keep controls above other UI and fixed to camera BEFORE making them interactive
    this.circleBase.setDepth(100).setScrollFactor(0);
    [this.arrowUp, this.arrowDown, this.arrowLeft, this.arrowRight].forEach((a) => a?.setDepth(101).setScrollFactor(0));
    
    // Make arrows interactive with default hit areas
    [this.arrowUp, this.arrowDown, this.arrowLeft, this.arrowRight].forEach((a) => a?.setInteractive());
    
    const press = (key: keyof typeof this.touchKeys, down: boolean) => {
      this.touchKeys[key] = down;
    };
    const addEvents = (img: Phaser.GameObjects.Image | undefined, key: keyof typeof this.touchKeys) => {
      if (!img) return;
      img.on('pointerdown', () => {
        // Only respond if this direction is currently allowed
        if (!this.allowedDirections[key]) return;
        press(key, true);
        img.setTint(0xdddddd);
      });
      img.on('pointerup', () => {
        press(key, false);
        img.clearTint();
      });
      img.on('pointerout', () => {
        press(key, false);
        img.clearTint();
      });
      img.on('pointerupoutside', () => {
        press(key, false);
        img.clearTint();
      });
    };
    addEvents(this.arrowUp, 'up');
    addEvents(this.arrowDown, 'down');
    addEvents(this.arrowLeft, 'left');
    addEvents(this.arrowRight, 'right');
    // Initialize visual state based on current allowedDirections
    this.updateMobileControlsInteractivity();
  }  update(_time: number, delta: number) {
    if (!this.hero) return;
    if (this.monster && this.monsterPath.length >= 2) {
      const dtSec = delta / 1000;
      const target = this.monsterPath[this.monsterPathIndex];
      const tx = this.getScaledValue(target.x);
      const ty = this.getScaledValue(target.y);
      const dx = tx - this.monster.x;
      const dy = ty - this.monster.y;
      const dist = Math.hypot(dx, dy);
      const arrive = this.getScaledValue(4);
      if (dist <= arrive) {
        this.monsterPathIndex = (this.monsterPathIndex + 1) % this.monsterPath.length;
      } else if (dist > 0) {
        const monsterSpeed = this.getScaledValue(CONFIG.TUTORIAL_MONSTER_SPEED);
        const vx = (dx / dist) * monsterSpeed;
        const vy = (dy / dist) * monsterSpeed;
        this.monster.x += vx * dtSec;
        this.monster.y += vy * dtSec;
      }
    }
    const steps = this.getSteps();
    const cur = steps[this.currentStepIndex];
    if (cur && cur.type === 'final') {
      if (this.hero.anims.currentAnim?.key !== 'hero_stand') {
        this.hero.anims.play('hero_stand');
      }
      return;
    }
    const dt = delta / 1000;
    let vx = 0,
      vy = 0;
    const want = (dir: keyof typeof this.touchKeys, key?: Phaser.Input.Keyboard.Key) =>
      this.allowedDirections[dir] && ((key && key.isDown) || this.touchKeys[dir]);
    if (want('left', this.cursors?.left)) vx -= 1;
    if (want('right', this.cursors?.right)) vx += 1;
    if (want('up', this.cursors?.up)) vy -= 1;
    if (want('down', this.cursors?.down)) vy += 1;
    const moving = vx !== 0 || vy !== 0;
    const heroSpeed = this.getScaledValue(CONFIG.PLAYER_BASE_SPEED);
    if (moving) {
      const len = Math.hypot(vx, vy) || 1;
      vx /= len;
      vy /= len;
      this.hero.x += vx * heroSpeed * dt;
      this.hero.y += vy * heroSpeed * dt;
      if (vx !== 0) this.hero.setFlipX(vx < 0);
      if (this.hero.anims.currentAnim?.key !== 'hero_run') this.hero.anims.play('hero_run', true);
    } else if (this.hero.anims.currentAnim?.key !== 'hero_stand') {
      this.hero.anims.play('hero_stand', true);
    }
    if (this.playfield) {
      this.hero.x = Phaser.Math.Clamp(
        this.hero.x,
        this.getScaledValue(this.playfield.left + 20),
        this.getScaledValue(this.playfield.left + this.playfield.width - 20),
      );
      this.hero.y = Phaser.Math.Clamp(
        this.hero.y,
        this.getScaledValue(this.playfield.top + 20),
        this.getScaledValue(this.playfield.top + this.playfield.height - 20),
      );
    } else {
      const pad = 40;
      this.hero.x = Phaser.Math.Clamp(
        this.hero.x,
        this.getScaledValue(pad),
        this.getScaledValue(this.display.width - pad),
      );
      this.hero.y = Phaser.Math.Clamp(
        this.hero.y,
        this.getScaledValue(pad),
        this.getScaledValue(this.display.height - pad),
      );
    }
    this.checkProgress();

    // Update mute button icon
    if (this.muteBtn) {
      const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
      if (this.audioManager.getIsAllMuted()) {
        muteBtnItem.setTexture('icon_mute');
      } else {
        muteBtnItem.setTexture('icon_unmute');
      }
    }
  }

  private goBack() {
    const inIframe = this.isInsideIframe();
    if (this.parentScene === 'GameScene') {
      if (inIframe) {
        // Reset iframe label back to "Game" when returning
        window.parent.postMessage({ 
          type: 'UPDATE_IFRAME_LABEL', 
          label: 'GameScene' 
        }, '*');
      }
      this.audioManager.stopAllSoundEffects();
      this.audioManager.playBackgroundMusic('bg-music', true);
      this.scene.resume('GameScene');
      this.scene.stop();
    } else {
      this.scene.stop();
      this.scene.start('MainMenu');
    }
  }

  private createNumberContainer(x: number, y: number, value: number | string, size: number) {
    const container = this.add.container(this.getScaledValue(x), this.getScaledValue(y));
    const rock = this.addImage(0, 0, 'rock');
    const scaleBoost = CONFIG.ROCK_SCALE_BOOST;
    const rockScale = ((size * 2.5) / Math.max(rock.width, rock.height)) * scaleBoost;
    rock.setScale(rockScale);
    container.add(rock);
    const breathDuration = Phaser.Math.Between(CONFIG.ROCK_BREATH_MIN_MS, CONFIG.ROCK_BREATH_MAX_MS);
    const breathDelay = Phaser.Math.Between(0, CONFIG.ROCK_BREATH_DELAY_MAX_MS);
    const amp = CONFIG.ROCK_BREATH_SCALE_AMP_MIN + Math.random() * CONFIG.ROCK_BREATH_SCALE_AMP_EXTRA;
    this.tweens.add({
      targets: rock,
      duration: breathDuration,
      delay: breathDelay,
      scaleY: this.getScaledValue(rockScale * amp),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    // Fractions: render stacked using ExpressionUtils similar to Game scene
    const isFraction = typeof value === 'string' && /\d+\/\d+/.test(value);
    if (isFraction) {
      const frac = parseFraction(value as string);
      if (frac) {
        const [num, den] = frac;
        const baseFontSize = 18;
        const expr = new ExpressionUtils(this, 0, 0, `${num}/${den}`, {
          font: `700 ${baseFontSize}px Exo`,
          fontColor: 0xffffff,
          spacing: 6,
          fractionLinePadding: 14,
          alignment: 'center',
        });
        const exprContainer = expr.getContainer();
        const bounds = exprContainer.getBounds();
        const maxForRock = rock.displayWidth * 0.75;
        let scaleFactor = 1;
        if (bounds.width > 0 && bounds.width > maxForRock) scaleFactor = maxForRock / bounds.width;
        exprContainer.setScale(scaleBoost * 0.8 * scaleFactor);
        container.add(exprContainer);
      } else {
        const fallback = this.addText(0, 2, value.toString(), {
          font: '700 30px Exo',
          color: '#ffffff',
        }).setOrigin(0.5);
        fallback.setScale(scaleBoost);
        container.add(fallback);
      }
    } else {
      const numberText = this.addText(0, 2, value.toString(), {
        font: '700 30px Exo',
        color: '#ffffff',
      }).setOrigin(0.5);
      numberText.setScale(scaleBoost);
      container.add(numberText);
    }
    return container;
  }

  private ensureHeroAnimations() {
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
  }

  private getSteps(): Array<{ key: string; auto?: number; type: 'info' | 'moveFirst' | 'moveSecond' | 'final' }> {
    // Dynamic first step: objective sentence derived from mechanic id.
    let firstKey = 'tutorial.step1';
    if (this.mechanicId) {
      firstKey = this.buildDynamicObjectiveKey();
    }
    return [
      { key: firstKey, auto: 4000, type: 'info' },
      { key: this.isMobile ? 'tutorial.step2Mobile' : 'tutorial.step2Desktop', auto: 4200, type: 'info' },
      { key: 'tutorial.step3', type: 'moveFirst' },
      { key: 'tutorial.step4', type: 'moveSecond' },
      { key: 'tutorial.step5', type: 'final' },
    ];
  }

  private buildDynamicObjectiveKey(): string {
    // Build a dynamic sentence; we insert raw text instead of a translation key by returning a pseudo-key with spaces.
    const prefix = i18n.t('tutorial.objectivePrefix');
    const tail = i18n.t(`tutorial.objective.${this.mechanicId}`);
    if (prefix && tail) {
      return `${prefix} ${tail}.`;
    }
    return 'tutorial.step1';
  }

  private startStep(index: number) {
    const steps = this.getSteps();
    if (index >= steps.length) return;
    this.currentStepIndex = index;
    if (index === 0) {
      this.collectedFirst = false;
      this.collectedSecond = false;
      if (this.playButton) {
        this.playButton.destroy();
        this.playButton = undefined;
      }
    }
    const step = steps[index];
    this.stepAutoTimer?.remove(false);
    this.stopPulse();
    this.configureDirections(step.type);
    // Special-case: for fractions (eqHalf/eqQuarter) render stacked fraction for step1
    const isFractionObjective = index === 0 && (this.mechanicId === 'eqHalf' || this.mechanicId === 'eqQuarter');
    if (!isFractionObjective && this.dynamicInstructionContainer) {
      this.dynamicInstructionContainer.destroy();
      this.dynamicInstructionContainer = undefined;
      if (this.instructionText) {
        this.instructionText.setText('');
        const overlay = this.instructionText.getData('overlay') as TextOverlay;
        if (overlay) overlay.updateContent('');
      };
    }
    if (isFractionObjective) {
      this.showFractionObjective(this.mechanicId === 'eqHalf' ? '1/2' : '1/4');
    } else {
      this.updateInstructionText(step.key);
      this.destroyTimers();
      if(step.key === 'tutorial.step4') {
        // clear directions
        this.allowedDirections = { up: false, down: false, left: false, right: false };
        // Play step4_2 after some delay
        const lang = i18n.getLanguage() || 'en';
        const delay = lang === 'en' ? 5250 : 8000;
        const timer = this.time.delayedCall(delay, () => {
            this.configureDirections(step.type);
            this.updateInstructionText('tutorial.step4_2');
        });
        this.delayedCalls.push(timer);
      }
    }
    this.applyHighlight(step.type);
    this.playStepAudio(index);
  // Accessibility focus: move focus to the relevant target but keep both focusable throughout
  if (step.type === 'moveFirst' && this.firstTargetOverlay) {
      try {
    // Keep both focusable; just move focus to the current target
    this.firstTargetOverlay.element.removeAttribute('aria-hidden');
    this.firstTargetOverlay.element.tabIndex = 0;
        this.firstTargetOverlay.focus();
        const label = this.firstTargetOverlay.element.getAttribute('aria-label') || i18n.t('tutorial.step3');
        announceToScreenReader(label, 'polite');
      } catch {}
  } else if (step.type === 'moveSecond' && this.secondTargetOverlay) {
      try {
    // Keep both focusable; just move focus to the current target
    this.secondTargetOverlay.element.removeAttribute('aria-hidden');
    this.secondTargetOverlay.element.tabIndex = 0;
        this.secondTargetOverlay.focus();
        const label = this.secondTargetOverlay.element.getAttribute('aria-label') || i18n.t('tutorial.step4');
        announceToScreenReader(label, 'polite');
      } catch {}
    }
    if (step.auto) {
      this.stepAutoTimer = this.time.delayedCall(step.auto, () => this.advanceStep());
    }
    if (step.type === 'final') {
      if (!this.playButton) this.createPlayButton();
      if (this.hero && this.hero.anims.currentAnim?.key !== 'hero_stand') {
        this.hero.anims.play('hero_stand');
      }
    }
  }

  private showFractionObjective(fracStr: string) {
    // Remove any previous dynamic container
    if (this.dynamicInstructionContainer) {
      this.dynamicInstructionContainer.destroy();
    }
    if (!this.instructionText) return;
    // Build a container centered where instructionText normally is
    const x = this.instructionText.x;
    const y = this.instructionText.y;
    // Prefix text
    const prefix = i18n.t('tutorial.objectivePrefix') || '';
    const prefixText = this.addText(0, 0, prefix + ' ', { font: '600 28px Exo', color: '#ffffff' }).setOrigin(0.5);
    // Expression for fraction
    let exprStr = fracStr;
    if (fracStr === '1/2') {
      exprStr = i18n.t('tutorial.objective.eqHalf');
    } else if (fracStr === '1/4') {
      exprStr = i18n.t('tutorial.objective.eqQuarter');
    }
    exprStr += '.';
    const expr = new ExpressionUtils(this, 0, 0, exprStr, {
      font: '700 28px Exo',
      fontColor: 0xffffff,
      spacing: 6,
      fractionLinePadding: 14,
      alignment: 'center',
    });
    const exprContainer = expr.getContainer();
    // Create wrapper container and position
    const wrap = this.add.container(x, y);
    wrap.setDepth(60);
    wrap.add([prefixText, exprContainer]);
    // Layout: move prefix left and expr to right
    const lang = i18n.getLanguage() || 'en';
    const gap = this.getScaledValue(lang === 'en' ? 9 : 12);
    const totalWidth = prefixText.displayWidth + exprContainer.displayWidth + 2 * gap;
    prefixText.x = -(totalWidth / 2 + gap);
    exprContainer.x = totalWidth / 2 + gap;
    wrap.setName('ruleText');
    this.dynamicInstructionContainer = wrap;
    // Hide original instructionText
    this.instructionText.setText('');
    const overlay = this.instructionText.getData('overlay') as TextOverlay;
    if (overlay) overlay.updateContent('');
  }

  private advanceStep() {
    this.startStep(this.currentStepIndex + 1);
  }

  private updateInstructionText(key: string) {
    if (!this.instructionText) return;
    // If key contains spaces (dynamic sentence) use directly, else translate.
    const newText = key.includes(' ') ? key : i18n.t(key) || key;
    this.instructionText.alpha = 0;
    this.instructionText.setText(newText);
    const overlay = this.instructionText.getData('overlay') as TextOverlay;
    if (overlay) overlay.updateContent(newText);
    this.tweens.add({ targets: this.instructionText, alpha: 1, duration: 350 });
  }

  private configureDirections(type: string) {
    this.allowedDirections = { up: false, down: false, left: false, right: false };
    if (type === 'info') return;
    if (type === 'moveFirst') {
      this.allowedDirections.right = true;
    } else if (type === 'moveSecond') {
      this.allowedDirections.up = true;
    } else if (type === 'final') {
      this.allowedDirections = { up: true, down: true, left: true, right: true };
    }
    // Reflect interactivity on mobile arrows
    this.updateMobileControlsInteractivity();
  }

  // Update visual state of mobile controls to match allowedDirections
  // Interactivity stays on, but event handler checks allowedDirections before responding
  private updateMobileControlsInteractivity() {
    if (!this.isMobile) return;
    const setState = (img: Phaser.GameObjects.Image | undefined, enabled: boolean) => {
      if (!img) return;
      // Only visual change - interactivity remains active
      img.setAlpha(enabled ? 1 : 0.45);
    };
    setState(this.arrowUp, this.allowedDirections.up);
    setState(this.arrowDown, this.allowedDirections.down);
    setState(this.arrowLeft, this.allowedDirections.left);
    setState(this.arrowRight, this.allowedDirections.right);
  }  private applyHighlight(type: string) {
    if (type === 'moveFirst' && this.firstTarget) {
      this.startPulse(this.firstTarget);
    } else if (type === 'moveSecond' && this.secondTarget) {
      this.startPulse(this.secondTarget);
    }
  }

  private startPulse(target: Phaser.GameObjects.Container) {
    this.stopPulse();
    this.stepPulse = this.tweens.add({
      targets: target,
      scale: { from: target.scale, to: target.scale * 1.18 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  private stopPulse() {
    if (this.stepPulse) {
      this.stepPulse.stop();
      this.stepPulse = undefined;
    }
  }

  private checkProgress() {
    const steps = this.getSteps();
    const step = steps[this.currentStepIndex];
    if (!step || !this.hero) return;
    if (step.type === 'moveFirst' && this.firstTarget && !this.collectedFirst) {
      const heroLogicalSize = CONFIG.PLAYER_SIZE;
      const numberLogicalSize = Math.floor(CONFIG.NUMBER_ROCK_SIZE * 1.25);
      const triggerDist = this.getScaledValue(heroLogicalSize + numberLogicalSize);
      if (
        Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.firstTarget.x, this.firstTarget.y) <
        triggerDist
      ) {
        this.collectedFirst = true;
        this.animateCollected(this.firstTarget, true);
        this.stopPulse();
        this.advanceStep();
      }
    } else if (step.type === 'moveSecond' && this.secondTarget && !this.collectedSecond) {
      const heroLogicalSize = CONFIG.PLAYER_SIZE;
      const numberLogicalSize = Math.floor(CONFIG.NUMBER_ROCK_SIZE * 1.25);
      const triggerDist = this.getScaledValue(heroLogicalSize + numberLogicalSize);
      if (
        Phaser.Math.Distance.Between(this.hero.x, this.hero.y, this.secondTarget.x, this.secondTarget.y) <
        triggerDist
      ) {
        this.collectedSecond = true;
        this.animateCollected(this.secondTarget, true);
        this.stopPulse();
        this.advanceStep();
      }
    }
  }

  private animateCollected(target: Phaser.GameObjects.Container, isTarget: boolean) {
    const container: any = target as any;
    const rock: Phaser.GameObjects.Image | undefined = container.list.find((o: any) => o.texture?.key === 'rock');
    const label: Phaser.GameObjects.Text | undefined = container.list.find(
      (o: any) => o instanceof Phaser.GameObjects.Text,
    );
    if (!rock) return;
    this.tweens.getTweensOf(rock).forEach((t) => t.stop());
    if (isTarget) {
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
          this.tweens.add({
            targets: [rock, label].filter(Boolean) as any,
            duration: 230,
            scaleX: 0,
            scaleY: 0,
            ease: 'Quad.In',
            onComplete: () => {
              target.destroy(true);
            },
          });
        },
      });
    } else {
      // Fallback fade if ever needed
      this.tweens.add({ targets: target, alpha: 0.3, duration: 200 });
    }
  }

  private playStepAudio(stepIndex: number) {
    const lang = (i18n.getLanguage && i18n.getLanguage()) || 'en';
    const suffix = lang.startsWith('es') ? 'es' : 'en';
    // Dynamic first step audio: step1_<mechanicId>_<lang>.mp3 stored under assets/audios/tutorial/step1
    if (stepIndex === 0 && this.mechanicId) {
      const dynamicKey = `step1_${this.mechanicId}_${suffix}`; // filename & cache key
      const already = (this.cache.audio as any).entries.has(dynamicKey);
      const fallbackKey = `tut_step1_${suffix}`;
      const playLoaded = (k: string) => {
        if (this.currentStepVoice && this.currentStepVoice.isPlaying) {
          this.currentStepVoice.stop();
        }
        const playNow = () => {
          this.currentStepVoice = this.audioManager.playSoundEffect(k);
        };
        if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, playNow);
        else playNow();
      };
      const tryPlayDynamic = () => {
        if ((this.cache.audio as any).entries.has(dynamicKey)) playLoaded(dynamicKey);
        else playLoaded(fallbackKey);
      };
      if (already) {
        tryPlayDynamic();
      } else {
        // Attempt to load; if missing, loader complete still fires and we'll fallback.
        this.load.setPath('assets/audios/tutorial/step1');
        this.load.audio(dynamicKey, `${dynamicKey}.mp3`);
        this.load.once(Phaser.Loader.Events.COMPLETE, () => tryPlayDynamic());
        this.load.start();
      }
      return;
    }
    const key = (() => {
      switch (stepIndex) {
        case 0:
          return `tut_step1_${suffix}`; // no mechanic id
        case 1:
          return this.isMobile ? `tut_step2_${suffix}_mobile` : `tut_step2_${suffix}`;
        case 2:
          return `tut_step3_${suffix}`;
        case 3:
          return `tut_step4_${suffix}`;
        case 4:
          return `tut_step5_${suffix}`;
        default:
          return undefined;
      }
    })();
    if (!key) return;
    if (this.currentStepVoice && this.currentStepVoice.isPlaying) {
      this.currentStepVoice.stop();
    }
    const playNow = () => {
      this.currentStepVoice = this.audioManager.playSoundEffect(key);
    };
    if (this.sound.locked) this.sound.once(Phaser.Sound.Events.UNLOCKED, playNow);
    else playNow();
  }

  private destroyTimers() {
    this.delayedCalls.forEach((timer) => timer.destroy());
    this.delayedCalls = [];
  }

  private createMuteButton(): void {
    this.muteBtn = ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: 'icon_unmute',
      label: i18n.t('common.mute'),
      x: this.display.width - 60,
      y: 180,
      onClick: () => {
        this.audioManager.setMute(!this.audioManager.getIsAllMuted());
      },
    });
  }

  private createVolumeControls(): void {
    this.volumeSlider = new VolumeSlider(this);
    this.volumeSlider.create(this.display.width - 215, 278, 'blue', i18n.t('common.volume'));
    
    ButtonHelper.createIconButton({
      scene: this,
      imageKeys: {
        default: 'icon_btn_default',
        hover: 'icon_btn_hover',
        pressed: 'icon_btn_pressed',
      },
      icon: 'icon_settings',
      label: i18n.t('common.volume'),
      x: this.display.width - 60,
      y: 270,
      onClick: () => {
        this.volumeSlider.toggleControl();
      },
    });
  }
}

