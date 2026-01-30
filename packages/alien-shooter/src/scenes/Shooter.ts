import { GameObjects, Math as PhaserMath } from 'phaser';
import { BaseScene, ButtonHelper, i18n, ScoreHelper, VolumeSlider, ProgressBar, ScoreCoins, setSceneBackground, SCORE_COUNTS, GameConfigManager, announceToScreenReader, QuestionSelectorHelper, getQuestionBankByName, Question, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, MULTI_DIGIT_TOPICS, MULTIVERSE_TOPICS, SCORE_COLORS } from '../config/common';
import { generateQuestionFromMultiverseSelector, generateQuestionFromSelector } from '../data/mathQuestions';
import { animateDoors, continueGameAfterWrongAnswer } from '../utils/helper';
import { MultiverseQuestionSelector, type MathFact, type StudentResponse, topicToTagsMapping, getBonusMultiverseTagsByMode } from '@k8-games/sdk/multiverse';

export type QuestionType = {
    operand1: string;
    operand2: string;
    operator: string;
    answer: string;
};

export class Shooter extends BaseScene {
    private astronaut!: GameObjects.Container;
    private targetEquation!: string;
    private targetText!: GameObjects.Text;
    private astronautCh!: GameObjects.Image;
    private asteroids: GameObjects.Container[] = [];
    private bullets: GameObjects.Shape[] = [];
    private answers: any[] = [];
    private gameSpeed: number = 0;
    private bulletSpeed: number = 10;
    private readonly NUM_COLUMNS: number = 5;
    private readonly TOTAL_TURNS: number = 10;
    private readonly COLUMN_WIDTH: number = (this.display.width - 280) / this.NUM_COLUMNS;
    private turns: number = 0;
    private gameStarted: boolean = false;
    private topic: string = '';
    private gameConfigManager!: GameConfigManager;
    private shootButton: Phaser.GameObjects.Container | null = null;
    private analyticsHelper!: AnalyticsHelper;

    // Question selector properties
    private questionSelector!: QuestionSelectorHelper;
    private currentQuestion?: Question;

    private isProcessing: boolean = false;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: GameObjects.Container;

    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    // New properties for parallax effect
    private starBackground!: GameObjects.TileSprite;
    private planetsBackground!: GameObjects.TileSprite;
    private starScrollSpeed: number = 2;
    private normalStarSpeed: number = 2;
    private fastStarSpeed: number = 5;

    // Progress bar properties
    private progressBar?: ProgressBar;

    // Score helper
    private scoreCoins!: ScoreCoins;
    private scoreHelper: ScoreHelper;
    private previousStreak: number = 0;
    private previousAstronautTexture: string = 'astronaut';

    // Timer
    // private gameStartTime: number = 0;

    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    private canShoot = true;
    private moveAccumulator: number = 0;
    private moveDebounceTimer?: number;
    private readonly MOVE_DEBOUNCE_DELAY = 250; // In millisecond, adjust as needed 

    // Multiverse Game
    private multiverseQuestionSelector: MultiverseQuestionSelector | null = null;
    // private question!: QuestionType;
    private multiverseQuestion: MathFact | null = null;
    private startTime: number = 0;

    // Continue button
    private isWaitingForContinue: boolean = false;

    constructor() {
        super('Shooter');
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || '2D_addition_upto_100';
        this.scoreHelper = new ScoreHelper(2);

        
        // Initialize question selector
        if(MULTIVERSE_TOPICS.includes(this.topic)) {
            const mode = this.gameConfigManager.get('mode');
            let tagKeys = topicToTagsMapping[this.topic];
            if ((this.topic === 'g5_g6' || this.topic === 'g7_g8') && mode) {
                tagKeys = getBonusMultiverseTagsByMode(this.topic, mode);
            }
            if(!this.multiverseQuestionSelector) {
                this.multiverseQuestionSelector = new MultiverseQuestionSelector(tagKeys);
            }
        } else {
            const questionBank = getQuestionBankByName(this.topic);
            if (!questionBank) {
                throw new Error('Question bank not found');
            }
            this.questionSelector = new QuestionSelectorHelper(questionBank, this.TOTAL_TURNS);
        }
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('starpattern', 'starpattern.png');
        scene.load.image('correct_icon', 'correct_icon.png');
        scene.load.image('planets', 'planets.png');
        scene.load.image('continue_btn_bg', 'continue_btn_bg.png');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.BACKGROUND.KEY, COMMON_ASSETS.BACKGROUND.PATH);

        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS.DOOR.PATH);
        scene.load.image("success_bg", "success_bg.png");
        scene.load.image('astronaut', 'astronaut.png');
        scene.load.image('astronaut_3', 'astronaut_streak_3x.png');
        scene.load.image('astronaut_5', 'astronaut_streak_5x.png');
        scene.load.image('astronaut_7', 'astronaut_streak_7x.png');

        scene.load.image('big_astronaut', 'big_astronaut.png');
        scene.load.image('big_astronaut_3', 'big_astronaut_streak_3x.png');
        scene.load.image('big_astronaut_5', 'big_astronaut_streak_5x.png');
        scene.load.image('big_astronaut_7', 'big_astronaut_streak_7x.png');

        // Load countdown images
        scene.load.image('countdown_1', 'countdown_1.png');
        scene.load.image('countdown_2', 'countdown_2.png');
        scene.load.image('countdown_3', 'countdown_3.png');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/blast`);
        scene.load.atlas('asteroid', 'asteroid.png', 'asteroid.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/booster`);
        scene.load.atlas('booster_anim', 'booster.png', 'booster.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/bullet`);
        scene.load.atlas('fire', 'fire.png', 'fire.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/streak_animation`);
        scene.load.atlas('streak_animation_0', 'texture-0.png', 'texture-0.json');
        scene.load.atlas('streak_animation_1', 'texture-1.png', 'texture-1.json');
        scene.load.atlas('streak_animation_2', 'texture-2.png', 'texture-2.json');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('laser-fire', 'laser-fire.mp3');
        scene.load.audio('bg-music', 'bg-music.mp3');
        scene.load.audio('incorrect-sfx', 'incorrect.mp3');
        scene.load.audio('blast-sfx', 'blast.wav');
        scene.load.audio('door_close', 'door_close.mp3');
        scene.load.audio('countdown', 'countdown.mp3');

        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    private isBigAstronautRequired(): boolean {
        return MULTI_DIGIT_TOPICS.includes(this.topic) && !!this.targetEquation && this.targetEquation.length >= 7;
    }

    init(data?: { reset?: boolean }) {
        if (data?.reset) {
            this.resetGameState();

            if (MULTIVERSE_TOPICS.includes(this.topic) && this.multiverseQuestionSelector) {
                this.multiverseQuestionSelector.reset();
            }
        }

        ProgressBar.init(this);
        ScoreCoins.init(this);

        if (!this.anims.exists('blast')) {
            const asteroidTexture = this.textures.get('asteroid');
            const allFrames = asteroidTexture.getFrameNames();
            
            // Filter out the highlighted frame
            const blastFrames = allFrames
                .filter(frameName => frameName !== 'Asteroid instance highlighted')
                .map(frameName => ({ key: 'asteroid', frame: frameName }));

            this.anims.create({
                key: 'blast',
                frames: blastFrames,
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            })
        }

        if (!this.anims.exists('booster')) {
            this.anims.create({
                key: 'booster',
                frames: 'booster_anim',
                frameRate: 24,
                repeat: -1,
                hideOnComplete: false
            })
        }

        if (!this.anims.exists('fire')) {
            this.anims.create({
                key: 'fire',
                frames: 'fire',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: false
            })
        }

        if (!this.anims.exists('power_up')) {
            let frames: Phaser.Types.Animations.AnimationFrame[] = [
                ...this.anims.generateFrameNames('streak_animation_0'),
                ...this.anims.generateFrameNames('streak_animation_1'),
                ...this.anims.generateFrameNames('streak_animation_2'),
            ]

            frames.sort((a, b) => {
                if (!a.frame || !b.frame) return 0;
                
                const aNum = Number(a.frame.toString().replace(/\D/g, ''));
                const bNum = Number(b.frame.toString().replace(/\D/g, ''));
                return aNum - bNum;
            });

            this.anims.create({
                key: 'power_up',
                frames: frames,
                frameRate: 12,
                repeat: -1,
                hideOnComplete: false
            })
        }
    }

    private resetGameState() {
        this.turns = 0;
        this.gameSpeed = 0;

        // Destroy all asteroids and bullets
        this.asteroids.forEach(asteroid => asteroid.destroy());
        this.bullets.forEach(bullet => bullet.destroy());
        this.asteroids = [];
        this.bullets = [];

        this.gameStarted = false;
        this.isProcessing = false;
        this.starScrollSpeed = this.normalStarSpeed;

        // Clear any pending announcements
        this.clearAnnouncementQueue();

        if(!MULTIVERSE_TOPICS.includes(this.topic)) {
            this.questionSelector.reset(true);
        }
        this.scoreHelper.reset();
    }

    private getStreakColor(streak: number): number {
        if (streak >= 7) return SCORE_COLORS.SEVEN_IN_A_ROW;
        if (streak >= 5) return SCORE_COLORS.FIVE_IN_A_ROW;
        if (streak >= 3) return SCORE_COLORS.THREE_IN_A_ROW;
        return SCORE_COLORS.DEFAULT;
    }

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(3);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(3);
    }

    private openDoors() {
        const countdownImg = this.addImage(this.display.width / 2, this.display.height / 2, 'countdown_3').setOrigin(0.5).setDepth(4);
        countdownImg.setScale(230/countdownImg.height);

        let count = 3;
        
        this.audioManager.playSoundEffect('countdown');
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(count > 0 ? count.toString() : '');
                count--;
                if (count > 0) {
                    this.audioManager.playSoundEffect('countdown');
                    countdownImg.setTexture(`countdown_${count}`);
                } else if (count === 0) {
                    countdownImg.destroy();
                    this.audioManager.playSoundEffect('countdown');

                    // Use animateDoors helper
                    animateDoors({
                        scene: this,
                        leftDoor: this.doorLeft,
                        rightDoor: this.doorRight,
                        open: true,
                        duration: 1000,
                        delay: 0,
                        soundEffectKey: 'door_close',
                        onComplete: () => {
                            // Add initial fly-up animation
                            this.tweens.add({
                                targets: this.astronaut,
                                y: this.getScaledValue(this.display.height - 200),
                                delay: 500,
                                duration: 1000,
                                ease: 'Back.easeInOut',
                                onComplete: () => {
                                    this.audioManager.playBackgroundMusic('bg-music');
                                    this.gameStarted = true;
                                    // this.gameStartTime = this.time.now;
                                    this.doorLeft.setVisible(false);
                                    this.doorRight.setVisible(false);
                                    
                                    // Add a small delay to ensure proper announcement order
                                    this.time.delayedCall(500, () => {
                                        this.queueAnnouncement(i18n.t('common.astronautText', { problem: this.targetEquation.toString().replace('-', '−') }));
                                        this.spawnAsteroids();
                                        this.announceBotLocation();
                                    });
                                }
                            });
                        }
                    });
                }
            },
            callbackScope: this,
            repeat: 3
        });
    }

    create() {
        // focus to game container
        focusToGameContainer();

        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
            if (MULTIVERSE_TOPICS.includes(this.topic) && this.topic !== 'grade3_topic2') {
                this.analyticsHelper?.createSession('game.multiverse.astro_math');
            } else {
                this.analyticsHelper?.createSession('game.astro_math.default');
            }
        } else {
            console.error('AnalyticsHelper not found');
        }

        setSceneBackground('assets/images/common/bg.png');
        this.createDoors();
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY);
        bg.setDepth(-3);
        this.audioManager.initialize(this);

        // Replace static starpattern with TileSprite for scrolling effect
        this.starBackground = this.addTileSprite(
            this.display.width / 2,
            this.display.height / 2,
            'starpattern'
        );
        this.starBackground.setDepth(-3);
        this.planetsBackground = this.addTileSprite(
            this.display.width / 2,
            this.display.height / 2,
            'planets'
        );
        this.planetsBackground.setDepth(-3);

        // Create progress bar
        this.progressBar = new ProgressBar(this, 'dark', i18n);
        this.progressBar.create(
            this.getScaledValue(this.display.width / 2),
            this.getScaledValue(70),
        );

        // Pause button
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.pause();
                this.audioManager.setMute(true);
                this.scene.launch("PauseScene", { parentScene: "Shooter" });
            },
        }).setName('pause_btn');

        // Mute button
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 238, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 218,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });

        // Help button
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t('common.help'),
            x: this.display.width - 54,
            y: 294,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.pause();
                this.scene.launch("InstructionsScene", { parentScene: "Shooter" });
                this.scene.bringToTop("InstructionsScene");
            },
        });

        // Scoreboard
        this.scoreCoins = new ScoreCoins(this, this.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(
            this.getScaledValue(87),
            this.getScaledValue(62)
        );

        // Set up initial target number and first wave
        let questionData;
        if(MULTIVERSE_TOPICS.includes(this.topic)) {
            questionData = generateQuestionFromMultiverseSelector(this.multiverseQuestionSelector!);
            if(questionData?.multiverseQuestion) {
                this.multiverseQuestion = questionData.multiverseQuestion;
            }
        } else {
            questionData = generateQuestionFromSelector(this.questionSelector);
        }
        if (!questionData) {
            // No questions available, end game
            this.gameOver();
            return;
        }
        this.currentQuestion = questionData.currentQuestion;
        const num2 = i18n.formatNumber(questionData.questionData.num2);
        const formattedNum2 = questionData.questionData.num2 < 0 ? `(${num2})` : num2;
        this.targetEquation = `${i18n.formatNumber(questionData.questionData.num1)} ${questionData.questionData.operator} ${formattedNum2}`;
        this.answers = questionData.questionData.options;
        this.startTime = Date.now();
        // Check if device is touchscreen
        const isMobile = () => {
        return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            ((navigator as any).msMaxTouchPoints > 0));
    };
        // Shoot button - only show on mobile devices or iPads
        if (isMobile()) {
            this.shootButton = ButtonHelper.createButton({
                scene: this,
                imageKeys: {
                    default: BUTTONS.BUTTON.KEY,
                    hover: BUTTONS.BUTTON_HOVER.KEY,
                    pressed: BUTTONS.BUTTON_PRESSED.KEY
                },
                text: i18n.t('game.beam'),
                label: i18n.t('game.beam'),
                textStyle: {
                    font: "700 32px Exo",
                    color: '#FFFFFF',
                },
                imageScale: 0.8,
                x: this.display.width / 2,
                y: this.display.height - 55,
                onClick: () => {
                    this.shoot();
                }
            });
        }

        // Add the astronaut at the bottom, starting in the middle column
        const middleColumn = Math.floor(this.NUM_COLUMNS / 2);
        this.astronaut = this.add.container(
            this.getScaledValue(140 + (middleColumn * this.COLUMN_WIDTH) + (this.COLUMN_WIDTH / 2)),
            this.getScaledValue(this.display.height + 200) // Start below the screen
        );

        // Create a container for the floating animation
        const floatingContainer = this.add.container(0, 0);
        this.astronaut.add(floatingContainer);

        const booster = this.addSprite(-45, 80, 'booster_anim').setScale(0.7);
        booster.play('booster');
        floatingContainer.add(booster);

        const initialAstronautTexture = this.isBigAstronautRequired() ? 'big_astronaut' : 'astronaut';
        this.astronautCh = this.addImage(0, 0, initialAstronautTexture).setScale(0.7);
        floatingContainer.add(this.astronautCh);
        const fire = this.addSprite(
            2,
            -150,
            'fire'
        ).setOrigin(0.5);
        fire.setVisible(false);
        floatingContainer.add(fire);

        // Add floating animation to the floating container
        this.addFloatingAnimation(floatingContainer);

        // Add target number display
        const targetTextLength = this.targetEquation.length;
        const targetFontSize = MULTI_DIGIT_TOPICS.includes(this.topic) ? 23 : (targetTextLength >= 7 ? 18 : 23);
        
        this.targetText = this.addText(10, 50, `${this.targetEquation}`, {
            fontFamily: 'Exo',
            fontStyle: 'bold',
            fontSize: targetFontSize,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        floatingContainer.add(this.targetText);
        this.astronaut.setDepth(-2);

        // Ensure mascot reflects current question size on start
        this.updateMascot();

        // Make astronaut focusable for keyboard users
        const astronautOverlay = new ButtonOverlay(this, this.astronaut, {
            label: i18n.t('common.astronautAria'),
            ariaLive: 'off',
        });
        (this.astronaut as any).buttonOverlay = astronautOverlay;

        // Capture Space/Enter at document level so it works even if overlay eats the event
        const docKeydownHandler = (ev: KeyboardEvent) => {
            const key = ev?.key;
            const isSpace = key === ' ' || key === 'Spacebar' || key === 'Space';
            const isEnter = key === 'Enter';
            if ((isSpace || isEnter) && this.gameStarted && this.isAstronautFocused()) {
                ev.preventDefault();
                ev.stopPropagation();
                this.shoot();
            }
        };
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', docKeydownHandler, true);
            this.events.once('shutdown', () => {
                try { document.removeEventListener('keydown', docKeydownHandler, true); } catch {}
            });
            this.events.once('destroy', () => {
                try { document.removeEventListener('keydown', docKeydownHandler, true); } catch {}
            });
        }

        // Set up keyboard controls
        this.input.keyboard?.on('keydown-LEFT', () => {
            if (!this.gameStarted || this.volumeSlider.isOpen()) return;
            if (!this.isAstronautFocused()) this.focusAstronaut();
            this.queueMove(-1);
        });

        this.input.keyboard?.on('keydown-RIGHT', () => {
            if (!this.gameStarted || this.volumeSlider.isOpen()) return;
            if (!this.isAstronautFocused()) this.focusAstronaut();
            this.queueMove(1);
        });

        // Shoot with Space ONLY when astronaut is focused
        this.input.keyboard?.on('keydown-SPACE', () => {
            if (this.gameStarted && this.isAstronautFocused()) this.shoot();
        });

        // Shoot with Enter ONLY when astronaut is focused
        this.input.keyboard?.on('keydown-ENTER', () => {
            if (this.gameStarted && this.isAstronautFocused()) this.shoot();
        });

        this.input.keyboard?.on('keydown-UP', () => {
            if (this.gameStarted && this.isAstronautFocused()) this.shoot();
        });

        // Add touch controls
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            if (!this.gameStarted) return;

            // Dont move the player on clicking interactive elements
            if (gameObjects.length > 0) return;

            // First check if we clicked the shoot button (only if it exists)
            if (this.shootButton) {
                const shootButtonBounds = this.shootButton.getBounds();
                if (shootButtonBounds.contains(pointer.x, pointer.y)) {
                    return; // Exit early if we clicked the shoot button
                }
            }

            // Move left or right based on screen position
            const screenWidth = this.display.width;
            if ((pointer.x / this.display.scale) < screenWidth / 2) {
                this.movePlayer(-1);
            } else {
                this.movePlayer(1);
            }
        });

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });

        this.openDoors();
    }

    private focusAstronaut(): void {
        const overlay: ButtonOverlay | undefined = (this.astronaut as any)?.buttonOverlay;
        if (overlay) {
            overlay.focus();
        }
    }

    private queueMove(direction: number): void {
        this.moveAccumulator += direction;
        if (this.moveDebounceTimer) {
            clearTimeout(this.moveDebounceTimer);
        }
        this.moveDebounceTimer = setTimeout(() => {
            if (this.moveAccumulator !== 0) {
                this.movePlayer(this.moveAccumulator);
                this.moveAccumulator = 0;
            }
        }, this.MOVE_DEBOUNCE_DELAY);
    }

    private spawnAsteroids() {
        const baseX = 140;
        // Spawn one asteroid in each column
        // Determine a uniform font size based on the longest formatted number
        const uniformFontSize = (this.answers || []).some(a => i18n.formatNumber(a.number).length >= 4) ? 23 : 40;
        for (let i = 0; i < this.NUM_COLUMNS; i++) {
            const answer = this.answers[i];
            // Calculate x position to center asteroid in each column
            const x = baseX + (i * this.COLUMN_WIDTH) + (this.COLUMN_WIDTH / 2);
            let y = 230;
            if (i % 2 === 0) {
                y = 230 + 40;
            } else {
                y = 230;
            }

            // Create a container to hold both asteroid and text
            const container = this.add.container(this.getScaledValue(x), this.getScaledValue(-100));

            // Create a container for the floating animation
            const floatingContainer = this.add.container(0, 0);
            container.add(floatingContainer);

            // Add asteroid to floating container
            const asteroid = this.addSprite(0, 0, 'asteroid');
            asteroid.setScale(0.7);
            floatingContainer.add(asteroid);

            const numberText = i18n.formatNumber(answer.number);
            const fontSize = uniformFontSize;
            
            const equationText = this.addText(0, 25, numberText, {
                font: `700 ${fontSize}px Exo`,
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }).setOrigin(0.5);
            floatingContainer.add(equationText);

            // Make the container interactive for clicking
            container.setSize(this.getScaledValue(asteroid.width * 0.35), this.getScaledValue(asteroid.height * 0.35));
            container.setInteractive({ useHandCursor: true });
            
            // Add hover effects
            container.on('pointerover', () => {
                this.input.setDefaultCursor('pointer');
                container.setScale(1.05);
                // Dont highlight the asteroid if it is correct and the continue button is not visible
                if (!answer.isCorrect || (answer.isCorrect && !this.isWaitingForContinue)) {   
                    asteroid.setFrame('Asteroid instance highlighted');
                }
            });
            
            container.on('pointerout', () => {
                this.input.setDefaultCursor('default');
                container.setScale(1.0);
                asteroid.setFrame(0);
            });
            
            // Add click handler for teleport and shoot
            container.on('pointerdown', () => {
                if (!this.gameStarted || this.isProcessing) return;
                this.teleportAndShoot(container);
            });

            this.tweens.add({
                targets: container,
                y: this.getScaledValue(y),
                duration: 500,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    // Add floating animation to the floating container
                    this.addAsteroidFloatingAnimation(floatingContainer);
                    // Announce asteroid with number for screen readers
                    this.queueAnnouncement(i18n.t('common.asteroidText', { number: answer.number }));
                    // new TextOverlay(this, equationText, { label: answer.number.toString() });
                }
            })

            // Store the container as the asteroid
            container.setData('question', answer);
            container.setDepth(-1);
            this.asteroids.push(container);
        }
    }

    override update(): void {
        if (!this.gameStarted) return; // Stop game updates when not started or time is up

        // Update star background scrolling for parallax effect
        if (this.starBackground) {
            this.starBackground.tilePositionY -= this.starScrollSpeed;
        }
        if (this.planetsBackground) {
            this.planetsBackground.tilePositionY -= (this.starScrollSpeed / 3);
        }

        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }

        // Move asteroids
        this.asteroids.forEach((asteroid, index) => {
            asteroid.y += this.getScaledValue(this.gameSpeed);

            // Check if asteroid is off screen
            if (asteroid.y > this.getScaledValue(this.display.height - 400)) {
                asteroid.destroy();
                this.asteroids.splice(index, 1);
            }
        });

        if (this.isProcessing) return;

        // Move bullets
        this.bullets.forEach((bullet, bulletIndex) => {
            bullet.y -= this.getScaledValue(this.bulletSpeed);

            // Check for collisions with asteroids
            this.asteroids.forEach((asteroid, asteroidIndex) => {
                if (PhaserMath.Distance.Between(
                    bullet.x, bullet.y,
                    asteroid.x, asteroid.y
                ) < this.getScaledValue(30)) {
                    // Prevent spamming shoot
                    this.isProcessing = true;
                    ++this.turns;

                    // Check if the answer is correct
                    const asteroidData = asteroid.getData('question');
                    const gameLevelInfo = MULTIVERSE_TOPICS.includes(this.topic) && this.topic !== 'grade3_topic2' ? 'game.multiverse.astro_math' : 'game.astro_math.default';
                    // Only destroy both bullet and asteroid if the equation is correct
                    if (asteroidData && asteroidData.isCorrect) {
                        this.analyticsHelper?.createTrial({
                            questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                            achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                            questionText: this.targetEquation,
                            isCorrect: true,
                            questionMechanic: 'default',
                            gameLevelInfo: gameLevelInfo,
                            studentResponse: asteroidData?.number,
                            studentResponseAccuracyPercentage: '100%',
                            optionsDisplay: this.answers.map(answer => ({ option: answer.number.toString(), isCorrect: answer.isCorrect })),
                        });

                        const endTime = Date.now();
                        this.scoreHelper.answerCorrectly();
                        // Track correct answer in question selector
                        if(!MULTIVERSE_TOPICS.includes(this.topic)) {
                            this.questionSelector.answerCorrectly();
                        }
                        // Announce correct answer for screen readers
                        this.queueAnnouncement(i18n.t('common.correct'));
                        this.scoreCoins.updateScoreDisplay(true);

                        // Update progress bar
                        const progress = this.turns / this.TOTAL_TURNS;
                        this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());

                        // Destroy the bullet
                        bullet.destroy();
                        this.bullets.splice(bulletIndex, 1);

                        // Destroy the asteroid
                        const floatingContainer = asteroid.getAt(0) as GameObjects.Container;
                        const asteroidText = floatingContainer.getAt(1) as GameObjects.Text;
                        asteroidText.destroy();

                        const asteroidItem = floatingContainer.getAt(0) as GameObjects.Sprite;
                        asteroidItem.play('blast');
                        this.audioManager.playSoundEffect('blast-sfx');

                        asteroidItem.once('animationcomplete', () => {
                            asteroid.destroy();
                            this.asteroids.splice(asteroidIndex, 1);
                            this.isProcessing = false;

                            // Make existing asteroids fall faster
                            this.gameSpeed = 10; // Make asteroids fall faster during transition


                            // Check if the multiplier has updated
                            const currentStreak = this.scoreHelper.getCurrentStreak();
                            this.previousStreak = currentStreak;
                            let response;
                            if(MULTIVERSE_TOPICS.includes(this.topic)) {
                                response = this.multiverseQuestionSelector!.createStudentResponse(
                                    this.multiverseQuestion!,
                                    this.startTime - endTime,
                                    true,
                                );
                            }
                            if (this.scoreHelper.showStreakAnimation()) {
                                this.queueAnnouncement(i18n.t('game.inARow', { count: currentStreak }));
                                this.showSuccessMascot(response);
                                return;
                            } else {
                                // Update target and spawn new wave
                                this.updateTargetAndQuestions(response);
                            }
                        });
                    } else {
                        // If wrong equation, just destroy the bullet
                        bullet.destroy();
                        // Announce incorrect answer for screen readers
                        this.queueAnnouncement(i18n.t('common.incorrect'));
                        this.bullets.splice(bulletIndex, 1);
                        let response = undefined;
                        const endTime = Date.now();
                            if(MULTIVERSE_TOPICS.includes(this.topic)) {
                                response = this.multiverseQuestionSelector!.createStudentResponse(
                                    this.multiverseQuestion!,
                                    this.startTime - endTime,
                                    false,
                                );
                            }
                        this.flashWrongAsteroid(asteroid, asteroidIndex, () => {
                            this.isProcessing = false;
                            // Make existing asteroids fall faster
                            this.gameSpeed = 10; // Make asteroids fall faster during transition
                            // Update target and spawn new wave
                            this.updateTargetAndQuestions(response);
                        });

                        this.analyticsHelper?.createTrial({
                            questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                            achievedPoints: 0,
                            questionText: this.targetEquation,
                            isCorrect: false,
                            questionMechanic: 'default',
                            gameLevelInfo: gameLevelInfo,
                            studentResponse: asteroidData?.number,
                            studentResponseAccuracyPercentage: '0%',
                            optionsDisplay: this.answers.map(answer => ({ option: answer.number.toString(), isCorrect: answer.isCorrect })),
                        });

                        this.audioManager.playSoundEffect('incorrect-sfx');
                        this.scoreHelper.answerIncorrectly();
                        // Track incorrect answer in question selector
                        if (this.currentQuestion) {
                            if(!MULTIVERSE_TOPICS.includes(this.topic)) {
                                this.questionSelector.answerIncorrectly(this.currentQuestion);
                            }
                        }

                        const hasStreakBroken = this.previousStreak >= 3;
                        if (hasStreakBroken) {
                            const floatingContainer = this.astronaut.getAt(0) as GameObjects.Container;
                            const astronautSprite = floatingContainer.getAt(1) as GameObjects.Sprite;
                            const textTarget = floatingContainer.getAt(3) as GameObjects.Text;
                            const boosterSprite = floatingContainer.getAt(0) as GameObjects.Sprite;

                            // Reset astronaut texture
                            const resetTexture = this.isBigAstronautRequired() ? 'big_astronaut' : 'astronaut';
                            astronautSprite.setTexture(resetTexture).setScale(0.7);

                            // Reset text positioning to default (center)
                            textTarget.x = this.getScaledValue(10);
                            textTarget.y = this.getScaledValue(50);

                            // Reset booster positioning to default
                            boosterSprite.x = this.getScaledValue(-45);
                            boosterSprite.y = this.getScaledValue(80);
                        }
                        this.previousStreak = 0;
                        this.previousAstronautTexture = this.isBigAstronautRequired() ? 'big_astronaut' : 'astronaut';
                        this.scoreCoins.updateScoreDisplay(false, hasStreakBroken);
                        const progress = this.turns / this.TOTAL_TURNS;
                        this.progressBar?.drawProgressFill(progress, this.scoreHelper.getCurrentStreak());
                    }
                }
            });

            // Remove bullets that are off screen
            if (bullet.y < 0) {
                bullet.destroy();
                this.bullets.splice(bulletIndex, 1);
            }
        });
    }

    private showSuccessMascot(response?: StudentResponse) {
        this.time.delayedCall(700, () => {
            this.scene.pause();
            const celebTexture = this.previousAstronautTexture.replace(/^big_/, '');
            this.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                streakColor: this.getStreakColor(this.scoreHelper.getCurrentStreak()),
                progress: this.turns / this.TOTAL_TURNS,
                previousAstronautTexture: celebTexture,
                callback: () => {
                    this.updateTargetAndQuestions(response);
                    this.updateMascot();
                    // Position astronaut below screen for re-entry
                    this.astronaut.y = this.getScaledValue(this.display.height + 200);
                    // Fly up animation
                    this.tweens.add({
                        targets: this.astronaut,
                        y: this.getScaledValue(this.display.height - 200),
                        duration: 1000,
                        ease: 'Back.easeInOut'
                    });
                }
            });
            this.scene.bringToTop('CelebrationScene');
        });
    }

    private updateMascot() {
        const currentStreak = this.scoreHelper.getCurrentStreak();
        const floatingContainer = this.astronaut.getAt(0) as GameObjects.Container;
        const boosterSprite = floatingContainer.getAt(0) as GameObjects.Sprite;
        const astronautSprite = floatingContainer.getAt(1) as GameObjects.Sprite;
        const textTarget = floatingContainer.getAt(3) as GameObjects.Text;
        const isBig = this.isBigAstronautRequired();
        const basePrefix = isBig ? 'big_' : '';
        let textureKey = `${basePrefix}astronaut`;
        if (currentStreak >= SCORE_COUNTS[2]) {
            textureKey = `${basePrefix}astronaut_7`;
            textTarget.x = this.getScaledValue(5);
            textTarget.y = this.getScaledValue(40);
            boosterSprite.x = this.getScaledValue(-55);
            boosterSprite.y = this.getScaledValue(60);
        } else if (currentStreak >= SCORE_COUNTS[1]) {
            textureKey = `${basePrefix}astronaut_5`;
            textTarget.x = this.getScaledValue(8);
            textTarget.y = this.getScaledValue(40);
            boosterSprite.x = this.getScaledValue(-60);
            boosterSprite.y = this.getScaledValue(45);
        } else if (currentStreak >= SCORE_COUNTS[0]) {
            textureKey = `${basePrefix}astronaut_3`;
            textTarget.y = this.getScaledValue(45);
            boosterSprite.x = this.getScaledValue(-55);
            boosterSprite.y = this.getScaledValue(60);
        }
        if (isBig) {
            this.targetText.x = this.getScaledValue(0);
        } else {
            this.targetText.x = this.getScaledValue(10);
        }
        astronautSprite.setTexture(textureKey).setScale(0.7);
        this.previousAstronautTexture = textureKey;
    }

    private gameOver(response?: StudentResponse) {
        if(MULTIVERSE_TOPICS.includes(this.topic)) {
            // To send the last submitted response before game over.
            generateQuestionFromMultiverseSelector(this.multiverseQuestionSelector!, response);
        }
        // Clean up all game objects
        this.asteroids.forEach(asteroid => asteroid.destroy());
        this.astronaut.destroy();
        this.bullets.forEach(bullet => bullet.destroy());
        this.asteroids = [];
        this.bullets = [];
        // Stop any playing sounds
        // this.audioManager.stopAll();

        // Game Over handling here
        this.scoreHelper.setPlannedTotalQuestions(this.TOTAL_TURNS);
        const finalScore = this.scoreHelper.endGame();

        // Calculate elapsed time in mm:ss format
        // const elapsedTime = this.time.now - this.gameStartTime;
        // const minutes = Math.floor(elapsedTime / 60000);
        // const seconds = Math.floor((elapsedTime % 60000) / 1000);
        // const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.time.delayedCall(2000, () => {
            // Stop asteroid movement
            this.gameSpeed = 0;
            this.starScrollSpeed = 0;

            this.closeDoors(finalScore);
        });

        return;
    }

    private closeDoors(finalScore: number) {
        this.doorLeft.setVisible(true);
        this.doorRight.setVisible(true);
        // this.audioManager.setMusicVolume(0.2);
        animateDoors({
            scene: this,
            leftDoor: this.doorLeft,
            rightDoor: this.doorRight,
            open: false,
            duration: 1000,
            delay: 0,
            soundEffectKey: 'door_close',
            onComplete: () => {
                // Send data to ScoreBoard scene
                this.scene.start('Scoreboard', {
                    rounds: this.scoreHelper.getCorrectAnswers(),
                    totalRounds: this.scoreHelper.getTotalQuestions(),
                    score: finalScore
                });
            }
        });
    }

    private updateTargetAndQuestions(response?: StudentResponse) {
        this.startTime = Date.now();
        this.isProcessing = true;
        // Check if this was the final turn or if question selector is complete
        if (this.turns >= this.TOTAL_TURNS || (!MULTIVERSE_TOPICS.includes(this.topic) && this.questionSelector.isGameCompleted())) {
            // Make existing asteroids fall faster
            this.gameSpeed = 10; // Make asteroids fall faster during transition

            // Speed up star scrolling when asteroids fall faster
            this.starScrollSpeed = this.fastStarSpeed;
            // Add delay before game over to allow for effects to complete
            const delay = this.scoreHelper.getCurrentStreak() === this.TOTAL_TURNS ? 0 : 1000;
            this.time.delayedCall(delay, () => {
                this.gameOver(response);
            });
            return;
        }

        // Generate a new question from the question bank
        let questionData;
        if(MULTIVERSE_TOPICS.includes(this.topic)) {
            questionData = generateQuestionFromMultiverseSelector(this.multiverseQuestionSelector!, response);
            if(questionData?.multiverseQuestion) {
                this.multiverseQuestion = questionData.multiverseQuestion;
            }
        } else {
            questionData = generateQuestionFromSelector(this.questionSelector);
        }
        if (!questionData) {
            // No more questions available, end game
            this.gameOver();
            return;
        }
        this.currentQuestion = questionData.currentQuestion;

        const num2 = i18n.formatNumber(questionData.questionData.num2);
        const formattedNum2 = questionData.questionData.num2 < 0 ? `(${num2})` : num2;
        this.targetEquation = `${i18n.formatNumber(questionData.questionData.num1)} ${questionData.questionData.operator} ${formattedNum2}`;

        // Generate new questions for the new target
        this.answers = questionData.questionData.options;

        // Speed up star scrolling when asteroids fall faster
        this.starScrollSpeed = this.fastStarSpeed;

        // After a longer delay to ensure asteroids fall off screen, spawn new wave and reset speed
        this.time.delayedCall(700, () => {
            // Clear announcement queue except for correct/incorrect announcements
            this.clearAnnouncementQueue(true);

            // Destroy any remaining asteroids before spawning new ones
            this.asteroids.forEach(asteroid => asteroid.destroy());
            this.asteroids = [];

            this.gameSpeed = 0;
            this.starScrollSpeed = this.normalStarSpeed;
            this.spawnAsteroids();
            // Update target display after asteroids are cleared
            const targetTextLength = this.targetEquation.length;
            const targetFontSize = MULTI_DIGIT_TOPICS.includes(this.topic) ? 23 : (targetTextLength >= 7 ? 18 : 23);
            this.targetText.setText(`${this.targetEquation}`);
            this.targetText.setFontSize(targetFontSize);
            // Refresh mascot in case question length changed variant
            this.updateMascot();
            this.queueAnnouncement(i18n.t('common.astronautText', { problem: this.targetEquation.toString().replace('-', '−') }));
            this.announceBotLocation();
            this.isProcessing = false;
        });
    }

    private movePlayer(direction: number) {
        if (this.tweens.isTweening(this.astronaut) || this.isWaitingForContinue) {
            return;
        }
        this.canShoot = false;

        const currentX = this.astronaut.x / this.display.scale;
        let newX = currentX + (direction * this.COLUMN_WIDTH);

        while (newX < this.COLUMN_WIDTH / 2) {
            direction++;
            newX = currentX + (direction * this.COLUMN_WIDTH);
        }
        while (newX > this.display.width - (this.COLUMN_WIDTH / 2)) {
            direction--;
            newX = currentX + (direction * this.COLUMN_WIDTH);
        }
        // Keep the astronaut within screen bounds (half a column width from edges)
        if (newX >= (this.COLUMN_WIDTH - 20) / 2 && newX <= this.display.width - this.COLUMN_WIDTH / 2) {

            // Announce movement direction
            const directionText = direction > 0 ? i18n.t('common.right') : i18n.t('common.left');
            this.queueAnnouncement(directionText);

            // Stop any ongoing animations
            this.tweens.killTweensOf(this.astronaut);

            // Move the astronaut with smoother easing
            this.tweens.add({
                targets: this.astronaut,
                x: newX * this.display.scale,
                duration: 50,
                ease: 'Cubic.easeInOut',
                onComplete: () => {
                    this.canShoot = true;
                    // Announce bot location after movement
                    this.announceBotLocation();
                }
            });
        } else {
            this.canShoot = true;
        }
    }

    private shoot() {
        if (this.isProcessing || !this.canShoot) return;
        this.canShoot = false;
        // Play laser sound
        this.audioManager.playSoundEffect('laser-fire');

        const floatingContainer = this.astronaut.getAt(0) as GameObjects.Container;
        const fire = floatingContainer.getAt(2) as GameObjects.Sprite;
        fire.setVisible(true);
        fire.play('fire');

        // Create a bullet using a circle
        const bullet = this.addCircle(
            (this.astronaut.x) / this.display.scale,
            (this.astronaut.y) / this.display.scale - 20,
            3,
            0xffff00,
            1
        );
        bullet.setAlpha(0.001);
        this.bullets.push(bullet);
    }

    private teleportAndShoot(asteroid: GameObjects.Container) {
        if (this.isProcessing || !this.canShoot || this.isWaitingForContinue) return;
        
        // Stop any ongoing astronaut animations
        this.tweens.killTweensOf(this.astronaut);
        
        // Calculate the x position directly under the asteroid
        const asteroidX = asteroid.x;
        
        // Teleport astronaut instantly to the asteroid's x position
        this.astronaut.x = asteroidX;
        
        // Reset cursor to default after click
        this.input.setDefaultCursor('default');
        asteroid.setScale(1.0);
        
        // Announce the teleport action
        const asteroidData = asteroid.getData('question');
        if (asteroidData) {
            this.queueAnnouncement(i18n.t('common.botLocation', { number: asteroidData.number }));
        }
        
        // Automatically shoot after teleporting
        this.shoot();
    }

    private addFloatingAnimation(container: GameObjects.Container) {
        // Create a continuous floating motion
        this.tweens.add({
            targets: container,
            x: this.getScaledValue(10),
            y: -this.getScaledValue(5),
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    private addAsteroidFloatingAnimation(container: GameObjects.Container) {
        // Create a continuous floating motion with slightly different timing for each asteroid
        const duration = 2000 + Math.random() * 1000; // Random duration between 2000-3000ms
        const xOffset = this.getScaledValue(10 + Math.random() * 10); // Random x offset between 5-10
        const yOffset = this.getScaledValue(10 + Math.random() * 10); // Random y offset between 3-7

        this.tweens.add({
            targets: container,
            x: xOffset,
            y: -yOffset,
            duration: duration,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.canShoot = true;
    }

    private flashWrongAsteroid(
        asteroid: GameObjects.Container,
        asteroidIndex: number,
        onAsteroidDestroyed: () => void
    ) {
        // If the asteroid is already being flashed, don't start a new animation
        if (asteroid.getData('isWrongAsteroidAnimationActive')) {
            return;
        }

        const floatingContainer = asteroid.getAt(0) as GameObjects.Container;

        // Mark the asteroid as being flashed
        asteroid.setData('isWrongAsteroidAnimationActive', true);

        // Create a red overlay sprite that matches the asteroid
        const overlay = this.addSprite(0, 0, 'asteroid')
            .setScale(0.7)  // Match the asteroid's scale
            .setTint(0xff0000)  // Make it red
            .setAlpha(0.5);  // Make it semi-transparent

        floatingContainer.add(overlay);

        // Flash animation
        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: 200,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                // Disable and hide beam button
                if(this.shootButton) {
                    ButtonHelper.disableButton(this.shootButton!);
                    this.shootButton.setVisible(false);
                }
                // Get the asteroid container and elements
                const floatingContainer = asteroid.getAt(0) as GameObjects.Container;
                const asteroidText = floatingContainer.getAt(1) as GameObjects.Text;
                this.isWaitingForContinue = true;
                
                // Find the correct asteroid and add green circle indicator
                let correctAsteroidIndicator: GameObjects.Graphics | null = null;
                const correctAsteroid = this.asteroids.find(ast => {
                    const astData = ast.getData('question');
                    return astData && astData.isCorrect;
                });
                
                if (correctAsteroid) {
                    const correctFloatingContainer = correctAsteroid.getAt(0) as GameObjects.Container;
                    correctAsteroidIndicator = this.add.graphics();
                    correctAsteroidIndicator.lineStyle(this.getScaledValue(6), 0x14DF06, 1);
                    correctAsteroidIndicator.strokeCircle(this.getScaledValue(-1), this.getScaledValue(22), this.getScaledValue(65)); // Radius 67.5px
                    correctAsteroidIndicator.setAlpha(0);

                    correctFloatingContainer.add(correctAsteroidIndicator);

                    this.tweens.add({
                        targets: correctAsteroidIndicator,
                        alpha: 1,
                        duration: 100,
                        ease: 'Sine.easeInOut'
                    });
                }
                
                continueGameAfterWrongAnswer(this, () => {
                    this.isWaitingForContinue = false;
                    // Re-enable and show beam button
                    if(this.shootButton) {
                        ButtonHelper.enableButton(this.shootButton!);
                        this.shootButton.setVisible(true);
                    }
                    // Destroy the green circle indicator
                    if (correctAsteroidIndicator) {
                        correctAsteroidIndicator.destroy();
                    }
                    // Destroy the asteroid text   
                    asteroidText.destroy();
                    asteroid.destroy();
                    this.asteroids.splice(asteroidIndex, 1);
                    overlay.destroy();
                    onAsteroidDestroyed();
                })
            }
        });

        // Add a small shake effect
        this.tweens.add({
            targets: floatingContainer,
            x: floatingContainer.x + this.getScaledValue(5),
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                // Reset the flashing state when animation is complete
                asteroid.setData('isWrongAsteroidAnimationActive', false);
            }
        });
    }

    // private showContinueButton(onContinue: () => void): void {
    //     const continueButton = ButtonHelper.createButton({
    //         scene: this,
    //         imageKeys: {
    //             default: BUTTONS.BUTTON.KEY,
    //             hover: BUTTONS.BUTTON_HOVER.KEY,
    //             pressed: BUTTONS.BUTTON_PRESSED.KEY
    //         },
    //         text: "Continue",
    //         label: "Continue",
    //         textStyle: {
    //             font: "700 24px Exo",
    //             color: '#FFFFFF'
    //         },
    //         imageScale: 0.8,
    //         x: this.display.width / 2,
    //         y: this.display.height - 100, 
    //         onClick: () => {
    //             onContinue();
    //             continueButton.destroy();
    //         }
    //     });
    // }

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

        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }

    private clearAnnouncementQueue(keepCorrectIncorrect: boolean = false) {
        if (keepCorrectIncorrect) {
            // Keep only correct/incorrect announcements and streak announcements
            this.announcementQueue = this.announcementQueue.filter(message =>
                message.includes(i18n.t('common.correct')) ||
                message.includes(i18n.t('common.incorrect')) ||
                message.includes('Progress bar: ') ||
                message.includes(' in a row')
            );
        } else {
            // Clear all announcements
            this.announcementQueue = [];
        }
    }

    private announceBotLocation() {
        if (!this.asteroids.length) return;

        // Get the astronaut's x position
        const astronautX = this.astronaut.x / this.display.scale;

        // Find the closest asteroid to the astronaut
        let closestAsteroid: GameObjects.Container | null = null;
        let minDistance = Infinity;

        for (const asteroid of this.asteroids) {
            const asteroidX = asteroid.x / this.display.scale;
            const distance = Math.abs(astronautX - asteroidX);

            if (distance < minDistance) {
                minDistance = distance;
                closestAsteroid = asteroid;
            }
        }

        if (closestAsteroid) {
            const asteroidData = closestAsteroid.getData('question');
            if (asteroidData) {
                this.queueAnnouncement(i18n.t('common.botLocation', { number: asteroidData.number }));
            }
        }
    }

    // Helper to determine if astronaut's overlay currently has DOM focus
    private isAstronautFocused(): boolean {
        try {
            const overlay: ButtonOverlay | undefined = (this.astronaut as any)?.buttonOverlay;
            if (!overlay || !overlay.element) return false;
            return typeof document !== 'undefined' && document.activeElement === overlay.element;
        } catch { return false; }
    }
} 