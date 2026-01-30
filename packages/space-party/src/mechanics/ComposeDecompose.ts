import {
    BaseScene,
    ButtonHelper,
    getQuestionBankByName,
    i18n,
    ProgressBar,
    Question,
    questionBankNames,
    ScoreCoins,
    ScoreHelper,
    VolumeSlider,
    QuestionSelectorHelper,
    TextOverlay,
    ButtonOverlay,
    announceToScreenReader,
    ImageOverlay,
    focusToGameContainer,
    AnalyticsHelper,
} from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";
import { BackgroundHelper } from "../utils/BackgroundHelper";
import { AnnouncementQueue } from "../utils/AnnouncementQueue";

const ITEMS = [
    "mooncake",
    "moonsandwich",
    "moonpie",
    "moonburger",
    "moonmelon",
]

export class ComposeDecompose {
    private scene!: BaseScene;
    private questionSelector!: QuestionSelectorHelper;
    public currentQuestion!: Question;
    private scoreHelper!: ScoreHelper;
    private progressBar!: ProgressBar;
    private scoreCoins!: ScoreCoins;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    private questionBar!: Phaser.GameObjects.Container;
    private alienMap: Map<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Image> = new Map();
    public plates: Phaser.GameObjects.Image[] = [];
    public optionContainers: Phaser.GameObjects.Container[] = [];
    public droppedPlates: number[] = [];

    private lang: string = i18n.getLanguage() || "en";
    private GAME_MODE: string = "game";
    private MECHANIC: string = "compose";
    private currentQuestionIndex: number = 0;
    private totalQuestions: number = 10;
    private isProcessing: boolean = false;
    private allowedPlates: number = 2;
    private retryCount: number = 0;
    private maxRetries: number = 3;
    private isComposeTutorialPlayed: boolean = false;

    private lookAroundTween?: Phaser.Tweens.TweenChain | null;
    private breathingTween?: Phaser.Tweens.TweenChain | null;
    private questionVolumeIcon!: Phaser.GameObjects.Container;
    private questionVolumeIconImage!: Phaser.GameObjects.Image;
    private isAudioPlaying: boolean = false;
    private questionAudioTween!: Phaser.Tweens.Tween;
    private audioInstance!: Phaser.Sound.WebAudioSound | undefined;
    private announcementQueue!: AnnouncementQueue;
    private announcementCount: number = 0;

    private alienState: "sitting" | "standing" = "sitting";

    // Accessibility overlays for tab navigation
    private plateOverlays: Map<Phaser.GameObjects.Container, ImageOverlay> = new Map();
    private dropZoneOverlay?: ImageOverlay;

    // Keyboard interaction state
    private selectedPlateForKeyboard?: Phaser.GameObjects.Container;
    // Using plate texture instead of focus rectangles
    // private selectedPlateIndicator?: Phaser.GameObjects.Graphics;
    // private dropZoneFocusIndicator?: Phaser.GameObjects.Graphics;

    private analyticsHelper!: AnalyticsHelper;

    // Alien config
    private ALIEN = {
        x: 640,
        y: 336,
    }

    constructor(scene: BaseScene) {
        this.scene = scene;
        this.announcementQueue = new AnnouncementQueue();
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
        const questionBank = getQuestionBankByName(
            questionBankNames.gk_t11_compose_and_decompose_numbers_11_to_19
        );
        if (!questionBank) {
            throw new Error("Question bank not found");
        }
        this.questionSelector = new QuestionSelectorHelper(
            questionBank,
            this.totalQuestions
        );
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        ProgressBar.preload(scene, "dark");
        ScoreCoins.preload(scene, "blue");
        VolumeSlider.preload(scene, "blue");
        BackgroundHelper.preload(scene);

        // Load game screen assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("title_bg", "title_bg.png");
        scene.load.image("correct_icon", "correct_icon.png");
        scene.load.image("incorrect_icon", "incorrect_icon.png");
        scene.load.image("count_1", "count_1.png");
        scene.load.image("count_2", "count_2.png");
        scene.load.image("count_3", "count_3.png");

        // Load volume icons
        scene.load.image("volume", "volume.png");
        scene.load.image("volume_1", "volume_1.png");
        scene.load.image("volume_2", "volume_2.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/compose_decompose`);
        scene.load.image("tables", "tables.png");
        scene.load.image("question_bg", "question_bg.png");
        scene.load.image("drop_zone_compose", "drop_zone_compose.png");
        scene.load.image("drop_zone_decompose", "drop_zone_decompose.png");
        // Load alien
        scene.load.image("alien_default", "alien_default.png");
        scene.load.image("alien_sad", "alien_sad.png");

        for (let i = 1; i <= 3; i++) {
            scene.load.image(`alien_left_${i}`, `alien_left_${i}.png`);
            scene.load.image(`alien_right_${i}`, `alien_right_${i}.png`);
        }

        // Load blinking alien
        for (let i = 1; i <= 4; i++) {
            scene.load.image(`alien_blink_${i}`, `alien_blink_${i}.png`);
        }
        // Load eating alien
        for (let i = 0; i <= 4; i++) {
            scene.load.image(`alien_eat_${i}`, `alien_eat_${i}.png`);
        }
        // Load hands
        scene.load.image("hands", "hands.png");
        scene.load.spritesheet("hands_eat", "hands_eat.png", { frameWidth: 145, frameHeight: 203 });
        // Load plates
        scene.load.image("plate_default", "plate_default.png");
        scene.load.image("plate_selected", "plate_selected.png");
        scene.load.image("plate_fixed", "plate_fixed.png");
        scene.load.image("plate_drop", "plate_drop.png");

        // Load food items
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/items`);
        ITEMS.forEach(item => {
            scene.load.image(item, `${item}.png`);
        });

        // Load audio assets
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio("positive-sfx", "positive.wav");
        scene.load.audio("negative-sfx", "negative.wav");
        scene.load.audio("countdown", "countdown.mp3");
        scene.load.audio("door_close", "door_close.mp3");
        scene.load.audio("plate", "plate.mp3");
        scene.load.audio("eating", "eating.mp3");

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen/compose_decompose`);
        scene.load.audio(`feed_${lang}`, `feed_${lang}.mp3`);
        scene.load.audio(`want_${lang}`, `want_${lang}.mp3`);
        scene.load.audio(`have_${lang}`, `have_${lang}.mp3`);
        scene.load.audio(`plus_${lang}`, `plus_${lang}.mp3`);
        scene.load.audio(`makes_${lang}`, `makes_${lang}.mp3`);
        // Load number audio
        for (let i = 1; i <= 19; i++) {
            scene.load.audio(`${i}_${lang}`, `${i}_${lang}.mp3`);
        }
        // Load item audio
        ITEMS.forEach(item => {
            scene.load.audio(`${item}_${lang}`, `${item}_${lang}.mp3`);
        });

        // Load common button assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("btn_alter", "btn_alter.png");
        scene.load.image("btn_alter_hover", "btn_alter_hover.png");
        scene.load.image("btn_alter_pressed", "btn_alter_pressed.png");
        scene.load.image("btn_alter_inactive", "btn_alter_inactive.png");
        scene.load.image("btn_purple", "btn_purple.png");
        scene.load.image("btn_purple_hover", "btn_purple_hover.png");
        scene.load.image("btn_purple_pressed", "btn_purple_pressed.png");

        // Buttons
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
        scene.load.image(BUTTONS.BUTTON_DISABLED.KEY, BUTTONS.BUTTON_DISABLED.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(
            BUTTONS.ICON_BTN_HOVER.KEY,
            BUTTONS.ICON_BTN_HOVER.PATH
        );
        scene.load.image(
            BUTTONS.ICON_BTN_PRESSED.KEY,
            BUTTONS.ICON_BTN_PRESSED.PATH
        );
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
    }

    static init(scene: BaseScene) {
        ProgressBar.init(scene);
        ScoreCoins.init(scene);
    }

    create(mode: string, reset: boolean = false, mechanicType: string = "compose", parentScene: string = "SplashScene") {
        if (reset) {
            this.resetGame();
        }
        this.GAME_MODE = mode;
        this.MECHANIC = mechanicType;

        this.scene.events.on("resume", () => {
            if (this.GAME_MODE === "game") { 
                this.setPlateOverlaysEnabled(this.optionContainers);
                const dropZoneElement = this.dropZoneOverlay?.domElement?.node as HTMLElement;
                if (dropZoneElement) {
                    dropZoneElement.removeAttribute('aria-disabled');
                    dropZoneElement.setAttribute('tabindex', '0');
                    dropZoneElement.style.pointerEvents = 'auto';
                }
            }
        });

        this.scene.events.on("pause", () => {
            if (this.GAME_MODE === "game") { 
                this.setPlateOverlaysEnabled([]);
                const dropZoneElement = this.dropZoneOverlay?.domElement?.node as HTMLElement;
                if (dropZoneElement) {
                    dropZoneElement.setAttribute('aria-disabled', 'true');
                    dropZoneElement.removeAttribute('tabindex');
                    dropZoneElement.style.pointerEvents = 'none';
                }
            }
        });
        
        if (this.GAME_MODE === "game") {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
            } else {
                console.error('AnalyticsHelper not found');
            }
            this.analyticsHelper?.createSession('game.space_party.default');
        }

        // Add background
        BackgroundHelper.createBackground(this.scene);

        if (parentScene === "GameScene") {
            focusToGameContainer();
            this.scene.time.delayedCall(1000, () => {
                this.announcementQueue.queue(i18n.t("info.helpPage"));
            })
        }

        // Add title background
        this.scene.addImage(this.scene.display.width / 2, 85, "title_bg");

        // Add table
        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height - 212, "tables")
            .setOrigin(0.5)
            .setDepth(2)

        if (this.GAME_MODE === "game") {
            // Create door
            this.createDoors("closed");

            // Create score coins
            this.scoreCoins = new ScoreCoins(
                this.scene,
                this.scoreHelper,
                i18n,
                "blue"
            );
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(62)
            ).setDepth(2);

            // Create progress bar
            this.progressBar = new ProgressBar(this.scene, "dark", i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(70)
            );

            // Create settings buttons
            this.createSetttingsButtons();

            // Create question bar and load first question
            this.createQuestionBar();

            // Create alien in center
            this.scene.time.delayedCall(3000, () => {
                this.createAlien();
                // Setup drag and drop events
                this.setupDragAndDropEvents();
            });

            // Open doors
            this.openDoors();
        } else {
            // Create doors
            this.createDoors("open");

            // Create question bar and load first question
            this.createQuestionBar();

            // Create alien in center
            this.createAlien();
        }

        // Load first question
        if(this.GAME_MODE === "game") {
            // delay load question for countdown announcement
            this.scene.time.delayedCall(3500, () => {
                this.loadNextQuestion();
            });
        } else {
            this.loadNextQuestion();
        }
        // Create buttons
        this.createResetButton();
        this.createSubmitButton();
    }

    private async createAlien() {
        // Create alien
        const alien = this.scene.addSprite(this.ALIEN.x, this.ALIEN.y + 45, "alien_default");
        this.alienMap.set("alien", alien);

        this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y);

        // Create Eating hands
        const eatingHands = this.scene.addSprite(this.ALIEN.x, this.ALIEN.y, "hands_eat_1");
        eatingHands.setDepth(2);
        eatingHands.setVisible(false);
        this.alienMap.set("eatingHands", eatingHands);

        // Create hands on table
        const handsX = this.scene.display.width / 2;
        const handsY = 342 - 10;
        const hands = this.scene.addImage(handsX, handsY, "hands");
        hands.setDepth(2);
        this.alienMap.set("hands", hands);

        // Wait till hands are on table
        await this.animatePosition(hands, handsX, handsY + 10);

        if (this.GAME_MODE === "game") {
            // Start blinking
            this.startBlinking();
            // Start looking around
            this.startLookAround();
        }
    }

    private async resetAlien() {
        // Update alien position
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        if (!alien || !hands) return;
        // Make default
        alien.setTexture("alien_default");
        const alienX = this.scene.getScaledValue(this.ALIEN.x);
        const alienY = this.scene.getScaledValue(this.ALIEN.y + 45);
        const handsX = this.scene.getScaledValue(this.scene.display.width / 2);
        const handsY = this.scene.getScaledValue(332);
        alien.setPosition(alienX, alienY);
        hands.setPosition(handsX, handsY);

        // Reset alien angle
        alien.setAngle(0);
        this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y);
        await this.animatePosition(hands, this.scene.display.width / 2, 342);

        // Update alien state
        this.alienState = 'sitting';

        // Start blinking
        this.startBlinking();
        // Start looking around
        this.startLookAround();
        // Stop Breathing
        this.stopBreathing();

    }

    private animatePosition(gameObject: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, x?: number, y?: number, duration: number = 500) {
        return new Promise((resolve) => {
            this.scene.tweens.add({
                targets: gameObject,
                x: x !== undefined ? this.scene.getScaledValue(x) : gameObject.x,
                y: y !== undefined ? this.scene.getScaledValue(y) : gameObject.y,
                duration: duration,
                ease: "Power2",
                onComplete: () => {
                    resolve(true);
                }
            });
        });
    }

    private async makeSad() {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        if (!alien) return;

        // Stop all active animations
        this.stopBreathing();
        this.stopBlinking();
        this.stopLookAround();

        // Make sad
        alien.setTexture("alien_sad");
        alien.setAngle(0);

        if (this.alienState === 'sitting') {
            this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y, 700);
        } else {
            this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y - 30, 700);
        }
        await this.animatePosition(hands, this.scene.display.width / 2, 342, 700);

        // Animate to sad position
        await this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y + 45, 1000);
        this.alienState = 'sitting';

    }

    private startBlinking() {
        // Stop blinking if already blinking
        this.stopBlinking();

        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        if (!alien) return;
        const animationKey = "alien_blink";

        // Make default
        alien.setTexture("alien_default");

        // Create blink animation once if not exists
        if (!this.scene.anims.exists(animationKey)) {
            this.scene.anims.create({
                key: animationKey,
                frames: [
                    { key: "alien_default" },
                    { key: "alien_blink_1" },
                    { key: "alien_blink_2" },
                    { key: "alien_blink_3" },
                    { key: "alien_blink_4" },
                ],
                yoyo: true,
                frameRate: 24,
                repeat: 0
            });
        }

        // Randomize time between 2 to 5 seconds for natural blinking
        const timeInterval = Phaser.Math.Between(2000, 5000);

        // Play animation
        const intervalId = setInterval(() => {
            alien.play(animationKey);
        }, timeInterval);

        alien.once("destroy", () => {
            clearInterval(intervalId);
        });

        // Set intervalId to alien
        alien.setData("intervalId", intervalId);
    }

    private stopBlinking() {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        if (!alien) return;
        // Stop animation
        alien.anims.stop();
        // Stop interval
        const intervalId = alien.getData("intervalId");
        if (intervalId) {
            clearInterval(intervalId);
        }
        alien.setData("intervalId", undefined);
    }

    private lookAnimation(isLeft: boolean) {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        if (!alien || !hands) return;

        const direction = isLeft ? -1 : 1;
        const texturePrefix = isLeft ? "alien_left_" : "alien_right_";
        const duration = 120;

        const handTweens: Phaser.Tweens.Tween[] = [];

        const createHandTween = (xOffset: number) => {
            const handTween = this.scene.tweens.add({
                targets: hands,
                x: "+=" + this.scene.getScaledValue(xOffset),
                duration,
                ease: "Linear"
            })
            handTweens.push(handTween);
            return handTween;
        };

        const createMoveTween = (xOffset: number, yOffset: number, angle: number, texture?: string) => ({
            duration,
            x: "+=" + this.scene.getScaledValue(xOffset),
            y: "+=" + this.scene.getScaledValue(yOffset),
            ease: "Linear",
            angle: angle * direction,
            onStart: () => {
                if (texture) alien.setTexture(texturePrefix + texture);
                createHandTween(xOffset);
            }
        });

        const tweenChain = this.scene.tweens.chain({
            targets: alien,
            paused: true,
            tweens: [
                createMoveTween(40 * direction, -4, 7.65, "1"),
                createMoveTween(40 * direction, -5, 6.19, "2"),
                createMoveTween(40 * direction, 15, -3.65, "2"),
                createMoveTween(40 * direction, 10, -16, "3"),
                {
                    delay: 500,
                    duration: 300,
                    angle: "+=" + (5 * direction),
                    yoyo: true,
                    repeat: 1
                },
                {
                    delay: 1000,
                    ...createMoveTween(-40 * direction, -10, 3.65, "2")
                },
                createMoveTween(-40 * direction, -15, -6.19, "2"),
                createMoveTween(-40 * direction, -5, -7.65, "1"),
                {
                    duration,
                    angle: 0,
                    x: this.scene.getScaledValue(this.ALIEN.x),
                    y: this.scene.getScaledValue(this.ALIEN.y - 30),
                    ease: "Linear",
                    onStart: () => createHandTween(this.ALIEN.x - hands.x / this.scene.display.scale),
                    onComplete: () => alien.setTexture("alien_default")
                }
            ]
        });

        const clearTweens = () => {
            handTweens.forEach(tween => tween.destroy());
        }

        tweenChain.on("destroy", clearTweens);
        tweenChain.on("complete", clearTweens);

        return tweenChain;
    }

    private startLookAround() {
        if (this.isProcessing) return;
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        if (!alien || !hands || this.lookAroundTween?.isPlaying()) return;

        // Stop look around if already playing
        this.stopLookAround();

        let direction = 'left';

        const intervalId = setInterval(async () => {
            this.stopBlinking();
            this.stopBreathing();

            await this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y - 30);

            if (direction === 'left') {
                direction = 'right';
                this.lookAroundTween = this.lookAnimation(true);
            } else {
                direction = 'left';
                this.lookAroundTween = this.lookAnimation(false);
            }

            this.lookAroundTween?.on("complete", () => {
                this.startBlinking();
                if (this.alienState === 'sitting') {
                    this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y);
                } else {
                    // Start breathing only if alien is not sitting
                    this.startBreathing();
                }
            });

            this.lookAroundTween?.play();
        }, 11000);

        // Stop look around on destroy
        alien.once("destroy", () => {
            clearInterval(intervalId);
        });
        alien.setData("lookAroundIntervalId", intervalId);
    }

    private stopLookAround() {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        if (!alien) return;
        // Stop tween
        if (this.lookAroundTween) {
            this.lookAroundTween.stop();
            this.lookAroundTween.destroy();
            this.lookAroundTween = null;
        }
        // Reset interval
        const intervalId = alien.getData("lookAroundIntervalId");
        if (intervalId) {
            clearInterval(intervalId);
        }
        alien.setData("lookAroundIntervalId", undefined);
    }

    private async startBreathing() {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        if (!alien) return;

        this.breathingTween = this.scene.tweens.chain({
            targets: alien,
            tweens: [
                {
                    scale: "+=" + this.scene.getScaledValue(0.025),
                    duration: 1000,
                    y: "-=" + this.scene.getScaledValue(5),
                    ease: "Sine.easeOut",
                },
                {
                    scale: "-=" + this.scene.getScaledValue(0.025),
                    duration: 1000,
                    y: "+=" + this.scene.getScaledValue(5),
                    ease: "Sine.easeOut",
                }
            ],
            loop: -1
        });

        this.breathingTween.play();
    }

    private stopBreathing() {
        // Stop tween
        if (this.breathingTween) {
            this.breathingTween.stop();
            this.breathingTween.destroy();
            this.breathingTween = null;
        }
    }

    private async exciteAlien() {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        if (!alien || !hands || this.lookAroundTween?.isPlaying()) return;

        // Stop all active animations
        this.stopBlinking();
        this.stopBreathing();
        this.stopLookAround();

        // Stand up
        await this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y - 30);
        // Update alien state to standing
        this.alienState = 'standing';

        let isLeft = false;

        if (this.MECHANIC === "compose") {
            if (this.droppedPlates.length === 1) {
                isLeft = true;
            } else {
                isLeft = false;
            }
        } else {
            isLeft = false;
        }

        if (!this.lookAroundTween) {
            this.lookAroundTween = this.lookAnimation(isLeft);
            this.lookAroundTween?.on("complete", async () => {
                this.startBlinking();
                if (this.alienState === 'sitting') {
                    this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y);
                } else {
                    this.startBreathing();
                }

            });
        }

        this.lookAroundTween?.play();

    };

    public async startEating(itemName: string) {
        const alien = this.alienMap.get("alien") as Phaser.GameObjects.Sprite;
        const hands = this.alienMap.get("hands") as Phaser.GameObjects.Image;
        const eatingHands = this.alienMap.get("eatingHands") as Phaser.GameObjects.Sprite;
        if (!alien || !hands || !eatingHands) return;

        // Stop looking around
        this.stopLookAround();
        // Stop breathing
        this.stopBreathing();
        // Stop blinking
        this.stopBlinking();

        // Make alien default
        alien.setTexture("alien_default");
        // Reset alien angle
        alien.setAngle(0);

        this.animatePosition(eatingHands, this.ALIEN.x, this.ALIEN.y - 25, 1000);
        this.animatePosition(hands, this.scene.display.width / 2, 342, 1000);
        await this.animatePosition(alien, this.ALIEN.x, this.ALIEN.y - 25, 1000);


        hands.setVisible(false);
        eatingHands.setVisible(true);

        // Open mouth animation
        const openMouthAnimationKey = "alien_open_mouth";
        if (!this.scene.anims.exists(openMouthAnimationKey)) {
            this.scene.anims.create({
                key: openMouthAnimationKey,
                frames: [
                    { key: "alien_eat_0" },
                    { key: "alien_eat_1" },
                    { key: "alien_eat_2" },
                ],
                duration: 300,
            });
        }

        // Eating animation
        const closeMouthAnimationKey = "alien_close_mouth";
        if (!this.scene.anims.exists(closeMouthAnimationKey)) {
            this.scene.anims.create({
                key: closeMouthAnimationKey,
                frames: [
                    { key: "alien_eat_3" },
                    { key: "alien_eat_4" },
                    { key: "alien_eat_3" },
                    { key: "alien_eat_4" },
                    { key: "alien_eat_0" },
                ],
                duration: 600,
            });
        }

        // Play eating animation
        alien.play(openMouthAnimationKey);

        const handAnimationKey = "alien_hand_eating";
        // Create hand eating animation
        if (!this.scene.anims.exists(handAnimationKey)) {
            this.scene.anims.create({
                key: handAnimationKey,
                frames: this.scene.anims.generateFrameNumbers("hands_eat", { start: 0, end: 11 }),
                duration: 600,
                repeat: 1
            });
        }

        // Create item
        const items: Phaser.GameObjects.Image[] = [];
        for (let i = 0; i < 3; i++) {
            const itemX = this.ALIEN.x + Phaser.Math.Between(-40, 40);
            const itemY = this.ALIEN.y + Phaser.Math.Between(-10, 30);
            const item = this.scene.addImage(itemX, itemY, itemName)
                .setScale(0.22)
                .setDepth(2);
            items.push(item);
        }

        let eatingSound: Phaser.Sound.WebAudioSound | undefined;

        const itemTween = this.scene.tweens.chain({
            targets: items,
            loop: 1,
            tweens: [
                {
                    duration: 300,
                    alpha: 1,
                    onStart: () => {
                        // Stop looking around
                        this.stopLookAround();
                        // Stop breathing
                        this.stopBreathing();
                        // Stop blinking
                        this.stopBlinking();

                        alien.play(openMouthAnimationKey);
                        eatingHands.play(handAnimationKey);

                        if (eatingSound?.isPlaying) {
                            eatingSound.stop();
                        }
                        eatingSound = this.scene.audioManager.playSoundEffect("eating")
                        eatingSound?.play();
                    },
                },
                {
                    duration: 600,
                    scale: this.scene.getScaledValue(0),
                    y: this.scene.getScaledValue(this.ALIEN.y - 30),
                    x: this.scene.getScaledValue(this.ALIEN.x),
                    onComplete: () => {
                        alien.play(closeMouthAnimationKey);
                    }
                },
                {
                    duration: 600,
                    alpha: 1,
                    onComplete: () => {
                        eatingSound?.stop();
                    }
                }
            ],
            onLoop: () => {
                items.forEach(item => {
                    item.setScale(0.22);
                    const itemX = this.scene.getScaledValue(this.ALIEN.x + Phaser.Math.Between(-40, 40));
                    const itemY = this.scene.getScaledValue(this.ALIEN.y + Phaser.Math.Between(-10, 30));
                    item.setPosition(itemX, itemY);
                });
            },
            onComplete: () => {
                this.scene.time.delayedCall(300, () => {
                    // Destroy items
                    itemTween.stop();
                    items.forEach(item => {
                        item.destroy();
                    });
                    hands.setVisible(true);
                    eatingHands.anims.stop();
                    eatingHands.setVisible(false);
                    eatingHands.setPosition(this.ALIEN.x, this.ALIEN.y);
                    // Make alien default
                    alien.setTexture("alien_default");
                    // Start breathing
                    this.startBreathing();
                    // Start blinking
                    this.startBlinking();

                    // Emmit eating complete
                    this.scene.events.emit("eatingcomplete");
                });
            }
        });
    }

    public createQuestionBar() {
        if (this.questionBar) this.questionBar.destroy();
        this.questionBar = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(159)
        );
        this.questionBar.add(
            this.scene.addImage(0, 0, "question_bg").setOrigin(0.5)
        );

        // Add question text (will be updated per question)
        const questionText = this.scene.addText(0, 0, "", {
            font: "700 36px Exo",
            color: "#FFEA00",
        })
            .setOrigin(0.5)
            .setName("questionText");

        this.questionBar.add(questionText);

        // Add question text overlay
        const overlay = new TextOverlay(this.scene, questionText, {
            label: "",
        });
        questionText.setData("overlay", overlay);

        // Add question volume icon
        if (this.GAME_MODE === "game") {
            if (this.questionVolumeIcon) this.questionVolumeIcon.destroy();
    
            const questionBounds = questionText.getBounds();
            const volumeIconX = - questionBounds.width / 2 - this.scene.getScaledValue(40);
            const volumeIconY = 0 - this.scene.getScaledValue(3);
            this.createQuestionVolumeIcon(volumeIconX, volumeIconY);
            this.questionVolumeIcon.setVisible(false);
            this.questionBar.add(this.questionVolumeIcon);

            // Add accessibility overlay
            const overlay = new ButtonOverlay(this.scene, this.questionVolumeIcon, {
                label: i18n.t("common.playQuestionAudio"),
                onKeyDown: () => this.toggleQuestionAudio(),
                style: {
                    height: `${this.questionVolumeIconImage.displayHeight}px`,
                    width: `${this.questionVolumeIconImage.displayWidth}px`,
                },
            });
            this.questionVolumeIcon.setData("overlay", overlay);
        }
    }

    private updateQuestionText(text: string) {
        const questionText: Phaser.GameObjects.Text = this.questionBar.getByName("questionText") as Phaser.GameObjects.Text;
        if (!questionText) return;
        questionText.setText(text);
        const overlay: TextOverlay = questionText.getData("overlay");
        overlay?.updateContent(text);

        this.announcementQueue.queue(text + (this.MECHANIC === "decompose" ? " " + i18n.t("game.iHave", { count: this.currentQuestion.selectedOption }) : ""));

        if (this.GAME_MODE === "game") {
            this.questionVolumeIcon.setVisible(true);
            this.updateQuestionVolumeIconPosition();
        }
    }

    private createItemsWithPlate(options: number[], itemName: string) {
        const plateGap = 55;
        const plateY = 567;

        const shuffle = (array: number[]) => {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        options = shuffle(options);

        // Create all plates
        options.forEach((optionValue, index) => {
            const optionContainer = this.scene.add.container(0, this.scene.getScaledValue(plateY)).setDepth(2);
            this.optionContainers.push(optionContainer);
            // Create plate
            const plate = this.scene.addImage(0, 0, "plate_default").setOrigin(0.5);
            this.plates.push(plate);

            const plateWidth = plate.displayWidth / this.scene.display.scale;
            const plateHeight = plate.displayHeight / this.scene.display.scale;
            const plateX = this.scene.display.width / 2 - (plateWidth + plateGap) * (options.length / 2 - index) + (plateWidth + plateGap) / 2;

            // Update the plate position
            optionContainer.setX(this.scene.getScaledValue(plateX));
            // Store original position in container data
            optionContainer.setData("originalX", plateX);
            optionContainer.setData("originalY", plateY);
            optionContainer.setData("itemCount", optionValue);
            // Create count label
            const countContainer = this.createCountLabel(0, -plateHeight / 2 - 10, optionValue);
            // Create items in a row on the plate
            const items = this.createItems(0, 0, optionValue, itemName);
            // Store items on the container for quick access during drag
            optionContainer.setData("items", items);
            // Add to container
            optionContainer.add([plate, countContainer, ...items]);

            // Make Option Container interactive
            optionContainer.setInteractive(
                {
                    hitArea: new Phaser.Geom.Rectangle(-plate.displayWidth / 2, -plate.displayHeight / 2, plate.displayWidth, plate.displayHeight),
                    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                    useHandCursor: true,
                    draggable: true,
                }
            );

            // Create accessibility overlay for tab navigation
            const overlay = new ImageOverlay(this.scene, plate, {
                label: `Plate with ${optionValue} ${itemName}s`,
                cursor: 'pointer',
            });
            this.plateOverlays.set(optionContainer, overlay);

            // Make it focusable via tab and add keyboard interaction
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.setAttribute('role', 'button');
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggablePlate', { count: optionValue, itemName: itemName }));

                this.setupOverlayEvents(optionContainer);

                // Add focus styles
                htmlElement.style.cssText += `
                    outline: none;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                `;
            }
        });
    }

    private createItemsWithFixedPlate(itemCount: number, itemName: string) {
        const x = 458;
        const y = 409;
        const optionContainer = this.scene.add.container(this.scene.getScaledValue(x), this.scene.getScaledValue(y)).setDepth(3);
        this.optionContainers.push(optionContainer);
        // Create plate
        const plate = this.scene.addImage(0, 0, "plate_fixed").setOrigin(0.5);
        this.plates.push(plate);
        // Create items in a row on the plate
        const items = this.createItems(0, 0, itemCount, itemName);

        // Create count label
        const text = this.scene.addText(0, -59, i18n.t("game.iHave", { count: itemCount }), {
            font: "700 24px Exo",
            color: "#000000",
        });
        text.setOrigin(0.5);
        new TextOverlay(this.scene, text, {
            label: i18n.t("game.iHave", { count: itemCount }),
            style: {
                top: `${this.scene.getScaledValue(y)}px`,
                left: `${this.scene.getScaledValue(x)}px`,
            }
        });

        const bgConfig = {
            x: 0 - text.displayWidth / 2,
            y: 0 - text.displayHeight / 2 - this.scene.getScaledValue(62),
            width: text.displayWidth,
            height: this.scene.getScaledValue(39),
            radius: this.scene.getScaledValue(10),
            borderWidth: this.scene.getScaledValue(3),
            padding: this.scene.getScaledValue(10),
        }
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xEAEAEA, 1);
        graphics.fillRoundedRect(bgConfig.x - bgConfig.padding, bgConfig.y, bgConfig.width + 2 * bgConfig.padding, bgConfig.height, bgConfig.radius);
        graphics.lineStyle(bgConfig.borderWidth, 0x080808);
        graphics.strokeRoundedRect(bgConfig.x - bgConfig.padding, bgConfig.y, bgConfig.width + 2 * bgConfig.padding, bgConfig.height, bgConfig.radius);

        // Add to container
        optionContainer.add([plate, ...items, graphics, text]);
    }

    private createCountLabel(x: number, y: number, itemCount: number, color: string = "#080808", radius: number = 21) {
        x = this.scene.getScaledValue(x);
        y = this.scene.getScaledValue(y);
        const hexColor = parseInt(color.replace("#", "0x"), 16);
        const countContainer = this.scene.add.container(x, y);

        radius = this.scene.getScaledValue(radius);
        const borderWidth = this.scene.getScaledValue(6);
        const graphics = this.scene.add.graphics();

        // Draw black border
        graphics.lineStyle(borderWidth, hexColor);
        graphics.strokeCircle(0, 0, radius);

        // Fill gray
        graphics.fillStyle(0xEAEAEA, 1);
        graphics.fillCircle(0, 0, radius);

        const countLabel = this.scene.addText(0, 3, itemCount.toString(), {
            font: "700 30px Exo",
            color: color,
        });
        countLabel.setOrigin(0.5);
        countContainer.add([graphics, countLabel]);
        return countContainer;
    }

    private createItems(plateX: number, plateY: number, itemCount: number, textureKey: string = "mooncake") {
        const itemScale = 0.22;
        const itemGapX = 2;
        const itemGapY = -2;
        const cols = Math.min(itemCount, 5);
        const rows = Math.ceil(itemCount / cols);
        const items: Phaser.GameObjects.Image[] = [];

        for (let i = 0; i < itemCount; i++) {
            const item = this.scene.addImage(0, 0, textureKey)
                .setScale(itemScale)
                .setOrigin(0.5)

            const itemWidth = item.displayWidth / this.scene.display.scale;
            const itemHeight = item.displayHeight / this.scene.display.scale;

            const row = Math.floor(i / cols);
            const col = i % cols;

            const itemX = plateX - (itemWidth + itemGapX) * (cols / 2 - col) + (itemWidth + itemGapX) / 2;
            const itemY = plateY - (itemHeight + itemGapY) * (rows / 2 - row) + (itemHeight + itemGapY) / 2;

            item.setX(this.scene.getScaledValue(itemX));
            item.setY(this.scene.getScaledValue(itemY));
            // Mark and cache original transforms for jiggle reset
            item.setData("origX", item.x);
            item.setData("origY", item.y);

            items.push(item);
        }

        return items;
    }

    private destroyDropZone() {
        // Get existing dropzone container
        const dropZone: Phaser.GameObjects.Container = this.scene.children.getByName('dropZone') as Phaser.GameObjects.Container;
        
        if (dropZone) {
            // Get and destroy text overlay
            const dropZoneText: Phaser.GameObjects.Text = dropZone.getByName('dropZoneText');
            if (dropZoneText) {
                const textOverlay: TextOverlay = dropZoneText.getData("overlay");
                if (textOverlay) {
                    textOverlay.destroy();
                }
            }
            
            // Destroy the dropzone container and all its children
            dropZone.destroy(true);
        }
        
        // Destroy drop zone overlay
        if (this.dropZoneOverlay) {
            this.dropZoneOverlay.destroy();
            this.dropZoneOverlay = undefined;
        }
        
        // Clear drop zone focus indicator
        this.clearDropZoneFocusIndicator();
    }

    private createDropZone() {
        const dropZoneX = this.scene.getScaledValue(this.scene.display.width / 2);
        const dropZoneY = this.scene.getScaledValue(413);
        const dropZoneWidth = this.scene.getScaledValue(1280);
        const dropZoneHeight = this.scene.getScaledValue(138);

        // Create drop zone container
        const zone = this.scene.add.container(dropZoneX, dropZoneY)
            .setName('dropZone')
            .setDepth(2)
            .setSize(dropZoneWidth, dropZoneHeight)

        // Create drop zone image
        const zoneImage = this.scene.addImage(0, 0, `drop_zone_${this.MECHANIC}`)
            .setOrigin(0.5)
            .setDepth(2)
            .setName('dropZoneImage');

        // Create drop zone text
        const label = this.MECHANIC === "compose" ? "dragTraysHere" : "dragTrayHere";
        const text = this.scene.addText(0, 0, i18n.t(`game.${label}`), {
            font: "700 20px Exo",
            color: "#FFFFFF",
        })
            .setOrigin(0.5)
            .setDepth(2)
            .setName('dropZoneText');

        const overlay = new TextOverlay(this.scene, text, {
            label: i18n.t(`game.${label}`),
            style: {
                top: `${dropZoneY}px`,
                left: `${dropZoneX}px`,
            }
        });
        text.setData("overlay", overlay);

        // Create accessibility overlay for drop zone
        const dropZoneOverlay = new ImageOverlay(this.scene, zoneImage, {
            label: i18n.t(`game.${label}`),
            cursor: 'default',
        });
        this.dropZoneOverlay = dropZoneOverlay;

        // Make drop zone focusable via tab and add keyboard interaction
        const domElement = (dropZoneOverlay as any).domElement;
        if (domElement?.node) {
            const htmlElement = domElement.node as HTMLElement;
            htmlElement.setAttribute('tabindex', '0');
            htmlElement.setAttribute('role', 'region');
            htmlElement.setAttribute('aria-label', i18n.t('accessibility.dropZone', { action: this.MECHANIC }));
            
            // Add keyboard event listener for Enter key
            htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.dropSelectedPlateWithKeyboard();
                }
            });

            // Add focus styles
            htmlElement.style.cssText += `
                outline: none;
                border-radius: 8px;
                transition: all 0.2s ease;
            `;

            htmlElement.addEventListener('focus', () => {
                // Highlight drop zone on focus
                const zoneImage = zone.getByName('dropZoneImage') as Phaser.GameObjects.Image;
                if (zoneImage) {
                    zoneImage.setTint(0xadd8e6); // Light blue tint for focus
                    zoneImage.setAlpha(0.8);
                }
            });

            htmlElement.addEventListener('blur', () => {
                // Remove highlight on blur
                const zoneImage = zone.getByName('dropZoneImage') as Phaser.GameObjects.Image;
                if (zoneImage) {
                    zoneImage.clearTint();
                    zoneImage.setAlpha(1);
                }
            });
        }

        // Add drop zone image and text to container
        zone.add([zoneImage, text]);

        return zone;
    }

    private updateDropZone(isVisible: boolean) {
        const dropZone: Phaser.GameObjects.Container = this.scene.children.getByName('dropZone') as Phaser.GameObjects.Container;
        
        // Return early if dropzone doesn't exist yet
        if (!dropZone) {
            return;
        }
        
        const dropZoneImage: Phaser.GameObjects.Image = dropZone.getByName('dropZoneImage');
        const dropZoneText: Phaser.GameObjects.Text = dropZone.getByName('dropZoneText');
        const dropZoneTextOverlay: TextOverlay = dropZoneText.getData("overlay");

        let x = 0;
        let y = 0;
        let width = 0;
        let height = 0;
        let textureKey = "";

        if (this.MECHANIC === "compose") {
            x = this.scene.display.width / 2;
            y = 413;
            width = 1280;
            height = 138;
            textureKey = "drop_zone_compose";
            dropZoneText.setText(i18n.t("game.dragTraysHere"));
            dropZoneTextOverlay.updateContent(i18n.t("game.dragTraysHere"));
        } else if (this.MECHANIC === "decompose") {
            x = 800;
            y = 413;
            width = 297;
            height = 85;
            textureKey = "drop_zone_decompose";
            dropZoneText.setText(i18n.t("game.dragTrayHere"));
            dropZoneTextOverlay.updateContent(i18n.t("game.dragTrayHere"));
        }

        x = this.scene.getScaledValue(x);
        y = this.scene.getScaledValue(y);
        width = this.scene.getScaledValue(width);
        height = this.scene.getScaledValue(height);

        dropZone.setPosition(x, y);
        dropZone.setSize(width, height);
        dropZoneImage.setTexture(textureKey);

        if (this.dropZoneOverlay) {
            const element = this.dropZoneOverlay.element;
            if (element) {
                element.style.top = `${y}px`;
                element.style.left = `${x}px`;
            }
            const textElement = dropZoneTextOverlay.element;
            if (textElement) {
                textElement.style.top = `${y}px`;
                textElement.style.left = `${x}px`;
            }
        }

        this.scene.tweens.add({
            targets: [dropZoneText, dropZoneImage],
            alpha: isVisible ? 1 : 0,
            duration: 500,
            ease: "Power2",
        });
    }

    private clearOptionContainers() {
        // Destroy and clear existing option containers and plates
        this.optionContainers.forEach((c) => c.destroy());
        this.optionContainers = [];
        this.plates = [];
        this.droppedPlates = [];
        this.updateDropZone(true);
    }

    private loadNextQuestion() {
        // Get next question from selector
        let nextQuestion: Question | null = null;

        if (this.GAME_MODE === "tutorial") {
            if (this.MECHANIC === "decompose") {
                nextQuestion = {
                    answer: "13",
                    operand1: "mooncake",
                    operand2: "3, 4, 5",
                    type: "decompose",
                    question_en: i18n.t("game.decomposeTutorialQuestion"),
                    question_es: i18n.t("game.decomposeTutorialQuestion"),
                    selectedOption: "10"
                };
            } else {
                nextQuestion = {
                    answer: "11",
                    operand1: "moonsandwich",
                    operand2: "10, 1, 6, 6",
                    type: "compose",
                    question_en: i18n.t("game.composeTutorialQuestion"),
                    question_es: i18n.t("game.composeTutorialQuestion"),
                };
            }
        } else {
            nextQuestion = this.questionSelector.getNextQuestion();
            if (!nextQuestion) {
                this.gameOver();
                return;
            }
            this.currentQuestionIndex++;
        }

        this.isProcessing = false;

        this.currentQuestion = nextQuestion;

        // Update mechanic
        this.MECHANIC = this.currentQuestion.type;

        // play count items tutorial if not played
        if (this.GAME_MODE === "game" && this.MECHANIC === "compose" && !this.isComposeTutorialPlayed) {
            this.isComposeTutorialPlayed = true;
            this.playTutorial("compose");
        }

        // Update question text
        const text = this.currentQuestion[`question_${this.lang}`] || this.currentQuestion.question_en;
        this.updateQuestionText(text);

        // Build options from operand2 (e.g., "6, 7, 5, 8") and item from operand1
        const options = this.currentQuestion.operand2
            .split(",")
            .map((s: string) => parseInt(s.trim()))
            .filter((n: number) => !Number.isNaN(n));

        const itemName = this.currentQuestion.operand1;

        // Set allowed plates
        this.allowedPlates = this.MECHANIC === "compose" ? 2 : 1;

        // Reset retry count
        this.retryCount = 0;

        this.resetAlien();
        this.clearOptionContainers();
        if (this.MECHANIC === "decompose") {
            const itemCount = parseInt(this.currentQuestion.selectedOption);
            this.createItemsWithFixedPlate(itemCount, itemName);
        }
        
        this.destroyDropZone();
        this.createDropZone();
        this.updateDropZone(true);
        
        this.setDropZoneOverlayEnabled(true);
        this.createItemsWithPlate(options, itemName);
        
        // Sort overlays in correct order in DOM
        this.sortOverlaysInDOM();
    }

    public setupDragAndDropEvents() {
        // Setup drag events for plates
        this.scene.input.on('dragstart', this.handleDragStart, this);
        this.scene.input.on('drag', this.handleDrag, this);
        this.scene.input.on('dragend', this.handleDragEnd, this);
    }

    private setupOverlayEvents(container: Phaser.GameObjects.Container) {
        const overlay = this.plateOverlays.get(container);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                // Add keyboard event listener for Enter key
                htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.selectPlateForKeyboard(container);
                    }
                });

                htmlElement.addEventListener('focus', () => {
                    // Show white outline on focus by changing plate texture
                    const plateIndex = this.optionContainers.indexOf(container);
                    if (plateIndex !== -1) {
                        const plate = this.plates[plateIndex];
                        plate.setTexture("plate_selected");
                    }
                    // this.createSelectedPlateIndicator(container);
                });

                htmlElement.addEventListener('blur', () => {
                    // Remove white outline on blur by resetting plate texture
                    const plateIndex = this.optionContainers.indexOf(container);
                    if (plateIndex !== -1) {
                        const plate = this.plates[plateIndex];
                        plate.setTexture("plate_default");
                    }
                    // this.clearSelectedPlateIndicator();
                });
            }
        }
    }

    /**
     * Enable accessibility overlays only for the provided containers; disable for all others.
     * Used by tutorials to restrict which plate overlay is tabbable/clickable.
     */
    public setPlateOverlaysEnabled(enabledContainers: Phaser.GameObjects.Container[]) {
        const enabledSet = new Set(enabledContainers);
        this.plateOverlays.forEach((overlay, container) => {
            const domElement = (overlay as any).domElement;
            const htmlElement = domElement?.node as HTMLElement | undefined;
            if (!htmlElement) return;

            const shouldEnable = enabledSet.has(container);
            if (shouldEnable) {
                htmlElement.removeAttribute('aria-disabled');
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.style.pointerEvents = 'auto';
            } else {
                htmlElement.setAttribute('aria-disabled', 'true');
                htmlElement.removeAttribute('tabindex');
                htmlElement.style.pointerEvents = 'none';
            }
        });
    }

    private setDropZoneOverlayEnabled(enabled: boolean) {
        if (this.dropZoneOverlay) {
            const domElement = (this.dropZoneOverlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                if (enabled) {
                    htmlElement.removeAttribute('aria-disabled');
                    htmlElement.setAttribute('tabindex', '0');
                    htmlElement.style.pointerEvents = 'auto';
                } else {
                    htmlElement.setAttribute('aria-disabled', 'true');
                    htmlElement.removeAttribute('tabindex');
                    htmlElement.style.pointerEvents = 'none';
                }
            }
        }
    }

    private handleDragStart = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
        if (!Array.isArray(this.optionContainers)) {
            return;
        }
        const plateIndex = this.optionContainers.indexOf(gameObject);
        if (plateIndex === -1) return;
        const plate = this.plates[plateIndex];
        plate.setTexture("plate_selected");
        // Start item jiggle while dragging
        this.startPlateJiggle(plateIndex);
    }

    private handleDrag = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container, dragX: number, dragY: number) => {
        if (!gameObject) return;
        if (!Array.isArray(this.optionContainers)) {
            return;
        }
        this.clearSelectedPlateIndicator();
        const plateIndex = this.optionContainers.indexOf(gameObject);
        if (plateIndex === -1) return;
        // Move the dragged plate container
        gameObject.setPosition(dragX, dragY);
        gameObject.setDepth(10); // Bring to front while dragging
    }

    private handleDragEnd = (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Container) => {
        if (!Array.isArray(this.optionContainers)) {
            return;
        }
        const plateIndex = this.optionContainers.indexOf(gameObject);
        if (plateIndex === -1) return;
        // Stop item jiggle when drag ends
        this.stopPlateJiggle(plateIndex);

        // Check if dropped in drop zone
        const dropZone: Phaser.GameObjects.Container = this.scene.children.getByName('dropZone') as Phaser.GameObjects.Container;
        if (!dropZone) return;

        const isOverlapping = Phaser.Geom.Rectangle.Intersection(
            gameObject.getBounds(),
            dropZone.getBounds()
        ).width > 0;

        if (isOverlapping) {
            this.dropPlateInZone(plateIndex);
        } else {
            this.returnPlateToOriginalPosition(plateIndex);
        }
    }

    private dropPlateInZone(plateIndex: number) {
        // If plate is already in drop zone, don't add it again
        if (this.droppedPlates.includes(plateIndex)) {
            return;
        }

        // If already at limit, remove the first dropped plate
        if (this.droppedPlates.length >= this.allowedPlates) {
            const firstDroppedIndex = this.droppedPlates[0];
            this.returnPlateToOriginalPosition(firstDroppedIndex);
        }

        // Add to dropped plates
        this.droppedPlates.push(plateIndex);

        if (this.droppedPlates.length > 0) {
            this.updateDropZone(false);
        }

        // Position plate in drop zone
        this.repositionDroppedPlates();

        // Change plate texture to selected
        const plate = this.plates[plateIndex];
        plate.setTexture("plate_drop");

        // Make plate uninteractive when in drop zone
        const container = this.optionContainers[plateIndex];
        container.disableInteractive(true);
        container.setDepth(2);

        // Remove accessibility overlay so plate is no longer tabbable
        const overlay = this.plateOverlays.get(container);
        if (overlay) {
            overlay.destroy();
            this.plateOverlays.delete(container);
        }

        // Clear selection if this plate was selected
        if (this.selectedPlateForKeyboard === container) {
            this.clearSelectedPlateIndicator();
            this.selectedPlateForKeyboard = undefined;
        }

        // Excite alien
        this.exciteAlien();

        // Stop all sound effects
        this.scene.audioManager.stopAllSoundEffects();

        // Play plate sound
        this.scene.audioManager.playSoundEffect("plate");

        const itemCount = container.getData("itemCount");
        if (itemCount) {
            this.scene.audioManager.playSoundEffect(`${itemCount}_${this.lang}`);
        }
        // Emmit plate drop event
        this.scene.events.emit("platedrop", {
            itemCount: itemCount,
        });
    }

    private startPlateJiggle(plateIndex: number) {
        const container = this.optionContainers[plateIndex];
        if (!container) return;
        const items: Phaser.GameObjects.Image[] = container.getData("items") || [];
        items.forEach((item) => {
            // Avoid duplicating tweens
            if (item.getData("jiggleTween")) return;
            const maxAngle = 5;
            const dx = 3;
            const dy = 3;
            const tween = this.scene.tweens.chain({
                targets: item,
                angle: maxAngle,
                tweens: [
                    {
                        angle: -maxAngle,
                        duration: 100,
                        dx: -dx,
                        dy: -dy,
                    },
                    {
                        angle: maxAngle,
                        duration: 100,
                        dx: dx,
                        dy: dy,
                    },
                ],
                yoyo: true,
                loop: -1,
                ease: "Sine.easeInOut",
            });
            item.setData("jiggleTween", tween);
        });
    }

    private stopPlateJiggle(plateIndex: number) {
        const container = this.optionContainers[plateIndex];
        if (!container) return;
        const items: Phaser.GameObjects.Image[] = container.getData("items") || [];
        items.forEach((item) => {
            const tween: Phaser.Tweens.Tween | undefined = item.getData("jiggleTween");
            if (tween) {
                tween.stop();
                if (typeof (tween as any).destroy === "function") {
                    (tween as any).destroy();
                }
                if (item.data) {
                    item.data.remove("jiggleTween");
                } else {
                    item.setData("jiggleTween", null);
                }
            }
            // Reset transforms
            const origX = item.getData("origX") as number;
            const origY = item.getData("origY") as number;
            if (typeof origX === "number" && typeof origY === "number") {
                item.setPosition(origX, origY);
            }
            item.setAngle(0);
        });
    }

    private returnPlateToOriginalPosition(plateIndex: number) {
        const container = this.optionContainers[plateIndex];

        // Remove from dropped plates
        const dropIndex = this.droppedPlates.indexOf(plateIndex);
        if (dropIndex > -1) {
            this.droppedPlates.splice(dropIndex, 1);
        }

        // Get original position from container data
        const originalX = container.getData("originalX");
        const originalY = container.getData("originalY");

        // Return to original position
        this.scene.tweens.add({
            targets: container,
            x: this.scene.getScaledValue(originalX),
            y: this.scene.getScaledValue(originalY),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // Change plate texture back to normal
                const plate = this.plates[plateIndex];
                plate.setTexture("plate_default");

                // If overlay already exists, don't create a new one
                if (this.plateOverlays.has(container)) {
                    // Show white outline for the focused element
                    this.optionContainers.forEach(c => {
                        const containerOverlay = this.plateOverlays.get(c);
                        if (containerOverlay) {
                            if (containerOverlay.element === document.activeElement) {
                                const focusedPlateIndex = this.optionContainers.indexOf(c);
                                if (focusedPlateIndex !== -1) {
                                    const focusedPlate = this.plates[focusedPlateIndex];
                                    focusedPlate.setTexture("plate_selected");
                                }
                                // this.createSelectedPlateIndicator(c);
                            }
                        }
                    });
                    return;
                }

                // Re-enable interaction when plate returns to original position
                container.setInteractive(
                    {
                        hitArea: new Phaser.Geom.Rectangle(-plate.displayWidth / 2, -plate.displayHeight / 2, plate.displayWidth, plate.displayHeight),
                        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
                        useHandCursor: true,
                        draggable: true,
                    }
                );

                // Recreate accessibility overlay so plate becomes tabbable again
                const itemCount = container.getData("itemCount");
                const itemName = this.getItemTypeName();
                const overlay = new ImageOverlay(this.scene, plate, {
                    label: `Plate with ${itemCount} ${itemName}s`,
                    cursor: 'pointer',
                });
                this.plateOverlays.set(container, overlay);

                // Re-setup keyboard interaction
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    htmlElement.setAttribute('tabindex', '0');
                    htmlElement.setAttribute('role', 'button');
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggablePlate', { count: itemCount, itemName: itemName }));
                    
                    // Add keyboard event listener for Enter key
                    htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            this.selectPlateForKeyboard(container);
                        }
                    });

                    // Add focus styles
                    htmlElement.style.cssText += `
                        outline: none;
                        border-radius: 8px;
                        transition: all 0.2s ease;
                    `;

                    htmlElement.addEventListener('focus', () => {
                        // Show white outline on focus by changing plate texture
                        const plateIndex = this.optionContainers.indexOf(container);
                        if (plateIndex !== -1) {
                            const plate = this.plates[plateIndex];
                            plate.setTexture("plate_selected");
                        }
                        // this.createSelectedPlateIndicator(container);
                    });

                    htmlElement.addEventListener('blur', () => {
                        // Remove white outline on blur by resetting plate texture
                        const plateIndex = this.optionContainers.indexOf(container);
                        if (plateIndex !== -1) {
                            const plate = this.plates[plateIndex];
                            plate.setTexture("plate_default");
                        }
                        // this.clearSelectedPlateIndicator();
                    });
                }

                // Show white outline for the focused element
                this.optionContainers.forEach(c => {
                    const containerOverlay = this.plateOverlays.get(c);
                    if (containerOverlay) {
                        if (containerOverlay.element === document.activeElement) {
                            const focusedPlateIndex = this.optionContainers.indexOf(c);
                            if (focusedPlateIndex !== -1) {
                                const focusedPlate = this.plates[focusedPlateIndex];
                                focusedPlate.setTexture("plate_selected");
                            }
                            // this.createSelectedPlateIndicator(c);
                        }
                    }
                });

                // Reposition remaining plates in drop zone
                this.repositionDroppedPlates();
                
                // Sort overlays in correct order in DOM
                this.sortOverlaysInDOM();
            }
        });
        container.setDepth(3);
    }

    private repositionDroppedPlates() {
        this.droppedPlates.forEach((plateIndex, index) => {
            const container = this.optionContainers[plateIndex];
            const dropZoneX = this.MECHANIC === "compose" ? this.scene.display.width / 2 : 800;
            const dropZoneY = 413;
            let offsetX = 0;

            if (this.MECHANIC === "compose") {
                offsetX = index === 0 ? -150 : 150;
            }

            this.scene.tweens.add({
                targets: container,
                x: this.scene.getScaledValue(dropZoneX + offsetX),
                y: this.scene.getScaledValue(dropZoneY),
                duration: 500,
                ease: "Power2",
                onComplete: () => {
                    const overlay = this.plateOverlays.get(container);
                    if (overlay) {
                        overlay.element.style.x = `${this.scene.getScaledValue(dropZoneX + offsetX)}px`;
                        overlay.element.style.y = `${this.scene.getScaledValue(dropZoneY)}px`;
                    }
                }
            });
        });
    }

    private createResetButton() {
        const xPos = this.scene.display.width / 2 - 120;
        const yPos = 703;

        const resetButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: "btn_alter",
                hover: "btn_alter_hover",
                pressed: "btn_alter_pressed",
                disabled: "btn_alter_inactive",
            },
            text: i18n.t("game.reset"),
            label: i18n.t("game.reset"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: xPos,
            y: yPos,
            isDisabled: this.GAME_MODE === "tutorial",
            onClick: () => {
                handleResetClick();
            },
        });
        resetButton.setDepth(3);
        resetButton.setName("resetButton");

        const handleResetClick = () => {
            if (this.isProcessing) return;
            // Return all dropped plates to original positions
            const droppedCopy = [...this.droppedPlates];
            droppedCopy.forEach(plateIndex => {
                this.returnPlateToOriginalPosition(plateIndex);
            });

            this.updateDropZone(true);
        }
    }

    private createSubmitButton() {
        const xPos = this.scene.display.width / 2 + 120;
        const yPos = 703;

        const checkButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: "btn_purple",
                hover: "btn_purple_hover",
                pressed: "btn_purple_pressed",
            },
            text: i18n.t("game.feed"),
            label: i18n.t("game.feed"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: xPos,
            y: yPos,
            onClick: () => {
                this.checkAnswer();
            },
        });
        checkButton.setDepth(3);
        checkButton.setName("checkButton");
    }

    private sortOverlaysInDOM() {
        // Get all plate overlays and sort them by originalX position
        const overlayElements: Array<{ element: HTMLElement, originalX: number }> = [];
        
        this.plateOverlays.forEach((overlay, container) => {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const originalX = container.getData("originalX");
                overlayElements.push({
                    element: domElement.node as HTMLElement,
                    originalX: originalX
                });
            }
        });
        
        // Sort by originalX
        overlayElements.sort((a, b) => a.originalX - b.originalX);
        
        // Reorder in DOM
        if (overlayElements.length > 0 && overlayElements[0].element.parentNode) {
            const parent = overlayElements[0].element.parentNode;
            overlayElements.forEach(({ element }) => {
                parent.appendChild(element);
            });
        }
        
        // Move control buttons to the end
        this.moveControlButtonsToEnd();
    }

    private moveControlButtonsToEnd() {
        const resetBtn = this.scene.children.getByName("resetButton") as Phaser.GameObjects.Container;
        const checkBtn = this.scene.children.getByName("checkButton") as Phaser.GameObjects.Container;

        if (!checkBtn || !resetBtn) return;

        // Get the button overlays and move their DOM elements to the end
        const resetOverlay = (resetBtn as any)?.buttonOverlay as ButtonOverlay;
        const checkOverlay = (checkBtn as any)?.buttonOverlay as ButtonOverlay;
        
        if (resetOverlay?.domElement?.node && resetOverlay.domElement.node.parentNode) {
            const parent = resetOverlay.domElement.node.parentNode;
            parent.appendChild(resetOverlay.domElement.node);
        }
        
        if (checkOverlay?.domElement?.node && checkOverlay.domElement.node.parentNode) {
            const parent = checkOverlay.domElement.node.parentNode;
            parent.appendChild(checkOverlay.domElement.node);
        }
    }

    public showEquation(color: string = "#080808") {
        const x = this.scene.getScaledValue(this.scene.display.width / 2);
        const y = this.scene.getScaledValue(413);
        let totalWidth = 0;
        const equationContainer = this.scene.add.container(x, y);
        equationContainer.setDepth(5);
        equationContainer.setName("equationContainer");
        let options = this.currentQuestion.operand2
            .split(",")
            .map((s: string) => parseInt(s.trim()))
            .filter((n: number) => !Number.isNaN(n));

        const answer = parseInt(this.currentQuestion.answer);

        const dropLength = this.droppedPlates.length;
        let operand1;
        if (this.MECHANIC === "compose") {
            operand1 = dropLength >= 1 ? this.optionContainers[this.droppedPlates[0]].getData("itemCount") : null;
        } else {
            operand1 = parseInt(this.currentQuestion.selectedOption);
            // Add operand1 to options (here we have 3 options)
            options.push(operand1);
        }

        let operand2 = dropLength === 2 ? this.optionContainers[this.droppedPlates[1]].getData("itemCount") : null;

        if (operand1 !== null && operand1 !== undefined) {
            // remove first occurrence of operand1 from options
            const index = options.indexOf(operand1);
            if (index !== -1) {
                options.splice(index, 1);
            }

            for (let i = 0; i < options.length; i++) {
                if (options[i] + operand1 === answer) {
                    operand2 = options[i];
                    break;
                }
            }
        }

        if (operand2 === null) {
            for (let i = 0; i < options.length; i++) {
                for (let j = 0; j < options.length; j++) {
                    if (i === j) continue;
                    if (options[i] + options[j] === answer) {
                        operand1 = options[i];
                        operand2 = options[j];
                        break;
                    }
                }
            }
        }

        const answerLabel = this.createCountLabel(0, 0, answer, color, 25);
        totalWidth += answerLabel.displayWidth
        const operand1Label = this.createCountLabel(0, 0, operand1, color, 25);
        totalWidth += operand1Label.displayWidth
        const operand2Label = this.createCountLabel(0, 0, operand2, color, 25);
        totalWidth += operand2Label.displayWidth

        const operator = this.scene.addText(0, 0, "+", {
            font: "700 36px Exo",
            color: "#ffffff",
        }).setOrigin(0.5);
        totalWidth += operator.displayWidth

        const equalSign = this.scene.addText(0, 0, "=", {
            font: "700 36px Exo",
            color: "#ffffff",
        }).setOrigin(0.5);
        totalWidth += equalSign.displayWidth

        equationContainer.add([operand1Label, operator, operand2Label, equalSign, answerLabel]);

        const space = this.scene.getScaledValue(20);
        let startX = 0 - totalWidth / 2 - (space * (equationContainer.list.length))

        type childType = Phaser.GameObjects.Text | Phaser.GameObjects.Image;
        equationContainer.list.forEach((child, _index) => {
            const gameObject = child as childType;
            const width = gameObject.displayWidth;
            startX += width / 2 + space;
            gameObject.setPosition(startX, 0);
            startX += width / 2 + space;
        });

        // Add semi-transparent rounded background behind the equation
        const bg = this.scene.add.graphics();
        const bgWidth = this.scene.getScaledValue(297);
        const bgHeight = this.scene.getScaledValue(85);
        const bgRadius = this.scene.getScaledValue(10);
        bg.fillStyle(0x000000, 0.4);
        bg.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, bgRadius);
        equationContainer.addAt(bg, 0);

        // Stop all sound effects
        this.scene.audioManager.stopAllSoundEffects();
        this.isAudioPlaying = false;

        if (this.GAME_MODE === "game") {
            const audioKeys = [`${operand1}_${this.lang}`, `plus_${this.lang}`, `${operand2}_${this.lang}`, `makes_${this.lang}`, `${answer}_${this.lang}`];
            this.playAudioSequence(audioKeys, 0);
            this.scene.events.on("audiosequencecomplete", () => {
                this.scene.time.delayedCall(1000, () => {
                    equationContainer.destroy();
                });
            });
        }

    }

    private async checkAnswer() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        const correctAnswer = parseInt(this.currentQuestion.answer);
        let droppedValues = this.droppedPlates.reduce((acc, index) => acc + this.optionContainers[index].getData("itemCount"), 0);
        if (this.MECHANIC === "decompose") {
            droppedValues += parseInt(this.currentQuestion.selectedOption);
        }

        if (this.GAME_MODE === "tutorial") {
            // Emmit check answer event
            this.scene.events.emit("checkanswer");
            this.optionContainers.forEach(container => {
                const overlay = this.plateOverlays.get(container);
                if (overlay) overlay.destroy();
            });
            this.setDropZoneOverlayEnabled(false);
            this.isProcessing = false;
            return;
        }

        let analyticsQuestion = '';
        let optionsDisplay: Array<{ option: string; isCorrect: boolean }> = [];
        let studentResponse = '';
        if (this.MECHANIC === "compose") {
            const totalTrays = this.currentQuestion.operand2.split(",").length;
            // Structure: Feed me 10 mooncakes. There are 4 trays with 6, 4, 3, and 7 mooncakes each.
            analyticsQuestion = `${this.currentQuestion.question_en} There are ${totalTrays} trays with ${this.currentQuestion.operand2} items in each.`;
            
            // Structure: 6 + 4
            studentResponse = this.droppedPlates.map((index) => this.optionContainers[index].getData("itemCount")).join(" + ");
        } else if (this.MECHANIC === "decompose") {
            // Structure: I want 11 mooncakes! I have 10.
            analyticsQuestion = `${this.currentQuestion.question_en} I have ${this.currentQuestion.selectedOption}.`;
            const options = this.currentQuestion.operand2.split(",").map((s: string) => parseInt(s.trim()));
            studentResponse = this.droppedPlates.reduce((acc, index) => acc + this.optionContainers[index].getData("itemCount"), 0).toString();
            const correctOption = parseInt(this.currentQuestion.answer) - parseInt(this.currentQuestion.selectedOption);
            optionsDisplay = options.map(option => ({ option: option.toString(), isCorrect: option === correctOption }));
        }

        if (droppedValues === correctAnswer) {
            // Reset retry count on correct answer
            this.retryCount = 0;
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: analyticsQuestion,
                isCorrect: true,
                questionMechanic: this.MECHANIC,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: studentResponse,
                studentResponseAccuracyPercentage: '100%',
                optionsDisplay: this.MECHANIC === "decompose" ? optionsDisplay : undefined,
            });
            // update score
            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            this.scoreCoins.updateScoreDisplay(true);
            // update progress bar
            const progress = this.currentQuestionIndex / this.totalQuestions;
            this.progressBar?.drawProgressFill(
                progress,
                this.scoreHelper.getCurrentStreak()
            );

            // Make alien happy
            const itemName = this.currentQuestion.operand1;
            this.startEating(itemName);

            this.showEquation();
            this.showSuccessAnimation();

            // Hide the option containers
            this.optionContainers.forEach(container => {
                container.setVisible(false);
                const overlay = this.plateOverlays.get(container);
                if (overlay) overlay.destroy();
            });
            this.setDropZoneOverlayEnabled(false);
            // streak celebration
            if (this.scoreHelper.showStreakAnimation()) {
                this.scene.events.once("eatingcomplete", () => {
                    this.announcementQueue.queue(i18n.t("game.inARow", { count: this.scoreHelper.getCurrentStreak() }));
                    this.showMascotCelebration(() => {
                        this.loadNextQuestion();
                    });
                });
                return;
            }

            // Listen for audio complete event
            this.scene.events.once("eatingcomplete", () => {
                this.scene.time.delayedCall(2500, () => {
                    this.loadNextQuestion();
                });
            });
        } else {
            // Increment retry count
            this.retryCount++;

            if (this.retryCount < this.maxRetries) {
                // Allow retry - don't update score or progress yet
                this.scene.time.delayedCall(2000, async () => {
                    // Return all dropped plates to original positions
                    const droppedCopy = [...this.droppedPlates];
                    droppedCopy.forEach(plateIndex => {
                        this.returnPlateToOriginalPosition(plateIndex);
                    });

                    await this.resetAlien();
                    this.isProcessing = false;
                    this.updateDropZone(true);
                });
                this.showErrorAnimation();
                await this.makeSad();

                // Retrun in this case
                return;
            } else {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: 0,
                    questionText: analyticsQuestion,
                    isCorrect: false,
                    questionMechanic: this.MECHANIC,
                    gameLevelInfo: 'game.space_party.default',
                    studentResponse: studentResponse,
                    studentResponseAccuracyPercentage: '0%',
                    optionsDisplay: this.MECHANIC === "decompose" ? optionsDisplay : undefined,
                });
                // update score
                this.questionSelector.answerIncorrectly(this.currentQuestion);
                this.scoreHelper.answerIncorrectly();
                this.scoreCoins.updateScoreDisplay(false);
                // update progress bar
                const progress = this.currentQuestionIndex / this.totalQuestions;
                this.progressBar?.drawProgressFill(
                    progress,
                    this.scoreHelper.getCurrentStreak()
                );

                // Make alien sad
                this.makeSad();

                this.showEquation("#8B211A");
                this.updateDropZone(false);

                // Hide the option containers
                this.optionContainers.forEach(container => {
                    container.setVisible(false);
                });
                this.showErrorAnimation();
            }

            // Listen for audio complete event
            this.scene.events.once("audiosequencecomplete", () => {
                this.scene.time.delayedCall(2500, () => {
                    this.loadNextQuestion();
                });
            });
        }
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            this.scene.scene.pause();
            this.scene.scene.launch("CelebrationScene", {
                scoreHelper: this.scoreHelper,
                progress: this.currentQuestionIndex / this.totalQuestions,
                callback: () => {
                    cb?.();
                },
            });
            this.scene.scene.bringToTop("CelebrationScene");
        });
    }

    private showSuccessAnimation() {
        const width = this.scene.display.width;
        const height = 122;
        const successContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );

        successContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x007e11);
        successContainer.add(bgRect);

        const bgRectTop = this.scene
            .addRectangle(0, -height / 2, width, 7, 0x24e13e)
            .setOrigin(0.5, 0);
        successContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, "correct_icon").setOrigin(0.5);
        // Delay announcement to avoid focus interference
        this.scene.time.delayedCall(1200, () => {
            announceToScreenReader(i18n.t("common.correct") + "\u200B".repeat(++this.announcementCount));
        });

        successContainer.add(icon);

        this.scene.audioManager.playSoundEffect("positive-sfx");
        // Simple slide up animation
        this.scene.tweens.add({
            targets: successContainer,
            y: this.scene.getScaledValue(
                this.scene.display.height - height / 2
            ),
            duration: 1000,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(
                            this.scene.display.height + height / 2
                        ),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            successContainer.destroy();
                        },
                    });
                });
            },
        });
    }

    private showErrorAnimation() {
        const width = this.scene.display.width;
        const height = 122;
        const errorContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(this.scene.display.height + height / 2)
        );

        errorContainer.setDepth(100);

        // Create background rectangle
        const bgRect = this.scene.addRectangle(0, 0, width, height, 0x8b0000);
        errorContainer.add(bgRect);

        const bgRectTop = this.scene
            .addRectangle(0, -height / 2, width, 7, 0xf40000)
            .setOrigin(0.5, 0);
        errorContainer.add(bgRectTop);

        // Create icon and text
        const icon = this.scene.addImage(0, 0, "incorrect_icon").setOrigin(0.5);
        // Delay announcement to avoid focus interference
        this.scene.time.delayedCall(1200, () => {
            announceToScreenReader(i18n.t("common.incorrect") + "\u200B".repeat(++this.announcementCount));
        });

        errorContainer.add(icon);

        this.scene.audioManager.playSoundEffect("negative-sfx");
        // Simple slide up animation
        this.scene.tweens.add({
            targets: errorContainer,
            y: this.scene.getScaledValue(
                this.scene.display.height - height / 2
            ),
            duration: 1000,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(
                            this.scene.display.height + height / 2
                        ),
                        duration: 1000,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                        },
                    });
                });
            },
        });
    }

    public createDoors(initialState: "open" | "closed" = "closed") {
        const doorY = this.scene.display.height / 2;
        let doorLeftX = this.scene.display.width / 2;
        let doorRightX = this.scene.display.width / 2;
        if (initialState === "open") {
            doorLeftX = 0;
            doorRightX = this.scene.display.width;
        }
        this.doorLeft = this.scene
            .addImage(doorLeftX, doorY, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(1, 0.5)
            .setDepth(100);
        this.doorRight = this.scene
            .addImage(doorRightX, doorY, COMMON_ASSETS.DOOR.KEY)
            .setOrigin(0, 0.5)
            .setFlipX(true)
            .setDepth(100);
    }

    openDoors() {
        const countdownImg = this.scene
            .addImage(
                this.scene.display.width / 2,
                this.scene.display.height / 2,
                "count_3"
            )
            .setOrigin(0.5)
            .setDepth(101);
            countdownImg.setScale(200/countdownImg.height);

        let count = 3;

        this.scene.audioManager.playSoundEffect("countdown");
        this.scene.time.addEvent({
            delay: 1000,
            callbackScope: this,
            repeat: 3,
            callback: () => {
                // Announce to screen reader
                announceToScreenReader(count > 0 ? count.toString() : '');
                count--;
                if (count > 0) {
                    this.scene.audioManager.playSoundEffect("countdown");
                    countdownImg.setTexture(`count_${count}`);
                } else if (count === 0) {
                    countdownImg.destroy();
                    this.scene.audioManager.playSoundEffect("door_close");
                    this.scene.tweens.add({
                        targets: this.doorLeft,
                        x: 0,
                        duration: 1000,
                        ease: "Power2",
                    });
                    this.scene.tweens.add({
                        targets: this.doorRight,
                        x: this.scene.getScaledValue(this.scene.display.width),
                        duration: 1000,
                        ease: "Power2",
                    });
                    setTimeout(() => {
                        this.scene.audioManager.playBackgroundMusic("bg-music");
                    }, 1000);
                }
            },
        });
    }

    closeDoors() {
        this.scene.audioManager.playSoundEffect("door_close");

        this.scene.tweens.add({
            targets: this.doorLeft,
            x: this.scene.getScaledValue(this.scene.display.width / 2),
            duration: 1000,
            ease: "Power2",
        });
        this.scene.tweens.add({
            targets: this.doorRight,
            x: this.scene.getScaledValue(this.scene.display.width / 2),
            duration: 1000,
            ease: "Power2",
        });
    }

    private gameOver() {
        this.isProcessing = true;
        const finalScore = this.scoreHelper.endGame();
        this.closeDoors();
        this.scene.time.delayedCall(2000, () => {
            this.scene.audioManager.unduckBackgroundMusic();
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        });
    }

    resetGame() {
        this.isProcessing = false;
        this.currentQuestionIndex = 0;
        this.scoreHelper.reset();
        this.questionSelector.reset(true);
        this.alienMap.clear();
    }

    private createQuestionVolumeIcon(x: number, y: number) {
        this.questionVolumeIcon = this.scene.add.container(x, y);
        this.questionVolumeIconImage = this.scene
            .addImage(0, 0, "volume_2")
            .setOrigin(0.5)
        this.questionVolumeIcon.add(this.questionVolumeIconImage);

        // Make it interactive
        this.questionVolumeIcon.setSize(40, 40);
        this.questionVolumeIcon.setInteractive({ useHandCursor: true });
        this.questionVolumeIcon.on("pointerdown", () =>
            this.toggleQuestionAudio()
        );
    }

    private updateQuestionVolumeIconPosition() {
        const questionText: Phaser.GameObjects.Text = this.questionBar.getByName("questionText") as Phaser.GameObjects.Text;
        if (!questionText) return;
        const questionBounds = questionText.getBounds();
        const volumeIconX = - questionBounds.width / 2 - this.scene.getScaledValue(40);
        const volumeIconY = 0 - this.scene.getScaledValue(3);   

        this.questionVolumeIcon.setPosition(volumeIconX, volumeIconY);

        const overlay: ButtonOverlay = this.questionVolumeIcon.getData("overlay");
        if (overlay && overlay.element) {
            overlay.element.style.top = `${volumeIconY}px`;
            overlay.element.style.left = `${volumeIconX + this.scene.getScaledValue(40)}px`;
        }
    }

    private toggleQuestionAudio() {
        if (this.isAudioPlaying) {
            this.stopQuestionAudio();
        } else {
            this.playQuestionAudio();
        }
    }

    private playQuestionAudio() {
        if (this.isAudioPlaying) return;

        this.questionVolumeIconImage.setTexture("volume");

        // Get the appropriate audio key based on question type
        const audioKeys = []
        audioKeys.push(this.MECHANIC === "compose" ? `feed_${this.lang}` : `want_${this.lang}`);
        audioKeys.push(`${this.currentQuestion.answer}_${this.lang}`);
        audioKeys.push(`${this.currentQuestion.operand1}_${this.lang}`);
        if (this.MECHANIC === 'decompose') {
            audioKeys.push(`have_${this.lang}`);
            audioKeys.push(`${this.currentQuestion.selectedOption}_${this.lang}`);
        }

        // Lower the background music volume
        this.scene.audioManager.duckBackgroundMusic();

        // Play the audio
        this.playAudioSequence(audioKeys, 0);

        // Start volume animation
        this.startVolumeAnimation();
    }

    private stopQuestionAudio() {
        if (!this.isAudioPlaying) return;

        this.isAudioPlaying = false;
        this.scene.audioManager.unduckBackgroundMusic();
        if (this.questionVolumeIconImage && this.questionVolumeIconImage.scene && this.questionVolumeIconImage.active) {
            this.questionVolumeIconImage.setTexture("volume_2");
        }

        // Stop the audio
        if (this.audioInstance) {
            this.audioInstance.stop();
            this.audioInstance = undefined;
        }

        // Stop the animation
        if (this.questionAudioTween) {
            this.questionAudioTween.stop();
        }
    }

    private startVolumeAnimation() {
        const volumeLevels = ["volume_2", "volume_1", "volume", "volume_1", "volume_2"];
        let currentIndex = 0;

        // Set initial texture
        this.questionVolumeIconImage.setTexture(volumeLevels[currentIndex]);

        this.questionAudioTween = this.scene.tweens.add({
            targets: this.questionVolumeIconImage,
            alpha: 1,
            duration: 200,
            repeat: volumeLevels.length - 1,
            onRepeat: () => {
                currentIndex = (currentIndex + 1) % volumeLevels.length;
                this.questionVolumeIconImage.setTexture(volumeLevels[currentIndex]);
            }
        });
    }

    private playAudioSequence(audioKeys: string[], currentIndex: number = 0) {
        if (currentIndex === audioKeys.length) {
            // Emmit audio complete event
            this.isAudioPlaying = false;
            this.scene.events.emit("audiosequencecomplete");
            this.scene.audioManager.unduckBackgroundMusic();
            return;
        }
        if (!this.isAudioPlaying) {
            this.scene.audioManager.stopAllSoundEffects();
        }
        this.isAudioPlaying = true;
        this.scene.audioManager.duckBackgroundMusic();

        const audioKey = audioKeys[currentIndex];
        this.audioInstance = this.scene.audioManager.playSoundEffect(audioKey);

        this.audioInstance?.on("complete", () => {
            if (this.isAudioPlaying) {
                this.playAudioSequence(audioKeys, currentIndex + 1);
            }
        });
    }

    private createSetttingsButtons() {
        if (this.GAME_MODE === "tutorial") {
            return;
        }

        // Pause button
        const pauseBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t("common.pause"),
            x: this.scene.display.width - 60,
            y: 60,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.audioManager.pauseAll();
                this.scene.scene.launch("PauseScene", {
                    parentScene: "GameScene",
                });
            },
        }).setName('pause_btn');
        pauseBtn.setDepth(1);

        // Mute button
        const muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t("common.mute"),
            ariaLive: 'off',
            x: this.scene.display.width - 60,
            y: 150,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });
        muteBtn.setDepth(1);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.scene.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (muteBtn as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = muteBtn.getData('state');
            if(muteBtnState != label) {
                muteBtn.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.scene.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        muteBtn.on("destroy", () => {
            this.scene.events.off("update", handleMuteBtnUpdate);
        });

        // Volume slider
        const volumeSlider = new VolumeSlider(this.scene);
        volumeSlider.create(
            this.scene.display.width - 220,
            240,
            "blue",
            i18n.t("common.volume")
        );

        const volumeBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t("common.volume"),
            x: this.scene.display.width - 60,
            y: 240,
            raisedOffset: 3.5,
            onClick: () => {
                volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(1);

        // Help button
        const helpBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t("common.help"),
            x: this.scene.display.width - 60,
            y: 330,
            raisedOffset: 3.5,
            onClick: () => this.playTutorial(this.MECHANIC),
        });
        helpBtn.setDepth(5);
    }

    private playTutorial(mechanicType: string) {
        this.stopQuestionAudio();
        this.scene.scene.pause();
        this.scene.audioManager.stopBackgroundMusic();
        this.scene.scene.launch("ComposeDecomposeTutorial", {
            fromGameScene: true,
            mechanicType: mechanicType,
        });
        this.scene.scene.bringToTop("ComposeDecomposeTutorial");
    }

    // Keyboard accessibility methods
    private selectPlateForKeyboard(plateContainer: Phaser.GameObjects.Container): void {
        // If clicking on the same plate that's already selected, deselect it
        if (this.selectedPlateForKeyboard === plateContainer) {
            const plateIndex = this.optionContainers.indexOf(plateContainer);
            if (plateIndex !== -1) {
                this.stopPlateJiggle(plateIndex);
            }
            this.clearSelectedPlateIndicator();
            this.selectedPlateForKeyboard = undefined;
            return;
        }
        
        // Stop jiggle for previously selected plate if any
        if (this.selectedPlateForKeyboard) {
            const prevPlateIndex = this.optionContainers.indexOf(this.selectedPlateForKeyboard);
            if (prevPlateIndex !== -1) {
                this.stopPlateJiggle(prevPlateIndex);
            }
        }
        
        // Clear any existing selection
        this.clearSelectedPlateIndicator();
        
        // Set new selection
        this.selectedPlateForKeyboard = plateContainer;
        
        // Show white outline by changing plate texture
        const plateIndex = this.optionContainers.indexOf(plateContainer);
        if (plateIndex !== -1) {
            const plate = this.plates[plateIndex];
            plate.setTexture("plate_selected");
            // this.createSelectedPlateIndicator(plateContainer);
        }
        
        // Start jiggle animation to show selection (same as mouse drag)
        if (plateIndex !== -1) {
            this.startPlateJiggle(plateIndex);
        }
        
        // Play selection sound
        this.scene.audioManager.playSoundEffect('correct');
        
        // Update aria-label to indicate selection
        const overlay = this.plateOverlays.get(plateContainer);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                const itemCount = plateContainer.getData('itemCount');
                const itemType = this.getItemTypeName();
                htmlElement.setAttribute('aria-label', 
                    i18n.t('accessibility.selectedPlate', { count: itemCount, itemName: itemType })
                );
            }
        }
    }

    private dropSelectedPlateWithKeyboard(): void {
        if (!this.selectedPlateForKeyboard) {
            // No plate selected - play error sound
            this.scene.audioManager.playSoundEffect('incorrect');
            return;
        }

        // Get the plate index
        const plateIndex = this.optionContainers.indexOf(this.selectedPlateForKeyboard);
        if (plateIndex === -1) return;

        // Stop jiggle animation before dropping
        this.stopPlateJiggle(plateIndex);

        // Perform the drop action
        this.dropPlateInZone(plateIndex);
        
        // Clear selection after drop
        this.clearSelectedPlateIndicator();
        this.selectedPlateForKeyboard = undefined;
    }

    // Using plate texture change instead of focus rectangle
    // private createSelectedPlateIndicator(plateContainer: Phaser.GameObjects.Container): void {
    //     // Clear any existing indicator
    //     this.clearSelectedPlateIndicator();
    //     
    //     // Create white outline indicator
    //     const bounds = plateContainer.getBounds();
    //     const indicator = this.scene.add.graphics();
    //     indicator.lineStyle(4, 0xffffff, 1);
    //     indicator.strokeRect(
    //         bounds.x - 5,
    //         bounds.y - 5,
    //         bounds.width + 10,
    //         bounds.height + 10
    //     );
    //     indicator.setDepth(plateContainer.depth + 1);
    //     
    //     this.selectedPlateIndicator = indicator;
    // }

    private clearSelectedPlateIndicator(): void {
        // Using plate texture change instead
        // if (this.selectedPlateIndicator) {
        //     this.selectedPlateIndicator.destroy();
        //     this.selectedPlateIndicator = undefined;
        // }

        // Reset aria-label for previously selected plate
        if (this.selectedPlateForKeyboard) {
            const overlay = this.plateOverlays.get(this.selectedPlateForKeyboard);
            if (overlay) {
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    const itemCount = this.selectedPlateForKeyboard.getData('itemCount');
                    const itemType = this.getItemTypeName();
                    htmlElement.setAttribute('aria-label', 
                        i18n.t('accessibility.draggablePlate', { count: itemCount, itemName: itemType })
                    );
                }
            }
        }
    }

    private getItemTypeName(): string {
        if (this.currentQuestion) {
            return this.currentQuestion.operand1;
        }
        return "";
    }

    // COMMENTED OUT: Drop zone focus indicator not needed
    // private createDropZoneFocusIndicator(dropZone: Phaser.GameObjects.Container): void {
    //     // Clear any existing indicator
    //     this.clearDropZoneFocusIndicator();
    //     
    //     // Create white outline indicator for the drop zone
    //     const bounds = dropZone.getBounds();
    //     const indicator = this.scene.add.graphics();
    //     indicator.lineStyle(4, 0xffffff, 1);
    //     indicator.strokeRect(
    //         bounds.x - 5,
    //         bounds.y - 5,
    //         bounds.width + 10,
    //         bounds.height + 10
    //     );
    //     indicator.setDepth(dropZone.depth + 1);
    //     
    //     this.dropZoneFocusIndicator = indicator;
    // }

    private clearDropZoneFocusIndicator(): void {
        // Drop zone focus indicator not needed
        // if (this.dropZoneFocusIndicator) {
        //     this.dropZoneFocusIndicator.destroy();
        //     this.dropZoneFocusIndicator = undefined;
        // }
    }

    // Cleanup method for accessibility overlays
    public cleanupAccessibilityOverlays(): void {
        // Destroy plate overlays
        this.plateOverlays.forEach(overlay => overlay.destroy());
        this.plateOverlays.clear();
        
        // Destroy drop zone overlay
        if (this.dropZoneOverlay) {
            this.dropZoneOverlay.destroy();
            this.dropZoneOverlay = undefined;
        }
        
        // Clear selection indicator
        this.clearSelectedPlateIndicator();
        this.selectedPlateForKeyboard = undefined;
        
        // Clear drop zone focus indicator
        this.clearDropZoneFocusIndicator();
    }
}
