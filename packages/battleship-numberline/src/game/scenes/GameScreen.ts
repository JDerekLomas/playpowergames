import { Marker, UIUtils } from '../utils/UIUtils';
import { BaseScene } from './BaseScene';
import { GameScreenConfig as GameConfig } from '../config/GameScreenConfig';
import { AnimationManager } from '../managers/AnimationManager';
import { AnimationPlayer } from '../managers/AnimationPlayer';
import { GameplayManager, topics } from '../managers/GameplayManager';
import { InputManager } from '../managers/InputManager';
import { CommonConfig } from '../config/CommonConfig';
import { TypingModule } from '../objects/TypingModule';
import { QuestionData } from '../interfaces/gameplay';
import { ButtonHelper, ExpressionUtils, i18n, ProgressBar, SCORE_COUNTS, ScoreCoins, setSceneBackground, TextOverlay, VolumeSlider, announceToScreenReader, ImageOverlay, ButtonOverlay, focusToGameContainer, AnalyticsHelper } from '@k8-games/sdk';
import { AccuracyBar } from '../objects/AccuracyBar';
import { Tutorial } from '../objects/Tutorial';
import { CountdownUtils } from '../utils/CountdownUtils';
import { parseFractionString } from '../utils/parseFractionString';
import { DoorUtils } from '../utils/DoorUtils';
import { getSharkAnnouncement } from '../utils/sharkAnnouncement';
import { formatMathExpression } from '../utils/parseExpression';
import { computeFractionDigitMask } from '../utils/fractionMask';

const {
    ASSETS: {
        KEYS: {
            FONT: fontKeys,
            IMAGE: { BUTTON: buttonKeys, ICON: iconKeys },
        },
    },
} = CommonConfig;

export class GameScreen extends BaseScene {
    private leftMarker: Marker | null;
    private rightMarker: Marker | null;
    private topWoodImage: Phaser.GameObjects.Image;
    private expression?: ExpressionUtils;
    private expressionOverlay?: TextOverlay;
    private currentMarkers: { line: Phaser.GameObjects.Rectangle; text: ExpressionUtils | null }[];
    private currentLevel: number;
    private isTypingMode: boolean = false;
    private visibleShip?: Phaser.GameObjects.Sprite;
    private sharkOverlay?: ImageOverlay;
    private muteButton: Phaser.GameObjects.Container;
    private numberLineContainer?: HTMLElement;
    private numberLineDomElement?: Phaser.GameObjects.DOMElement;
    // Managers
    private animationManager: AnimationManager;
    private animationPlayer: AnimationPlayer;
    private gameplayManager: GameplayManager;
    private inputManager: InputManager;
    private bgTexture: string;
    private accuracyBar: AccuracyBar;
    private progressBar?: ProgressBar;
    private scoreCoins?: ScoreCoins;
    private volumeSlider!: VolumeSlider;
    private prevStreak: number = 0;
    private useQuestionBank: boolean;
    private topic: string;
    private mapLevel: number;
    private isTutorialActive: boolean = false;
    private tutorial?: Tutorial;
    private screenClicking?: Phaser.GameObjects.Image;
    private isCountdownActive: boolean = false;
    private typingModule?: TypingModule;
    private parentScene: string;
	private announcementQueue: { message: string; ariaLive?: 'off' | 'polite' | 'assertive' }[] = [];
    private isAnnouncing: boolean = false;
    
    // Analytics
    private analyticsHelper!: AnalyticsHelper;
    
    constructor() {
        super('GameScreen');
        this.audioManager.initialize(this);
    }

    init(data: { useQuestionBank: boolean; topic: string; mapLevel?: number; level?: number, reset?: boolean, parentScene?: string }) {
        this.currentLevel = data.level ?? 0;
        this.mapLevel = data.mapLevel ?? 0;
        this.currentMarkers = [];
        this.animationManager = new AnimationManager(this);

        // Resolve per-level threshold overrides for campaign mode
        let thresholdOverrides: { hitThreshold?: number; nearMissThreshold?: number } | undefined;
        if (data.topic === 'campaign') {
            const campaignLevel = topics['campaign']?.levels[data.level ?? 0];
            if (campaignLevel) {
                thresholdOverrides = {
                    hitThreshold: campaignLevel.hitThreshold,
                    nearMissThreshold: campaignLevel.nearMissThreshold,
                };
            }
        }

        if (data.reset) {
            const oldQuestionSelector = this.gameplayManager.questionSelector;
            oldQuestionSelector?.reset();
            this.gameplayManager = new GameplayManager(this, data.useQuestionBank, data.topic, data.useQuestionBank ? data.mapLevel : data.level, oldQuestionSelector, thresholdOverrides);
        } else {
            this.gameplayManager = new GameplayManager(this, data.useQuestionBank, data.topic, data.useQuestionBank ? data.mapLevel : data.level, undefined, thresholdOverrides);
        }
        this.expression = undefined;
        this.expressionOverlay = undefined;
        this.visibleShip = undefined;
        this.isTypingMode = this.gameplayManager.getMode() === 'typing';
        this.bgTexture = this.gameplayManager.getBgTexture();
        this.useQuestionBank = data.useQuestionBank;
        this.topic = data.topic;
        this.parentScene = data.parentScene ?? 'GameScreen';
        
        // clear announcement queue
        this.isAnnouncing = false;
        this.announcementQueue = [];

        if (data.reset) {
            this.gameplayManager.resetGame();
        }

        ProgressBar.init(this);
        ScoreCoins.init(this);

        // Add keyboard listener for ESC to pause
        this.input.keyboard?.on('keydown-ESC', () => {
            this.toggleMenu();
        });
    }

    static _preload(scene: BaseScene) {
        const { CLICK_MECHANICS: clickMechanicsKeys, TYPING_MECHANICS: typingMechanicsKeys } =
            GameConfig.ASSETS.KEYS.IMAGE;
        // Image - Click Mechanics
        scene.load.setPath(GameConfig.ASSETS.PATHS.CLICK_MECHANICS);
        Object.values(clickMechanicsKeys).forEach((key) => {
            scene.load.image(key, key);
        });

        // Image - Typing Mechanics
        scene.load.setPath(GameConfig.ASSETS.PATHS.TYPING_MECHANICS);
        Object.values(typingMechanicsKeys).forEach((key) => {
            scene.load.image(key, key);
        });

        // Image - Background
        scene.load.setPath(GameConfig.ASSETS.PATHS.BACKGROUND);
        Object.values(GameConfig.ASSETS.KEYS.IMAGE.BACKGROUND).forEach((key) => {
            scene.load.image(key, key);
        });

        // Atlas
        Object.values(GameConfig.ASSETS.KEYS.ATLAS).forEach((key) => {
            scene.load.setPath(`${GameConfig.ASSETS.PATHS.ATLASES_BASE}/${key}`);
            scene.load.atlas(key, 'spritesheet.png', 'spritesheet.json');
        });

        // SFX
        scene.load.setPath(CommonConfig.ASSETS.PATHS.SFX_BASE);
        Object.values(GameConfig.ASSETS.KEYS.SFX).forEach((key) => {
            scene.load.audio(key, `${key}.wav`);
        });
        const language = i18n.getLanguage() || 'en';
        scene.load.audio('spotted_at', `spotted_at_${language}.mp3`);

        // Background Stars
        scene.load.setPath(GameConfig.ASSETS.PATHS.BACKGROUND);
        scene.load.image('bg_stars_1', 'bg_stars_1.png');
        scene.load.image('bg_stars_2', 'bg_stars_2.png');
        scene.load.image('bg_water', 'bg_water.png');
        scene.load.image('bg_clouds', 'bg_clouds.png');

        ProgressBar.preload(scene, 'dark');
        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
        CountdownUtils._preload(scene);
        DoorUtils._preload(scene);
    }

    create() {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
        } else {
            console.error('AnalyticsHelper not found');
        }

        this.gameplayManager.analyticsHelper = this.analyticsHelper;

        this.analyticsHelper?.createSession(`game.robo_pirates.${this.gameplayManager.getGameLevelName()}`);

        // focus to game container
        focusToGameContainer();

        if (this.parentScene === "MapScene") {
            this.removeClouds();
        }

        const { CLICK_MECHANICS: clickMechanicsKeys } = GameConfig.ASSETS.KEYS.IMAGE;
        const isMapUI = this.mapLevel > 0;
        // Start background music
        // this.audioManager.playBackgroundMusic(CommonConfig.ASSETS.KEYS.MUSIC.GAME_THEME);

        // Create animations
        this.animationManager.createAnimations();

        // Create background
        setSceneBackground(`assets/images/background/${this.bgTexture}`);
        const bg = UIUtils.createCoverBackground(this, this.bgTexture, true, true).setOrigin(GameConfig.UI.BACKGROUND.ORIGIN);

        if (isMapUI) {
            bg.setScale(1).setOrigin(0.5);
            bg.y += this.getScaledValue(22);
        }

        // add top wood
        this.topWoodImage = this.addImage(this.display.width / 2, 0, clickMechanicsKeys.TOP_WOOD)
            .setOrigin(GameConfig.UI.WOOD.ORIGIN.TOP.X, GameConfig.UI.WOOD.ORIGIN.TOP.Y)
            .setScale(GameConfig.UI.WOOD.SCALE);

        if (isMapUI) this.topWoodImage.setScale(1);

        // Initialize animation player
        this.animationManager.createAnimations();
        this.animationPlayer = new AnimationPlayer(this, this.topWoodImage);

        const yOffset = this.isTypingMode ? 305 : GameConfig.ACCURACY_BAR.Y_OFFSET;
        // 1. Score multiplier and score
        this.scoreCoins = new ScoreCoins(this, this.gameplayManager.scoreHelper, i18n, 'purple');
        this.scoreCoins.create(this.getScaledValue(123), this.getScaledValue(61));
        // 2. Progress bar
        this.progressBar = new ProgressBar(this, 'dark', i18n);
        const progressBarContainer = this.progressBar.create(this.getScaledValue(this.display.width / 2 + 51), this.getScaledValue(70));
        progressBarContainer.setSize(this.getScaledValue(904), this.getScaledValue(50));

        // Number line div to maintain DOM order
        this.createNumberLineContainer();

        // Add accuracy bar above screen clicking image
        this.accuracyBar = new AccuracyBar(this, {
            x: this.display.width / 2,
            y: this.display.height - yOffset,
            width: GameConfig.ACCURACY_BAR.WIDTH,
            height: GameConfig.ACCURACY_BAR.HEIGHT,
            iconKey: clickMechanicsKeys.ACCURACY_ICON,
            fontFamily: fontKeys.EXO,
        });
        this.accuracyBar.getContainer().setDepth(1);

        // add bottom wood
        if (!isMapUI) {
            this.addImage(this.display.width / 2, this.display.height, clickMechanicsKeys.BOTTOM_WOOD)
                .setOrigin(GameConfig.UI.WOOD.ORIGIN.BOTTOM.X, GameConfig.UI.WOOD.ORIGIN.BOTTOM.Y)
                .setScale(GameConfig.UI.WOOD.SCALE);
        }

        // Create water animation
        this.animationPlayer.playWaterAnimations();

        this.createPauseButton();

        // Settings button (volume/settings)
        this.createVolumeSlider();

        if (this.isTypingMode) {
            // Create typing module
            this.typingModule = new TypingModule(this, (value) => void this.handleTypedValue(value), false, this.topic === 'percents' ? '%' : '', isMapUI, this.topic);
            // Initially position off-screen and hide
            const typingContainer = this.typingModule.getContainer();
            const height = typingContainer.height;
            typingContainer.y += height;
            typingContainer.setVisible(false);
        } else {
            // add screen clicking
            this.screenClicking = this.addImage(this.display.width / 2, this.display.height, clickMechanicsKeys.SCREEN_CLICKING).setOrigin(
                GameConfig.UI.SCREEN_CLICKING.ORIGIN.X,
                GameConfig.UI.SCREEN_CLICKING.ORIGIN.Y,
            ).setDepth(2).setVisible(false);
            // Setup click handling for clicking mode
            this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => void this.handleClick(pointer));
        }

        this.createExpression();

        this.createMuteButton();
        this.createHelpButton();

        // Start countdown instead of doors
        this.isCountdownActive = true;
        if (this.isTypingMode) {
            this.slideUpTypingModule();
        } else {
            this.slideUpScreenClicking();
        }

        if (this.parentScene === 'ScoreBoardScene') {
            this.isCountdownActive = false;
            void this.startNewRound();
        } else {
            const countdownUtils = new CountdownUtils(this);
            countdownUtils.startCountdown(() => {
                this.isCountdownActive = false;
                void this.startNewRound();
                const audio = this.audioManager.playSoundEffect('island_entry');
                audio?.on('complete', () => {
                    this.time.delayedCall(50, () => {
                        this.audioManager.playBackgroundMusic(CommonConfig.ASSETS.KEYS.MUSIC.GAME_THEME);
                    });
                });
            });
        }
    }

    private createExpression() {
        const screenXCenter = this.display.width / 2;
        const textY = this.display.height + GameConfig.UI.TARGET_TEXT.BOTTOM_Y_OFFSET;
        const language = i18n.getLanguage() || 'en';
        let fontSize = GameConfig.UI.TARGET_TEXT.FONT_SIZE;
        if (this.topic === 'add_and_subtract_decimals' && this.mapLevel === 1) {
            fontSize = '30px';
        } else if (this.topic === 'percents' && this.mapLevel === 5 && language === 'es') {
            fontSize = '35px';
        } else if (this.topic === 'percents' && this.mapLevel === 4 && language === 'es') {
            fontSize = '40px';
        }

        this.expression = new ExpressionUtils(this, screenXCenter, textY, '', {
            fontSize,
            fontFamily: fontKeys.EUROSTILE,
            fontColor: GameConfig.UI.TARGET_TEXT.COLOR,
            lineHeight: GameConfig.UI.TARGET_TEXT.LINE_HEIGHT,
            spacing: GameConfig.UI.TARGET_TEXT.SPACING,
        });

        this.expression.getContainer().setDepth(2).setVisible(false);
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(250, 712, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.VOLUME_CONTROL_ICON,
            label: i18n.t('common.volume'),
            raisedOffset: 3.5,
            x: 95,
            y: this.display.height - 75,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        }).setDepth(10);
    }

    private createPauseButton() {
        const handlePauseButtonClick = () => {
            this.toggleMenu();
        };

        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.PAUSE_ICON,
            label: i18n.t('common.pause'),
            raisedOffset: 3.5,
            x: this.display.width - 70,
            y: 60,
            onClick: handlePauseButtonClick,
        }).setName('pause_btn');
    }

    private createNumberLineContainer() {
        // Create a container div for number line overlays
        const containerDiv = document.createElement('div');
        containerDiv.style.position = 'absolute';
        containerDiv.style.pointerEvents = 'none';
        
        // Position at center of screen where number line is
        this.numberLineDomElement = this.add.dom(0, 0, containerDiv);
        this.numberLineDomElement.setOrigin(0.5);
        this.numberLineContainer = containerDiv;
    }

    private createMuteButton() {
        const handleMuteButtonClick = () => {
            this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
            icon.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);
        };

        this.muteButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            raisedOffset: 3.5,
            x: this.display.width - 178,
            y: this.display.height - 75,
            onClick: handleMuteButtonClick,
        }).setDepth(10);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteButton as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteButton.getData('state');
            if(muteBtnState != label) {
                this.muteButton.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteButton.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private createHelpButton() {
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.HELP_ICON,
            label: i18n.t('common.help'),
            raisedOffset: 3.5,
            x: this.display.width - 95,
            y: this.display.height - 75,
            onClick: () => this.startHowToPlay(),
        }).setDepth(10).setName('help_btn');
    }

    private moveControlButtonsToEnd() {
        if (this.muteButton) {
            const muteOverlay = (this.muteButton as any)?.buttonOverlay as ButtonOverlay;
            if (muteOverlay?.domElement?.node && muteOverlay.domElement.node.parentNode) {
                const parent = muteOverlay.domElement.node.parentNode;
                parent.appendChild(muteOverlay.domElement.node);
            }
        }
        
        const helpBtn = this.children.getByName('help_btn') as Phaser.GameObjects.Container;

        if (helpBtn) {
            const helpOverlay = (helpBtn as any)?.buttonOverlay as ButtonOverlay;
            if (helpOverlay?.domElement?.node && helpOverlay.domElement.node.parentNode) {
                const parent = helpOverlay.domElement.node.parentNode;
                parent.appendChild(helpOverlay.domElement.node);
            }
        }
    }

    private updateTargetTextOnScreen(text: string) {
        this.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.SCREEN_CHANGE);

        if (this.expression) {
            if (text !== '') {
                this.expression.setExpression(formatMathExpression(text));

                if (this.expressionOverlay) {
                    this.expressionOverlay?.destroy();
                }
                this.expressionOverlay = new TextOverlay(this, this.expression.getContainer().getAt(0) as Phaser.GameObjects.Text, { label: i18n.t('common.targetText', { number: text }), announce: true });

                this.moveControlButtonsToEnd();
            }
        }
    }

    private updateMarkers(markersList: QuestionData['markersList'], startPoint?: number | string, endPoint?: number | string) {
        // Clean up existing markers
        const ANIMATION_DURATION = 500;

        const destroyMarker = (marker: Marker) => {
            if (marker.text) {
                this.tweens.add({
                    targets: marker.text.getContainer(),
                    scale: 0,
                    duration: ANIMATION_DURATION,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        marker.text?.destroy();
                    }
                });
            }

            if (marker.line) {
                this.tweens.add({
                    targets: marker.line,
                    scaleY: 0,
                    duration: ANIMATION_DURATION,
                    ease: 'Cubic.easeOut',
                    onComplete: () => {
                        marker.line.destroy();
                    }
                });
            }
        }

        this.currentMarkers.forEach((marker) => {
            destroyMarker(marker);
        });
        this.currentMarkers = [];

        if (this.leftMarker) {
            destroyMarker(this.leftMarker);
            this.leftMarker = null;
        }

        if (this.rightMarker) {
            destroyMarker(this.rightMarker);
            this.rightMarker = null;
        }

        // Use provided startPoint and endPoint, or fall back to current question
        const question = this.gameplayManager.getCurrentQuestion();
        const finalStartPoint = startPoint ?? question.startPoint;
        const finalEndPoint = endPoint ?? question.endPoint;

        // Clear container before creating new markers
        if (this.numberLineContainer) {
            this.numberLineContainer.innerHTML = '';
        }

        // Determine scaffolding overrides for campaign
        let showIntermediateNumbers = this.gameplayManager.getShowIntermediateNumbers();
        let hideIntermediateTicks = false;
        let effectiveMarkersList = markersList;
        if (this.gameplayManager.isScaffoldingActive()) {
            const stage = this.gameplayManager.getScaffoldingStage();
            const levelIdx = this.gameplayManager.getCampaignLevelIdx();

            // For fractions level (4): generate denominator-based tick marks at stages 1 & 2
            if (levelIdx === 4 && stage < 3) {
                const prompt = question.questionPrompt;
                const fractionMatch = prompt.match(/(\d+)\/(\d+)/);
                if (fractionMatch) {
                    const denom = parseInt(fractionMatch[2], 10);
                    const start = parseFractionString(finalStartPoint) ?? 0;
                    const end = parseFractionString(finalEndPoint) ?? 1;
                    const generatedMarkers: string[] = [];
                    for (let n = 0; n <= denom; n++) {
                        const val = start + (end - start) * n / denom;
                        generatedMarkers.push(val.toString());
                    }
                    effectiveMarkersList = generatedMarkers;
                }
            }

            if (stage >= 2) {
                showIntermediateNumbers = false; // hide labels (keep endpoints)
            }
            if (stage >= 3) {
                hideIntermediateTicks = true; // hide tick marks too
            }
        }

        // Create new markers
        const { markers, leftMarker, rightMarker } = UIUtils.createVerticalLinesWithNumbers(this, {
            ...GameConfig.MARKER_LINES,
            fontFamily: fontKeys.EUROSTILE,
            markersList: effectiveMarkersList,
            visibleMarkers: question.visibleMarkers ?? [],
            startPoint: finalStartPoint,
            endPoint: finalEndPoint,
            answer: this.gameplayManager.getTargetNumber?.() ?? undefined,
            showIntermediateNumbers,
            hideIntermediateTicks,
            suffix: this.topic === 'percents' && this.mapLevel === 1 ? '%' : undefined,
            a11y: {
                enabled: !this.isTypingMode,
                onActivate: (x: number) => void this.handleClickAtX(x),
            },
            parentContainer: this.numberLineContainer,
        });
        this.currentMarkers = markers;
        this.leftMarker = leftMarker;
        this.rightMarker = rightMarker;

        // Initialize input manager with initial range
        if (this.gameplayManager.currentQuestionIdx === 0) {
            this.inputManager = new InputManager(
                this,
                this.leftMarker!.line,
                this.rightMarker!.line,
                finalStartPoint,
                finalEndPoint,
            );
            this.inputManager.setupCursorZone();
        }
    }

    private updateProgressBar() {
        const progress = this.gameplayManager.getProgress();
        this.progressBar?.drawProgressFill(progress, this.gameplayManager.scoreHelper.getCurrentStreak());
    }

    private getStreakColor(streak: number): number {
        if (streak >= 7) return CommonConfig.STREAK_COLORS.SEVEN_IN_A_ROW;
        if (streak >= 5) return CommonConfig.STREAK_COLORS.FIVE_IN_A_ROW;
        if (streak >= 3) return CommonConfig.STREAK_COLORS.THREE_IN_A_ROW;
        return CommonConfig.STREAK_COLORS.DEFAULT;
    }

    private async handleClick(pointer: Phaser.Input.Pointer) {
        if (!this.gameplayManager.isWaiting() || !this.inputManager.isInCursorZone(pointer) || this.isTutorialActive || this.isCountdownActive) {
            return;
        }

        this.audioManager.playSoundEffect(GameConfig.ASSETS.KEYS.SFX.TARGET_CLICK);

        await this.handleClickAtX(pointer.x);
    }

    private async handleClickAtX(x: number) {
        if (!this.gameplayManager.isWaiting() || this.isTutorialActive || this.isCountdownActive) {
            return;
        }

        const clickedNumber = this.inputManager.calculateClickedNumber(x);
        const result = this.gameplayManager.handleClick(clickedNumber);
        const targetNumber = this.gameplayManager.getTargetNumber()!;
        const targetX = this.inputManager.getXPositionFromNumber(targetNumber);

        await this.animationPlayer.playResultAnimations(result, x, targetX);

        const closenessAccuracy = this.gameplayManager.closenessAccuracy;
        if (result !== 'hit') {
            this.accuracyBar?.show(closenessAccuracy);
            // Queue accuracy announcement
            const accuracyMessage = i18n.t('common.accuracy') + ': ' + Math.round(closenessAccuracy) + '%';
            focusToGameContainer();
            this.queueAnnouncement(accuracyMessage, 'polite');
        }

        if (result === 'hit') {
            this.scoreCoins?.updateScoreDisplay(true);
            this.prevStreak = this.gameplayManager.scoreHelper.getCurrentStreak();
            // Announce correct answer
            this.queueAnnouncement(i18n.t('common.correct'));
             // Announce current score
            const currentScore = this.gameplayManager.scoreHelper.getTotalScore();
            this.queueAnnouncement(i18n.t('game.scoreValue', { score: currentScore }));
        } else {
            const hasStreakBroken = this.prevStreak >= 3;
            this.prevStreak = 0;
            this.scoreCoins?.updateScoreDisplay(false, hasStreakBroken);
            // Announce incorrect answer
            this.queueAnnouncement(i18n.t('common.incorrect'));
            const currentScore = this.gameplayManager.scoreHelper.getTotalScore();
            this.queueAnnouncement(i18n.t('game.scoreValue', { score: currentScore }));
        }

        // Scaffolding transition cue
        if (this.gameplayManager.consumeScaffoldingStageChanged()) {
            const stage = this.gameplayManager.getScaffoldingStage();
            const msg = stage === 3 ? 'Training wheels off!' : stage === 2 ? 'Numbers hidden!' : 'Hints restored';
            void this.animationPlayer.addToastMessage({
                message: msg,
                duration: 1200,
                textStyle: { fontFamily: fontKeys.EUROSTILE, letterSpacing: 1 },
            });
        }

        // Update progress bar
        this.updateProgressBar();

        // Start next round after a delay
        this.time.delayedCall(1000, () => this.startNewRound());
    }

    private async handleTypedValue(value: number) {
        if (!this.gameplayManager.isWaiting() || this.isTutorialActive || this.isCountdownActive) return;

        let processedValue = value;

        // if (this.topic === 'percents') processedValue /= 100;

        const currentQuestion = this.gameplayManager.getCurrentQuestion();
        const result = this.gameplayManager.handleClick(processedValue);
        const targetNumber = this.gameplayManager.getTargetNumber()!;
        const targetX = this.inputManager.getXPositionFromNumber(targetNumber);
        const clickX = this.inputManager.getXPositionFromNumber(processedValue);

        result === 'hit' && this.time.delayedCall(500, () => this.visibleShip && this.visibleShip.setVisible(false));
        const start = parseFractionString(currentQuestion.startPoint);
        const end = parseFractionString(currentQuestion.endPoint);
        if (start === null || end === null || processedValue > end || processedValue < start) {
            await this.animationPlayer.addToastMessage({
                message: i18n.t('gameScreen.inputOutOfRange'),
                duration: 1200,
                textStyle: { fontFamily: fontKeys.EUROSTILE, letterSpacing: 1 },
            });
        } else {
            // Disable typing input during animations
            this.typingModule?.disableInput();
            const hasVisibleShip = this.visibleShip !== undefined;
            await this.animationPlayer.playResultAnimations(result, clickX, targetX, hasVisibleShip);

            const closenessAccuracy = this.gameplayManager.closenessAccuracy;
            if (result !== 'hit') {
                this.accuracyBar?.show(closenessAccuracy);
                focusToGameContainer();
                // Queue accuracy announcement
                this.queueAnnouncement(i18n.t('common.accuracy') + ': ' + Math.round(closenessAccuracy) + '%', 'polite');
            }

            if (result === 'hit') {
                this.scoreCoins?.updateScoreDisplay(true);
                this.prevStreak = this.gameplayManager.scoreHelper.getCurrentStreak();
                // Announce correct answer
                this.queueAnnouncement(i18n.t('common.correct'));
                // Announce current score
                const currentScore = this.gameplayManager.scoreHelper.getTotalScore();
                this.queueAnnouncement(i18n.t('game.scoreValue', { score: currentScore }));
            } else {
                const hasStreakBroken = this.prevStreak >= 3;
                this.prevStreak = 0;
                this.scoreCoins?.updateScoreDisplay(false, hasStreakBroken);
                // Announce incorrect answer
                this.queueAnnouncement(i18n.t('common.incorrect'));
                const currentScore = this.gameplayManager.scoreHelper.getTotalScore();
                this.queueAnnouncement(i18n.t('game.scoreValue', { score: currentScore }));
            }
        }

        // Scaffolding transition cue
        if (this.gameplayManager.consumeScaffoldingStageChanged()) {
            const stage = this.gameplayManager.getScaffoldingStage();
            const msg = stage === 3 ? 'Training wheels off!' : stage === 2 ? 'Numbers hidden!' : 'Hints restored';
            void this.animationPlayer.addToastMessage({
                message: msg,
                duration: 1200,
                textStyle: { fontFamily: fontKeys.EUROSTILE, letterSpacing: 1 },
            });
        }

        this.updateProgressBar();

        // Start next round after a delay
        this.time.delayedCall(1000, () => this.startNewRound());
    }

    private showMascotCelebration(cb?: () => void) {
        this.time.delayedCall(1000, () => {
            this.scene.pause();
            this.scene.launch('CelebrationScene', {
                scoreHelper: this.gameplayManager.scoreHelper,
                streakColor: this.getStreakColor(this.gameplayManager.scoreHelper.getCurrentStreak()),
                progress: this.gameplayManager.getProgress(),
                showSuccessCheckmark: false,
                callback: () => {
                    cb?.();
                }
            });
            this.scene.bringToTop('CelebrationScene');
        });
    }

    private async startNewRound() {
        // Enable typing input for the new round
        this.typingModule?.enableInput();
        const { questionPrompt, markersList, startPoint, endPoint } = this.gameplayManager.startNewRound();

        if (this.gameplayManager.isGameComplete) return;

        this.updateMarkers(markersList, startPoint, endPoint);
        this.inputManager.updateRange(startPoint, endPoint);

        // If typing mode and fractions topic, compute fraction digit mask from current answer and set on TypingModule
        if (this.isTypingMode && (this.topic === 'fractions_as_numbers' || this.topic === 'understand_and_compare_decimals')) {
            const q = this.gameplayManager.getCurrentQuestion();
            const answerStr = q.csvQuestion?.answer;
            const mask = answerStr ? computeFractionDigitMask(answerStr) : null;
            if (mask) this.typingModule?.setFractionMask(mask);
        }

        if (this.isTypingMode) {
            // In typing mode, show the ship at the target position
            const targetNumber = this.gameplayManager.getTargetNumber()!;
            const targetX = this.inputManager.getXPositionFromNumber(targetNumber);

            if (!this.visibleShip) {
                await this.animationPlayer.playSharkEnterExitAnimation(targetX);
                this.visibleShip = await this.animationPlayer.playSharkLoopAnimation(targetX);
                if (this.visibleShip) {
                    this.sharkOverlay = new ImageOverlay(this, this.visibleShip, { label: i18n.t('game.sharkIsHere') });
                    // Move shark overlay to number line container
                    if (this.numberLineContainer && this.sharkOverlay.element) {
                        this.numberLineContainer.appendChild(this.sharkOverlay.element);
                    }
                }
            } else {
                const isVisible = this.visibleShip.visible;
                this.visibleShip.setVisible(false);
                await this.animationPlayer.playSharkEnterExitAnimation(this.visibleShip.x, true, isVisible);
                await this.animationPlayer.playSharkEnterExitAnimation(targetX);
                this.visibleShip.setX(targetX);
                this.sharkOverlay?.recreate();
                // Move shark overlay to number line container after recreate
                if (this.numberLineContainer && this.sharkOverlay?.element) {
                    this.numberLineContainer.appendChild(this.sharkOverlay.element);
                }
            }
            this.visibleShip.setVisible(true);
            focusToGameContainer();
            this.queueAnnouncement(getSharkAnnouncement(
                this.topic,
                this.gameplayManager.getTargetNumber()!,
                this.gameplayManager.getCurrentQuestion().startPoint,
                this.gameplayManager.getCurrentQuestion().endPoint,
            ));
            setTimeout(() => {
                this.typingModule?.resetFocusToFirstButton();
            }, 3000);
        } else {
            this.animationPlayer.playScreenClickAnimation();
            this.updateTargetTextOnScreen(questionPrompt);
        }
    }
 

    private toggleMenu(): void {
        this.gameplayManager.pauseGame();
        this.scene.pause();
        this.scene.launch('MenuScene', { 
            parentScene: this.scene.key,
            topic: this.topic
        });
        this.audioManager.pauseAll();
    }

    private startHowToPlay(): void {
        this.typingModule?.stopQuestionAudio();
        this.scene.pause();
        this.scene.launch('HowToPlayScene', {
            useQuestionBank: this.useQuestionBank,
            topic: this.topic,
            parentScene: this.scene.key,
            ...(this.useQuestionBank ? { mapLevel: this.mapLevel } : { level: this.currentLevel }),
        });
        this.scene.bringToTop('HowToPlayScene');
    }

    shutdown() {
        this.tutorial?.destroy();
        this.tutorial = undefined;
        this.typingModule?.destroy();
        this.typingModule = undefined;
        this.audioManager.stopAllSoundEffects();
        
        // Clean up number line container
        if (this.numberLineDomElement) {
            this.numberLineDomElement.destroy();
            this.numberLineDomElement = undefined;
        }
        this.numberLineContainer = undefined;
    }

    update() {
        this.gameplayManager.update();
    }

    private slideUpScreenClicking() {
        if (!this.screenClicking) return;

        const isMapUI = this.mapLevel > 0;
        
        if (isMapUI) {
            // For map levels, just make visible without animation
            this.screenClicking.setVisible(true);
            if (this.expression) {
                this.expression.getContainer().setVisible(true);
            }
            return;
        }

        const height = this.screenClicking.getBounds().height;
        this.screenClicking.y += height;
        if (this.expression) {
            this.expression.getContainer().setVisible(true);
            this.expression.getContainer().y += height;
        }
        this.screenClicking.setVisible(true);
        this.tweens.add({
            targets: [this.screenClicking, this.expression?.getContainer()],
            y: "-=" + height,
            duration: 500,
            ease: 'Cubic.easeOut',
        });
    }

    private slideUpTypingModule() {
        if (!this.typingModule) return;

        const isMapUI = this.mapLevel > 0;
        
        if (isMapUI) {
            // For map levels, just make visible without animation
            const typingContainer = this.typingModule.getContainer();
            typingContainer.setVisible(true);
            return;
        }

        const typingContainer = this.typingModule.getContainer();
        const height = typingContainer.getBounds().height;
        typingContainer.y += height;
        typingContainer.setVisible(true);
        this.tweens.add({
            targets: [typingContainer],
            y: "-=" + height,
            duration: 500,
            ease: 'Cubic.easeOut',
        });
    }

    private removeClouds() {
        const offset = 500;
        const cloud1 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);
        const cloud2 = this.addImage(this.display.width / 2, this.display.height / 2, 'cloud').setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: cloud1,
            alpha: 0,
            x: -offset,
            y: this.getScaledValue(this.display.height + offset),
            duration: 1000,
            ease: 'Sine.easeOut',
            onComplete: () => {
                cloud1.destroy();
                cloud2.destroy();
            }
        });

        this.tweens.add({
            targets: cloud2,
            alpha: 0,
            x: this.getScaledValue(this.display.height + offset),
            y: -offset,
            duration: 1000,
            ease: 'Sine.easeOut',
        });
    }

    // Add this method to handle queued announcements
    private queueAnnouncement(message: string, ariaLive?: 'off' | 'polite' | 'assertive') {
        this.announcementQueue.push({ message, ariaLive });
        this.processAnnouncementQueue();
    }

    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) return;
        this.isAnnouncing = true;
        const next = this.announcementQueue.shift()!;
        announceToScreenReader(next.message.toString(), next.ariaLive);
        // Estimate the duration of the announcement and wait before processing next
        const words = next.message.split(' ').length;
        const estimatedDuration = (words / 2.5) * 1000; // 2.5 words per second
        const delay = Math.max(estimatedDuration + 500, 2000); // Minimum 2 seconds

        this.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }
}
