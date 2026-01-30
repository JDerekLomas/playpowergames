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
    getQuestionBankByName,
    questionBankNames,
    ButtonOverlay,
    ImageOverlay,
    TextOverlay,
    announceToScreenReader,
    focusToGameContainer,
    AnalyticsHelper,
} from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";
import { AnnouncementQueue } from "../utils/AnnouncementQueue";
import { BackgroundHelper } from "../utils/BackgroundHelper";
import { Alien } from "../utils/Alien";
import SliceItemsConfig from "../config/SliceItemsConfig";

export class SliceItems {
    private scene!: BaseScene;
    private currentQuestion!: Question;
    private scoreHelper!: ScoreHelper;
    private questionSelector!: QuestionSelectorHelper;
    private progressBar!: ProgressBar;
    private scoreCoins!: ScoreCoins;
    private lang: string = i18n.getLanguage() || "en";
    private totalQuestions: number = 9;
    private GAME_MODE: "game" | "tutorial" = "game";

    // UI components
    private table!: Phaser.GameObjects.Image;
    private aliens: Alien[] = [];
    public items: Phaser.GameObjects.Image[] = [];
    public plates: Phaser.GameObjects.Image[] = [];
    public itemContainer!: Phaser.GameObjects.Container;
    private questionBar!: Phaser.GameObjects.Container;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    // Slicer
    public slicer!: Phaser.GameObjects.Container;
    public controls!: Phaser.GameObjects.Container;
    private sliceIndex: number = 0;
    private displayText!: Phaser.GameObjects.Text;

    private currentQuestionIndex: number = 0;
    private retryCount: number = 0;
    private maxRetries: number = 3;
    private isProcessing: boolean = false;

    private announcementQueue!: AnnouncementQueue;
    private announcementCount: number = 0;

    // Question volume icon properties
    private questionVolumeIcon!: Phaser.GameObjects.Container;
    private questionVolumeIconImage!: Phaser.GameObjects.Image;
    private isQuestionAudioPlaying: boolean = false;
    private questionAudioTween!: Phaser.Tweens.Tween;
    private currentQuestionAudio!: Phaser.Sound.WebAudioSound | null;

    // Drag and Drop
    private hoveredPlate: Phaser.GameObjects.Image | null = null;
    public itemsInPlates: Map<number, Phaser.GameObjects.Image[]> = new Map();

    // Accessibility overlays for tab navigation
    private itemOverlays: Map<Phaser.GameObjects.Image, ImageOverlay> = new Map();
    private plateOverlays: Map<Phaser.GameObjects.Image, ImageOverlay> = new Map();

    // Keyboard interaction state
    private selectedItemForKeyboard?: Phaser.GameObjects.Image;
    private selectedItemIndicator?: Phaser.GameObjects.Graphics;

    private analyticsHelper!: AnalyticsHelper;

    constructor(scene: BaseScene) {
        this.scene = scene;
        const questionBank = getQuestionBankByName(
            questionBankNames.g1_t11_equal_shares_and_time
        );
        if (!questionBank) {
            throw new Error("Question bank not found");
        }
        this.questionSelector = new QuestionSelectorHelper(
            questionBank,
            this.totalQuestions
        );
        this.scoreHelper = new ScoreHelper(2);
		this.announcementQueue = new AnnouncementQueue();
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


        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/slice_items`);
        scene.load.image("question_bg", "question_bg.png");
        scene.load.image("table_big", "table_big.png");
        scene.load.image("plate_rectangle", "plate_rectangle.png");
        scene.load.image("plate_circle", "plate_circle.png");
        scene.load.image("slicer_heading_bg", "slicer_heading_bg.png");

        // Load slice control icons
        scene.load.image("increase_icon", "increase_icon.png");
        scene.load.image("decrease_icon", "decrease_icon.png");

        // Load slice items
        Object.entries(SliceItemsConfig.SLICE_ITEMS).forEach(([_key, value]) => {
            value.ASSETS.forEach(items => {
                items.forEach(item => {
                    scene.load.image(item.KEY, item.PATH);
                });
            });
        });

        // Load audio for plate interactions
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio("plate", "plate.mp3");
        scene.load.audio("positive-sfx", "positive.wav");
        scene.load.audio("negative-sfx", "negative.wav");
        scene.load.audio("countdown", "countdown.mp3");
        scene.load.audio("door_close", "door_close.mp3");

        // Load question audio for slice items
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen/slice_items`);
        const lang = i18n.getLanguage() || "en";
        scene.load.audio(`half_${lang}`, `half_${lang}.mp3`);
        scene.load.audio(`quarter_${lang}`, `quarter_${lang}.mp3`);
        scene.load.audio(`fourth_${lang}`, `fourth_${lang}.mp3`);
        scene.load.audio(`cake_${lang}`, `cake_${lang}.mp3`);
        scene.load.audio(`pizza_${lang}`, `pizza_${lang}.mp3`);
        scene.load.audio(`pastry_${lang}`, `pastry_${lang}.mp3`);

        // Load colored button assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image("btn_alter", "btn_alter.png");
        scene.load.image("btn_alter_hover", "btn_alter_hover.png");
        scene.load.image("btn_alter_pressed", "btn_alter_pressed.png");
        scene.load.image("btn_alter_inactive", "btn_alter_inactive.png");
        scene.load.image("btn_purple", "btn_purple.png");
        scene.load.image("btn_purple_hover", "btn_purple_hover.png");
        scene.load.image("btn_purple_pressed", "btn_purple_pressed.png");
        scene.load.image("btn_skip", "btn_skip.png");
        scene.load.image("btn_skip_hover", "btn_skip_hover.png");
        scene.load.image("btn_skip_pressed", "btn_skip_pressed.png");

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

    create(mode: "game" | "tutorial", reset: boolean = false, parentScene: string = "SplashScene") {
        if (reset) {
            this.resetGame();
        }
        this.GAME_MODE = mode;

        this.scene.events.on("resume", () => {
            if (this.GAME_MODE === "game") {
                this.setOverlaysEnabled(true);
            }
        });

        this.scene.events.on("pause", () => {
            if (this.GAME_MODE === "game") {
                this.setOverlaysEnabled(false);
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
        this.scene.addImage(this.scene.display.width / 2, 85, "title_bg")

        if (this.GAME_MODE === "game") {
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
            ).setDepth(10);

            // Add progress bar
            this.progressBar = new ProgressBar(this.scene, "dark", i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(70)
            ).setDepth(10);
            this.openDoors();

            // Create settings buttons
            this.createSetttingsButtons();
        } else {
            this.createDoors("open");
        }

        this.createQuestionBar();
        
        // Load next question
        if(this.GAME_MODE === "game") {
            // delay load question for countdown announcement
            this.scene.time.delayedCall(4000, () => {
                this.loadNextQuestion();
            });
        } else {
            this.loadNextQuestion();
        }
        this.createSlicer();
        this.createControls();
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

    public createQuestionBar() {
        if (this.questionBar) this.questionBar.destroy();
        this.questionBar = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(159)  // Changed from 184 to 159
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
                    outline: 'revert',
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
    
        this.announcementQueue.queue(text);
    
        if (this.GAME_MODE === "game") {
            this.questionVolumeIcon.setVisible(true);
            this.updateQuestionVolumeIconPosition();
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
        if (this.isQuestionAudioPlaying) {
            this.stopQuestionAudio();
        } else {
            this.playQuestionAudio();
        }
    }

    private playQuestionAudio() {
        if (this.isQuestionAudioPlaying) return;

        // Get the appropriate audio key based on question text
        const audioKey = this.getQuestionAudioKey();

        // If there's no audio key (e.g., for "1" case), don't play anything
        if (!audioKey) {
            return;
        }

        this.isQuestionAudioPlaying = true;
        this.questionVolumeIconImage.setTexture("volume");

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
                const itemName = this.currentQuestion.operand2;
                const audio2 = this.scene.audioManager.playSoundEffect(`${itemName}_${this.lang}`);
                this.currentQuestionAudio = audio2 || null;
                audio2?.once("complete", () => {
                    this.stopQuestionAudio();
                });
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

    private getQuestionAudioKey(): string {
        const questionText = this.currentQuestion['question_en'].toLowerCase();
        if (questionText.includes("half")) {
            return `half_${this.lang}`;
        } else if (questionText.includes("quarter")) {
            return `quarter_${this.lang}`;
        } else if (questionText.includes("fourth")) {
            return `fourth_${this.lang}`;
        }
        return "";
    }

    private createTable() {
        if (this.table) this.table.destroy();
        this.table = this.scene
            .addImage(this.scene.display.width / 2, 608, "table_big")
            .setOrigin(0.5);
    }

    private createAlienWithPlates(
        count: number
    ) {
        const displayWidth = this.scene.display.width;
        const alienWidth = 200;
        const gap = 60;
        const padding = (displayWidth - (alienWidth + gap) * count + gap) / 2;
        let alienX = padding + alienWidth / 2;
        const alienY = 485;
        let plateX = alienX;
        const plateY = 460;

        for (let i = 0; i < count; i++) {
            // no of aliens is 3
            const alienIndex = i % 3
            const alien = new Alien(this.scene, alienIndex, alienX, alienY);
            alien.startBlinking();
            alien.alienContainer.setScale(0.61);

            alienX += gap + alienWidth;
            this.aliens.push(alien);

            // Get the plate type
            const itemName = this.currentQuestion.operand2.toUpperCase();
            const plateType = SliceItemsConfig.SLICE_ITEMS[itemName as keyof typeof SliceItemsConfig.SLICE_ITEMS].PLATE_TYPE;

            const plate = this.scene
                .addImage(plateX, plateY, `plate_${plateType}`)
                .setOrigin(0.5)
                .setDepth(2);

            plateX += gap + alienWidth;
            this.plates.push(plate);

            // Store plate data for drag and drop
            plate.setData("plateIndex", i);

            // Create accessibility overlay for tab navigation
            const plateOverlay = new ImageOverlay(this.scene, plate, {
                label: `Plate ${i + 1}`,
                cursor: 'default',
            });
            this.plateOverlays.set(plate, plateOverlay);

            // Make it focusable via tab and add keyboard interaction
            const domElement = (plateOverlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.setAttribute('role', 'region');
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.plateDropZoneSingle', { number: i + 1 }));
                
                // Add keyboard event listener for Enter key
                htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.dropSelectedItemWithKeyboard(plate);
                    }
                });
            }
        }
    }

    private drawDashedLine(graphics: Phaser.GameObjects.Graphics, startX: number, startY: number, endX: number, endY: number, dash: number, gap: number) {
        const totalDistance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
        const dashGapLength = dash + gap;
        const numberOfDashes = Math.floor(totalDistance / dashGapLength);

        const dirX = (endX - startX) / totalDistance;
        const dirY = (endY - startY) / totalDistance;

        for (let i = 0; i <= numberOfDashes; i++) {
            const currentX = startX + dirX * dashGapLength * i;
            const currentY = startY + dirY * dashGapLength * i;
            const remainingDistance = totalDistance - dashGapLength * i;
            const dashLength = Math.min(dash, remainingDistance);

            if (dashLength > 0) {
                graphics.lineBetween(currentX, currentY, currentX + dirX * dashLength, currentY + dirY * dashLength);
            }
        }
    }

    private drawDashedRectangle(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, dash: number, gap: number) {
        this.drawDashedLine(graphics, x, y, x + width, y, dash, gap);
        this.drawDashedLine(graphics, x + width, y, x + width, y + height, dash, gap);
        this.drawDashedLine(graphics, x + width, y + height, x, y + height, dash, gap);
        this.drawDashedLine(graphics, x, y + height, x, y, dash, gap);
    }

    private drawDashedCircle(graphics: Phaser.GameObjects.Graphics, centerX: number, centerY: number, radius: number, dash: number, gap: number) {
        const circumference = 2 * Math.PI * radius;
        const dashGapLength = dash + gap;
        const numberOfDashes = Math.floor(circumference / dashGapLength);
        const angleStep = (2 * Math.PI) / numberOfDashes;

        for (let i = 0; i < numberOfDashes; i++) {
            const startAngle = i * angleStep;
            const endAngle = startAngle + (dash / circumference) * 2 * Math.PI;

            const startX = centerX + radius * Math.cos(startAngle);
            const startY = centerY + radius * Math.sin(startAngle);
            const endX = centerX + radius * Math.cos(endAngle);
            const endY = centerY + radius * Math.sin(endAngle);

            graphics.lineBetween(startX, startY, endX, endY);
        }
    }

    private createItems(sliceIndex: number) {
        this.itemContainer = this.scene.add.container(0, 0);

        const itemName = this.currentQuestion.operand2;
        const slices = SliceItemsConfig.SLICES[sliceIndex];
        const itemConfig = SliceItemsConfig.SLICE_ITEMS[itemName.toUpperCase() as keyof typeof SliceItemsConfig.SLICE_ITEMS];
        const itemCenterY = this.scene.display.height - 142;
        const itemCenterX = this.scene.display.width / 2;
        const gap = 8;
        const padding = 14;
        let itemStartX = itemCenterX;
        let itemStartY = itemCenterY;

        // Add item bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        this.itemContainer.add(bg);

        const texts = [];

        let itemWidth = 0;
        let itemHeight = 0;

        // Create items
        for (let i = 1; i <= slices.value; i++) {
            const key = `${itemName}_${slices.value}_${i}`;

            const itemImage = this.scene.addImage(itemStartX, itemStartY, key);
            itemImage.setScale(itemConfig.SCALE);
            this.items.push(itemImage);

            const width = itemImage.displayWidth / this.scene.display.scale;
            const height = itemImage.displayHeight / this.scene.display.scale;
            itemWidth = width;
            itemHeight = height;

            // Store original position
            itemImage.setData("sliceIndex", i);
            itemImage.setData("textureKey", key);
            itemImage.setData("sliceType", `1/${slices.value}`);

            if (this.sliceIndex !== 0) {
                itemImage.setData("isDragAllowed", true);
                // Make item interactive
                itemImage.setInteractive({ draggable: true, useHandCursor: true });
            }

            // Add small display text
            const display = this.createItemTextDisplay(itemStartX, itemStartY, this.getItemText());
            display.setName(`item_text_${i}`);
            texts.push(display);

            // Calculate next item position
            itemStartX += width + gap;
            if (i % slices.col === 0) {
                itemStartX = itemCenterX;
                itemStartY += height + gap;
            }

        }
        this.itemContainer.add([...this.items, ...texts]);

        let bounds = this.itemContainer.getBounds();

        // Recalculate the position of the items
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            const x = item.x + (itemWidth * this.scene.display.scale) / 2 - bounds.width / 2;
            const y = item.y + (itemHeight * this.scene.display.scale) / 2 - bounds.height / 2;
            item.setX(x);
            item.setY(y);
            // Set orignial position
            item.setData("originalX", x / this.scene.display.scale);
            item.setData("originalY", y / this.scene.display.scale);

            const text = texts[i];
            let textX = text.x + (itemWidth * this.scene.display.scale) / 2 - bounds.width / 2;
            let textY = text.y + (itemHeight * this.scene.display.scale) / 2 - bounds.height / 2;

            const findNearestCorner = (item: Phaser.GameObjects.Image, x: number, y: number) => {

                const itemBounds = item.getBounds();
                const corners = [
                    { x: itemBounds.left, y: itemBounds.top },
                    { x: itemBounds.right, y: itemBounds.top },
                    { x: itemBounds.left, y: itemBounds.bottom },
                    { x: itemBounds.right, y: itemBounds.bottom }
                ];

                // scale the corners to the original scale
                corners.forEach(corner => {
                    corner.x /= this.scene.display.scale;
                    corner.y /= this.scene.display.scale;
                });

                let nearestCorner = corners[0];
                let minDistance = Phaser.Math.Distance.Between(x, y, nearestCorner.x, nearestCorner.y);
                for (let j = 1; j < corners.length; j++) {
                    const distance = Phaser.Math.Distance.Between(x, y, corners[j].x, corners[j].y);
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestCorner = corners[j];
                    }
                }

                return nearestCorner;
            }
            // Find the nearest corner coordinates of items with item top and left
            const nearestCorner = findNearestCorner(item, itemCenterX, itemCenterY);
            const textWidth = text.displayWidth;

            if ((itemName === "cake") && (this.getItemText() === i18n.t("game.quarter") || this.getItemText() === i18n.t("game.fourth"))) {
                if (nearestCorner.x < itemCenterX) {
                    textX = this.scene.getScaledValue(nearestCorner.x - 45) - textWidth / 2;
                } else {
                    textX = this.scene.getScaledValue(nearestCorner.x + 45) + textWidth / 2;
                }

                if (nearestCorner.y < itemCenterY) {
                    textY = this.scene.getScaledValue(nearestCorner.y - 21);
                } else {
                    textY = this.scene.getScaledValue(nearestCorner.y + 21);
                }
            }

            text.setX(textX);
            text.setY(textY);
        }

        // Recalculate the bounds
        bounds = this.itemContainer.getBounds();

        // Create overlays after items are positioned correctly
        if (this.sliceIndex !== 0) {
            this.items.forEach((item, index) => {
                if (item.getData("isDragAllowed")) {
                    // Create accessibility overlay for tab navigation
                    const overlay = new ImageOverlay(this.scene, item, {
                        label: `${itemName} piece ${index + 1}`,
                        cursor: 'pointer',
                    });
                    this.itemOverlays.set(item, overlay);

                    // Make it focusable via tab and add keyboard interaction
                    const domElement = (overlay as any).domElement;
                    if (domElement?.node) {
                        const htmlElement = domElement.node as HTMLElement;
                        htmlElement.setAttribute('tabindex', '0');
                        htmlElement.setAttribute('role', 'button');
                        htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggablePiece', { itemName: itemName, number: index + 1 }));
                        
                        // Add keyboard event listener for Enter key
                        htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                this.selectItemForKeyboard(item);
                            }
                        });
                    }
                }
            });
        }

        // Update bg
        let rectX = bounds.x;
        let rectY = bounds.y;
        let rectWidth = bounds.width;
        let rectHeight = bounds.height;

        // Keep the bg of largest number of slices
        if (this.sliceIndex === 0) {
            rectX -= this.scene.getScaledValue(padding + gap / 2);
            rectY -= this.scene.getScaledValue(padding + gap / 2);
            rectWidth += this.scene.getScaledValue(2 * padding + gap);
            rectHeight += this.scene.getScaledValue(2 * padding + gap);
        } else if (this.sliceIndex === 1) {
            rectX -= this.scene.getScaledValue(padding);
            rectY -= this.scene.getScaledValue(padding + gap / 2);
            rectWidth += this.scene.getScaledValue(2 * padding);
            rectHeight += this.scene.getScaledValue(2 * padding + gap);
        } else if (this.sliceIndex === 2) {
            rectX -= this.scene.getScaledValue(padding);
            rectY -= this.scene.getScaledValue(padding);
            rectWidth += this.scene.getScaledValue(2 * padding);
            rectHeight += this.scene.getScaledValue(2 * padding);
        }

        if (itemConfig.PLATE_TYPE === "rectangle") {
            bg.fillRect(rectX, rectY, rectWidth, rectHeight);
            bg.lineStyle(4, 0xffffff, 1);
            this.drawDashedRectangle(bg, rectX, rectY, rectWidth, rectHeight, 8, 8);
        } else if (itemConfig.PLATE_TYPE === "circle") {
            bg.fillCircle(bounds.centerX, bounds.centerY, rectWidth / 2);
            bg.lineStyle(4, 0xffffff, 1);
            this.drawDashedCircle(bg, bounds.centerX, bounds.centerY, rectWidth / 2, 8, 8);
        }

        // Set depth
        this.itemContainer.setDepth(10);

        // Setup drag events for items
        if (this.GAME_MODE === "game") {
            this.setupItemDragEvents();
        }

        // Move control buttons to end of DOM to maintain proper tab order
        this.moveControlButtonsToEnd();
    }

    private createItemTextDisplay(x: number, y: number, text: string): Phaser.GameObjects.Container {
        const container = this.scene.add.container(this.scene.getScaledValue(x), this.scene.getScaledValue(y));

        let fontSize = 24;
        const itemName = this.currentQuestion.operand2;
        if ((itemName === "cake" || itemName === "pastry") && (text === i18n.t("game.quarter") || text === i18n.t("game.fourth"))) {
            fontSize = 17;
        }

        const displayText = this.scene.addText(0, 0, text, {
            font: `700 ${fontSize}px Exo`,
            color: "#000000",
        });
        displayText.setOrigin(0.5);

        const displayTextOverlay = new TextOverlay(this.scene, displayText, {
            label: text,
            style: {
                top: `${this.scene.getScaledValue(y)}px`,
                left: `${this.scene.getScaledValue(x)}px`,
            },
        });
        displayText.setData("overlay", displayTextOverlay);

        // create a rounded rect
        const display = {
            x: 0 - displayText.displayWidth / 2 - this.scene.getScaledValue(10),
            y: 0 - displayText.displayHeight / 2 - this.scene.getScaledValue(4),
            width: displayText.displayWidth + this.scene.getScaledValue(20),
            height: displayText.displayHeight + this.scene.getScaledValue(2),
            strokeWidth: this.scene.getScaledValue(3),
        }
        const rect = this.scene.add.graphics();
        rect.fillStyle(0xFFFFFF, 1);
        rect.fillRect(display.x, display.y, display.width, display.height);
        rect.lineStyle(display.strokeWidth, 0x000000, 1);
        rect.strokeRect(display.x, display.y, display.width, display.height);

        container.add([rect, displayText]);

        return container;
    }

    private getItemText() {
        if (this.sliceIndex === 0) {
            return "1";
        } else if (this.sliceIndex === 1) {
            return i18n.t("game.half");
        } else if (this.sliceIndex === 2) {
            // Check if the question contains "fourth" or "quarter"
            const questionText = this.currentQuestion[`question_${this.lang}`].toLowerCase();
            if (questionText.includes("fourth")) {
                return i18n.t("game.fourth");
            } else {
                return i18n.t("game.quarter");
            }
        }
        return "";
    }

    private clearItems() {
        // Clear keyboard selection state
        this.clearSelectedItem();
        
        // Clear item overlays
        this.itemOverlays.forEach(overlay => overlay.destroy());
        this.itemOverlays.clear();
        
        this.clearItemDragEvents();
        if (this.itemContainer) this.itemContainer.destroy();
        this.items = [];
    }

    private createSlicer() {
        this.slicer = this.scene.add.container(0, 0);
        // Add slicer heading background
        this.slicer.add(this.scene.addImage(91, 406, "slicer_heading_bg")
            .setOrigin(0.5));

        // Add slicer heading text
        this.slicer.add(this.scene.addText(92, 407, i18n.t("game.slicer"), {
            font: "700 24px Exo",
            color: "#3CA6DC",
        }).setOrigin(0.5));

        // Add slicer bg
        this.slicer.add(this.scene.addRectangle(91, 599, 183, 305, 0x000000, 0.5));

        //Add increase button
        const increaseBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: "increase_icon",
            label: i18n.t("increase"),
            x: 91,
            y: 506,
            raisedOffset: 3.5,
            onClick: () => {
                if (this.sliceIndex < SliceItemsConfig.SLICES.length - 1) {
                    this.sliceIndex++;
                    // Update slicer display text
                    this.updateSlicerDisplayText();
                    // Reset items
                    this.resetItems();
                }
            },
        });
        increaseBtn.setName("increaseBtn");
        this.slicer.add(increaseBtn);

        // Add rectangular display
        const display: { [key: string]: number } = {
            x: 25,
            y: 557,
            width: 133,
            height: 78,
            radius: 10,
            strokeWidth: 5,
        }

        // Scale the display values
        for (const key in display) {
            display[key] = this.scene.getScaledValue(display[key]);
        }

        const displayRect = this.scene.add.graphics();
        displayRect.fillStyle(0xFFFFFF, 1);
        displayRect.fillRoundedRect(display.x, display.y, display.width, display.height, display.radius);
        displayRect.lineStyle(display.strokeWidth, 0x3163E2, 1);
        displayRect.strokeRoundedRect(display.x, display.y, display.width, display.height, display.radius);
        this.slicer.add(displayRect);


        // Add display text
        const text = SliceItemsConfig.SLICES[this.sliceIndex].value.toString();
        this.displayText = this.scene.addText(91, 598, text, {
            font: "700 46px Exo",
            color: "#000000",
        });
        this.displayText.setOrigin(0.5);
        this.slicer.add(this.displayText);

        const displayTextOverlay = new TextOverlay(this.scene, this.displayText, {
            label: `${i18n.t("game.numberOfSlices")} ${text}`,
        });
        this.displayText.setData("overlay", displayTextOverlay);

        // Add decrease button
        const decreaseBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: "decrease_icon",
            label: i18n.t("decrease"),
            x: 91,
            y: 686,
            raisedOffset: 3.5,
            onClick: () => {
                if (this.sliceIndex > 0) {
                    this.sliceIndex--;
                    // Update slicer display text
                    this.updateSlicerDisplayText();
                    // Reset items
                    this.resetItems();
                }
            },
        });
        decreaseBtn.setName("decreaseBtn");
        this.slicer.add(decreaseBtn);


        // Set slicer container depth
        this.slicer.setDepth(10);
    }

    private updateSlicerDisplayText() {
        const text = SliceItemsConfig.SLICES[this.sliceIndex].value.toString();
        this.displayText.setText(text);
        const displayTextOverlay: TextOverlay | null = this.displayText.getData("overlay");
        if (displayTextOverlay) {
            displayTextOverlay.updateContent(`${i18n.t("game.numberOfSlices")} ${text}`);
        }

        // Emit slicer display text updated event for tutorial
        this.scene.events.emit("slicerdisplaytextupdated", { text });
    }

    private createControls() {
        const controls = this.scene.add.container(0, 0);

        let paddingX = 0;
        if (this.lang === "es") {
            paddingX = 50;
        }

        // Add controls bg
        controls.add(this.scene.addRectangle(1181 - paddingX / 2, 599, 197 + paddingX, 307, 0x000000, 0.5));


        // Add check button
        const checkButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: "btn_purple",
                hover: "btn_purple_hover",
                pressed: "btn_purple_pressed",
            },
            text: i18n.t("game.check"),
            label: i18n.t("game.check"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: 1181 - paddingX / 2,
            y: 539,
            onClick: () => {
                this.checkAnswer();
            },
        })
        checkButton.setName("checkBtn");
        controls.add(checkButton);

        // Add reset button
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
            x: 1181 - paddingX / 2,
            y: 660,
            isDisabled: this.GAME_MODE === "tutorial",
            onClick: () => {
                // Reset slicer
                this.sliceIndex = 0;
                this.updateSlicerDisplayText();
                this.resetItems();
            },
        });
        resetButton.setName("resetBtn");
        controls.add(resetButton);

        // Set controls container depth
        controls.setDepth(1);

        this.controls = controls;
    }

    private moveControlButtonsToEnd() {
        if (!this.controls) return;

        const checkBtn = this.controls.getByName("checkBtn") as Phaser.GameObjects.Container;
        const resetBtn = this.controls.getByName("resetBtn") as Phaser.GameObjects.Container;

        // Get the button overlays and move their DOM elements to the end
        const checkOverlay = (checkBtn as any)?.buttonOverlay as ButtonOverlay;
        const resetOverlay = (resetBtn as any)?.buttonOverlay as ButtonOverlay;

        if (checkOverlay?.domElement?.node && checkOverlay.domElement.node.parentNode) {
            const parent = checkOverlay.domElement.node.parentNode;
            parent.appendChild(checkOverlay.domElement.node);
        }

        if (resetOverlay?.domElement?.node && resetOverlay.domElement.node.parentNode) {
            const parent = resetOverlay.domElement.node.parentNode;
            parent.appendChild(resetOverlay.domElement.node);
        }
    }

    private async loadNextQuestion() {
        let nextQuestion: Question | null = null;

        if (this.GAME_MODE === "tutorial") {
            // Tutorial mode can use hardcoded questions if needed
            nextQuestion = {
                operand1: "2",
                operand2: "pizza",
                answer: "1/2",
                question_en: i18n.t("game.sliceTutorialQuestion"),
                question_es: i18n.t("game.sliceTutorialQuestion"),
            }
        } else {
            nextQuestion = this.questionSelector.getNextQuestion();
            this.currentQuestionIndex++;
        }
        if (!nextQuestion) {
            this.gameOver();
            return;
        }

        this.currentQuestion = nextQuestion;

        await this.cleanupUI();

        const text = this.currentQuestion[`question_${this.lang}`];
        this.updateQuestionText(text);

        // Set slice index to 0
        this.sliceIndex = 0;
        this.displayText.setText(SliceItemsConfig.SLICES[this.sliceIndex].value.toString());

        // Reset retry count for new question
        this.retryCount = 0;

        // Reset items
        this.resetItems();
        // Create alien with plates
        const alienCount = parseInt(this.currentQuestion.operand1);
        this.createAlienWithPlates(alienCount);
        // Create table
        this.createTable();

        // Move control buttons to end of DOM to maintain proper tab order
        this.moveControlButtonsToEnd();
    }

    public setupItemDragEvents() {
        this.clearItemDragEvents();
        this.scene.input.on("drag", this.handleItemDrag, this);
        this.scene.input.on("dragend", this.handleItemDragEnd, this);
    }

    public clearItemDragEvents() {
        this.scene.input.off("drag", this.handleItemDrag, this);
        this.scene.input.off("dragend", this.handleItemDragEnd, this);
    }

    private handleItemDrag(
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        _dragX: number,
        _dragY: number
    ) {
        const item = gameObject as Phaser.GameObjects.Image;

        const isDragAllowed = item.getData("isDragAllowed");
        if (!isDragAllowed) {
            return;
        }

        // Move the item to the drag position
        const pointerX = _pointer.x;
        const pointerY = _pointer.y;

        item.x = pointerX;
        item.y = pointerY;

        // Hide the item text label when dragging starts
        const itemIndex = item.getData("sliceIndex");
        if (itemIndex) {
            const itemText = this.itemContainer.getByName(`item_text_${itemIndex}`) as Phaser.GameObjects.Container;
            if (itemText) {
                this.scene.tweens.add({
                    targets: itemText,
                    scale: 0,
                    duration: 100,
                    ease: "Power2",
                });
            }
        }

        // Check if the item is over a plate
        const targetPlate = this.getTargetPlate(pointerX, pointerY);

        const plateIndex = targetPlate?.getData("plateIndex");

        // Check if plate already has an item
        const itemsInThisPlate = this.itemsInPlates.get(plateIndex) || [];
        if (itemsInThisPlate.length > 0 && plateIndex) {
            return;
        }

        this.updatePlateHover(targetPlate);

        const itemName = this.currentQuestion.operand2.toUpperCase();
        const itemConfig = SliceItemsConfig.SLICE_ITEMS[itemName.toUpperCase() as keyof typeof SliceItemsConfig.SLICE_ITEMS];

        if (targetPlate) {
            this.scene.tweens.add({
                targets: item,
                scale: this.scene.getScaledValue(itemConfig.PLATE_SCALE),
                duration: 200,
                ease: "Power2",
            });
        } else {
            this.scene.tweens.add({
                targets: item,
                scale: this.scene.getScaledValue(itemConfig.SCALE),
                duration: 200,
                ease: "Power2",
            });
        }
    }

    private handleItemDragEnd(
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
    ) {
        const item = gameObject as Phaser.GameObjects.Image;
        const dragX = item.x;
        const dragY = item.y;

        // Check if item should be dropped on a plate
        const targetPlate = this.getTargetPlate(dragX, dragY);

        if (targetPlate) {
            // Drop item on plate
            this.dropItemOnPlate(item, targetPlate);
        } else {
            // Return item to original position
            this.returnItemToOriginalPosition(item);
        }

        // Reset any hovered plate
        this.updatePlateHover(null);
    }

    private getTargetPlate(dragX: number, dragY: number): Phaser.GameObjects.Image | null {
        for (const plate of this.plates) {
            const padding = this.scene.getScaledValue(25);
            const plateLeft = plate.getLeftCenter().x - padding;
            const plateRight = plate.getRightCenter().x + padding;
            const plateTop = plate.getTopCenter().y - padding;
            const plateBottom = plate.getBottomCenter().y + padding;

            if (
                dragX >= plateLeft &&
                dragX <= plateRight &&
                dragY >= plateTop &&
                dragY <= plateBottom
            ) {
                return plate;
            }
        }
        return null;
    }

    private dropItemOnPlate(item: Phaser.GameObjects.Image, targetPlate: Phaser.GameObjects.Image) {
        const plateIndex = targetPlate.getData("plateIndex");

        // Check if plate already has an item
        const itemsInThisPlate = this.itemsInPlates.get(plateIndex) || [];
        if (itemsInThisPlate.length > 0) {
            // Plate already has an item, return to original position
            this.returnItemToOriginalPosition(item);
            return;
        }

        const plateX = targetPlate.x;
        const plateY = targetPlate.y - this.scene.getScaledValue(4);

        // Add item to plate
        itemsInThisPlate.push(item);
        this.itemsInPlates.set(plateIndex, itemsInThisPlate);

        // Remove from original items array and clean up overlay
        const itemIndex = this.items.indexOf(item);
        if (itemIndex > -1) {
            this.items.splice(itemIndex, 1);
            
            // Remove and destroy the overlay so it's no longer tabbable
            const overlay = this.itemOverlays.get(item);
            if (overlay) {
                overlay.destroy();
                this.itemOverlays.delete(item);
            }
        }

        // Position item on plate (center it since only one item allowed)
        const itemName = this.currentQuestion.operand2.toUpperCase();
        const itemScale = this.scene.getScaledValue(SliceItemsConfig.SLICE_ITEMS[itemName as keyof typeof SliceItemsConfig.SLICE_ITEMS].PLATE_SCALE);

        // Disable dragging for items on plates
        item.disableInteractive();
        this.scene.tweens.add({
            targets: item,
            x: plateX,
            y: plateY,
            scale: itemScale,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                // Set item plate texture
                item.setTexture(item.getData("textureKey") + "_plate");
            }
        });

        // Play plate sound
        this.scene.audioManager.playSoundEffect("plate");

        // Emmit item dropped event for tutorial
        this.scene.events.emit("itemdropped", { item, plateIndex });
    }

    private returnItemToOriginalPosition(item: Phaser.GameObjects.Image) {
        const originalX = item.getData("originalX");
        const originalY = item.getData("originalY");

        const itemName = this.currentQuestion.operand2.toUpperCase();
        const itemsScale = this.scene.getScaledValue(SliceItemsConfig.SLICE_ITEMS[itemName as keyof typeof SliceItemsConfig.SLICE_ITEMS].SCALE);

        this.scene.tweens.add({
            targets: item,
            x: this.scene.getScaledValue(originalX),
            y: this.scene.getScaledValue(originalY),
            scale: itemsScale,
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                item.setDepth(2); // Reset depth
                // Show the item text label again when item returns to original position
                const itemIndex = item.getData("sliceIndex");
                if (itemIndex) {
                    const itemText = this.itemContainer.getByName(`item_text_${itemIndex}`) as Phaser.GameObjects.Container;
                    if (itemText) {
                        this.scene.tweens.add({
                            targets: itemText,
                            scale: 1,
                            duration: 200,
                            ease: "Power2",
                        });
                    }
                }
            }
        });

    }

    private updatePlateHover(targetPlate: Phaser.GameObjects.Image | null) {
        // Reset previous hovered plate
        if (this.hoveredPlate && this.hoveredPlate !== targetPlate) {
            this.scene.tweens.add({
                targets: this.hoveredPlate,
                scale: this.scene.getScaledValue(1),
                duration: 500,
                ease: "Power2",
            });
        }

        // Update current hovered plate
        if (targetPlate && targetPlate !== this.hoveredPlate) {
            this.scene.tweens.add({
                targets: targetPlate,
                scale: this.scene.getScaledValue(1.2),
                duration: 500,
                ease: "Power2",
            });
        }

        this.hoveredPlate = targetPlate;
    }

    private checkAnswer() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        const correctAnswer = this.currentQuestion.answer;
        let isCorrect = true;

        const analyticsQuestion = `${this.currentQuestion.question_en} (${this.currentQuestion.operand1} aliens)`;
        let studentResponse: string[] = [];

        // Each plate should have the correct number of items
        this.plates.forEach((_plate, index) => {
            const items = this.itemsInPlates.get(index);
            const alien = this.aliens[index];
            if (this.GAME_MODE === "game") {
                alien.stopBlinking();
            }
            if (items && items.length === 1 && items[0].getData("sliceType") === correctAnswer) {
                if (this.GAME_MODE === "game") {
                    alien.makeHappy();
                }
            } else {
                isCorrect = false;
                if (this.GAME_MODE === "game") {
                    alien.makeSad();
                }
            }

            if (items && items.length === 1) {
                studentResponse.push(items[0].getData("sliceType"));
            } else {
                studentResponse.push("0");
            }
        });

        // Emmit check answer event for tutorial
        if (this.GAME_MODE === "tutorial") {
            this.scene.events.emit("checkanswer", { isCorrect });
            this.isProcessing = false;
            return;
        }

        if (isCorrect) {
            // Reset retry count on correct answer
            this.retryCount = 0;

            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: analyticsQuestion,
                isCorrect: true,
                questionMechanic: 'slice',
                gameLevelInfo: 'game.space_party.default',
                studentResponse: studentResponse.join(","),
                studentResponseAccuracyPercentage: '100%',
            });

            // Update score and progress for correct answer
            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            this.scoreCoins.updateScoreDisplay(true);

            // Update progress bar
            const progress = this.currentQuestionIndex / this.totalQuestions;
            this.progressBar?.drawProgressFill(
                progress,
                this.scoreHelper.getCurrentStreak()
            );

            // Check if we should show streak animation
            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.loadNextQuestion();
                    this.isProcessing = false;
                });
                return;
            }

            this.showSuccessAnimation();

            this.scene.time.delayedCall(2500, () => {
                this.loadNextQuestion();
                this.isProcessing = false;
            });
        } else {
            // Increment retry count
            this.retryCount++;

            if (this.retryCount < this.maxRetries) {
                // Allow retry - don't update score or progress yet
                this.showErrorAnimation();

                this.scene.time.delayedCall(2000, () => {
                    // Reset items for retry
                    this.resetItems();
                    // Reset alien states
                    this.aliens.forEach(alien => {
                        alien.startBlinking();
                    });
                    this.isProcessing = false;
                });

            } else {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: 0,
                    questionText: analyticsQuestion,
                    isCorrect: false,
                    questionMechanic: 'slice',
                    gameLevelInfo: 'game.space_party.default',
                    studentResponse: studentResponse.join(","),
                    studentResponseAccuracyPercentage: '0%',
                });

                // Max retries reached - count as incorrect
                this.questionSelector.answerIncorrectly(this.currentQuestion);
                this.scoreHelper.answerIncorrectly();
                this.scoreCoins.updateScoreDisplay(false);

                // Update progress bar
                const progress = this.currentQuestionIndex / this.totalQuestions;
                this.progressBar?.drawProgressFill(
                    progress,
                    this.scoreHelper.getCurrentStreak()
                );

                this.showErrorAnimation();

                this.scene.time.delayedCall(2500, () => {
                    this.loadNextQuestion();
                    this.isProcessing = false;
                });
            }
        }
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
        this.currentQuestionIndex = 0;
        this.retryCount = 0;
        this.isQuestionAudioPlaying = false;
        this.stopQuestionAudio();
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
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
            onClick: () => {
                this.stopQuestionAudio();
                this.scene.scene.pause();
                this.scene.audioManager.stopBackgroundMusic();
                this.scene.scene.launch("SliceItemsTutorial", {
                    fromGameScene: true,
                });
                this.scene.scene.bringToTop("SliceItemsTutorial");
            },
        });
        helpBtn.setDepth(1);
    }

    private cleanupUI(): Promise<void> {
        return new Promise((resolve) => {
            // Stop question audio if playing
            this.stopQuestionAudio();

            // Clear keyboard selection state
            this.clearSelectedItem();

            // Clear overlays
            this.itemOverlays.forEach(overlay => overlay.destroy());
            this.itemOverlays.clear();
            this.plateOverlays.forEach(overlay => overlay.destroy());
            this.plateOverlays.clear();

            // Clean up arrays and resolve immediately if no targets
            this.plates.forEach((item) => item?.destroy());
            this.plates = [];
            this.aliens.forEach((alien) => alien?.alienContainer?.destroy());
            this.aliens = [];
            this.items.forEach((item) => item?.destroy());
            this.items = [];
            this.itemContainer?.destroy();
            this.itemsInPlates.clear();
            resolve();
        });
    }

    private resetItems() {
        // Clear items in plates
        this.itemsInPlates.clear();

        // Reset plate hover
        this.updatePlateHover(null);

        // Recreate items
        this.clearItems();

        // Create new items
        this.createItems(this.sliceIndex);
    }

    /**
     * Selects an item for keyboard-based dropping
     */
    private selectItemForKeyboard(item: Phaser.GameObjects.Image): void {
        // Clear any previously selected item
        this.clearSelectedItem();
        
        // Set the new selected item
        this.selectedItemForKeyboard = item;
        
        // Create visual indicator (white outline around the item)
        this.createSelectedItemIndicator(item);
        
        // Update aria-label to indicate selection
        const overlay = this.itemOverlays.get(item);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                const itemIndex = item.getData('sliceIndex');
                const itemName = this.currentQuestion.operand2;
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.selectedPiece', { itemName: itemName, number: itemIndex }));
            }
        }
        
        // Play positive sound to indicate selection
        this.scene.audioManager.playSoundEffect('correct');
    }

    /**
     * Creates a visual indicator around the selected item
     */
    private createSelectedItemIndicator(item: Phaser.GameObjects.Image): void {
        this.selectedItemIndicator = this.scene.add.graphics();
        this.selectedItemIndicator.lineStyle(4, 0xffffff, 1);
        
        // Draw a rectangle around the item
        const padding = 10;
        const rect = item.getBounds();
        this.selectedItemIndicator.strokeRect(
            rect.x - padding, 
            rect.y - padding, 
            rect.width + padding * 2, 
            rect.height + padding * 2
        );
        
        // Set depth to be above the item
        this.selectedItemIndicator.setDepth(item.depth + 1);
    }

    /**
     * Attempts to drop the selected item on the specified plate
     */
    private dropSelectedItemWithKeyboard(targetPlate: Phaser.GameObjects.Image): void {
        if (!this.selectedItemForKeyboard) {
            // No item selected, play negative sound
            this.scene.audioManager.playSoundEffect('incorrect');
            return;
        }
        
        const selectedItem = this.selectedItemForKeyboard;
        const plateIndex = targetPlate.getData("plateIndex");
        
        // Hide the item text label when keyboard dropping starts (same as mouse drag)
        const itemIndex = selectedItem.getData("sliceIndex");
        if (itemIndex) {
            const itemText = this.itemContainer.getByName(`item_text_${itemIndex}`) as Phaser.GameObjects.Container;
            if (itemText) {
                this.scene.tweens.add({
                    targets: itemText,
                    scale: 0,
                    duration: 100,
                    ease: "Power2",
                });
            }
        }
        
        // Check if plate already has an item
        const itemsInThisPlate = this.itemsInPlates.get(plateIndex) || [];
        if (itemsInThisPlate.length > 0) {
            // Plate is full, play negative sound and return item
            this.scene.audioManager.playSoundEffect('incorrect');
            this.animateItemToPosition(selectedItem, targetPlate, () => {
                this.returnItemToOriginalPosition(selectedItem);
                this.clearSelectedItem();
            });
            return;
        }
        
        // Valid drop - animate item to plate, then drop it
        this.animateItemToPosition(selectedItem, targetPlate, () => {
            this.dropItemOnPlate(selectedItem, targetPlate);
            this.clearSelectedItem();
        });
    }

    /**
     * Animates item movement to a target position (plate or original position)
     */
    private animateItemToPosition(
        item: Phaser.GameObjects.Image, 
        targetPlate: Phaser.GameObjects.Image, 
        onComplete: () => void
    ): void {
        const itemName = this.currentQuestion.operand2.toUpperCase();
        const itemConfig = SliceItemsConfig.SLICE_ITEMS[itemName as keyof typeof SliceItemsConfig.SLICE_ITEMS];
        
        this.scene.tweens.add({
            targets: item,
            x: targetPlate.x,
            y: targetPlate.y,
            scale: this.scene.getScaledValue(itemConfig.PLATE_SCALE),
            duration: 300,
            ease: 'Power2',
            onComplete: onComplete
        });
    }

    /**
     * Clears the currently selected item and its visual indicator
     */
    private clearSelectedItem(): void {
        if (this.selectedItemForKeyboard) {
            // Reset aria-label
            const overlay = this.itemOverlays.get(this.selectedItemForKeyboard);
            if (overlay) {
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    const itemIndex = this.selectedItemForKeyboard.getData('sliceIndex');
                    const itemName = this.currentQuestion.operand2;
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggablePiece', { itemName: itemName, number: itemIndex }));
                }
            }
            
            this.selectedItemForKeyboard = undefined;
        }
        
        // Destroy visual indicator
        if (this.selectedItemIndicator) {
            this.selectedItemIndicator.destroy();
            this.selectedItemIndicator = undefined;
        }
    }

    private setOverlaysEnabled(enabled: boolean): void {
        // Handle item overlays
        this.itemOverlays.forEach((overlay) => {
            const domElement = (overlay as any).domElement;
            const htmlElement = domElement?.node as HTMLElement | undefined;
            if (!htmlElement) return;

            if (enabled) {
                htmlElement.removeAttribute('aria-disabled');
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.style.pointerEvents = 'auto';
            } else {
                htmlElement.setAttribute('aria-disabled', 'true');
                htmlElement.removeAttribute('tabindex');
                htmlElement.style.pointerEvents = 'none';
            }
        });

        // Handle plate overlays
        this.plateOverlays.forEach((overlay) => {
            const domElement = (overlay as any).domElement;
            const htmlElement = domElement?.node as HTMLElement | undefined;
            if (!htmlElement) return;

            if (enabled) {
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
}
