import {
    BaseScene,
    i18n,
    ButtonHelper,
    ProgressBar,
    Question,
    ScoreCoins,
    VolumeSlider,
    ScoreHelper,
    QuestionSelectorHelper,
    questionBankNames,
    getQuestionBankByName,
    GameConfigManager,
    ButtonOverlay,
    TextOverlay,
    announceToScreenReader,
    ImageOverlay,
	focusToGameContainer,
    AnalyticsHelper,
} from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";
import { AnnouncementQueue } from "../utils/AnnouncementQueue";
import { BackgroundHelper } from "../utils/BackgroundHelper";
import { Alien } from "../utils/Alien";

export class CountItems {
    private scene!: BaseScene;
    private questionSelector!: QuestionSelectorHelper;
    private currentQuestion!: Question;
    private scoreHelper!: ScoreHelper;
    private progressBar!: ProgressBar;
    private scoreCoins!: ScoreCoins;
    private lang: string = i18n.getLanguage() || "en";
    private totalQuestions: number = 12;
    private GAME_MODE: "game" | "tutorial" = "game";
    private MECHANIC_TYPE: "feed" | "count" = "feed";

    // UI components
    private table!: Phaser.GameObjects.Image;
    private alien!: Alien;
    private countItems: Phaser.GameObjects.Image[] = [];
    public feedItems: Phaser.GameObjects.Image[] = [];
    private plates: Phaser.GameObjects.Image[] = [];
    private countLabels: Phaser.GameObjects.Container[] = [];
    public numPadBtns: Phaser.GameObjects.Container[] = [];
    private questionBar!: Phaser.GameObjects.Container;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    private isFeeding: boolean = false;
    private isCounting: boolean = false;
    private feedItemsCount: number = 0;
    private currentQuestionIndex: number = 0;

    // tutorial states
    private isCountTutorialPlayed: boolean = false;
    private isFeedItemsClickable: boolean = true;

    // Question volume icon properties
    private questionVolumeIcon!: Phaser.GameObjects.Container;
    private questionVolumeIconImage!: Phaser.GameObjects.Image;
    private isQuestionAudioPlaying: boolean = false;
    private questionAudioTween!: Phaser.Tweens.Tween;
    private currentQuestionAudio!: Phaser.Sound.WebAudioSound | null;
    private announcementQueue!: AnnouncementQueue;
    private announcementCount: number = 0;

    private analyticsHelper!: AnalyticsHelper;

    constructor(scene: BaseScene) {
        this.scene = scene;
		this.announcementQueue = new AnnouncementQueue();
        const gameConfigManager = GameConfigManager.getInstance();
        const topic =
            gameConfigManager.get("topic") || "GK_T1_count_numbers_upto_5";

        let questionBank;

        if (topic === "GK_T1_count_numbers_upto_5") {
            questionBank = getQuestionBankByName(
                questionBankNames.GK_T1_count_numbers_upto_5
            );
        } else if (topic === "GK_T2_count_numbers_upto_10") {
            questionBank = getQuestionBankByName(
                questionBankNames.GK_T2_count_numbers_upto_10
            );
        } else {
            // default to GK_T1_count_numbers_upto_5
            questionBank = getQuestionBankByName(
                questionBankNames.GK_T1_count_numbers_upto_5
            );
        }

        if (!questionBank) {
            throw new Error("Question bank not found");
        }
        this.questionSelector = new QuestionSelectorHelper(
            questionBank,
            this.totalQuestions
        );
        this.scoreHelper = new ScoreHelper(2);
    }

    static _preload(scene: BaseScene) {
        ProgressBar.preload(scene, "dark");
        ScoreCoins.preload(scene, "blue");
        VolumeSlider.preload(scene, "blue");
        BackgroundHelper.preload(scene);
        Alien.preload(scene);

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
        // scene.load.image("volume_off", "volume_off.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/count_items`);
        scene.load.image("question_bg", "question_bg.png");
        scene.load.image("numberpad_bg", "numberpad_bg.png");
        scene.load.image("table_small", "table_small.png");
        scene.load.image("table_large", "table_large.png");
        scene.load.image("plate", "plate.png");

        // Load alien mouth
        scene.load.image("alien_mouth", "alien_mouth.png");

        // Load food items
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/items`);
        scene.load.image("mooncake", "mooncake.png");
        scene.load.image("mooncake_selected", "mooncake_selected.png");
        scene.load.image("mooncake_eaten", "mooncake_eaten.png");

        scene.load.image("moonpie", "moonpie.png");
        scene.load.image("moonpie_selected", "moonpie_selected.png");
        scene.load.image("moonpie_eaten", "moonpie_eaten.png");

        scene.load.image("moonsandwich", "moonsandwich.png");
        scene.load.image("moonsandwich_selected", "moonsandwich_selected.png");
        scene.load.image("moonsandwich_eaten", "moonsandwich_eaten.png");

        scene.load.image("moontea", "moontea.png");
        scene.load.image("moontea_selected", "moontea_selected.png");
        scene.load.image("moontea_empty", "moontea_empty.png");

        scene.load.image("moonmelon", "moonmelon.png");
        scene.load.image("moonmelon_selected", "moonmelon_selected.png");
        scene.load.image("moonmelon_eaten", "moonmelon_eaten.png");

        scene.load.image("moonburger", "moonburger.png");
        scene.load.image("moonburger_selected", "moonburger_selected.png");
        scene.load.image("moonburger_eaten", "moonburger_eaten.png");

        // load buttons
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/count_items`);
        scene.load.image("btn_num", "btn_num.png");
        scene.load.image("btn_num_hover", "btn_num_hover.png");
        scene.load.image("btn_num_pressed", "btn_num_pressed.png");
        scene.load.image("btn_num_inactive", "btn_num_inactive.png");

        // Load audio for plate interactions
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio("positive-sfx", "positive.wav");
        scene.load.audio("negative-sfx", "negative.wav");
        scene.load.audio("countdown", "countdown.mp3");
        scene.load.audio("door_close", "door_close.mp3");
        scene.load.audio("munch", "munch.mp3");

        // Load number audio
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen/count_items`);
        const lang = i18n.getLanguage() || "en";
        for (let num = 1; num <= 10; num++) {
            scene.load.audio(`${num}_${lang}`, `${num}_${lang}.mp3`);
        }
        // Load question audio
        for (let num = 1; num <= 10; num++) {
            scene.load.audio(`feed_treat_${num}_${lang}`, `feed_treat_${num}_${lang}.mp3`);
        }
        scene.load.audio(`count_treats_${lang}`, `count_treats_${lang}.mp3`);

        // Buttons
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
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

    create(mode: "game" | "tutorial", reset: boolean = false, mechanicType: "feed" | "count" = "feed", parentScene: string = "SplashScene") {
        if (reset) {
            this.resetGame();
        }
        this.GAME_MODE = mode;
        this.MECHANIC_TYPE = mechanicType;

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
        this.scene.addImage(this.scene.display.width / 2, 85, "title_bg")

        // Add control background
        this.scene
            .addImage(this.scene.display.width / 2, 692, "numberpad_bg")
            .setOrigin(0.5);

        if (this.GAME_MODE === "tutorial") {
            this.createDoors("open");
        } else {
            this.createDoors("closed");
            // Add score coins
            this.scoreCoins = new ScoreCoins(
                this.scene,
                this.scoreHelper,
                i18n,
                "blue"
            );
            this.scoreCoins.create(
                this.scene.getScaledValue(87),
                this.scene.getScaledValue(62)
            );

            // Add progress bar
            this.progressBar = new ProgressBar(this.scene, "dark", i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(70)
            );
            this.openDoors();
        }

        // Load next question
        if(this.GAME_MODE === "game") {
            // delay load question for countdown announcement
            this.scene.time.delayedCall(4000, () => {
                this.loadNextQuestion();
            });
        } else {
            this.loadNextQuestion();
        }

        // Create control buttons
        this.createControlButtons();
    }

    private createDoors(initialState: "open" | "closed" = "closed") {
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

    private createControlButtons() {
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
            onClick: () => this.playTutorial(this.MECHANIC_TYPE),
        });
        helpBtn.setDepth(1);
    }

    private createQuestionBar() {
        if (this.questionBar) this.questionBar.destroy();
        this.questionBar = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(168)
        );
        this.questionBar.add(
            this.scene.addImage(0, 0, "question_bg").setOrigin(0.5)
        );

        // Add question text
        let text = "";

        if (this.currentQuestion.type === "feed") {
            const itemCount = parseInt(this.currentQuestion.operand1);
            text = i18n.t(itemCount === 1 ? "game.feedTreat" : "game.feedTreats", { count: itemCount });
        } else {
            text = i18n.t("game.countTreats");
        }
        this.announcementQueue.queue(text);

        const questionText = this.scene.addText(0, 0, text, {
            font: "700 36px Exo",
            color: "#FFEA00",
        });
        questionText.setOrigin(0.5);
        this.questionBar.add(questionText);

        new TextOverlay(this.scene, questionText, { label: text });

        // Add question volume icon
        if (this.GAME_MODE === "game") {
            const volumeIconX = 0 - questionText.displayWidth / 2 - this.scene.getScaledValue(50);
            const volumeIconY = 0 - this.scene.getScaledValue(3);
            this.createQuestionVolumeIcon(volumeIconX, volumeIconY);
            
            this.questionBar.add(this.questionVolumeIcon);
        }

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

        // Add accessibility overlay
        new ButtonOverlay(this.scene, this.questionVolumeIcon, {
            label: i18n.t("common.playQuestionAudio"),
            onKeyDown: () => this.toggleQuestionAudio(),
            style: {
                height: `${this.questionVolumeIconImage.displayHeight}px`,
                width: `${this.questionVolumeIconImage.displayWidth}px`,
                top: `${this.scene.getScaledValue(168)}px`,
                left: `${this.scene.getScaledValue(this.scene.display.width / 2)}px`,
            },
        });
    }

    private toggleQuestionAudio() {
        if (this.isQuestionAudioPlaying) {
            this.stopQuestionAudio();
        } else {
            this.playQuestionAudio();
        }
    }

    private playQuestionAudio() {
        if (this.isQuestionAudioPlaying) return;

        this.isQuestionAudioPlaying = true;
        this.questionVolumeIconImage.setTexture("volume");

        // Get the appropriate audio key based on question type
        let audioKey = "";
        if (this.currentQuestion.type === "feed") {
            const itemCount = parseInt(this.currentQuestion.operand1);
            audioKey = `feed_treat_${itemCount}_${this.lang}`;
        } else {
            audioKey = `count_treats_${this.lang}`;
        }

        // Lower the background music volume
        this.scene.audioManager.duckBackgroundMusic();

        // Play the audio
        const audio = this.scene.audioManager.playSoundEffect(audioKey);
        this.currentQuestionAudio = audio || null;

        if (this.currentQuestionAudio) {
            // Start volume animation
            this.startVolumeAnimation();

            // Set up audio completion handler
            this.currentQuestionAudio.once("complete", () => {
                this.stopQuestionAudio();
            });
        }
    }

    private stopQuestionAudio() {
        if (!this.isQuestionAudioPlaying) return;

        this.isQuestionAudioPlaying = false;
        this.scene.audioManager.unduckBackgroundMusic();
        if (this.questionVolumeIconImage && this.questionVolumeIconImage.scene && this.questionVolumeIconImage.active) {
            this.questionVolumeIconImage.setTexture("volume_2");
        }

        // Stop the audio
        if (this.currentQuestionAudio) {
            this.currentQuestionAudio.stop();
            this.currentQuestionAudio = null;
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

    private createTable(type: "small" | "large") {
        if (this.table) this.table.destroy();
        if (type === "small") {
            this.table = this.scene
                .addImage(this.scene.display.width / 2, 535, "table_small")
                .setOrigin(0.5);
        } else {
            this.table = this.scene
                .addImage(this.scene.display.width / 2, 567, "table_large")
                .setOrigin(0.5);
        }
    }

    private createAlien() {
        if (this.alien) this.alien.alienContainer.destroy();
        // Create a blinking alien with index 0
        const alienIndex = 0;
        const alienX = this.scene.display.width / 2;
        const alienY = this.scene.display.height / 2 + 90;
        this.alien = new Alien(this.scene, alienIndex, alienX, alienY);
        this.alien.alienContainer.setScale(0.65);
        this.alien.startBlinking();
    }

    private createCountItemsRow(count: number, itemName: string) {
        const itemScale = 0.52;
        const itemWidth = 200 * itemScale;
        const gapX = 20;
        let itemX =
            this.scene.display.width / 2 -
            (count * (itemWidth + gapX)) / 2 +
            itemWidth / 2;
        let itemY = 525;

        for (let i = 0; i < count; i++) {
            const item = this.scene
                .addImage(itemX, itemY, itemName)
                .setOrigin(0.5)
                .setScale(itemScale);
            this.countItems.push(item);

            const overlay = new ImageOverlay(this.scene, item, {
                label: i18n.t("game.foodItem") + " " + (i + 1),
                style: {
                    height: `${item.height * itemScale * this.scene.display.scale}px`,
                    width:  `${item.width * itemScale * this.scene.display.scale}px`,
                },
            });
            item.setData("overlay", overlay);

            itemX += gapX + itemWidth;
        }
    }

    private createFeedItemsRow(count: number, itemName: string) {
        const itemScale = 0.5;
        const itemWidth = 200 * itemScale;
        const gapX = 120;
        const maxInRow = 5;
        const startX =
            this.scene.display.width / 2 -
            (Math.min(maxInRow, count) * (itemWidth + gapX)) / 2 +
            itemWidth;
        let itemX = startX;
        let itemY = 525;
        if (count / maxInRow > 1) {
            itemY -= 35;
        }

        this.feedItems = [];
        this.plates = [];

        for (let i = 0; i < count; i++) {
            const plate = this.scene
                .addImage(itemX, itemY + 25, "plate")
                .setOrigin(0.5)
                .setScale(0);
            this.plates.push(plate);
            const plateOverlay = new ImageOverlay(this.scene, plate, {
                label: i18n.t("game.plateWithFoodItem"),
                style: {
                    height: `${plate.height * this.scene.display.scale}px`,
                    width:  `${plate.width * this.scene.display.scale}px`,
                },
                ariaLive: 'off'
            });
            plate.setData("overlay", plateOverlay);

            const item = this.scene
                .addImage(itemX, itemY, itemName)
                .setOrigin(0.5)
                .setScale(0);

            item.setData("itemName", itemName);
            item.setData("originalX", itemX);
            item.setData("originalY", itemY);

            item.setInteractive({ useHandCursor: true });

            this.feedItems.push(item);

            const onKeyDown = () => this.handleFeedItemClick(this.scene.input.activePointer, [item]);
            const itemOverlay = new ButtonOverlay(this.scene, item as unknown as Phaser.GameObjects.Container, {
                label: i18n.t("game.foodItem"),
                cursor: 'pointer',
                onKeyDown: onKeyDown,
                style: {
                    height: `${item.height * itemScale * this.scene.display.scale}px`,
                    width:  `${item.width * itemScale * this.scene.display.scale}px`,
                },
            });
            item.setData("overlay", itemOverlay);

            if ((i + 1) % maxInRow === 0) {
                itemX = startX;
                itemY += 100;
            } else {
                itemX += gapX + itemWidth;
            }
        }

        // remove pointer events
        this.clearFeedItemsEvents();
        
        // In tutorial mode, prevent clicks until explicitly enabled
        if (this.GAME_MODE === "tutorial") {
            this.isFeedItemsClickable = false;
        }

        this.scene.tweens.add({
            targets: [...this.feedItems],
            scale: this.scene.getScaledValue(itemScale),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                if (this.GAME_MODE === "game") {
                    this.setupFeedItemsEvents();
                }
            },
        });

        this.scene.tweens.add({
            targets: [...this.plates],
            scale: this.scene.getScaledValue(1),
            duration: 500,
            ease: "Power2",
        });
    }

    private updatePlateOverlay(item: Phaser.GameObjects.Image) {
        const idx = this.feedItems.indexOf(item);
        if(idx === -1) return;
        const targetPlate = this.plates[idx];
        const overlay = targetPlate.getData('overlay') as ImageOverlay;
        overlay.updateLabel(i18n.t("game.emptyPlateWithCount", { count: this.feedItemsCount + 1 }));
    }

    private createNumberPad() {
        this.numPadBtns = [];

        const btnCount = 10;
        const btnWidth = 85 * 0.94;
        const padding = 50;
        const startX = 0 + btnWidth / 2 + padding;
        const startY = 686;
        const gapX = 30;
        for (let i = 0; i <= btnCount; i++) {
            const x = startX + i * (btnWidth + gapX);
            const y = startY;
            const btn = ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: "btn_num",
                    hover: "btn_num_hover",
                    pressed: "btn_num_pressed",
                    disabled: "btn_num_inactive",
                },
                text: i.toString(),
                label: i.toString(),
                textStyle: {
                    font: "700 36px Exo",
                    color: "#000000",
                },
                x: x,
                y: y,
                imageScale: 0.94,
                onClick: () => {
                    this.checkCountAnswer(i);
                    this.scene.events.emit("numpadbtnclicked", {
                        index: i,
                    });
                },
            });
            this.numPadBtns.push(btn);
        }

        if (this.GAME_MODE === "game") {
            this.scene.time.delayedCall(6000, () => {
                const btn = this.numPadBtns?.[0] as any;
                const overlay = btn?.buttonOverlay;

                if (overlay) {
                    overlay.focus();
                }
            })
        }
    }

    private playTutorial(mechanicType: "feed" | "count") {
        this.stopQuestionAudio();
        this.scene.scene.pause();
        this.scene.audioManager.stopBackgroundMusic();
        this.scene.scene.launch("CountItemsTutorial", {
            fromGameScene: true,
            mechanicType: mechanicType,
        });
        this.scene.scene.bringToTop("CountItemsTutorial");
    }

    private loadNextQuestion() {
        this.cleanupItems();
        // Delay focus to allow feedback announcements to be heard first
        this.scene.time.delayedCall(2000, () => {
            focusToGameContainer();
        });

        let nextQuestion: Question | null = null;

        if (this.GAME_MODE === "tutorial") {
            if (this.MECHANIC_TYPE === "feed") {
                nextQuestion = {
                    operand1: "1",
                    operand2: "mooncake",
                    answer: "1",
                    type: "feed",
                    question_en: i18n.t("game.feedTutorialQuestion"),
                    question_es: i18n.t("game.feedTutorialQuestion"),
                };
            } else {
                nextQuestion = {
                    operand1: "4",
                    operand2: "mooncake",
                    answer: "4",
                    type: "count",
                    question_en: i18n.t("game.countTutorialQuestion"),
                    question_es: i18n.t("game.countTutorialQuestion"),
                };
            }
        } else {
            nextQuestion = this.questionSelector.getNextQuestion();
            this.currentQuestionIndex++;
            if (!nextQuestion) {
                this.gameOver();
                return;
            }
        }

        this.currentQuestion = nextQuestion;
        // update mechanic type based on question
        this.MECHANIC_TYPE = this.currentQuestion.type;

        // play count items tutorial if not played
        if (this.GAME_MODE === "game" && this.MECHANIC_TYPE === "count" && !this.isCountTutorialPlayed) {
            this.isCountTutorialPlayed = true;
            this.playTutorial("count");
        }

        const itemCount = parseInt(this.currentQuestion.operand1);
        const itemName = this.currentQuestion.operand2;

        // Add Question Bar
        this.createQuestionBar();

        this.scene.time.delayedCall(500, () => {
            if (this.currentQuestion.type === "feed") {
                // Add alien
                this.createAlien();

                // Add table
                this.createTable("large");

                // Add items
                this.createFeedItemsRow(itemCount, itemName);
            } else {
                // Add alien
                this.createAlien();

                // Add table
                this.createTable("small");

                // Add items
                this.createCountItemsRow(itemCount, itemName);

                // Add number pad
                this.createNumberPad();
            }
        });
    }

    public setupFeedItemsEvents() {
        this.clearFeedItemsEvents();
        this.isFeedItemsClickable = true;
        this.scene.input.on("pointerdown", this.handleFeedItemClick, this);
    }

    public clearFeedItemsEvents() {
        this.scene.input.off("pointerdown", this.handleFeedItemClick, this);
    }

    private handleFeedItemClick(
        _pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) {
        if (!this.isFeedItemsClickable) return;
        
        const clickedItem = gameObjects.find((obj) =>
            this.feedItems.includes(obj as Phaser.GameObjects.Image)
        ) as Phaser.GameObjects.Image;
        if (!clickedItem) return;

        if (this.isFeeding) return;
        this.isFeeding = true;

        // Apply button click effect
        if (!clickedItem.getData("isClicked")) {
            clickedItem.setData("isClicked", true);
            const selectedTexture =
                clickedItem.getData("itemName") + "_selected";
            clickedItem.setTexture(selectedTexture);
            const itemScale = 0.52;
            this.scene.tweens.add({
                targets: clickedItem,
                scaleX: itemScale * this.scene.getScaledValue(0.9),
                scaleY: itemScale * this.scene.getScaledValue(0.9),
                duration: 100,
                ease: "Power2",
                yoyo: true,
                onComplete: () => {
                    clickedItem.setScale(itemScale);
                },
            });
        }

        // add count label
        const containerX = this.scene.getScaledValue(
            clickedItem.getData("originalX")
        );
        const containerY = this.scene.getScaledValue(
            clickedItem.getData("originalY") + 30
        );
        const container = this.scene.add
            .container(containerX, containerY)
            .setDepth(10);
        const circle = this.scene
            .addCircle(0, 0, 12, 0xffffff, 1)
            .setOrigin(0.5);
        const countText = this.scene
            .addText(0, 2, `${this.feedItemsCount + 1}`, {
                font: "700 16px Exo",
                color: "#000000",
                stroke: "#000000",
            })
            .setOrigin(0.5);
        container.add([circle, countText]);
        container.setDepth(2);
        this.countLabels.push(container);

        // play number audio
        this.scene.audioManager.playSoundEffect(
            `${this.feedItemsCount + 1}_${this.lang}`
        );
        
        this.scene.time.delayedCall(500, () => {
            // scale circle and label
            this.scene.tweens.add({
                targets: circle,
                y: this.scene.getScaledValue(-25),
                duration: 200,
                ease: "Power2",
                onUpdate: () => {
                    circle.setRadius(this.scene.getScaledValue(35));
                },
            });

            this.scene.tweens.add({
                targets: countText,
                y: this.scene.getScaledValue(-23),
                duration: 200,
                ease: "Power2",
                onUpdate: () => {
                    countText.setFontSize(48);
                },
            });

            // Update Plate overlay
            this.updatePlateOverlay(clickedItem);

            // remove item from feedItems array
            this.feedItems.splice(this.feedItems.indexOf(clickedItem), 1);
            this.feedItemToAlien(clickedItem);
        });
    }

    private feedItemToAlien(item: Phaser.GameObjects.Image) {
        this.announcementQueue.queue(i18n.t("game.itemFed", {count: this.feedItemsCount + 1}));

        // move item to alien
        const itemDestX = this.alien.alienContainer.x;
        const itemDestY = this.alien.alienContainer.y - this.scene.getScaledValue(25);

        // bring item to front
        item.setDepth(3);

        // update feed items count
        this.feedItemsCount++;

        const itemTexture = item.getData("itemName");

        this.scene.tweens.add({
            targets: item,
            x: itemDestX,
            y: itemDestY,
            scale: this.scene.getScaledValue(0.32),
            texture: itemTexture,
            duration: 200,
            onComplete: () => {
                this.alien.setHoldingArms();
                this.alien.holdingArms?.setDepth(item.depth - 1);

                this.scene.time.delayedCall(500, () => {
                    this.scene.audioManager.playSoundEffect("munch");

                    const eatenTexture = item.getData("itemName") + "_eaten";
                    item.setTexture(eatenTexture);

                    // Add alien chewing animation
                    const alienMouthX = this.scene.display.width / 2;
                    const alienMouthY = this.scene.display.height / 2 - 40;
                    const alienMouth = this.scene
                        .addImage(alienMouthX, alienMouthY, "alien_mouth")
                        .setOrigin(0.5);
                    this.scene.tweens.add({
                        targets: alienMouth,
                        scaleX: this.scene.getScaledValue(1.2),
                        repeat: 1,
                        yoyo: true,
                        duration: 200,
                        onComplete: () => {
                            item.destroy();
                            alienMouth.destroy();
                            this.alien.setDefaultArms();
                            this.isFeeding = false;

                            if(this.feedItems.length > 0) {
                                // focus next item
                                const nextItem = this.feedItems[0];
                                const overlay = nextItem.getData('overlay') as ButtonOverlay;
                                overlay?.focus();
                            } else {
                                // focus game container for screen reader
                                focusToGameContainer();
                            }
                            // check answer
                            this.checkFeedAnswer();
                        },
                    });
                });
            },
        });
    }

    private checkCountAnswer(answer: number) {
        if (this.GAME_MODE === "tutorial") {
            return;
        }

        if (this.isCounting) {
            return;
        }
        this.isCounting = true;

        const expectedAnswer = parseInt(this.currentQuestion.answer);

        const analyticsQuestion = `${this.currentQuestion.question_en} ${this.currentQuestion.answer}`;

        if (answer === expectedAnswer) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: analyticsQuestion,
                isCorrect: true,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: answer.toString(),
                studentResponseAccuracyPercentage: '100%',
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
            // Fed announcement
            this.scene.time.delayedCall(900, () => {
                this.announcementQueue.queue(i18n.t("game.countItemsFed", { count: expectedAnswer }));
            });
            
            if (this.scoreHelper.showStreakAnimation()) {
                this.announcementQueue.queue(i18n.t("game.inARow", { count: this.scoreHelper.getCurrentStreak() }));
                this.showMascotCelebration(() => {
                    this.isCounting = false;
                    this.loadNextQuestion();
                });
                return;
            } else {
                this.showSuccessAnimation();
            }
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: 0,
                questionText: analyticsQuestion,
                isCorrect: false,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: answer.toString(),
                studentResponseAccuracyPercentage: '0%',
            });

            this.questionSelector.answerIncorrectly(this.currentQuestion);
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins.updateScoreDisplay(false);

            // update progress bar
            const progress = this.currentQuestionIndex / this.totalQuestions;
            this.progressBar?.drawProgressFill(
                progress,
                this.scoreHelper.getCurrentStreak()
            );

            this.showErrorAnimation();
        }

        this.scene.time.delayedCall(2500, () => {
            this.isCounting = false;
            this.loadNextQuestion();
        });
    }

    private checkFeedAnswer() {
        if (this.GAME_MODE === "tutorial") {
            return;
        }
        const expectedAnswer = parseInt(this.currentQuestion.answer);
        const isCorrect = this.feedItemsCount === expectedAnswer;
        if (!isCorrect) {
            return;
        }
        // update score
        this.analyticsHelper?.createTrial({
            questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
            achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
            questionText: this.currentQuestion.question_en,
            isCorrect: true,
            questionMechanic: this.MECHANIC_TYPE,
            gameLevelInfo: 'game.space_party.default',
            studentResponse: Array.from({ length: expectedAnswer }).map((_, index) => index + 1).join(","),
            studentResponseAccuracyPercentage: '100%',
        });

        this.questionSelector.answerCorrectly();
        this.scoreHelper.answerCorrectly();
        this.scoreCoins.updateScoreDisplay(true);

        // update progress bar
        const progress = this.currentQuestionIndex / this.totalQuestions;
        this.progressBar?.drawProgressFill(
            progress,
            this.scoreHelper.getCurrentStreak()
        );

        if (this.scoreHelper.showStreakAnimation()) {
            this.announcementQueue.queue(i18n.t("game.inARow", { count: this.scoreHelper.getCurrentStreak() }));
            this.showMascotCelebration(() => {
                this.loadNextQuestion();
            });
            return;
        } else {
            this.showSuccessAnimation();
        }

        this.scene.time.delayedCall(1000, () => {
            this.loadNextQuestion();
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
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: successContainer,
                        y: this.scene.getScaledValue(
                            this.scene.display.height + height / 2
                        ),
                        duration: 500,
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
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                // Wait for a moment and then slide down
                this.scene.time.delayedCall(500, () => {
                    this.scene.tweens.add({
                        targets: errorContainer,
                        y: this.scene.getScaledValue(
                            this.scene.display.height + height / 2
                        ),
                        duration: 500,
                        ease: "Power2",
                        onComplete: () => {
                            errorContainer.destroy();
                        },
                    });
                });
            },
        });
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

    private cleanupItems() {
        // reset feed items count
        this.feedItemsCount = 0;

        // Stop question audio if playing
        this.stopQuestionAudio();

        // remove pointer events
        this.scene.input.off("pointerdown", this.handleFeedItemClick, this);

        const targets = [
            ...this.countItems,
            ...this.feedItems,
            ...this.plates,
            ...this.countLabels,
            ...this.numPadBtns,
        ];

        this.scene.tweens.add({
            targets,
            scale: this.scene.getScaledValue(0),
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                // clear count items
                this.countItems.forEach((item) => {
                    item.destroy();
                });
                this.countItems = [];

                // clear feed items
                this.feedItems.forEach((item) => {
                    item.destroy();
                });
                this.feedItems = [];

                // clear plates
                this.plates.forEach((plate) => {
                    plate.destroy();
                });
                this.plates = [];

                // clear count labels
                this.countLabels.forEach((label) => {
                    label.destroy();
                });
                this.countLabels = [];

                // clear num pad
                this.numPadBtns.forEach((btn) => {
                    btn.destroy();
                });
                this.numPadBtns = [];
            },
        });
    }

    public clearNumberPad() {
        this.scene.tweens.add({
            targets: this.numPadBtns,
            scale: this.scene.getScaledValue(0),
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                this.numPadBtns.forEach((btn) => {
                    btn.destroy();
                });
                this.numPadBtns = [];
            },
        });
    }

    private gameOver() {
        // Game Over handling here
        const finalScore = this.scoreHelper.endGame();

        this.closeDoors();
        this.scene.time.delayedCall(2000, () => {
            this.scene.audioManager.unduckBackgroundMusic();
            // Send data to ScoreBoard scene
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        });
    }

    resetGame() {
        this.cleanupItems();
        this.currentQuestionIndex = 0;
        this.isCounting = false;
        this.isFeeding = false;
        this.isQuestionAudioPlaying = false;
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
    }
}
