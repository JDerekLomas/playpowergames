import { BaseScene, ButtonHelper, i18n, VolumeSlider, ScoreHelper, ScoreCoins, GameConfigManager, ButtonOverlay, TextOverlay, announceToScreenReader, focusToGameContainer, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, FACT_RACER_POSITIONS } from '../config/common';
import { FactMasteryItem, MathFact, MathFactTagKey, MultiverseQuestionSelector, StudentResponse, topicToTagsMapping, withinFilter, getBonusMultiverseTagsByMode, g5_g6Filter } from '@k8-games/sdk/multiverse';
import { Starfield } from '../effects/Starfield';
import { continueGameAfterWrongAnswer } from '../utils/helper';

const TOTAL_QUESTIONS = 10;

export type FactRacerMode = 'game' | 'instructions';

interface FactRacerOptions { mode: FactRacerMode; fromSplashScene?: boolean; }

interface ScoreboardLaunchData {
  rounds: number;
  totalRounds: number;
  score: number;
  rankings: PlayerRanking[];
}

interface PlayerRanking {
  name: string;
  spaceship: string;
  x: number;
  isUser?: boolean;
}

export class FactRacerMechanic {
  private scene: BaseScene;
  private mode: FactRacerMode;
  private isMobile: boolean = false;
  private fromSplashScene: boolean = false;

  private questionSelector: MultiverseQuestionSelector | null = null;
  private tagKeys: MathFactTagKey[] = [];
  private topic: string = '';
  private paramMode: string | null = null;

  private currentQuestionRaw: MathFact | null = null;
  private currentAnswer = '';
  private startTime = 0;
  private answeredCount = 0;
  private scoreHelper: ScoreHelper = new ScoreHelper(1);

  private questionContainer!: Phaser.GameObjects.Container;
  // Two-section layout containers
  private questionSectionContainer!: Phaser.GameObjects.Container;
  private answerSectionContainer!: Phaser.GameObjects.Container;
  // Answer visuals inside answer section
  // Announcement queue system
  private announcementQueue: string[] = [];
  private isAnnouncing: boolean = false;
  private instructionStepOverlay?: TextOverlay;
  private questionTextOverlay?: TextOverlay;

  private firstValueText?: Phaser.GameObjects.Text;
  private secondValueText?: Phaser.GameObjects.Text;
  private operatorText?: Phaser.GameObjects.Text;
  private equalsSymbolText?: Phaser.GameObjects.Text;
  private answerInputText: Phaser.GameObjects.Text[] = [];
  private answerCommaText: Phaser.GameObjects.Text[] = [];
  private answerBox?: Phaser.GameObjects.Graphics;
  private answerBoxCoordinates = { x: 0, y: 0 };
  private answerBoxCenterX = 0; // Store center X for dynamic decimal box growth
  // (legacy, no longer used for positioning) kept for safety if referenced elsewhere
  private arrows: Record<string, Phaser.GameObjects.Image> = {};
  private nitro: Record<string, Phaser.GameObjects.Sprite> = {};

  private muteBtn!: Phaser.GameObjects.Container;
  private volumeSlider!: VolumeSlider;
  private scoreCoins!: ScoreCoins;

  private howToPlayText?: Phaser.GameObjects.Text;
  // Instruction mode custom flow
  private instructionStep = 0; // 0 intro (no input), 1 typing (input enabled), 2 progress demo (no input), 3 final play prompt
  private placeholderPulseTween?: Phaser.Tweens.Tween;
  private keyboardHandler?: (event: KeyboardEvent) => void;
  private gridLinesImage?: Phaser.GameObjects.Image;
  private endPlayButton?: Phaser.GameObjects.Container;
  private starfield?: Starfield;
  // Dynamic alignment helpers (track placeholder shift due to centering)
  // Removed dynamic placeholder alignment; keep fields unused for compatibility
  private currentPlaceholder?: Phaser.GameObjects.Image;
  // One-time boot effect flag
  private bootEffectPlayed = false;
  private feedbackOverlay?: Phaser.GameObjects.Image;
  // Mobile number pad
  private numberPadContainer?: Phaser.GameObjects.Container;
  private numberButtons: Phaser.GameObjects.Container[] = [];
  private backspaceButton?: Phaser.GameObjects.Container;
  private decimalButton?: Phaser.GameObjects.Container;
  private negativeButton?: Phaser.GameObjects.Container;
  private enterButton?: Phaser.GameObjects.Container;
  // Audio management for tutorial
  private currentStepAudio?: Phaser.Sound.BaseSound;
  private isDestroyed = false;
  // Timer tracking for cleanup
  private tutorialTimers: Phaser.Time.TimerEvent[] = [];
  // Lock input once an answer of expected length is submitted or while showing correct answer
  private isAnswerLocked = false;
  private isVerticalLayout = false;
  private userProgressRatio = 0;
  private aiRotationIndex = 0;
  private isTypingAnswer = false;
  private lastTypedAt = 0;
  private readonly TYPING_TIMEOUT = 2000; // ms, adjust if needed

  private analyticsHelper!: AnalyticsHelper;

  constructor(scene: BaseScene, options: FactRacerOptions) {
    this.scene = scene;
    this.mode = options.mode;
    this.fromSplashScene = options.fromSplashScene || false;

    const gameConfigManager = GameConfigManager.getInstance();
    this.topic = gameConfigManager.get('topic') || 'grade2_topic3';
    this.tagKeys = topicToTagsMapping[this.topic];
    this.paramMode = gameConfigManager.get('mode') || null;
    if ((this.topic === 'g5_g6' || this.topic === 'g7_g8') && this.paramMode) {
      this.tagKeys = getBonusMultiverseTagsByMode(this.topic, this.paramMode);
    }

    if (!this.questionSelector) {
      this.questionSelector = new MultiverseQuestionSelector(this.tagKeys);
    }
  }

  static _preload(scene: BaseScene) {
    scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
    // Layered background assets
    scene.load.image('background_layer', 'background.png');

    // Load all foreground variants to support dynamic switching
    scene.load.image('foreground_layer', 'foreground.png');
    scene.load.image('foreground_mobile', 'foreground_mobile.png');
    scene.load.image('foreground_tutorial', 'foreground_tutorial.png');
    scene.load.image('foreground_tutorial_mobile', 'foreground_tutorial_mobile.png');

    // Load all grid_lines variants to support dynamic switching
    scene.load.image('grid_lines', 'grid_lines.png');
    scene.load.image('grid_lines_mobile', 'grid_lines_mobile.png');
    scene.load.image('grid_lines_tutorial', 'grid_lines.png');
    scene.load.image('grid_lines_tutorial_mobile', 'grid_lines_tutorial_mobile.png');

    scene.load.image('single_digit_placeholder', 'single_digit_placeholder.png');
    scene.load.image('single_digit_placeholder_correct', 'single_digit_placeholder_correct.png');
    scene.load.image('single_digit_placeholder_wrong', 'single_digit_placeholder_wrong.png');
    scene.load.image('two_digit_placeholder', 'two_digit_placeholder.png');
    scene.load.image('two_digit_placeholder_correct', 'two_digit_placeholder_correct.png');
    scene.load.image('two_digit_placeholder_wrong', 'two_digit_placeholder_wrong.png');
    // scene.load.image('answer_bg', 'answer_bg.png');
    // scene.load.image('user_arrow', 'user_arrow.png');
    // scene.load.image('orange_arrow', 'orange_arrow.png');
    // scene.load.image('yellow_arrow', 'yellow_arrow.png');
    // scene.load.image('purple_arrow', 'purple_arrow.png');
    scene.load.image('cyan_spaceship', 'cyan_spaceship.png');
    scene.load.image('purple_spaceship', 'purple_spaceship.png');
    scene.load.image('red_spaceship', 'red_spaceship.png');
    scene.load.image('blue_spaceship', 'blue_spaceship.png');
    scene.load.image('tutorial_banner_mobile', 'tutorial_banner_mobile.png');
    scene.load.image('continue_btn_bg', 'continue_btn_bg.png');

    // Load nitro assets
    scene.load.setPath(`${ASSETS_PATHS.ATLAS}/nitro`);
    scene.load.atlas('nitro', 'nitro.png', 'nitro.json');

    // Mobile number pad assets
    scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
    scene.load.image('number-pad-default', 'number-pad-default.png');
    scene.load.image('number-pad-hover', 'number-pad-hover.png');
    scene.load.image('number-pad-pressed', 'number-pad-pressed.png');
    scene.load.image('backspace', 'backspace.png');
    scene.load.image('enter', 'enter.png');

    // Feedback overlay assets
    scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
    scene.load.image('feedback_ring_correct', 'feedback_ring_correct.png');
    scene.load.image('feedback_ring_wrong', 'feedback_ring_wrong.png');

    scene.load.setPath(`${BUTTONS.PATH}`);
    scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
    scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
    scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
    scene.load.image(BUTTONS.ICON_BTN_DISABLED.KEY, BUTTONS.ICON_BTN_DISABLED.PATH);
    scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
    scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
    scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
    scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
    scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
    scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);

    // Load HALF_BUTTON assets from info_screen folder
    scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
    scene.load.image(BUTTONS.HALF_BUTTON.KEY, 'half_button_default.png');
    scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, 'half_button_hover.png');
    scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, 'half_button_pressed.png');

    // Reset path for other assets
    scene.load.setPath(`${BUTTONS.PATH}`);

    // Load tutorial step audio files (added step_4)
    const language = i18n.getLanguage() || 'en';
    scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
    scene.load.audio('step_1', `step_1_${language}.mp3`);
    scene.load.audio('step_2', `step_2_${language}.mp3`);
    scene.load.audio('step_3', `step_3_${language}.mp3`);
    scene.load.audio('step_4', `step_4_${language}.mp3`);

    // Game background music & sfx
    scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
    scene.load.audio('bg_music', 'bg-music.mp3');
    scene.load.audio('positive_sfx', 'positive.mp3');
    scene.load.audio('negative_sfx', 'negative.mp3');
    scene.load.audio('hologram_appear', 'hologram_appear.mp3');

    VolumeSlider.preload(scene, 'blue');
    ScoreCoins.preload(scene, 'blue');
  }

  init(reset?: boolean) {
    this.isMobile = this.scene.isTouchDevice();
    this.scene.audioManager.initialize(this.scene);
    this.answeredCount = 0;
    this.currentAnswer = '';
    this.currentQuestionRaw = null;
    this.startTime = 0;
    this.scoreHelper.reset();
    this.scoreHelper.setPlannedTotalQuestions(TOTAL_QUESTIONS);
    this.isAnswerLocked = false;
    this.userProgressRatio = 0;
    this.aiRotationIndex = Math.floor(Math.random() * 3);
    if (!this.questionSelector) {
      this.questionSelector = new MultiverseQuestionSelector(this.tagKeys);
    }
    if (reset) {
      this.questionSelector?.reset();
    }
    this.createNitroAnimations();
  }

  private getAssetKey(baseKey: string): string {
    // Get the appropriate asset key based on mode and device
    if (baseKey === 'foreground_layer') {
      if (this.mode === 'instructions' && this.isMobile) {
        return 'foreground_tutorial_mobile';
      } else if (this.mode === 'instructions') {
        return 'foreground_tutorial';
      } else if (this.isMobile) {
        return 'foreground_mobile';
      }
      return 'foreground_layer';
    }

    if (baseKey === 'grid_lines') {
      if (this.mode === 'instructions' && this.isMobile) {
        return 'grid_lines_tutorial_mobile'; // Smaller tutorial version for mobile
      } else if (this.mode === 'instructions') {
        return 'grid_lines_tutorial'; // Smaller tutorial version for desktop
      } else if (this.isMobile) {
        return 'grid_lines_mobile';
      }
      return 'grid_lines';
    }

    return baseKey;
  }

  create() {
    if (this.mode === 'game') {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
            if (this.topic === 'grade2_topic4') {
                this.analyticsHelper?.createSession('game.fact_racer.default');
            } else {
                this.analyticsHelper?.createSession('game.multiverse.fact_racer');
            }
        } else {
            console.error('AnalyticsHelper not found');
        }
    }

    // Layered Background
    this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'background_layer')
      .setOrigin(0.5)
      .setDepth(-2);
    // Animation layer (starfield) - only show in game mode, not tutorial
    if (this.mode !== 'instructions') {
      this.starfield = new Starfield(this.scene as BaseScene);
      this.starfield.create();
    }
    // Foreground frame/window - use appropriate asset based on mode and device
    this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, this.getAssetKey('foreground_layer'))
      .setOrigin(0.5)
      .setDepth(0);

    const questionY = this.scene.getScaledValue(this.getQuestionYUnscaled());
    this.questionContainer = this.scene
      .add.container(
        this.scene.getScaledValue(this.scene.display.width / 2),
        questionY
      )
      .setDepth(2);

    // Build two section containers inside questionContainer (positions are computed per-question using config)
    this.questionSectionContainer = this.scene.add.container(0, 0).setDepth(2);
    this.answerSectionContainer = this.scene.add.container(0, 0).setDepth(3);
    this.questionContainer.add([this.questionSectionContainer, this.answerSectionContainer]);

    // Side buttons only in game mode
    if (this.mode === 'game') {
      this.createScoreUI();
      this.createPauseButton();
      this.createMuteButton();
      this.createVolumeSlider();
      this.createHelpButton();
    }

    // Adjust depths for map and arrows
    if (this.gridLinesImage) this.gridLinesImage.setDepth(2);
    Object.values(this.arrows).forEach(a => a.setDepth(3));
    if (this.mode === 'instructions') {
      this.loadTutorialQuestion();
    } else {
      this.loadNextQuestion();
    }

    // Start background music only for game mode (not tutorial)
    if (this.mode === 'game') {
      // Avoid duplicate start
      this.scene.audioManager.playBackgroundMusic('bg_music');
      // Play boot flicker effect on grid lines once
      this.playGridBootEffect();
    }
    this.setupKeyboardEvents();

    // Create mobile number pad if on mobile device
    if (this.isMobile) {
      this.createMobileNumberPad();
    }

    // Instruction mode setup (new 4-step flow)
    if (this.mode === 'instructions') {
      this.createInstructionText(this.getInstructionLine(0));
      this.showInstructionLine(0, () => {
        // Safety check before advancing
        if (this.isDestroyed) return;

        // Advance to step 1 (enable input & pulse placeholder)
        this.instructionStep = 1;
        this.showInstructionLine(1, () => {
          // Safety check before proceeding
          if (this.isDestroyed) return;

          this.enableKeyboardInputForTutorial();
          this.startPlaceholderPulse();
          
          // Announce the tutorial question after step 1 instruction is complete
          if (this.currentQuestionRaw) {
            const q = this.extractQuestion(this.currentQuestionRaw);
            const fractionDigits = this.topic === 'grade6_topic1' ? 1 : 0;
            const formattedOperand1 = i18n.formatNumber(+q.operand1, { minimumFractionDigits: fractionDigits });
            const formattedOperand2 = i18n.formatNumber(+q.operand2, { minimumFractionDigits: fractionDigits });
            const operatorWord = this.getOperatorWord(q.operator);
            const questionText = `${formattedOperand1} ${operatorWord} ${formattedOperand2} equals`;
            
            // Queue question announcement after step 1 instruction
            this.queueAnnouncement(questionText);
          }
        });
      });
    }

    this.drawMap();

    // Resume handling
    this.scene.events.on('resume', () => {
      this.scene.audioManager.initialize(this.scene);
      this.scene.audioManager.playBackgroundMusic('bg_music');
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
    
      // If the player is currently entering an answer, intercept Enter
      if (this.isUserEnteringAnswer() && !this.isAnswerLocked) {
        event.preventDefault();
        event.stopPropagation();
    
        // lock and submit
        this.isAnswerLocked = true;
        // reset typing flags so repeated Enter won't re-submit
        this.isTypingAnswer = false;
        this.lastTypedAt = 0;
    
        this.checkAnswer();
      }
      // else: do nothing, let focused element handle Enter normally
    }, true); // capture = true so this runs before buttons
  }

  update() {
    // Update starfield animation (only if not in tutorial mode)
    if (this.mode !== 'instructions') {
      this.starfield?.update();
    }
    if (this.muteBtn) {
      const icon = this.muteBtn.getAt(1) as Phaser.GameObjects.Image;
      if (this.scene.audioManager.getIsAllMuted()) {
        icon.setTexture(BUTTONS.MUTE_ICON.KEY);
      } else {
        icon.setTexture(BUTTONS.UNMUTE_ICON.KEY);
      }

      // Update mute button state
      const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
      const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
      const muteBtnState = this.muteBtn.getData('state');
      if(muteBtnState != label) {
          this.muteBtn.setData('state', label);
          overlay.setLabel(label);
      }
    }

    ['user', 'orange', 'yellow', 'purple'].forEach((key) => {
      const spaceship = this.arrows[key];
      const nitro = this.nitro[key];
      const positions = this.getPositionConfig()
      const gap = spaceship.displayWidth - this.scene.getScaledValue(17 * positions.arrows.SCALE);
      if (nitro.x !== spaceship.x - gap) {
        nitro.x = spaceship.x - gap;
      }
    })
  }

  // --- Internal helpers ---
  private UICleanup() {
    this.firstValueText?.destroy();
    this.secondValueText?.destroy();
    this.operatorText?.destroy();
    this.equalsSymbolText?.destroy();
    this.answerBox?.destroy();
    this.firstValueText = undefined;
    this.secondValueText = undefined;
    this.operatorText = undefined;
    this.equalsSymbolText = undefined;
    this.answerBox = undefined;
    this.answerBoxCoordinates = { x: 0, y: 0 };
    this.answerBoxCenterX = 0;
    this.answerInputText.forEach(t => t.destroy());
    this.answerInputText = [];
    this.answerCommaText.forEach(t => t.destroy());
    this.answerCommaText = [];

    if (this.questionTextOverlay) {
      this.questionTextOverlay = undefined;
    }
  }

  // --- Decimal helpers (similar to AdditionAdventure) ---
  private getDigitCount(value: string | number): number {
    if (this.topic === 'g7_g8') {
      return String(value).replace(/[^0-9\-−]/g, '').length;
    }
    return String(value).replace(/[^0-9]/g, '').length;
  }

  // Helper method to determine if comma should be added after a position
  private shouldAddCommaAfterPosition(position: number, totalDigits: number): boolean {
    // For 4+ digit numbers, add commas every 3 digits from the right
    // position is 0-indexed from left, totalDigits is total count
    const remainingDigits = totalDigits - position - 1;
    return remainingDigits > 0 && remainingDigits % 3 === 0;
  }

  private buildSlotDisplayStrings(raw: string, slotCount: number): string[] {
    const slots: string[] = new Array(slotCount).fill('');
    let slotIndex = 0;
    for (const ch of raw) {
      if (/^[0-9]$/.test(ch)) {
        if (slotIndex < slotCount) {
          slots[slotIndex] = ch;
          slotIndex++;
        }
      } else if (ch === '.') {
        if (slotIndex > 0 && !slots[slotIndex - 1].includes('.')) {
          slots[slotIndex - 1] = `${slots[slotIndex - 1]}.`;
        }
      } else if (ch === '-' && this.topic === 'g7_g8') {
        if (slotIndex === 0) {
          slots[slotIndex] = '−';
          slotIndex++;
        }
      }
    }
    return slots;
  }

  private loadQuestionContent(operand1: string, operator: string, operand2: string, answer: string) {
    if (!operand1 || !operator || !operand2 || !answer) return;
  
    this.UICleanup();
  
    const boxCenterX = this.scene.display.width / 2;
    const boxCenterY = this.getQuestionYUnscaled();
    const gap = 20;
    const fontStyle = { font: '700 50px Exo', color: '#ffffff', align: 'center' } as any;
    const fontStyleBlue = { font: '700 50px Exo', color: '#00CCFF', align: 'center' } as any;
    const ansFontSize = 50;
  
    const smallFontStyle = { font: '700 40px Exo', color: '#ffffff', align: 'center' } as any;
    const smallFontStyleBlue = { font: '700 40px Exo', color: '#00CCFF', align: 'center' } as any;
    const smallAnsFontSize = 40;
  
    const first = operand1;
    const second = operand2;
    const op = operator;
    const ans = answer;
  
    // Check if question involves decimals (operands or answer)
    const isDecimalQuestion = String(ans).includes('.') || String(first).includes('.') || String(second).includes('.');
    
    // Force vertical layout for decimal questions to prevent overlap when box grows
    const needsVerticalLayout = isDecimalQuestion || this.getDigitCount(first) > 2 || this.getDigitCount(second) > 2 || this.getDigitCount(ans) > 2;
    this.isVerticalLayout = needsVerticalLayout;
    if (needsVerticalLayout) {
      this.loadVerticalLayout(boxCenterX, boxCenterY, gap, smallFontStyle, smallFontStyleBlue, first, second, op, ans, smallAnsFontSize);
    } else {
      this.loadHorizontalLayout(boxCenterX, boxCenterY, gap, fontStyle, fontStyleBlue, first, second, op, ans, ansFontSize);
    }
    this.updateAnswerDisplay();
    
    // Create text overlay for the question
    this.createQuestionTextOverlay(first, op, second);
  }

  private createQuestionTextOverlay(operand1: string, operator: string, operand2: string) {
    // Clean up existing overlay
    if (this.questionTextOverlay) {
      this.questionTextOverlay = undefined;
    }
  
    // Format the question text for screen readers
    const fractionDigits = this.topic === 'grade6_topic1' ? 1 : 0;
    const formattedOperand1 = i18n.formatNumber(+operand1, { minimumFractionDigits: fractionDigits });
    const formattedOperand2 = i18n.formatNumber(+operand2, { minimumFractionDigits: fractionDigits });
    
    // Convert operator symbol to word for better screen reader experience
    const operatorWord = this.getOperatorWord(operator);
    
    const questionText = `${formattedOperand1} ${operatorWord} ${formattedOperand2} equals`;
  
    // Only create overlay and announce in game mode, not in tutorial mode
    // In tutorial mode, question will be announced by the tutorial flow
    if (this.mode === 'game' && this.firstValueText) {
      this.questionTextOverlay = new TextOverlay(this.scene, this.firstValueText, { 
        label: questionText,
        ariaLive: 'off' 
      });
      
      // Queue the announcement to happen after buttons and other overlays
      this.scene.time.delayedCall(100, () => {
        if (!this.isDestroyed) {
          this.queueAnnouncement(questionText);
        }
      });
    }
  }
  
  private getOperatorWord(operator: string): string {
    const operatorMap: Record<string, string> = {
      '+': i18n.t('common.plus') || 'plus',
      '−': i18n.t('common.minus') || 'minus',
      '-': i18n.t('common.minus') || 'minus',
      '×': i18n.t('common.times') || 'times',
      '÷': i18n.t('common.divided by') || 'divided by'
    };
    return operatorMap[operator] || operator;
  }

  private formatOperandWithBrackets(operand: string): string {
    if (Number(operand) < 0) {
      return `(${operand})`;
    }
    return operand;
  }

  private loadVerticalLayout(
    boxCenterX: number,
    boxCenterY: number,
    gap: number,
    fontStyle: any,
    fontStyleBlue: any,
    first: string,
    second: string,
    operator: string,
    answer: string,
    ansFontSize: number
  ) {
    const questionY = boxCenterY - 40;

    const fractionDigits = this.topic === 'grade6_topic1' ? 1 : 0;

    const formattedFirst = `${i18n.formatNumber(+first, { minimumFractionDigits: fractionDigits, }).replace('-', '−')}`;
    const formattedSecond = `${this.formatOperandWithBrackets(i18n.formatNumber(+second, { minimumFractionDigits: fractionDigits, })).replace('-', '−')}`;
    const renderedOperator = `${operator.replace('-', '−')}`;

    const tempText1 = this.scene.addText(0, 0, formattedFirst, fontStyle).setVisible(false);
    const tempText2 = this.scene.addText(0, 0, formattedSecond, fontStyle).setVisible(false);
    const tempOp = this.scene.addText(0, 0, renderedOperator, fontStyleBlue).setVisible(false);
    const questionWidth = tempText1.width + gap + tempOp.width + gap + tempText2.width;
    tempText1.destroy();
    tempText2.destroy();
    tempOp.destroy();

    let startX = boxCenterX - questionWidth / 2;

    this.firstValueText = this.scene.addText(startX, questionY, formattedFirst, fontStyle).setOrigin(0, 0.5);
    startX += this.firstValueText.width + gap;
    this.operatorText = this.scene.addText(startX, questionY, renderedOperator, fontStyleBlue).setOrigin(0, 0.5);
    startX += this.operatorText.width + gap;
    this.secondValueText = this.scene.addText(startX, questionY, formattedSecond, fontStyle).setOrigin(0, 0.5);

    // Check if question involves decimals (operands or answer)
    const isDecimal = String(answer).includes('.') || String(first).includes('.') || String(second).includes('.');
    const n = this.getDigitCount(answer);
    const boxHeight = 70;
    const borderPadding = 45;
    const gapWidth = 8; // must match updateAnswerBox
    const sidePadding = 22; // must match updateAnswerBox
    const underlineLength = 40; // must match updateAnswerBox
    
    // For decimal questions, start with a small box (1 digit) that will grow dynamically
    const boxWidth = isDecimal 
      ? underlineLength + borderPadding  // Start with 1 digit width
      : underlineLength * n + gapWidth * (n - 1) + borderPadding;
    
    const boxX = boxCenterX - boxWidth / 2;
    const boxY = boxCenterY + 30 - boxHeight / 2;
    this.answerBoxCoordinates = { x: boxX, y: boxY };
    this.answerBoxCenterX = boxCenterX; // Store center for dynamic resizing
    this.answerBox = this.scene.add.graphics();
    this.updateAnswerBox(0x00CCFF, true); // Pass true to indicate vertical layout

    this.currentAnswer = '';
    const scaledBoxY = boxY;
    const scaledBoxHeight = boxHeight;
    const textY = scaledBoxY + scaledBoxHeight / 2;

    if (isDecimal) {
      // For decimal answers, create a single centered text object at the box center
      const textObj = this.scene
        .addText(boxCenterX, textY, '', { font: `700 ${ansFontSize}px Exo`, color: '#00CCFF', align: 'center' })
        .setOrigin(0.5);
      this.answerInputText.push(textObj);
    } else {
      // For non-decimal answers, use the original multi-digit layout
      const singleLineLength = underlineLength;
      let currentX = boxX + sidePadding;
      for (let i = 0; i < n; i++) {
        const centerX = currentX + singleLineLength / 2;
        const textObj = this.scene
          .addText(centerX, textY, '', { font: `700 ${ansFontSize}px Exo`, color: '#00CCFF', align: 'center' })
          .setOrigin(0.5);
        this.answerInputText.push(textObj);
        currentX += singleLineLength + gapWidth;

        // Add comma after this digit if needed (for 4+ digit numbers)
        if (n >= 4 && this.shouldAddCommaAfterPosition(i, n)) {
          const commaX = currentX - gapWidth / 2;
          const commaObj = this.scene
            .addText(commaX, textY + 8, this.getGroupingSeparator(), {
              font: '400 32px Exo',
              color: '#00CCFF',
              align: 'center',
            })
            .setOrigin(0.5);
          this.answerCommaText.push(commaObj);
        }
      }
    }
  }

  private loadHorizontalLayout(
    boxCenterX: number,
    boxCenterY: number,
    gap: number,
    fontStyle: any,
    fontStyleBlue: any,
    first: string,
    second: string,
    operator: string,
    answer: string,
    ansFontSize: number
  ) {
    const y = boxCenterY;

    const fractionDigits = this.topic === 'grade6_topic1' ? 1 : 0;
    const formattedFirst = `${i18n.formatNumber(+first, { minimumFractionDigits: fractionDigits, }).replace('-', '−')}`;
    const formattedSecond = `${this.formatOperandWithBrackets(i18n.formatNumber(+second, { minimumFractionDigits: fractionDigits, })).replace('-', '−')}`;
    const renderedOperator = `${operator.replace('-', '−')}`;

    const tempText1 = this.scene.addText(0, 0, formattedFirst, fontStyle).setVisible(false);
    const tempText2 = this.scene.addText(0, 0, formattedSecond, fontStyle).setVisible(false);
    const tempOp = this.scene.addText(0, 0, renderedOperator, fontStyleBlue).setVisible(false);
    const tempEq = this.scene.addText(0, 0, '=', fontStyleBlue).setVisible(false);
    
    // Check if question involves decimals (operands or answer)
    const isDecimal = String(answer).includes('.') || String(first).includes('.') || String(second).includes('.');
    const n = this.getDigitCount(answer);
    const borderPadding = 55;
    const gapWidth = 8; // must match updateAnswerBox
    const sidePadding = 27; // must match updateAnswerBox
    const underlineLength = 40; // must match updateAnswerBox
    
    // For decimal questions, start with a small box (1 digit) that will grow dynamically
    const boxWidth = isDecimal 
      ? underlineLength + borderPadding  // Start with 1 digit width
      : underlineLength * n + gapWidth * (n - 1) + borderPadding;
    
    const totalWidth = tempText1.width + gap + tempOp.width + gap + tempText2.width + gap + tempEq.width + gap + boxWidth;
    tempText1.destroy();
    tempText2.destroy();
    tempOp.destroy();
    tempEq.destroy();

    let startX = boxCenterX - totalWidth / 2;
    this.firstValueText = this.scene.addText(startX, y, formattedFirst, fontStyle).setOrigin(0, 0.5);
    startX += this.firstValueText.width + gap;
    this.operatorText = this.scene.addText(startX, y, renderedOperator, fontStyleBlue).setOrigin(0, 0.5);
    startX += this.operatorText.width + gap;
    this.secondValueText = this.scene.addText(startX, y, formattedSecond, fontStyle).setOrigin(0, 0.5);
    startX += this.secondValueText.width + gap;
    this.equalsSymbolText = this.scene.addText(startX, y, '=', fontStyleBlue).setOrigin(0, 0.5);
    startX += this.equalsSymbolText.width + gap;

    const boxHeight = 85;
    const boxX = startX;
    const boxY = y - boxHeight / 2;
    
    // Store the center X position for decimal boxes
    const boxCenterXPos = boxX + (boxWidth / 2);
    this.answerBoxCoordinates = { x: boxX, y: boxY };
    this.answerBoxCenterX = boxCenterXPos; // Store center for dynamic resizing
    this.answerBox = this.scene.add.graphics();
    this.updateAnswerBox(0x00CCFF, false); // false for horizontal layout

    this.currentAnswer = '';
    const scaledBoxY = boxY;
    const scaledBoxHeight = boxHeight;
    const textY = scaledBoxY + scaledBoxHeight / 2;

    if (isDecimal) {
      // For decimal answers, create a single centered text object at the box center
      const textObj = this.scene
        .addText(boxCenterXPos, textY, '', { font: `700 ${ansFontSize}px Exo`, color: '#00CCFF', align: 'center' })
        .setOrigin(0.5);
      this.answerInputText.push(textObj);
    } else {
      // For non-decimal answers, use the original multi-digit layout
      const singleLineLength = underlineLength;
      let currentX = boxX + sidePadding;
      for (let i = 0; i < n; i++) {
        const centerX = currentX + singleLineLength / 2;
        const textObj = this.scene
          .addText(centerX, textY, '', { font: `700 ${ansFontSize}px Exo`, color: '#00CCFF', align: 'center' })
          .setOrigin(0.5);
        this.answerInputText.push(textObj);
        currentX += singleLineLength + gapWidth;

        // Add comma after this digit if needed (for 4+ digit numbers)
        if (n >= 4 && this.shouldAddCommaAfterPosition(i, n)) {
          const commaX = currentX - gapWidth / 2;
          const commaObj = this.scene
            .addText(commaX, textY, this.getGroupingSeparator(), {
              font: '700 28px Exo',
              color: '#00CCFF',
              align: 'center',
            })
            .setOrigin(0.5);
          this.answerCommaText.push(commaObj);
        }
      }
    }
  }

  private resetPlaceholderToDefault() {
    this.updateAnswerBox(0x00CCFF, this.isVerticalLayout);
  }

  private extractQuestion(raw: MathFact): { operand1: string; operand2: string; operator: string; answer: string } {
    const str = raw['question text'];
    // const str = '123800-200=123600';
    
    // Supported operators
    const operators = ['+', '−', '×', '÷', '-'];
    
    // Split on '=' to separate question from answer
    const [left, answer] = str.split('=').map((s) => s.trim());
    if (!left || answer === undefined) throw new Error('Invalid question format');
    
    // Remove all parentheses first
    const cleaned = left.replace(/[()]/g, '');
    
    // Find the operator (skip the first character to avoid leading negative)
    let operator = null;
    let operatorIndex = -1;
    
    for (let i = 1; i < cleaned.length; i++) {
        if (operators.includes(cleaned[i])) {
            operator = cleaned[i];
            operatorIndex = i;
            break;
        }
    }
    
    if (!operator || operatorIndex === -1) throw new Error('Operator not found in question string');
    
    // Split at the operator
    const operand1 = cleaned.substring(0, operatorIndex).trim();
    const operand2 = cleaned.substring(operatorIndex + 1).trim();
    
    if (!operand1 || !operand2) throw new Error('Invalid operands');
    
    return {
        operand1,
        operand2,
        operator,
        answer: answer.trim(),
    };
  }

  private loadNextQuestion(response?: StudentResponse) {
    let filter = undefined;
    if (this.topic === 'grade2_topic1') {
      filter = (fm: FactMasteryItem) => withinFilter(fm, 20, 10);
    } else if (this.topic === 'g5_g6') {
      filter = (fm: FactMasteryItem) => g5_g6Filter(fm);
    }
    if (this.topic === 'grade2_topic1') {
      this.currentQuestionRaw = response
        ? this.questionSelector?.getNextQuestionAddSub(response, filter) || null
        : this.questionSelector?.getNextQuestionAddSub(undefined, filter) || null;
    } else {
      this.currentQuestionRaw = response
        ? this.questionSelector?.getNextQuestion(response, filter) || null
        : this.questionSelector?.getNextQuestion(undefined, filter) || null;
    }
    if (!this.currentQuestionRaw) {
      this.gameOver();
      return;
    }
    const q = this.extractQuestion(this.currentQuestionRaw);
    this.loadQuestionContent(q.operand1, q.operator, q.operand2, q.answer);
    this.currentAnswer = '';
    this.isAnswerLocked = false;
    this.updateAnswerDisplay();
    this.startTime = Date.now();
  }

  private loadTutorialQuestion() {
    let question = null;
    if (this.topic === 'grade2_topic4') {
      question = { 'question text': '10 - 7 = 3' };
    } else if (this.topic === 'grade3_topic2' || this.topic === 'grade3_topic3') {
      question = { 'question text': '5 × 2 = 10' };
    } else if (this.topic === 'grade3_topic4') {
      question = { 'question text': '12 ÷ 2 = 6' };
    } else if (this.topic === 'grade4_topic2') {
      question = { 'question text': '1000 + 200 = 1200' };
    } else if (this.topic === 'grade5_topic3') {
      question = { 'question text': '1000 × 20 = 20000' };
    } else if (this.topic === 'grade6_topic1') {
      question = { 'question text': '1.0 − 0.4 = 0.6' };
    } else if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
      if (this.paramMode === 'add') {
        question = { 'question text': '70 + 80 = 150' };
      } else if (this.paramMode === 'sub') {
        question = { 'question text': '150 - 70 = 80' };
      } else if (this.paramMode === 'mul') {
        question = { 'question text': '7 × 9 = 63' };
      } else if (this.paramMode === 'div') {
        question = { 'question text': '56 ÷ 7 = 8' };
      } else {
        question = { 'question text': '70 + 80 = 150' };
      }
    } else {
      question = { 'question text': '5 + 3 = 8' };
    }
    this.currentQuestionRaw = question as MathFact;
    const q = this.extractQuestion(this.currentQuestionRaw);
    this.loadQuestionContent(q.operand1, q.operator, q.operand2, q.answer);
    this.currentAnswer = '';
    this.isAnswerLocked = false;
    this.updateAnswerDisplay();
    this.startTime = Date.now();
  }

  private updateAnswerDisplay() {
    if (!this.currentQuestionRaw) return;
    const q = this.extractQuestion(this.currentQuestionRaw);
    // Check if question involves decimals (operands or answer)
    const isDecimal = String(q.answer).includes('.') || String(q.operand1).includes('.') || String(q.operand2).includes('.');
    
    if (isDecimal) {
      // For decimal questions, display the full answer in the single text object
      if (this.answerInputText.length > 0) {
        this.answerInputText[0].setText(this.currentAnswer.replace('.', this.getDecimalSeparator()));
      }
      // Dynamically resize the box based on current input length (max 10 chars)
      this.resizeDecimalBox();
    } else {
      // For non-decimal questions, use the slot-based display
      const slotCount = this.getDigitCount(q.answer);
      const displayStrings = this.buildSlotDisplayStrings(this.currentAnswer, slotCount);
      for (let i = 0; i < this.answerInputText.length; i++) {
        this.answerInputText[i].setText(displayStrings[i] ?? '');
      }
    }
  }

  private resizeDecimalBox() {
    if (!this.currentQuestionRaw) return;
    
    // Calculate how many characters to show space for (minimum 1, maximum 10)
    const currentLength = Math.max(1, Math.min(10, this.currentAnswer.length || 1));
    
    // Constants matching the layout methods
    const borderPadding = this.isVerticalLayout ? 45 : 55;
    const underlineLength = 40; // Same width as non-decimal underscores
    
    // Calculate box width based on current input length
    // Divide underlineLength by 1.5 to make character width more compact and better fit the text
    const charWidth = underlineLength / 1.5;
    const boxWidth = (charWidth * currentLength) + borderPadding;
    
    // Recalculate box position to keep it centered
    const boxX = this.answerBoxCenterX - boxWidth / 2;
    const boxY = this.answerBoxCoordinates.y;
    
    // Update stored coordinates
    this.answerBoxCoordinates = { x: boxX, y: boxY };
    
    // Redraw the box with new dimensions
    this.updateAnswerBox(0x00CCFF, this.isVerticalLayout);
  }

  // Determine if backspace should be enabled in current state
  private canBackspace(expectedLength: number): boolean {
    return expectedLength > 0 && !this.isAnswerLocked && this.currentAnswer.length > 0;
  }

  // Toggle backspace availability on the mobile number pad (if present)
  // private setBackspaceEnabled(enabled: boolean) {
  //   if (!this.backspaceButton) return;
  //   const btn: any = this.backspaceButton as any;

  //   if (!btn.scene || !btn.scene.sys || btn.destroyed === true || btn.active === false) {
  //     return;
  //   }
  //   // Try ButtonHelper overlay API if available
  //   // const overlay = btn.buttonOverlay;
  //   // if (overlay && typeof overlay.setDisabled === 'function') {
  //   //   overlay.setDisabled(!enabled);
  //   // }
  //   // Fallback: adjust interactivity and alpha
  //   if (enabled) {
  //     this.backspaceButton.setAlpha(1);
  //     ButtonHelper.enableButton(this.backspaceButton);
  //   } else {
  //     this.backspaceButton.setAlpha(0.5);
  //     ButtonHelper.disableButton(this.backspaceButton);
  //   }
  // }

  private updateProgress(isCorrect: boolean, onComplete?: () => void) {
    // Use current config so tutorial (mobile/desktop) and game share logic.
    const positions = this.getPositionConfig();
    const startX = positions.arrows.X; // dynamic per mode/device
    const TRACK_DISTANCE = this.isMobile ? 545 : 525;

    this.playNitroAnimation(isCorrect);

    // Instructions mode: single-step movement to fixed ratios (user 15%, AIs 10%)
    if (this.mode === 'instructions') {
      const userTargetUnscaled = startX + TRACK_DISTANCE * 0.15;
      const aiTargetUnscaled = startX + TRACK_DISTANCE * 0.10;

      if (this.arrows.user) {
        this.scene.tweens.add({
          targets: this.arrows.user,
          x: this.scene.getScaledValue(userTargetUnscaled),
          duration: 500,
          ease: 'Power2',
          onComplete,
        });
      } else if (onComplete) {
        this.scene.time.delayedCall(500, onComplete);
      }

      ['orange', 'yellow', 'purple'].forEach((key) => {
        const arrow = (this.arrows as any)[key] as Phaser.GameObjects.Image | undefined;
        if (!arrow) return;
        this.scene.tweens.add({ targets: arrow, x: this.scene.getScaledValue(aiTargetUnscaled), duration: 500, ease: 'Power2' });
      });
      return;
    }

    // Step index (1..TOTAL_QUESTIONS) after this answer has been counted
    const stepIndex = this.answeredCount;
    const requiredCorrect = Math.ceil(0.7 * TOTAL_QUESTIONS); // 7 of 10
    const correctSoFar = this.scoreHelper.getCorrectAnswers();

    // Allocate 90% across the first 70% correct answers
    const basePortion = 0.9;
    const baseTarget = basePortion * Math.min(correctSoFar, requiredCorrect) / requiredCorrect;

    // Allocate remaining 10% across the remaining questions after threshold
    const reservePortion = 0.1;
    const reserveSteps = Math.max(1, TOTAL_QUESTIONS - requiredCorrect); // 3
    const extraCorrectAfterThreshold = Math.max(0, correctSoFar - requiredCorrect);

    // Default reserve uses only correct answers after threshold
    let reserveTarget = reservePortion * Math.min(extraCorrectAfterThreshold, reserveSteps) / reserveSteps;

    // At final question, if user met threshold, force finish even if the last answers were wrong
    const isFinalStep = stepIndex === TOTAL_QUESTIONS;
    const metThreshold = correctSoFar >= requiredCorrect;
    let totalTarget = baseTarget + reserveTarget;
    if (isFinalStep && metThreshold) {
      totalTarget = 1;
    }

    // Move user only when a correct answer occurs, or on final force-finish
    const shouldTweenUser = (isCorrect && totalTarget > this.userProgressRatio) || (isFinalStep && metThreshold);
    if (shouldTweenUser) {
      this.userProgressRatio = Math.min(1, totalTarget);
    }
    const userTargetXUnscaled = startX + TRACK_DISTANCE * this.userProgressRatio;

    // AI cars target end ratios (rotated per 10-question set)
    const aiEndRatios = this.getAiEndRatios();
    const aiStepRatio = stepIndex / TOTAL_QUESTIONS;

    // Tween user
    if (this.arrows.user) {
      this.scene.tweens.add({
        targets: this.arrows.user,
        x: this.scene.getScaledValue(userTargetXUnscaled),
        duration: 500,
        ease: 'Power2',
        onComplete,
      });
    } else if (onComplete) {
      // If no tween for user but a completion callback is provided,
      // call it after the AI tween duration to keep timing consistent.
      this.scene.time.delayedCall(500, onComplete);
    }

    // Tween AI cars each question according to their target percent of finish line
    ['orange', 'yellow', 'purple'].forEach((key) => {
      const arrow = (this.arrows as any)[key] as Phaser.GameObjects.Image | undefined;
      if (!arrow) return;
      const ratioNow = (aiEndRatios as any)[key] * aiStepRatio;
      const targetX = startX + TRACK_DISTANCE * ratioNow;
      this.scene.tweens.add({ targets: arrow, x: this.scene.getScaledValue(targetX), duration: 500, ease: 'Power2' });
    });
  }

  private getAiEndRatios(): Record<string, number> {
    const permutations: Array<[string, string, string]> = [
      ['orange', 'yellow', 'purple'],
      ['yellow', 'purple', 'orange'],
      ['purple', 'orange', 'yellow'],
    ];
    const values = [1.0, 0.8, 0.7];
    const order = permutations[this.aiRotationIndex % permutations.length];
    const mapping: Record<string, number> = { orange: 0, yellow: 0, purple: 0 } as Record<string, number>;
    mapping[order[0]] = values[0];
    mapping[order[1]] = values[1];
    mapping[order[2]] = values[2];
    return mapping;
  }

  private checkAnswer() {
    this.isTypingAnswer = false;
    this.lastTypedAt = 0;

    if (!this.currentQuestionRaw || this.currentAnswer === '') return;
    const q = this.extractQuestion(this.currentQuestionRaw);
    
    // Check if question involves decimals (operands or answer)
    const isDecimalQuestion = String(q.answer).includes('.') || String(q.operand1).includes('.') || String(q.operand2).includes('.');
    
    // For decimal questions, compare numeric values to allow different formats (.4, 0.4, 00.4)
    // For non-decimal questions, use exact string comparison
    let isCorrect: boolean;
    if (isDecimalQuestion) {
      const expectedNum = parseFloat(q.answer);
      const studentNum = parseFloat(this.currentAnswer);
      isCorrect = !isNaN(studentNum) && !isNaN(expectedNum) && studentNum === expectedNum;
    } else {
      isCorrect = this.currentAnswer === q.answer;
    }

    const questionText = this.currentQuestionRaw?.["question text"] || '';
    const [questionPart] = questionText.split('=');
    const formattedQuestionText = `${questionPart}=?`;
    const gameLevelInfo = this.topic === 'grade2_topic4' ? 'game.fact_racer.default' : 'game.multiverse.fact_racer';
    
    if (isCorrect) {
      this.analyticsHelper?.createTrial({
          questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
          achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
          questionText: formattedQuestionText,
          isCorrect: true,
          questionMechanic: 'default',
          gameLevelInfo: gameLevelInfo,
          studentResponse: this.currentAnswer,
          studentResponseAccuracyPercentage: '100%',
      });
      this.scoreHelper.answerCorrectly();
      this.queueAnnouncement(i18n.t('common.correctFeedback'));
    } else {
      this.analyticsHelper?.createTrial({
          questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
          achievedPoints: 0,
          questionText: formattedQuestionText,
          isCorrect: false,
          questionMechanic: 'default',
          gameLevelInfo: gameLevelInfo,
          studentResponse: this.currentAnswer,
          studentResponseAccuracyPercentage: '0%',
      });
      this.scoreHelper.answerIncorrectly();
      this.queueAnnouncement(i18n.t('common.incorrectFeedback', { value: q.answer }));
    }
    // Show feedback overlay (provide callback for wrong answers later)
    let feedbackFinished = false;
    const onFeedbackComplete = () => { feedbackFinished = true; };
    this.showFeedbackOverlay(isCorrect, !isCorrect ? onFeedbackComplete : undefined);

    if (this.mode === 'game') {
      this.scoreCoins.setScore(this.scoreHelper.getTotalScore());
      this.scoreCoins.setComboText(`${this.scoreHelper.getCurrentMultiplier()}`, true);

      // Show streak celebration if applicable
      if (isCorrect && this.scoreHelper.showStreakAnimation()) {
        this.showMascotCelebration();
      }
    }    // Instruction mode branching
    if (this.mode === 'instructions') {
      if (this.instructionStep === 1) {
        if (isCorrect) {
          // Stop input & pulse, keep same question
          this.disableKeyboardInput();
          this.stopPlaceholderPulse();
          this.answeredCount++; // so progress bar shows movement
          this.updateProgress(true);
          // Transition to step 2 after brief delay
          const timer1 = this.scene.time.delayedCall(1500, () => {
            // Safety check before proceeding
            if (this.isDestroyed) return;

            this.instructionStep = 2;
            this.showInstructionLine(2, () => {
              // Safety check before proceeding
              if (this.isDestroyed) return;

              this.flashRaceTrack();
              // Proceed to final step after showcasing progress
              const timer2 = this.scene.time.delayedCall(1800, () => {
                // Safety check before proceeding
                if (this.isDestroyed) return;

                this.instructionStep = 3;
                this.showInstructionLine(3, () => {
                  // Safety check before proceeding
                  if (this.isDestroyed) return;

                  this.showEndPlayButton();
                  this.applyPlayButtonBounce();
                });
              });
              this.tutorialTimers.push(timer2);
            });
          });
          this.tutorialTimers.push(timer1);
        } else {
          // Allow retry
          this.currentAnswer = '';
          this.updateAnswerDisplay();
          this.isAnswerLocked = false;
        }
      }
      return; // other steps ignore answers
    }
    // Game mode: update progress and count after feedback delay (shorter for wrong answers with reveal)
    if (!isCorrect) {
      // Flow for incorrect answers:
      // 1. Keep user's typed answer visible until feedback ring completes its cycle (~1.3s total)
      // 2. After ring completes: swap to correct answer
      // 3. Hold correct answer visible for 1 second
      // 4. Then advance to next question

      // Poll for feedback completion rather than hard-coding timing to stay in sync with overlay logic
      const checkInterval = 50;
      const poll = () => {
        if (feedbackFinished) {
          if (!this.currentQuestionRaw) return; // safety
          this.currentAnswer = q.answer;
          this.updateAnswerDisplay();
          this.showFeedbackOverlay(true, undefined, true);
          this.finishAnswerProgress(isCorrect);
        } else {
          this.scene.time.delayedCall(checkInterval, poll);
        }
      };
      poll();
    } else {
      // Correct answer retains previous 2s delay before progressing
      this.scene.time.delayedCall(2000, () => {
        this.finishAnswerProgress(isCorrect);
      });
    }
    if (this.mode === 'game') {
      this.scene.audioManager.playSoundEffect(isCorrect ? 'positive_sfx' : 'negative_sfx');
    }
    const currentScore = this.scoreHelper.getTotalScore();
    this.queueAnnouncement(i18n.t('game.scoreValue', { value: currentScore }));
  }

  private playNitroAnimation(isCorrect: boolean) {
    if (isCorrect) {
      this.nitro.user.play('nitro_cyan', true);
      this.nitro.user.on('animationcomplete', () => {
        this.nitro.user.setTexture('nitro', 'nitro/cyan/0001');
      });
    }
    this.nitro.orange.play('nitro_purple', true);
    this.nitro.orange.on('animationcomplete', () => {
      this.nitro.orange.setTexture('nitro', 'nitro/purple/0001');
    });
    this.nitro.yellow.play('nitro_red', true);
    this.nitro.yellow.on('animationcomplete', () => {
      this.nitro.yellow.setTexture('nitro', 'nitro/red/0001');
    });
    this.nitro.purple.play('nitro_blue', true);
    this.nitro.purple.on('animationcomplete', () => {
      this.nitro.purple.setTexture('nitro', 'nitro/blue/0001');
    });
  }

  private finishAnswerProgress(isCorrect: boolean) {
    // Shared progression logic after any reveal / delay
    this.answeredCount++;
    const isLastQuestion = this.mode === 'game' && this.answeredCount >= TOTAL_QUESTIONS;
    if (isLastQuestion) {
      // Move progress and only then show the scoreboard
      this.updateProgress(isCorrect, () => {
        this.gameOver();
      });
    } else {
      this.updateProgress(isCorrect);
    }

    if (isLastQuestion) return;

    const end = Date.now();
    const duration = end - this.startTime;
    if (this.currentQuestionRaw) {
      if(!isCorrect) {
        // Disable number pad
        this.disableNumberPad();
        continueGameAfterWrongAnswer(this.scene, () => {
          // Clean up feedback overlay when continuing
          if (this.feedbackOverlay) {
            this.feedbackOverlay.destroy();
            this.feedbackOverlay = undefined;
          }
          // Reset answer box to default state
          this.resetPlaceholderToDefault();
          // Re-enable number pad
          this.enableNumberPad();
          this.currentAnswer = '';
          this.updateAnswerDisplay();
          this.loadNextQuestion(this.questionSelector!.createStudentResponse(this.currentQuestionRaw!, duration, isCorrect));
        })
      } else {
        this.currentAnswer = '';
        this.updateAnswerDisplay();
        this.loadNextQuestion(this.questionSelector!.createStudentResponse(this.currentQuestionRaw, duration, isCorrect));
      }
    }
  }

  // Neon / hologram boot-up flicker for grid lines (moved outside of checkAnswer)
  private playGridBootEffect() {
    if (this.bootEffectPlayed || this.mode !== 'game') return;
    if (!this.gridLinesImage) return; // safety
    this.bootEffectPlayed = true;
    this.scene.time.delayedCall(500, () => {
      this.scene.audioManager.playSoundEffect('hologram_appear');
    });
    const img = this.gridLinesImage;
    // Chain tweens manually (fallback if timeline unsupported)
    this.scene.tweens.add({
      targets: img,
      alpha: 1,
      delay: 500,
      duration: 120,
      ease: 'Quad.Out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: img,
          alpha: 0.15,
          duration: 90,
          ease: 'Quad.In',
          onComplete: () => {
            this.scene.tweens.add({
              targets: img,
              alpha: 0.9,
              duration: 110,
              ease: 'Quad.Out',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: img,
                  alpha: 0.3,
                  duration: 80,
                  ease: 'Linear',
                  onComplete: () => {
                    this.scene.tweens.add({
                      targets: img,
                      alpha: 1,
                      duration: 160,
                      ease: 'Quad.Out'
                    });
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  private getPositionConfig() {
    // Determine the correct position configuration based on mode and device
    if (this.mode === 'instructions' && this.isMobile) {
      return {
        gridLines: FACT_RACER_POSITIONS.GRID_LINES.TUTORIAL_MOBILE_SCENE,
        arrows: FACT_RACER_POSITIONS.ARROWS.TUTORIAL_MOBILE_SCENE,
        questionContainer: FACT_RACER_POSITIONS.QUESTION_CONTAINER.TUTORIAL_MOBILE_SCENE,
        feedbackRing: FACT_RACER_POSITIONS.FEEDBACK_RING.TUTORIAL_MOBILE_SCENE
      };
    } else if (this.mode === 'instructions') {
      return {
        gridLines: FACT_RACER_POSITIONS.GRID_LINES.TUTORIAL_SCENE,
        arrows: FACT_RACER_POSITIONS.ARROWS.TUTORIAL_SCENE,
        questionContainer: FACT_RACER_POSITIONS.QUESTION_CONTAINER.TUTORIAL_SCENE,
        feedbackRing: FACT_RACER_POSITIONS.FEEDBACK_RING.TUTORIAL_SCENE
      };
    } else if (this.isMobile) {
      return {
        gridLines: FACT_RACER_POSITIONS.GRID_LINES.GAME_MOBILE_SCENE,
        arrows: FACT_RACER_POSITIONS.ARROWS.GAME_MOBILE_SCENE,
        questionContainer: FACT_RACER_POSITIONS.QUESTION_CONTAINER.GAME_MOBILE_SCENE,
        feedbackRing: FACT_RACER_POSITIONS.FEEDBACK_RING.GAME_MOBILE_SCENE
      };
    } else {
      return {
        gridLines: FACT_RACER_POSITIONS.GRID_LINES.GAME_SCENE,
        arrows: FACT_RACER_POSITIONS.ARROWS.GAME_SCENE,
        questionContainer: FACT_RACER_POSITIONS.QUESTION_CONTAINER.GAME_SCENE,
        feedbackRing: FACT_RACER_POSITIONS.FEEDBACK_RING.GAME_SCENE
      };
    }
  }

  private drawMap() {
    const positions = this.getPositionConfig();
    const scenarioKey = this.mode === 'instructions'
      ? (this.isMobile ? 'TUTORIAL_MOBILE_SCENE' : 'TUTORIAL_SCENE')
      : (this.isMobile ? 'GAME_MOBILE_SCENE' : 'GAME_SCENE');

    // Create map container with configured position
    const mapContainer = this.scene.add.container(
      this.scene.getScaledValue(positions.gridLines.X),
      this.scene.getScaledValue(positions.gridLines.Y)
    );

    this.gridLinesImage = this.scene.addImage(0, 0, this.getAssetKey('grid_lines')).setOrigin(0.5);

    // Apply scale if specified in configuration
    if (positions.gridLines.SCALE) {
      this.gridLinesImage.setScale(positions.gridLines.SCALE);
    }

    mapContainer.add(this.gridLinesImage);

    // START / FINISH labels (use scaled offsets + account for grid image scale)
    const gridCfg: any = (FACT_RACER_POSITIONS as any).GRID_LABELS?.[scenarioKey];
    if (gridCfg) {
      const gridScale = positions.gridLines.SCALE || 1;
      const fontSize = gridCfg.FONT_SIZE * gridScale; // scale font with grid
      const leftMargin = gridCfg.LEFT_MARGIN * gridScale;
      const rightMargin = gridCfg.RIGHT_MARGIN * gridScale;
      const topOffset = gridCfg.TOP_OFFSET * gridScale;
      const startText = this.scene
        .addText(-leftMargin, topOffset, i18n.t('common.start') || 'Start', { font: `600 ${Math.round(fontSize)}px Exo`, color: '#00CCFF' })
        .setOrigin(0, 0.5);
      const finishText = this.scene
        .addText(rightMargin, topOffset, i18n.t('common.finish') || 'Finish', { font: `600 ${Math.round(fontSize)}px Exo`, color: '#00CCFF' })
        .setOrigin(1, 0.5);
      // Re-align after texture metrics ready using displayWidth (accounts for scale)
      this.scene.time.delayedCall(0, () => {
        if (this.gridLinesImage && finishText && startText) {
          const halfW = this.gridLinesImage.displayWidth / 2;
          // Negative moves left (start), positive moves right (finish)
          finishText.x = halfW - rightMargin;
          startText.x = -halfW + leftMargin;
        }
      });
      mapContainer.add(startText);
      mapContainer.add(finishText);
    }

    // Create arrows with configured positions (scale applied uniformly). Scaling does not affect movement since we only tween x.
    const s = positions.arrows.SCALE || 1;
    const baseX = positions.arrows.X;
    this.arrows.user = this.scene.addImage(baseX, positions.arrows.USER_Y, 'cyan_spaceship').setOrigin(0.5).setScale(s);
    this.nitro.user = this.scene.addSprite(baseX, positions.arrows.USER_Y, 'nitro_cyan').setOrigin(0.5).setScale(s).setTexture('nitro', 'nitro/cyan/0001');
    this.arrows.orange = this.scene.addImage(baseX, positions.arrows.ORANGE_Y, 'purple_spaceship').setOrigin(0.5).setScale(s);
    this.nitro.orange = this.scene.addSprite(baseX, positions.arrows.ORANGE_Y, 'nitro_purple').setOrigin(0.5).setScale(s).setTexture('nitro', 'nitro/purple/0001');
    this.arrows.yellow = this.scene.addImage(baseX, positions.arrows.YELLOW_Y, 'red_spaceship').setOrigin(0.5).setScale(s);
    this.nitro.yellow = this.scene.addSprite(baseX, positions.arrows.YELLOW_Y, 'nitro_red').setOrigin(0.5).setScale(s).setTexture('nitro', 'nitro/red/0001');
    this.arrows.purple = this.scene.addImage(baseX, positions.arrows.PURPLE_Y, 'blue_spaceship').setOrigin(0.5).setScale(s);
    this.nitro.purple = this.scene.addSprite(baseX, positions.arrows.PURPLE_Y, 'nitro_blue').setOrigin(0.5).setScale(s).setTexture('nitro', 'nitro/blue/0001');

    // Arrow lane labels (place in scene space so they align left of arrows)
    const laneCfg: any = (FACT_RACER_POSITIONS as any).ARROW_LABELS?.[scenarioKey];
    if (laneCfg) {
      const baseFont = laneCfg.FONT_SIZE;
      const labelScale = s;
      const mkFont = (size: number) => `600 ${Math.round(size * labelScale)}px Exo`;
      const labels: { key: string; y: number; arrowX: number; color?: string }[] = [
        { key: i18n.t('common.you') || 'You', y: positions.arrows.USER_Y, arrowX: this.arrows.user.x, color: '#ffffff' },
        { key: i18n.t('common.nova') || 'Nova', y: positions.arrows.ORANGE_Y, arrowX: this.arrows.orange.x },
        { key: i18n.t('common.orion') || 'Orion', y: positions.arrows.YELLOW_Y, arrowX: this.arrows.yellow.x },
        { key: i18n.t('common.flux') || 'Flux', y: positions.arrows.PURPLE_Y, arrowX: this.arrows.purple.x }
      ];
      labels.forEach(l => {
        const x = l.arrowX / this.scene.display.scale + laneCfg.OFFSET_X * labelScale; // negative offset moves left
        const textObject = this.scene.addText(x, l.y, l.key, { font: mkFont(baseFont), color: l.color || '#00CCFF' }).setOrigin(1, 0.5);
        new TextOverlay(this.scene, textObject, { label: l.key });
      });
    }
  }

  private setupKeyboardEvents() {
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (this.mode === 'instructions' && this.instructionStep !== 1) return; // allow typing ONLY during step 1
      if (this.isAnswerLocked) return; // ignore input when locked (after submission or during reveal)
      const key = event.key;
      // Get expected answer length from current question
      let expectedDigits = 1; // number of numeric digits (ignore '.')
      let needsDecimal = false;
      if (this.currentQuestionRaw) {
        const q = this.extractQuestion(this.currentQuestionRaw);
        expectedDigits = this.getDigitCount(q.answer);
        // Check if question involves decimals (operands or answer)
        needsDecimal = String(q.answer).includes('.') || String(q.operand1).includes('.') || String(q.operand2).includes('.');
      }
      const currentDigits = this.currentAnswer.replace(/[^0-9]/g, '').length;
      if (/^[0-9]$/.test(key)) {
        // For decimal questions, allow up to 10 characters total (including decimal point)
        // For non-decimal, only allow expected digits
        const maxLength = needsDecimal ? 10 : expectedDigits;
        if (needsDecimal ? this.currentAnswer.length < maxLength : currentDigits < expectedDigits) {
          this.currentAnswer += key;
          this.updateAnswerDisplay();

          // mark typing activity
          this.isTypingAnswer = true;
          this.lastTypedAt = Date.now();
        }
      } else if (key === 'Backspace') {
        if (this.canBackspace(expectedDigits)) {
          this.currentAnswer = this.currentAnswer.slice(0, -1);
          this.updateAnswerDisplay();

          this.isTypingAnswer = true;
          this.lastTypedAt = Date.now();
        }
      } else if (key === this.getDecimalSeparator()) {
        // Accept decimal point for decimal questions
        // Allow '.' at the beginning (e.g., .85) or after digits (e.g., 0.85)
        if (needsDecimal && !this.currentAnswer.includes('.') && this.currentAnswer.length < 10) {
          this.currentAnswer += '.';
          this.updateAnswerDisplay();
        }
      } else if (key === 'Enter') {
        if (this.currentAnswer.length > 0) {
          this.isAnswerLocked = true;
          this.checkAnswer();

          this.isTypingAnswer = true;
          this.lastTypedAt = Date.now();
        }
      } else if (key === '-' && this.topic === 'g7_g8') {
        if (this.currentAnswer.length === 0) {
          this.currentAnswer = '-';
          this.updateAnswerDisplay();
        }
      }
    };
    this.scene.input.keyboard?.removeAllListeners('keydown');
    this.scene.input.keyboard?.on('keydown', this.keyboardHandler);
  }

  private gameOver() {
    if (this.mode !== 'game') return; // tutorial loops
    const finalScore = this.scoreHelper.endGame();

    const positions = this.getPositionConfig();
    const startX = positions.arrows.X;
    const TRACK_DISTANCE = this.isMobile ? 545 : 525;
    const computeUserX = () => this.scene.getScaledValue(startX + TRACK_DISTANCE * this.userProgressRatio);
    const computeAiX = (ratio: number) => this.scene.getScaledValue(startX + TRACK_DISTANCE * ratio);

    const userX = this.arrows.user?.x ?? computeUserX();
    const orangeX = this.arrows.orange?.x ?? computeAiX(this.getAiEndRatios().orange);
    const yellowX = this.arrows.yellow?.x ?? computeAiX(this.getAiEndRatios().yellow);
    const purpleX = this.arrows.purple?.x ?? computeAiX(this.getAiEndRatios().purple);

    const rankings: PlayerRanking[] = [
      { name: i18n.t('common.you') || 'You', spaceship: 'cyan_spaceship', x: userX, isUser: true },
      { name: i18n.t('common.nova') || 'Nova', spaceship: 'purple_spaceship', x: orangeX },
      { name: i18n.t('common.orion') || 'Orion', spaceship: 'red_spaceship', x: yellowX },
      { name: i18n.t('common.flux') || 'Flux', spaceship: 'blue_spaceship', x: purpleX },
    ].sort((a, b) => b.x - a.x);

    const data: ScoreboardLaunchData = {
      rounds: this.scoreHelper.getCorrectAnswers(),
      totalRounds: this.scoreHelper.getTotalQuestions(),
      score: finalScore,
      rankings,
    };
    this.scene.scene.start('Scoreboard', data);
  }

  private createScoreUI() {
    this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
    this.scoreCoins.create(this.scene.getScaledValue(87), this.scene.getScaledValue(62));
  }

  private createPauseButton() {
    ButtonHelper.createIconButton({
      scene: this.scene,
      imageKeys: { default: BUTTONS.ICON_BTN.KEY, hover: BUTTONS.ICON_BTN_HOVER.KEY, pressed: BUTTONS.ICON_BTN_PRESSED.KEY },
      icon: BUTTONS.PAUSE_ICON.KEY,
      label: i18n.t('common.pause'),
      x: this.scene.display.width - 54,
      y: 66,
      raisedOffset: 3.5,
      onClick: () => {
        this.scene.scene.pause();
        this.scene.scene.launch('PauseScene', { parentScene: 'GameScene' });
        this.scene.audioManager.pauseAll();
        this.scene.scene.bringToTop('PauseScene');
      }
    }).setName('pause_btn');
  }

  private createMuteButton() {
    this.muteBtn = ButtonHelper.createIconButton({
      scene: this.scene,
      imageKeys: { default: BUTTONS.ICON_BTN.KEY, hover: BUTTONS.ICON_BTN_HOVER.KEY, pressed: BUTTONS.ICON_BTN_PRESSED.KEY },
      icon: BUTTONS.UNMUTE_ICON.KEY,
      label: i18n.t('common.mute'),
      ariaLive: 'off',
      x: this.scene.display.width - 54,
      y: 142,
      raisedOffset: 3.5,
      onClick: () => this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted())
    });
  }

  private createVolumeSlider() {
    this.volumeSlider = new VolumeSlider(this.scene);
    this.volumeSlider.create(this.scene.display.width - 220, 238, 'blue', i18n.t('common.volume'));
    ButtonHelper.createIconButton({
      scene: this.scene,
      imageKeys: { default: BUTTONS.ICON_BTN.KEY, hover: BUTTONS.ICON_BTN_HOVER.KEY, pressed: BUTTONS.ICON_BTN_PRESSED.KEY },
      icon: BUTTONS.SETTINGS_ICON.KEY,
      label: i18n.t('common.volume'),
      x: this.scene.display.width - 54,
      y: 218,
      raisedOffset: 3.5,
      onClick: () => this.volumeSlider.toggleControl()
    });
  }

  private createHelpButton() {
    ButtonHelper.createIconButton({
      scene: this.scene,
      imageKeys: { default: BUTTONS.ICON_BTN.KEY, hover: BUTTONS.ICON_BTN_HOVER.KEY, pressed: BUTTONS.ICON_BTN_PRESSED.KEY },
      icon: BUTTONS.HELP_ICON.KEY,
      label: i18n.t('common.help'),
      x: this.scene.display.width - 54,
      y: 294,
      raisedOffset: 3.5,
      onClick: () => {
        this.scene.scene.pause();
        this.scene.scene.launch('InstructionsScene', { parentScene: 'GameScene', fromSplashScene: false });
        this.scene.scene.bringToTop('InstructionsScene');
        // Stop or pause background music when entering tutorial from game
        this.scene.audioManager.stopBackgroundMusic();
      }
    });
  }

  // (Legacy createHowToPlayCycler removed; replaced by explicit step flow)

  // New instruction helpers
  private createInstructionText(text: string) {
    this.howToPlayText = this.scene.addText(this.scene.display.width / 2, 74, text, {
      font: '700 24px Exo',
      align: 'center',
      wordWrap: {
        width: this.scene.display.width - 400,
      }
    }).setOrigin(0.5);
  }
  private getInstructionLine(step: number): string {
    const keys = [
      'factRacer.instructions.step1', // intro no input
      'factRacer.instructions.step2', // typing instructions
      'factRacer.instructions.step3', // progress / racing explanation
      'factRacer.instructions.step4'  // final play prompt
    ];
    return i18n.t(keys[step]) || keys[step];
  }
  private showInstructionLine(step: number, onComplete?: () => void) {
    // Safety checks for destroyed objects
    if (this.isDestroyed || !this.howToPlayText || !this.scene) {
      return;
    }

    try {
      const currentInstructionLine = this.getInstructionLine(step);
      this.howToPlayText.setText(currentInstructionLine);

      if (this.instructionStepOverlay) {
        // If the overlay already exists, update its content.
        this.instructionStepOverlay.updateContent(currentInstructionLine);
      } else {
        // If the overlay doesn't exist, create it.
        this.instructionStepOverlay = new TextOverlay(this.scene, this.howToPlayText, { label: currentInstructionLine });
      }
    } catch (error) {
      console.error('Error setting instruction text:', error);
      return;
    }

    // Play audio for this step
    this.playStepAudio(step + 1, onComplete); // step is 0-indexed, audio files are 1-indexed
  }

  // Tutorial helper: enable keyboard input only when entering step 1
  private enableKeyboardInputForTutorial() {
    // Reattach handler if removed
    if (this.keyboardHandler && this.scene.input.keyboard) {
      this.scene.input.keyboard.removeAllListeners('keydown');
      this.scene.input.keyboard.on('keydown', this.keyboardHandler);
    }
  }

  private startPlaceholderPulse() {
    if (!this.currentPlaceholder) return;
    this.stopPlaceholderPulse();
    const baseScale = this.currentPlaceholder.scale; // capture current scale (may not be 1)
    const maxScale = baseScale * 1.04; // grow 4%
    const minScale = baseScale * 0.985; // shrink 1.5% below base
    // Tween scale uniformly (Phaser auto-applies to scaleX & scaleY when using 'scale')
    this.placeholderPulseTween = this.scene.tweens.add({
      targets: this.currentPlaceholder,
      scale: { from: minScale, to: maxScale },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }
  private stopPlaceholderPulse() {
    if (this.placeholderPulseTween) {
      this.placeholderPulseTween.stop();
      this.placeholderPulseTween = undefined;
    }
    if (this.currentPlaceholder) {
      // Restore to original (approx midpoint) to avoid snapping to 1
      // Use average of min & max which is close to baseScale
      // Since we stored baseScale locally we can't access it now; just leave current scale
    }
  }

  private applyPlayButtonBounce() {
    if (!this.endPlayButton) return;
    // Use ButtonHelper bounce if available, else fallback tween
    const btn: any = this.endPlayButton;
    if (btn && typeof btn.playBounceAnimation === 'function') {
      btn.playBounceAnimation();
    } else {
      this.scene.tweens.add({ targets: this.endPlayButton, y: this.endPlayButton.y - 10, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private createMobileNumberPad() {
    if (!this.isMobile) return;

    this.numberPadContainer = this.scene.add.container(0, 0);
    this.numberPadContainer.setDepth(5); // Above other elements

    const isDecimalTopic = this.topic === 'grade6_topic1';
    const isNegativeTopic = this.topic === 'g7_g8';

    // 2x5 grid layout: 2 rows, 5 columns each
    const buttonSize = 60;
    const padding = 40;
    const cols = 5;
    const gridWidth = cols * (buttonSize + padding) - padding;
    const startX = this.scene.display.width / 2 - gridWidth / 2 - ((isDecimalTopic || isNegativeTopic) ? 70 : 20);
    const startY = this.scene.display.height - 165; // Start higher to fit 2 rows

    // First row: 1, 2, 3, 4, 5
    for (let i = 1; i <= 5; i++) {
      const x = startX + (i - 1) * (buttonSize + padding);
      const y = startY;
      const button = this.createNumberButton(i, x, y, buttonSize);
      this.numberButtons.push(button);
      this.numberPadContainer.add(button);
    }

    // Second row: 6, 7, 8, 9, 0
    for (let i = 6; i <= 9; i++) {
      const x = startX + (i - 6) * (buttonSize + padding);
      const y = startY + (buttonSize + padding);
      const button = this.createNumberButton(i, x, y, buttonSize);
      this.numberButtons.push(button);
      this.numberPadContainer.add(button);
    }

    // Add 0 button in second row, last position
    const zeroX = startX + 4 * (buttonSize + padding);
    const zeroY = startY + (buttonSize + padding);
    const zeroButton = this.createNumberButton(0, zeroX, zeroY, buttonSize);
    this.numberButtons.push(zeroButton);
    this.numberPadContainer.add(zeroButton);

    if (isDecimalTopic) {
      const decimalX = startX + gridWidth + 40;
      const decimalY = startY;
      this.decimalButton = this.createDecimalButton(decimalX, decimalY, buttonSize);
      this.numberPadContainer.add(this.decimalButton);
    } else if (isNegativeTopic) {
      const negativeX = startX + gridWidth + 40;
      const negativeY = startY;
      this.negativeButton = this.createNegativeButton(negativeX, negativeY, buttonSize);
      this.numberPadContainer.add(this.negativeButton);
    }

    // Create backspace button to the right of the number pad
    const backspaceX = startX + gridWidth + 40; // Gap from number pad
    const backspaceY = (isDecimalTopic || isNegativeTopic) ? startY + (buttonSize + padding) : startY; // Vertically centered
    this.backspaceButton = this.createBackspaceButton(backspaceX, backspaceY, buttonSize);
    this.numberPadContainer.add(this.backspaceButton);

    // Create enter button to the right of the backspace button
    const enterX = startX + gridWidth + 40 + ((isDecimalTopic || isNegativeTopic) ? buttonSize + padding : 0);
    const enterY = (isDecimalTopic || isNegativeTopic) ? startY + (buttonSize + padding) / 2 : startY + (buttonSize + padding);
    this.enterButton = this.createEnterButton(enterX, enterY, buttonSize);
    this.numberPadContainer.add(this.enterButton);

    // Set initial availability based on current question expected length and current input state
    // let expectedLength = 1;
    // if (this.currentQuestionRaw) {
    //   const q = this.extractQuestion(this.currentQuestionRaw);
    //   expectedLength = q.answer.length;
    // }
    // this.setBackspaceEnabled(this.canBackspace(expectedLength));
  }

  private disableNumberPad() {
    this.numberButtons.forEach(btn => {
      ButtonHelper.disableButton(btn);
      btn.setAlpha(0.5);
    });
    if (this.backspaceButton) {
      ButtonHelper.disableButton(this.backspaceButton);
      this.backspaceButton.setAlpha(0.5);
    }
    if (this.enterButton) {
      ButtonHelper.disableButton(this.enterButton);
      this.enterButton.setAlpha(0.5);
    }
    if (this.negativeButton) {
      ButtonHelper.disableButton(this.negativeButton);
      this.negativeButton.setAlpha(0.5);
    }
    if (this.decimalButton) {
      ButtonHelper.disableButton(this.decimalButton);
      this.decimalButton.setAlpha(0.5);
    }
  }

  private enableNumberPad() {
    this.numberButtons.forEach(btn => {
      ButtonHelper.enableButton(btn);
      btn.setAlpha(1);
    });
    if (this.backspaceButton) {
      ButtonHelper.enableButton(this.backspaceButton);
      this.backspaceButton.setAlpha(1);
    }
    if (this.enterButton) {
      ButtonHelper.enableButton(this.enterButton);
      this.enterButton.setAlpha(1);
    }
    if (this.negativeButton) {
      ButtonHelper.enableButton(this.negativeButton);
      this.negativeButton.setAlpha(1);
    }
    if (this.decimalButton) {
      ButtonHelper.enableButton(this.decimalButton);
      this.decimalButton.setAlpha(1);
    }
  }

  private createNumberButton(number: number, x: number, y: number, size: number): Phaser.GameObjects.Container {
    const button = ButtonHelper.createButton({
      scene: this.scene,
      imageKeys: {
        default: 'number-pad-default',
        hover: 'number-pad-hover',
        pressed: 'number-pad-pressed'
      },
      text: number.toString(),
      label: number.toString(),
      textStyle: {
        font: '600 28px Exo',
        color: '#000000'
      },
      x,
      y,
      imageScale: size / 70, // Scale to desired size
      onClick: () => this.handleNumberPadInput(number.toString()),
      raisedOffset: 3.5
    });

    return button;
  }

  private createBackspaceButton(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const button = ButtonHelper.createButton({
      scene: this.scene,
      imageKeys: {
        default: 'number-pad-default',
        hover: 'number-pad-hover',
        pressed: 'number-pad-pressed'
      },
      text: '',
      label: i18n.t('common.backspace') || 'Backspace',
      textStyle: {
        font: '600 28px Exo',
        color: '#000000'
      },
      x,
      y,
      imageScale: size / 70,
      onClick: () => this.handleNumberPadInput('Backspace'),
      raisedOffset: 3.5
    });

    // Add backspace icon on top of button
    const icon = this.scene.addImage(-2, -5, 'backspace').setScale(0.8).setOrigin(0.5);
    button.add(icon); // Add icon as child of button container

    return button;
  }

  private createEnterButton(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const button = ButtonHelper.createButton({
      scene: this.scene,
      imageKeys: {
        default: 'number-pad-default',
        hover: 'number-pad-hover',
        pressed: 'number-pad-pressed'
      },
      text: '',
      label: i18n.t('common.enter') || 'Enter',
      textStyle: {
        font: '600 28px Exo',
        color: '#000000'
      },
      x,
      y,
      imageScale: size / 70,
      onClick: () => this.handleNumberPadInput('Enter'),
      raisedOffset: 3.5
    });

    // Add backspace icon on top of button
    const icon = this.scene.addImage(-2, -5, 'enter').setScale(0.8).setOrigin(0.5);
    button.add(icon); // Add icon as child of button container

    return button;
  }

  private createDecimalButton(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const button = ButtonHelper.createButton({
      scene: this.scene,
      imageKeys: {
        default: 'number-pad-default',
        hover: 'number-pad-hover',
        pressed: 'number-pad-pressed'
      },
      text: this.getDecimalSeparator(),
      label: this.getDecimalSeparator(),
      textStyle: {
        font: '600 28px Exo',
        color: '#000000'
      },
      x,
      y,
      imageScale: size / 70, // Scale to desired size
      onClick: () => this.handleNumberPadInput('.'),
      raisedOffset: 3.5
    });

    return button;
  }

  private createNegativeButton(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const button = ButtonHelper.createButton({
      scene: this.scene,
      imageKeys: {
        default: 'number-pad-default',
        hover: 'number-pad-hover',
        pressed: 'number-pad-pressed'
      },
      text: '−',
      label: '−',
      textStyle: {
        font: '600 28px Exo',
        color: '#000000'
      },
      x,
      y,
      imageScale: size / 70, // Scale to desired size
      onClick: () => {
        if (this.currentAnswer.length === 0) {
          this.currentAnswer = '-';
          this.updateAnswerDisplay();
        }
      },
      raisedOffset: 3.5
    });

    return button;
  }

  private handleNumberPadInput(input: string) {
    // Reuse the same logic as keyboard input
    if (this.mode === 'instructions' && this.instructionStep !== 1) return;
    if (this.isAnswerLocked) return; // ignore input when locked

    let expectedDigits = 1;
    let needsDecimal = false;
    if (this.currentQuestionRaw) {
      const q = this.extractQuestion(this.currentQuestionRaw);
      expectedDigits = this.getDigitCount(q.answer);
      // Check if question involves decimals (operands or answer)
      needsDecimal = String(q.answer).includes('.') || String(q.operand1).includes('.') || String(q.operand2).includes('.');
    }

    const currentDigits = this.currentAnswer.replace(/[^0-9]/g, '').length;

    if (/^[0-9]$/.test(input)) {
      // For decimal questions, allow up to 10 characters total (including decimal point)
      // For non-decimal, only allow expected digits
      this.isTypingAnswer = true;
      this.lastTypedAt = Date.now();
      const maxLength = needsDecimal ? 10 : expectedDigits;
      if (needsDecimal ? this.currentAnswer.length < maxLength : currentDigits < expectedDigits) {
        this.currentAnswer += input;
        this.updateAnswerDisplay();
      }
    } else if (input === 'Backspace') {
      this.isTypingAnswer = true;
      this.lastTypedAt = Date.now();
      if (this.canBackspace(expectedDigits)) {
        this.currentAnswer = this.currentAnswer.slice(0, -1);
        this.updateAnswerDisplay();
      }
    } else if (input === '.') {
      // Accept decimal point for decimal questions
      // Allow '.' at the beginning (e.g., .85) or after digits (e.g., 0.85)
      this.isTypingAnswer = true;
      this.lastTypedAt = Date.now();
      if (needsDecimal && !this.currentAnswer.includes('.') && this.currentAnswer.length < 10) {
        this.currentAnswer += '.';
        this.updateAnswerDisplay();
      }
    } else if (input === 'Enter') {
      if (this.currentAnswer.length > 0) {
        this.isAnswerLocked = true;
        this.checkAnswer();
      }
    }
  }
  
  private getDecimalSeparator(): string {
    return i18n.getLanguage() === 'es' ? ',' : '.';
  }

  private getGroupingSeparator(): string {
    return i18n.getLanguage() === 'es' ? '.' : ',';
  }

  private showMascotCelebration() {
    this.scene.time.delayedCall(1500, () => {
      this.scene.scene.pause();
      this.scene.scene.launch('CelebrationScene', {
        scoreHelper: this.scoreHelper,
        progress: this.answeredCount / TOTAL_QUESTIONS,
        showSuccessCheckmark: false,
        callback: () => {
          // Resume game after celebration
          this.scene.scene.resume();

          // check if this is the last question
          if (this.answeredCount === TOTAL_QUESTIONS - 1) {
            this.UICleanup();
            this.numberPadContainer?.destroy();
          }
        }
      });
      this.scene.scene.bringToTop('CelebrationScene');
    });
  }

  private playStepAudio(stepNumber: number, onComplete?: () => void) {
    // Stop any currently playing tutorial audio
    if (this.currentStepAudio) {
      this.currentStepAudio.stop();
      this.currentStepAudio.removeAllListeners();
      this.currentStepAudio = undefined;
    }

    // Safety check for destroyed objects
    if (this.isDestroyed || !this.scene) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const audioKey = `step_${stepNumber}`;
    const audio = this.scene.audioManager.playSoundEffect(audioKey);

    if (audio) {
      this.currentStepAudio = audio;

      if (onComplete) {
        audio.on('complete', () => {
          // Clear the reference when audio completes
          if (this.currentStepAudio === audio) {
            this.currentStepAudio = undefined;
          }
          // Safety check before calling onComplete - check both isDestroyed and scene validity
          if (!this.isDestroyed && this.scene && this.scene.scene && this.scene.scene.isActive()) {
            onComplete();
          }
        });
      }
    } else if (onComplete) {
      // If no audio, call onComplete immediately
      onComplete();
    }
  }
  // Removed highlightAnswerBox (replaced by placeholder pulse in tutorial step 1)
  private flashRaceTrack() {
    if (!this.gridLinesImage || this.isDestroyed) return;
    this.scene.tweens.add({ targets: this.gridLinesImage, alpha: 0.3, duration: 250, yoyo: true, repeat: 3 });
  }
  private disableKeyboardInput() {
    if (this.keyboardHandler && this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.keyboardHandler);
    }
  }
  private showEndPlayButton() {
    if (this.endPlayButton) return;
    const isTutorialMobile = this.mode === 'instructions' && this.isMobile;
    if (isTutorialMobile) {
      // Add banner at bottom
      const bannerY = this.scene.display.height - 80; // approximate offset
      this.scene.addImage(this.scene.display.width / 2, bannerY, 'tutorial_banner_mobile').setOrigin(0.5).setDepth(5);
      // Play button on top of banner
      this.endPlayButton = ButtonHelper.createButton({
        scene: this.scene,
        imageKeys: { default: BUTTONS.BUTTON.KEY, hover: BUTTONS.BUTTON_HOVER.KEY, pressed: BUTTONS.BUTTON_PRESSED.KEY },
        text: i18n.t('info.play') || 'Play',
        label: i18n.t('info.play') || 'Play',
        textStyle: { font: '700 34px Exo', color: '#ffffff' },
        x: this.scene.display.width / 2,
        y: bannerY + 4,
        imageScale: 0.9,
        raisedOffset: 3.5,
        onClick: () => {
          // Immediately stop all audio
          if (this.scene && this.scene.sound) {
            this.scene.sound.stopAll();
          }

          // Clean up tutorial audio and state before transitioning
          this.scene.registry.set('factRacerTutorialSeen', true);

          // Small delay to ensure audio cleanup completes
          this.scene.time.delayedCall(100, () => {
            this.scene.scene.stop('InstructionsScene');
            if (this.fromSplashScene) {
              this.scene.scene.start('GameScene', { reset: false, skipTutorial: true })
            } else {
              this.scene.scene.resume('GameScene', { reset: false, skipTutorial: true });
            }
            this.scene.scene.bringToTop('GameScene');
          });
        }
      });
      this.endPlayButton.setDepth(6);
    } else {
      // Non-mobile or non-tutorial: simple larger button at bottom center
      const btnY = this.scene.display.height - 70;
      this.endPlayButton = ButtonHelper.createButton({
        scene: this.scene,
        imageKeys: { default: BUTTONS.BUTTON.KEY, hover: BUTTONS.BUTTON_HOVER.KEY, pressed: BUTTONS.BUTTON_PRESSED.KEY },
        text: i18n.t('info.play') || 'Play',
        label: i18n.t('info.play') || 'Play',
        textStyle: { font: '700 36px Exo', color: '#ffffff' },
        x: this.scene.display.width / 2,
        y: btnY,
        imageScale: 0.95,
        raisedOffset: 3.5,
        onClick: () => {
          // Immediately stop all audio
          if (this.scene && this.scene.sound) {
            this.scene.sound.stopAll();
          }

          // Clean up tutorial audio and state before transitioning
          this.destroy();
          this.scene.registry.set('factRacerTutorialSeen', true);

          // Small delay to ensure audio cleanup completes
          this.scene.time.delayedCall(100, () => {
            this.scene.scene.stop('InstructionsScene');
            if (this.fromSplashScene) {
              this.scene.scene.start('GameScene', { reset: false, skipTutorial: true })
            } else {
              this.scene.scene.resume('GameScene', { reset: false, skipTutorial: true });
            }
            this.scene.scene.bringToTop('GameScene');
          });
        }
      });
    }
  }


  private showFeedbackOverlay(isCorrect: boolean, onComplete?: () => void, isContinue: boolean = false) {
    this.updateAnswerBox(isCorrect ? 0x00FF33 : 0xFF0000, this.isVerticalLayout);

    // Hide any existing feedback overlay
    if (this.feedbackOverlay) {
      this.feedbackOverlay.destroy();
    }

    // Create new feedback overlay as an independent scene object (not a child of any section)
    const feedbackKey = isCorrect ? 'feedback_ring_correct' : 'feedback_ring_wrong';
    this.feedbackOverlay = this.scene.addImage(0, 0, feedbackKey);
    this.feedbackOverlay.setDepth(4); // Above question/answer sections
    this.feedbackOverlay.setOrigin(0.5, 0.5);

    const cfg = this.getPositionConfig();
    const position = cfg.feedbackRing;
    const sceneX = this.scene.getScaledValue(position.X);
    const sceneY = this.scene.getScaledValue(position.Y);
    this.feedbackOverlay.setPosition(sceneX, sceneY);

    let correctTextContainerY = 700;
    if (this.isMobile) {
      if (this.mode === 'instructions') correctTextContainerY = 305;
      else correctTextContainerY = 300;
    }
    const correctTextContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(correctTextContainerY));

    if (!isContinue) {
      // Start invisible for fade-in effect
      this.feedbackOverlay.setAlpha(0);
  
      // Fade in animation
      this.scene.tweens.add({
        targets: this.feedbackOverlay,
        alpha: 1,
        duration: 300,
        ease: 'Power2'
      });

      if (isCorrect) {
        const graphics = this.scene.add.graphics();
        const correctText = this.scene.addText(0, 0, i18n.t('common.correctFeedback'), {
          font: `700 ${this.isMobile ? '23px' : '34px'} Exo`,
          color: '#6BFF00'
        }).setOrigin(0.5);
        graphics.fillStyle(0x000000, 0.5);
        const width = this.scene.getScaledValue(correctText.width + (this.isMobile ? 20 : 30));
        const height = this.scene.getScaledValue(this.isMobile ? 36 : 50);
        graphics.fillRoundedRect(-width/2, -height/2, width, height, this.scene.getScaledValue(6));
        correctTextContainer.add(graphics);
        correctTextContainer.add(correctText);
      }
    } else {
      // If isContinue is true, call onComplete immediately
      if (onComplete) onComplete();
      return;
    }

    // Fade out and destroy after 1 second
    this.scene.time.delayedCall(1000, () => {
      if (this.feedbackOverlay) {
        // Fade out animation
        this.scene.tweens.add({
          targets: this.feedbackOverlay,
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => {
            if (this.feedbackOverlay) {
              this.feedbackOverlay.destroy();
              this.feedbackOverlay = undefined;
            }
            if (correctTextContainer) {
              correctTextContainer.destroy();
            }
            // Reset placeholder back to default state
            this.resetPlaceholderToDefault();
            if (onComplete) onComplete();
          }
        });
      }
    });
  }

  // Add cleanup method for tutorial
  destroy() {
    this.isDestroyed = true;

    // Stop any playing audio
    if (this.currentStepAudio) {
      this.currentStepAudio.stop();
      this.currentStepAudio.removeAllListeners();
      this.currentStepAudio = undefined;
    }

    // Stop ALL sounds in the Phaser sound system
    if (this.scene && this.scene.sound) {
      this.scene.sound.stopAll();
    }

    // Stop all audio through the audio manager
    if (this.scene && this.scene.audioManager) {
      // Try multiple methods to ensure all audio stops
      if (typeof this.scene.audioManager.stopAll === 'function') {
        this.scene.audioManager.stopAll();
      } else if (typeof this.scene.audioManager.pauseAll === 'function') {
        this.scene.audioManager.pauseAll();
      }

      // Also try to stop all sound effects specifically  
      if (typeof this.scene.audioManager.stopSoundEffect === 'function') {
        // Try to stop tutorial audio specifically
        ['step_1', 'step_2', 'step_3', 'step_4'].forEach(audioKey => {
          try {
            this.scene.audioManager.stopSoundEffect(audioKey);
          } catch (e) {
            // Ignore errors if sound doesn't exist
          }
        });
      }
    }

    // Clear all tutorial timers
    this.tutorialTimers.forEach(timer => {
      if (timer) {
        timer.destroy();
      }
    });
    this.tutorialTimers = [];

    // Stop placeholder pulse
    this.stopPlaceholderPulse();

    // Remove keyboard event listeners
    if (this.keyboardHandler && this.scene.input.keyboard) {
      this.scene.input.keyboard.off('keydown', this.keyboardHandler);
    }

    // Clear references to prevent memory leaks
    this.howToPlayText = undefined;
    this.currentPlaceholder = undefined;
    this.gridLinesImage = undefined;
    this.endPlayButton = undefined;
    this.feedbackOverlay = undefined;
    this.numberPadContainer = undefined;
    this.numberButtons = [];
    this.backspaceButton = undefined;
    this.enterButton = undefined;
    this.decimalButton = undefined;
  }

  private getQuestionYUnscaled(): number {
    if (this.mode === 'instructions') {
      return this.isMobile ? 425 : 535;
    }
    return this.isMobile ? 420 : 535;
  }

  private isUserEnteringAnswer(): boolean {
    if (this.currentAnswer && this.currentAnswer.length > 0) return true;
    if (this.isTypingAnswer && (Date.now() - this.lastTypedAt) < this.TYPING_TIMEOUT) return true;
    return false;
  }
  
  private updateAnswerBox(lineStyle: number = 0x00CCFF, isVerticalLayout: boolean = false) {
    if (!this.answerBox || !this.currentQuestionRaw) return;
    const q = this.extractQuestion(this.currentQuestionRaw);

    // Check if question involves decimals (operands or answer)
    const isDecimal = String(q.answer).includes('.') || String(q.operand1).includes('.') || String(q.operand2).includes('.');

    // Use different dimensions based on layout type
    const boxHeight = isVerticalLayout ? 70 : 85;
    const borderPadding = isVerticalLayout ? 45 : 55;
    const gapWidth = 8;
    const lineWidth = 4;
    const linePadding = isVerticalLayout ? 12 : 15;
    const sidePadding = isVerticalLayout ? 22 : 27;
    const borderRadius = 13;
    const underlineLengthUnscaled = 40; // fixed underline length for all layouts

    const scaledBoxX = this.scene.getScaledValue(this.answerBoxCoordinates.x);
    const scaledBoxY = this.scene.getScaledValue(this.answerBoxCoordinates.y);
    const scaledBoxHeight = this.scene.getScaledValue(boxHeight);

    let scaledBoxWidth;
    if (isDecimal) {
      // For decimal questions, calculate width dynamically based on current input
      const currentLength = Math.max(1, Math.min(10, this.currentAnswer.length || 1));
      // Divide underlineLength by 1.2 to make character width more compact and better fit the text
      const charWidth = underlineLengthUnscaled / 1.5;
      const boxWidth = (charWidth * currentLength) + borderPadding;
      scaledBoxWidth = this.scene.getScaledValue(boxWidth);
    } else {
      // For non-decimal answers, compute box width based on answer digit count
      const n = this.getDigitCount(q.answer);
      const scaledGapWidth = this.scene.getScaledValue(gapWidth);
      const scaledUnderlineLength = this.scene.getScaledValue(underlineLengthUnscaled);
      const totalGapWidth = scaledGapWidth * (n - 1);
      const totalLineLength = scaledUnderlineLength * n + totalGapWidth;
      scaledBoxWidth = totalLineLength + this.scene.getScaledValue(borderPadding);
    }

    this.answerBox.clear();
    this.answerBox.lineStyle(4, lineStyle, 1);

    this.answerBox.strokeRoundedRect(
      scaledBoxX,
      scaledBoxY,
      scaledBoxWidth,
      scaledBoxHeight,
      this.scene.getScaledValue(borderRadius),
    );

    const lineColor = lineStyle;
    const y = scaledBoxY + scaledBoxHeight - this.scene.getScaledValue(linePadding);
    
    if (isDecimal) {
      // For decimal answers, draw a single long underline
      const underlineStartX = scaledBoxX + this.scene.getScaledValue(sidePadding);
      const underlineEndX = scaledBoxX + scaledBoxWidth - this.scene.getScaledValue(sidePadding);
      this.answerBox.lineStyle(lineWidth, lineColor, 1);
      this.answerBox.beginPath();
      this.answerBox.moveTo(underlineStartX, y);
      this.answerBox.lineTo(underlineEndX, y);
      this.answerBox.strokePath();
    } else {
      // For non-decimal answers, draw multiple underlines (one per digit)
      const n = this.getDigitCount(q.answer);
      const scaledGapWidth = this.scene.getScaledValue(gapWidth);
      const scaledUnderlineLength = this.scene.getScaledValue(underlineLengthUnscaled);
      const singleLineLength = scaledUnderlineLength;
      let currentX = scaledBoxX + this.scene.getScaledValue(sidePadding);
      for (let i = 0; i < n; i++) {
        this.answerBox.lineStyle(lineWidth, lineColor, 1);
        this.answerBox.beginPath();
        this.answerBox.moveTo(currentX, y);
        this.answerBox.lineTo(currentX + singleLineLength, y);
        this.answerBox.strokePath();
        currentX += singleLineLength + scaledGapWidth;
      }
    }
  }

  private createNitroAnimations() {
    const defaultFps = 8;

    const seq = (texture: string, prefix: string, start: number, end: number) =>
      this.scene.anims.generateFrameNames(texture, {
        prefix,
        start,
        end,
        zeroPad: 4,
      });

    const make = (
      { key, frames, repeat, frameRate = defaultFps, hideOnComplete = false }:
        { key: string, frames: Phaser.Types.Animations.AnimationFrame[], repeat: number, frameRate?: number, hideOnComplete?: boolean }
    ) => {
      if (!this.scene.anims.exists(key)) {
        this.scene.anims.create({ key, frames, frameRate, repeat, hideOnComplete });
      }
    };

    make({ key: 'nitro_cyan', frames: seq('nitro', 'nitro/cyan/', 1, 3), repeat: 0 });
    make({ key: 'nitro_purple', frames: seq('nitro', 'nitro/purple/', 1, 3), repeat: 0 });
    make({ key: 'nitro_red', frames: seq('nitro', 'nitro/red/', 1, 3), repeat: 0 });
    make({ key: 'nitro_blue', frames: seq('nitro', 'nitro/blue/', 1, 3), repeat: 0 });
  }

  private queueAnnouncement(message: string) {
    this.announcementQueue.push(message);
    this.processAnnouncementQueue();
  }

  private processAnnouncementQueue() {
    if (this.isAnnouncing || this.announcementQueue.length === 0) {
        return;
    }

    this.isAnnouncing = true;
    const message = this.announcementQueue.shift()!;

    announceToScreenReader(message);

    // Estimate the duration of the announcement and wait before processing next
    const words = message.split(' ').length;
    const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
    const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

    this.scene.time.delayedCall(delay, () => {
        this.isAnnouncing = false;
        
        // Refocus game container after announcement completes so Enter key works
        focusToGameContainer();
        
        this.processAnnouncementQueue();
    });
  }
}
