import {
    BaseScene,
    ButtonHelper,
    getQuestionBankByName,
    i18n,
    ImageOverlay,
    ProgressBar,
    Question,
    questionBankNames,
    ScoreCoins,
    ScoreHelper,
    VolumeSlider,
    QuestionSelectorHelper,
    TextOverlay,
    announceToScreenReader,
    ButtonOverlay,
    focusToGameContainer,
    AnalyticsHelper,
} from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS } from "../config/common";
import { BackgroundHelper } from "../utils/BackgroundHelper";
import { Alien } from "../utils/Alien";
import { NumberPad } from "../game/NumberPad2";

export class DistributeItems {
    private scene!: BaseScene;
    private hasLaunchedDistributeTutorial: boolean = false;
    private questionSelector!: QuestionSelectorHelper;
    public currentQuestion!: Question;
    private scoreHelper!: ScoreHelper;
    private progressBar!: ProgressBar;
    private scoreCoins!: ScoreCoins;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;

    private analyticsHelper!: AnalyticsHelper;

    public aliens: Alien[] = [];
    public plates: Phaser.GameObjects.Image[] = [];
    public items: Phaser.GameObjects.Image[] = [];
    public selectedItems: Phaser.GameObjects.Image[] = [];
    public itemsInPlates: Map<number, Phaser.GameObjects.Image[]> = new Map();

    private questionBar!: Phaser.GameObjects.Container;
    private equationText!: Phaser.GameObjects.Text;
    private groupLabelContainer: Phaser.GameObjects.Container | null = null;
    private hoveredPlate: Phaser.GameObjects.Image | null = null;

    // Drag selection properties
    private isDragSelecting: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private dragSelectionBox: Phaser.GameObjects.Rectangle | null = null;
    private dragStartItem: Phaser.GameObjects.Image | null = null;

    // Accessibility overlays for tab navigation
    private itemOverlays: Map<Phaser.GameObjects.Image, ImageOverlay> = new Map();
    private plateOverlays: Map<Phaser.GameObjects.Image, ImageOverlay> = new Map();

    // Keyboard interaction state
    private selectedItemsForKeyboard: Phaser.GameObjects.Image[] = [];
    // private focusIndicators: Map<Phaser.GameObjects.Image, Phaser.GameObjects.Graphics> = new Map();

    private lang: string = i18n.getLanguage() || "en";
    private GAME_MODE: string = "game";
    private MECHANIC_TYPE: "numpad" | "distribute" = "numpad";
    private currentQuestionIndex: number = 0;
    private totalQuestions: number = 10;
    private isProcessing: boolean = false;
    private announcementCount: number = 0;
    
    // NumberPad related properties
    public numberPad: NumberPad | null = null;
    public userAnswer: string = "";
    public answerDisplay: Phaser.GameObjects.Text | null = null;
    private resetButton: Phaser.GameObjects.Container | null = null;
    private checkButton: Phaser.GameObjects.Container | null = null;

    private characterScale: number = 0.55;
    private itemScale: number = 0.4;
    private plateConfig = {
        small: {
            scale: 0.32,
            maxItems: 3,
        },
        medium: {
            scale: 0.252,
            maxItems: 5,
        },
        large: {
            scale: 0.27,
            maxItems: 8,
        },
    };

    constructor(scene: BaseScene) {
        this.scene = scene;
        const questionBank = getQuestionBankByName(
            questionBankNames.G3_T1_understand_division
        );
        if (!questionBank) {
            throw new Error("Question bank not found");
        }
        this.questionSelector = new QuestionSelectorHelper(
            questionBank,
            this.totalQuestions
        );
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks
    }

    static _preload(scene: BaseScene) {
        ProgressBar.preload(scene, "dark");
        ScoreCoins.preload(scene, "blue");
        VolumeSlider.preload(scene, "blue");
        BackgroundHelper.preload(scene);
        Alien.preload(scene);

        // Load game screen assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image("title_bg", "title_bg.png");
        scene.load.image("correct_icon", "correct_icon.png");
        scene.load.image("incorrect_icon", "incorrect_icon.png");
        scene.load.image("count_1", "count_1.png");
        scene.load.image("count_2", "count_2.png");
        scene.load.image("count_3", "count_3.png");

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/distribute_items`);
        scene.load.image("question_bg", "question_bg.png");
        scene.load.image("controls_bg", "controls_bg.png");
        scene.load.image("table", "table.png");
        scene.load.image("table_small", "table_small.png");
        scene.load.image("numberpad_bg", "numberpad_bg.png");
        scene.load.image("input_bg", "input_bg.png");
        scene.load.image("plate_small", "plate_small.png");
        scene.load.image("plate_small_selected", "plate_small_selected.png");
        scene.load.image("plate_medium", "plate_medium.png");
        scene.load.image("plate_medium_selected", "plate_medium_selected.png");
        scene.load.image("plate_large", "plate_large.png");
        scene.load.image("plate_large_selected", "plate_large_selected.png");

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

        scene.load.image("moonburger", "moonburger.png");
        scene.load.image("moonburger_selected", "moonburger_selected.png");

        // Load audio for plate interactions
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio("plate", "plate.mp3");
        scene.load.audio("positive-sfx", "positive.wav");
        scene.load.audio("negative-sfx", "negative.wav");
        scene.load.audio("countdown", "countdown.mp3");
        scene.load.audio("door_close", "door_close.mp3");

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

        // Load keypad button assets
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen/distribute_items/`);
        scene.load.image("keypad_btn", "btn_num.png");
        scene.load.image("keypad_btn_hover", "btn_num_hover.png");
        scene.load.image("keypad_btn_pressed", "btn_num_pressed.png");
        scene.load.image("keypad_btn_inactive", "btn_num_inactive.png");

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

	create(mode: string, reset: boolean = false, parentScene: string = "SplashScene") {
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
				announceToScreenReader(i18n.t("info.helpPage"));
			})
		}

        // Add title background
        this.scene.addImage(this.scene.display.width / 2, 85, "title_bg")

        // Add table (dynamic based on mechanic type)
        this.scene
            .addImage(this.scene.display.width / 2, 550, "table")
            .setOrigin(0.5)
            .setDepth(2)
            .setName("gameTable");

        // Add control background (dynamic based on mechanic type)
        this.scene
            .addImage(this.scene.display.width / 2, 703, "controls_bg")
            .setOrigin(0.5)
            .setDepth(2)
            .setName("controlsBg");

        if (this.GAME_MODE === "tutorial") {
            // create doors
            this.createDoors("open");

            this.loadNextQuestion();
        } else {
            // create doors
            this.createDoors("closed");

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

            this.progressBar = new ProgressBar(this.scene, "dark", i18n);
            this.progressBar.create(
                this.scene.getScaledValue(this.scene.display.width / 2),
                this.scene.getScaledValue(70)
            );
            this.openDoors();
            this.scene.time.delayedCall(3000, () => {
                this.loadNextQuestion();
            });
        }
        this.createButtons();
    }

    public createQuestionBar() {
        if (this.questionBar) this.questionBar.destroy();
        this.questionBar = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(184)
        );
        this.questionBar.add(
            this.scene.addImage(0, 0, "question_bg").setOrigin(0.5)
        );

        const questionText = this.scene.addText(
            0,
            -25,
            this.currentQuestion[`question_${this.lang}`],
            {
                font: "700 30px Exo",
                color: "#FFEA00",
            }
        );
        questionText.setOrigin(0.5);
        this.questionBar.add(questionText);

        // Add question text overlay
        const overlay = new TextOverlay(this.scene, questionText, {
            label: this.currentQuestion[`question_${this.lang}`],
        });
        questionText.setData("overlay", overlay);
        
        // add equation text
        const equation = this.currentQuestion.equation + " = ?";
        this.equationText = this.scene.addText(
            0,
            25,
            equation,
            {
                font: "700 40px Exo",
                color: "#FFFFFF",
            }
        );
        this.equationText.setOrigin(0.5);
        this.questionBar.add(this.equationText);

        // add equation text overlay
        const equationOverlay = new TextOverlay(this.scene, this.equationText, {
            label: equation,
        });

        // store the overlay in the equation text
        this.equationText.setData("overlay", equationOverlay);
    }

    public createCharactersWithPlates(
        count: number,
        plateSize: "small" | "medium" | "large"
    ) {
        const displayWidth = this.scene.display.width;
        const alienWidth = 200;
        const gap = (displayWidth - alienWidth * count) / count;
        let alienX = gap / 2 + alienWidth / 2;
        const alienY = 475;
        let plateX = alienX;
        const plateY = 455;

        for (let i = 0; i < count; i++) {
            // no of aliens is 3
            const alienIndex = i % 3
            const alien = new Alien(this.scene, alienIndex, alienX, alienY);
            alien.startBlinking();
            alien.alienContainer.setDepth(1);
            alien.alienContainer.setScale(this.characterScale);

            alienX += gap + alienWidth;
            this.aliens.push(alien);
            
            const plate = this.scene
                .addImage(plateX, plateY, `plate_${plateSize}`)
                .setOrigin(0.5)
                .setScale(this.plateConfig[plateSize].scale)
                .setDepth(2);

            plate.setInteractive({ draggable: false });
            plate.setData("plateIndex", i);
            plate.setData("plateX", plateX);
            plate.setData("plateY", plateY);
            plate.setData("plateType", plateSize);
            plate.setData("maxItems", this.plateConfig[plateSize].maxItems);

            // Create accessibility overlay for tab navigation
            const plateOverlay = new ImageOverlay(this.scene, plate, {
                label: `Plate ${i + 1}`,
                cursor: 'default',
            });
            this.plateOverlays.set(plate, plateOverlay);

            if (this.MECHANIC_TYPE === "distribute") {
                // Make it focusable via tab and add keyboard interaction
                const domElement = (plateOverlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    htmlElement.setAttribute('tabindex', '0');
                    htmlElement.setAttribute('role', 'region');
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.plateDropZone', { number: i + 1 }));
                    
                    // Add focus styles for visibility
                    htmlElement.style.cssText += `
                        outline: none;
                        border-radius: 8px;
                        transition: all 0.2s ease;
                    `;
                    
                    // Add focus and blur event listeners for visual feedback
                    htmlElement.addEventListener('focus', () => {
                        const plateType = plate.getData("plateType");
                        plate.setTexture(`plate_${plateType}_selected`);
                    });
                    
                    htmlElement.addEventListener('blur', () => {
                        const plateType = plate.getData("plateType");
                        plate.setTexture(`plate_${plateType}`);
                    });
                    
                    // Add keyboard event listener for Enter key
                    htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            this.dropSelectedItemsWithKeyboard(plate);
                        }
                    });
                }
            }

            plateX += gap + alienWidth;

            this.plates.push(plate);
            this.itemsInPlates.set(i, []);
        }
    }

    private createItemsRow(count: number, itemName: string) {
        const displayWidth = this.scene.display.width;
        const itemWidth = 70;
        const itemHeight = 70;
        const gap = 30;
        const padding = 20;
        let itemX = Math.max(
            padding + itemWidth,
            displayWidth / 2 - ((itemWidth + gap) * (count - 1)) / 2
        );
        let itemY = 530;

        for (let i = 0; i < count; i++) {
            const item = this.scene
                .addImage(itemX, itemY, itemName)
                .setOrigin(0.5)
                .setScale(0)
                .setDepth(2);
            item.setData("itemIndex", i);
            item.setData("originalX", itemX);
            item.setData("originalY", itemY);
            item.setInteractive({ useHandCursor: true });
            
            // Create accessibility overlay for tab navigation
            const overlay = new ImageOverlay(this.scene, item, {
                label: `${itemName} ${i + 1}`,
                cursor: 'pointer',
            });
            this.itemOverlays.set(item, overlay);

            // Make it focusable via tab and add keyboard interaction
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                htmlElement.setAttribute('tabindex', '0');
                htmlElement.setAttribute('role', 'button');
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableItem', { itemName: itemName, number: i + 1 }));
                
                // Add focus styles for visibility
                htmlElement.style.cssText += `
                    outline: none;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                `;
                
                // Add focus and blur event listeners for visual feedback
                htmlElement.addEventListener('focus', () => {
                    const currentTexture = item.texture.key;
                    if (!currentTexture.endsWith('_selected')) {
                        item.setTexture(`${currentTexture}_selected`);
                    }
                });
                
                htmlElement.addEventListener('blur', () => {
                    // Only restore texture if item is not in selectedItems
                    if (!this.selectedItems.includes(item)) {
                        const currentTexture = item.texture.key;
                        if (currentTexture.endsWith('_selected')) {
                            const originalTexture = currentTexture.replace('_selected', '');
                            item.setTexture(originalTexture);
                        }
                    }
                });
                
                // Add keyboard event listener for Enter key
                htmlElement.addEventListener('keydown', (event: KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.selectItemForKeyboard(item);
                    }
                });
            }
            
            this.items.push(item);

            if (itemX + itemWidth + padding >= displayWidth) {
                itemX = Math.max(
                    padding + itemWidth,
                    displayWidth / 2 - ((itemWidth + gap) * (count - 1)) / 2
                );
                itemY += itemHeight;
            } else {
                itemX += gap + itemWidth;
            }
        }
        this.scene.tweens.add({
            targets: [...this.items],
            scale: this.scene.getScaledValue(this.itemScale),
            duration: 500,
            ease: "Power2",
            onComplete: () => {
                if (this.GAME_MODE === "game" && this.MECHANIC_TYPE === "distribute") {
                    this.setupItemSelectionEvents();
                    this.setupItemDragEvents();
                }
                // TODO: add image overlay with onClick
                // this.items.forEach((item) => {
                //     new ImageOverlay(this.scene, item, {
                //         label: itemName,
                //         style: {
                //             height: `${item.displayHeight}px`,
                //             width: `${item.displayWidth}px`,
                //             cursor: "pointer",
                //         },
                //     });
                // });
            },
        });
    }

    private createGroupLabelContainer(x: number, y: number) {
        if (this.groupLabelContainer) {
            this.groupLabelContainer.destroy();
        }

        this.groupLabelContainer = this.scene.add.container(x, y).setDepth(10);

        const circle = this.scene
            .addCircle(0, 0, 12, 0xffffff, 1)
            .setOrigin(0.5);
        this.groupLabelContainer.add([circle]);

        const countText = this.scene
            .addText(0, 2, `${this.selectedItems.length}`, {
                font: "700 16px Exo",
                color: "#000000",
                stroke: "#000000",
            })
            .setOrigin(0.5);
        this.groupLabelContainer.add([countText]);
    }

    public createPreDistributedItems(count: number, itemName: string, itemsPerPlate: number) {
        // Automatically distribute items to plates for numpad mechanic
        const totalPlates = this.plates.length;
        let itemIndex = 0;

        for (let plateIndex = 0; plateIndex < totalPlates && itemIndex < count; plateIndex++) {
            const plate = this.plates[plateIndex];
            const plateX = plate.x;
            const plateY = plate.y;
            const itemsInThisPlate: Phaser.GameObjects.Image[] = [];

            // Add the specified number of items to this plate
            for (let i = 0; i < itemsPerPlate && itemIndex < count; i++) {
                const item = this.scene
                    .addImage(plateX, plateY, itemName)
                    .setOrigin(0.5)
                    .setScale(0)
                    .setDepth(2);
                
                item.setData("itemIndex", itemIndex);
                itemsInThisPlate.push(item);
                itemIndex++;
            }

            // Position items in the plate
            const targetScale = this.scene.getScaledValue(this.itemScale - 0.15);
            const itemWidth = 200 * targetScale;
            const gap = -15 * targetScale;
            const itemCount = itemsInThisPlate.length;
            const totalWidth = (itemCount - 1) * (itemWidth + gap) + itemWidth;
            const startX = plateX - totalWidth / 2 + itemWidth / 2;
            const startY = plateY - this.scene.getScaledValue(10);

            itemsInThisPlate.forEach((item, index) => {
                const x = startX + index * (itemWidth + gap);
                const y = startY;
                
                this.scene.tweens.add({
                    targets: item,
                    x: x,
                    y: y,
                    scale: targetScale,
                    duration: 500,
                    ease: "Power2"
                });
            });

            // Store items in plate
            this.itemsInPlates.set(plateIndex, itemsInThisPlate);
        }
    }

    public createNumberPad() {
        this.numberPad = new NumberPad(
            this.scene,
            (number: number) => {
                this.handleNumberInput(number);
            },
            {
                onEnter: () => this.handleCheckClick()
            }
        );

        // Position based on mechanic type
        const xPosition = this.scene.display.width / 4 - 25;
        const yPosition = 620;

        this.numberPad.create({
            x: xPosition,
            y: yPosition
        });
    }

    public createAnswerDisplay() {
        const xPosition = this.scene.display.width / 2 + 250;
        const yPosition = 585;

        this.scene.addImage(xPosition, yPosition, "input_bg")
            .setOrigin(0.5)
            .setDepth(3)
            .setName("input_bg"); // Ensure the input_bg image is named for reliable destruction

        this.answerDisplay = this.scene.addText(
            xPosition,
            yPosition,
            "",
            {
                font: "700 36px Exo",
                color: "#000000"
            }
        ).setOrigin(0.5).setDepth(10);
    }


    private updateBackgroundElements() {
        // Update background images and positions based on mechanic type
        const gameTable = this.scene.children.getByName("gameTable") as Phaser.GameObjects.Image;
        if (gameTable) {
            gameTable.setTexture(this.MECHANIC_TYPE === "numpad" ? "table_small" : "table");
            // Update position based on mechanic type
            const tableY = this.scene.getScaledValue(this.MECHANIC_TYPE === "numpad" ? 480 : 550);
            gameTable.setY(tableY);
        }
        
        const controlsBg = this.scene.children.getByName("controlsBg") as Phaser.GameObjects.Image;
        if (controlsBg) {
            controlsBg.setTexture(this.MECHANIC_TYPE === "numpad" ? "numberpad_bg" : "controls_bg");
            // Update position based on mechanic type
            const controlsBgY = this.scene.getScaledValue(this.MECHANIC_TYPE === "numpad" ? 633 : 703);
            controlsBg.setY(controlsBgY);
        }
    }

    private handleNumberInput(number: number) {
        if (this.isProcessing) return;

        // Handle clear functionality
        if (number === -1) {
            this.userAnswer = "";
        } else {
            // Limit answer length to reasonable number
            if (this.userAnswer.length < 3) {
                this.userAnswer += number.toString();
            }
        }

        // Update display
        if (this.answerDisplay) {
            this.answerDisplay.setText(this.userAnswer || "");
        }
    }

    private checkNumpadAnswer() {
        if (this.scene.sys.settings.key === "NumpadTutorial") return;
        if (this.isProcessing) return;
        this.isProcessing = true;
    
        const userAnswerNum = parseInt(this.userAnswer);
        const correctAnswer = parseInt(this.currentQuestion.answer);

        const analyticsQuestion = `${this.currentQuestion.equation} = ?`;
    
        if (userAnswerNum === correctAnswer) {
            // Update equation text to show the answer
            const equation = this.currentQuestion.equation + " = " + this.currentQuestion.answer;
            if (this.equationText && typeof this.equationText.setText === 'function') {
                this.equationText.setText(equation);
                const equationOverlay = this.equationText.getData("overlay");
                if (equationOverlay) {
                    equationOverlay.updateContent(equation);
                }
            }
    
            // Make all aliens happy
            this.aliens.forEach(alien => {
                alien.stopBlinking();
                alien.makeHappy();
            });

            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: analyticsQuestion,
                isCorrect: true,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: userAnswerNum.toString(),
                studentResponseAccuracyPercentage: '100%',
            });
    
            // Update score and progress
            this.questionSelector.answerCorrectly();
            this.scoreHelper.answerCorrectly();
            if (this.scoreCoins) {
            this.scoreCoins.updateScoreDisplay(true);
            }
    
            const progress = this.currentQuestionIndex / this.totalQuestions;
            this.progressBar?.drawProgressFill(
                progress,
                this.scoreHelper.getCurrentStreak()
            );
    
            // Check if we should show streak animation (3, 5, or 7 in a row)
            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.loadNextQuestion();
                });
                return;
            }
            
            this.showSuccessAnimation();
            
            // Load next question after animation
            this.scene.time.delayedCall(2500, () => {
                this.loadNextQuestion();
            });
        } else {
            // Make all aliens sad
            this.aliens.forEach(alien => {
                alien.stopBlinking();
                alien.makeSad();
            });

            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: analyticsQuestion,
                isCorrect: false,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: userAnswerNum.toString(),
                studentResponseAccuracyPercentage: '0%',
            });
            
            this.questionSelector.answerIncorrectly(this.currentQuestion);
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins.updateScoreDisplay(false);
    
            const progress = this.currentQuestionIndex / this.totalQuestions;
            this.progressBar?.drawProgressFill(
                progress,
                this.scoreHelper.getCurrentStreak()
            );
    
            this.showErrorAnimation();
            
            // Load next question after animation
            this.scene.time.delayedCall(2500, () => {
                this.loadNextQuestion();
            });
        }
    }

    private handleResetClick() {
        if (this.MECHANIC_TYPE === "numpad") {
            // For numpad mechanic: clear the input
            this.userAnswer = "";
            if (this.answerDisplay) {
                this.answerDisplay.setText("");
            }
        } else {
            // For distribute mechanic: reset items to original positions
            this.resetItems();
            // Sort overlays in correct order in DOM
            this.sortOverlaysInDOM();
        }
    }

    private sortOverlaysInDOM() {
        // Get all item overlays and sort them by itemIndex
        const overlayElements: Array<{ element: HTMLElement, itemIndex: number }> = [];
        
        this.itemOverlays.forEach((overlay, item) => {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const itemIndex = item.getData("itemIndex");
                overlayElements.push({
                    element: domElement.node as HTMLElement,
                    itemIndex: itemIndex
                });
            }
        });
        
        // Sort by itemIndex
        overlayElements.sort((a, b) => a.itemIndex - b.itemIndex);
        
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

        if (!checkBtn && !resetBtn) return;

        // Get the button overlays and move their DOM elements to the end
        if (resetBtn) {
            const resetOverlay = (resetBtn as any)?.buttonOverlay as ButtonOverlay;
            if (resetOverlay?.domElement?.node && resetOverlay.domElement.node.parentNode) {
                const parent = resetOverlay.domElement.node.parentNode;
                parent.appendChild(resetOverlay.domElement.node);
            }
        }
        
        if (checkBtn) {
            const checkOverlay = (checkBtn as any)?.buttonOverlay as ButtonOverlay;
            if (checkOverlay?.domElement?.node && checkOverlay.domElement.node.parentNode) {
                const parent = checkOverlay.domElement.node.parentNode;
                parent.appendChild(checkOverlay.domElement.node);
            }
        }
    }

    private handleCheckClick() {
        if (this.MECHANIC_TYPE === "numpad") {
            // For numpad mechanic: check the numpad answer
            this.checkNumpadAnswer();
        } else {
            // For distribute mechanic: check the distribution
            this.checkAnswer();
        }
    }

    private createButtons() {
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
                this.scene.scene.pause();
                this.scene.audioManager.stopBackgroundMusic();
                if (this.MECHANIC_TYPE === "numpad") {
                    this.scene.scene.launch("NumpadTutorial", {
                        fromGameScene: true
                    });
                    this.scene.scene.bringToTop("NumpadTutorial");
                } else {
                    this.scene.scene.launch("DistributeItemsTutorial", {
                        fromGameScene: true
                    });
                    this.scene.scene.bringToTop("DistributeItemsTutorial");
                }
            },
        });
        helpBtn.setDepth(2);
    }

    private createSubmitButton() {
        // Position buttons differently based on mechanic type and language
        let xPos, yPos;
        const isSpanish = (i18n.getLanguage && i18n.getLanguage() === "es") || this.lang === "es";
        if (this.MECHANIC_TYPE === "numpad") {
            xPos = isSpanish ? this.scene.display.width / 2 + 410 : this.scene.display.width / 2 + 335;
            yPos = 680;
        } else {
            xPos = this.scene.display.width / 2 + 120;
            yPos = 715;
        }

        this.checkButton = ButtonHelper.createButton({
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
            x: xPos,
            y: yPos,
            onClick: () => {
                this.handleCheckClick();
            },
        });
        this.checkButton.setDepth(3);
        this.checkButton.setName("checkButton");
    }

    private createResetButton() {
        // Position buttons differently based on mechanic type and language
        let xPos, yPos;
        const isSpanish = (i18n.getLanguage && i18n.getLanguage() === "es") || this.lang === "es";
        if (this.MECHANIC_TYPE === "numpad") {
            xPos = isSpanish ? this.scene.display.width / 2 + 200 : this.scene.display.width / 2 + 165;
            yPos = 680;
        } else {
            xPos = this.scene.display.width / 2 - 120;
            yPos = 715;
        }

        this.resetButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: "btn_alter",
                hover: "btn_alter_hover",
                pressed: "btn_alter_pressed",
            },
            text: i18n.t("game.reset"),
            label: i18n.t("game.reset"),
            textStyle: {
                font: "700 36px Exo",
                color: "#FFFFFF",
            },
            x: xPos,
            y: yPos,
            onClick: () => {
                this.handleResetClick();
            },
        });
        this.resetButton.setDepth(3);
        this.resetButton.setName("resetButton");
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
        // Game Over handling here
        const finalScore = this.scoreHelper.endGame();

        this.closeDoors();
        this.scene.time.delayedCall(2000, () => {
            // Send data to ScoreBoard scene
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        });
    }

    resetGame() {
        this.cleanup();
        this.currentQuestionIndex = 0;
        this.questionSelector.reset(true);
        this.scoreHelper.reset();
    }

    private loadNextQuestion() {
        if (this.answerDisplay) {
            this.answerDisplay.setText("");
        }
        let nextQuestion: Question | null = null;
        if (this.GAME_MODE === "tutorial") {
            nextQuestion = {
                operand1: "2",
                operand2: "4",
                answer: "4",
                item: "mooncake",
                itemPerPlate: "2",
                equation: "4 ÷ 2",
                question_en: i18n.t("game.tutorialQuestion"),
                question_es: i18n.t("game.tutorialQuestion"),
            };
        } else {
            nextQuestion = this.questionSelector.getNextQuestion();
            this.currentQuestionIndex++;
        }
        if (!nextQuestion) {
            this.gameOver();
            return;
        }
        this.currentQuestion = nextQuestion;
        
        const typeFromSheet = (this.currentQuestion as any).type;
        this.MECHANIC_TYPE = typeFromSheet === "numpad" ? "numpad" : "distribute";

        // Launch DistributeItemsTutorial only the first time a distribute mechanic question is shown
        if (
            this.GAME_MODE !== "tutorial" &&
            this.MECHANIC_TYPE === "distribute" &&
            !this.hasLaunchedDistributeTutorial
        ) {
            this.scene.scene.pause();
            this.scene.scene.launch("DistributeItemsTutorial", {
                fromGameScene: true,
                showPlayButton: true,
            });
            this.scene.scene.bringToTop("DistributeItemsTutorial");
            this.hasLaunchedDistributeTutorial = true;
        }

        this.updateBackgroundElements();
        this.cleanup();

        const alienCount = parseInt(this.currentQuestion.operand1);
        const itemCount = parseInt(this.currentQuestion.operand2);
        const expectedItemsPerPlate = parseInt(this.currentQuestion.itemPerPlate);
        const itemName = this.currentQuestion.item;
        // Add Question Bar
        this.createQuestionBar();

        this.scene.time.delayedCall(500, () => {
            if (this.GAME_MODE === 'game') {
                announceToScreenReader(`${this.currentQuestion[`question_${this.lang}`]} ${this.currentQuestion.equation} = ?`);
            }
            // Create Characters
            if (expectedItemsPerPlate <= 3) {
                this.createCharactersWithPlates(alienCount, "small");
            } else if (expectedItemsPerPlate <= 5) {
                this.createCharactersWithPlates(alienCount, "medium");
            } else {
                this.createCharactersWithPlates(alienCount, "large");
            }
            // Add Items
            if (this.MECHANIC_TYPE === "numpad") {
                // For numpad mechanic: pre-distribute items and show number pad
                this.createPreDistributedItems(itemCount, itemName, expectedItemsPerPlate);
                this.createNumberPad();
                this.createAnswerDisplay();
            } else {
                // For distribute mechanic: show loose items for manual distribution
                this.createItemsRow(itemCount, itemName);
            }

            if (!(this.GAME_MODE === "tutorial" && this.MECHANIC_TYPE === "distribute")) {
                this.createResetButton();
                this.createSubmitButton();
                // Sort overlays in correct order in DOM
                this.sortOverlaysInDOM();
            }
            this.isProcessing = false;
        });
    }

    setupItemSelectionEvents() {
        this.clearItemSelectionEvents();
        // Listen for pointer events on the scene itself to handle empty space selection
        this.scene.input.on("pointerdown", this.handleItemSelectionStart, this);
        this.scene.input.on("pointerup", this.handleItemSelectionEnd, this);
        this.scene.input.on("pointermove", this.handleItemSelectionMove, this);
    }

    clearItemSelectionEvents() {
        this.scene.input.off(
            "pointerdown",
            this.handleItemSelectionStart,
            this
        );
        this.scene.input.off("pointerup", this.handleItemSelectionEnd, this);
        this.scene.input.off("pointermove", this.handleItemSelectionMove, this);
    }

    setupItemDragEvents() {
        this.clearItemDragEvents();
        this.scene.input.on("drag", this.handleItemDrag, this);
        this.scene.input.on("dragend", this.handleItemDragEnd, this);
    }

    clearItemDragEvents() {
        this.scene.input.off("drag", this.handleItemDrag, this);
        this.scene.input.off("dragend", this.handleItemDragEnd, this);
    }

    private handleItemSelectionStart(
        _pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) {
        if (this.isDragSelecting) {
            return;
        }
        const clickedItem = gameObjects.find((obj) =>
            this.items.includes(obj as Phaser.GameObjects.Image)
        ) as Phaser.GameObjects.Image;

        // set the drag start position
        this.dragStartX = _pointer.x;
        this.dragStartY = _pointer.y;

        // do not start drag selection if the clicked item is not selected
        if(clickedItem && !this.selectedItems.includes(clickedItem)) {
            return;
        }

        this.isDragSelecting = true;
        this.dragStartItem = clickedItem;

        // Create selection box
        this.dragSelectionBox = this.scene.add.rectangle(
            this.dragStartX,
            this.dragStartY,
            0,
            0,
            0x4a90e2,
            0.15
        );
        this.dragSelectionBox.setOrigin(0, 0);
        this.dragSelectionBox.setDepth(100);
        this.dragSelectionBox.setStrokeStyle(1, 0x4a90e2, 0.8);
    }

    private handleItemSelectionMove(
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[]
    ) {
        if (!this.isDragSelecting || !this.dragSelectionBox) {
            return; // Exit early if not drag selecting
        }
        const currentX = _pointer.x;
        const currentY = _pointer.y;
        const minX = Math.min(this.dragStartX, currentX);
        const minY = Math.min(this.dragStartY, currentY);
        const maxX = Math.max(this.dragStartX, currentX);
        const maxY = Math.max(this.dragStartY, currentY);

        this.dragSelectionBox.setPosition(minX, minY);
        this.dragSelectionBox.setSize(maxX - minX, maxY - minY);

        // Check if we started dragging from a selected item
        if (
            this.dragStartItem &&
            this.selectedItems.includes(this.dragStartItem)
        ) {
            // If we started from a selected item, cancel drag selection and let drag system handle it
            this.isDragSelecting = false;
            this.dragSelectionBox?.destroy();
            this.dragSelectionBox = null;
            this.dragStartItem = null;
            return;
        }

        // Add unselected items in the selection box to selected items
        this.items.forEach((item) => {
            const itemBounds = item.getBounds();
            const isInSelectionBox =
                itemBounds.x < maxX &&
                itemBounds.x + itemBounds.width > minX &&
                itemBounds.y < maxY &&
                itemBounds.y + itemBounds.height > minY;

            // Only add items that are not already selected
            if (isInSelectionBox && !this.selectedItems.includes(item)) {
                this.selectItem(item);
            }
        });
    }

    private handleItemSelectionEnd(
        _pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) {
        const clickedItem = gameObjects.find((obj) =>
            this.items.includes(obj as Phaser.GameObjects.Image)
        ) as Phaser.GameObjects.Image;
        // Check if this was a drag selection or a single click
        const dragDistance = Phaser.Math.Distance.Between(this.dragStartX, this.dragStartY, _pointer.x, _pointer.y);
        const threshold = this.scene.getScaledValue(15);
        if (this.isDragSelecting && dragDistance > threshold) {
            // This was a drag selection - finalize the selection
            this.isDragSelecting = false;
            this.dragSelectionBox?.destroy();
            this.dragSelectionBox = null;
            this.dragStartItem = null;
        } else if (clickedItem && dragDistance <= threshold) {
            // This was a single click
            this.isDragSelecting = false;
            this.dragSelectionBox?.destroy();
            this.dragSelectionBox = null;
            this.dragStartItem = null;

            // Apply button click effect
            if (!clickedItem.getData("isClickProcessing")) {
                clickedItem.setData("isClickProcessing", true);
                this.scene.tweens.add({
                    targets: clickedItem,
                    scaleX: this.itemScale * this.scene.getScaledValue(0.9),
                    scaleY: this.itemScale * this.scene.getScaledValue(0.9),
                    duration: 100,
                    ease: "Power2",
                    yoyo: true,
                    onComplete: () => {
                        clickedItem.setScale(this.itemScale);
                        clickedItem.setData("isClickProcessing", false);
                    },
                });
            }

            // Toggle selection of clicked item
            if (this.selectedItems.includes(clickedItem)) {
                this.deselectItem(clickedItem);
            } else {
                this.selectItem(clickedItem);
            }
        } else {
            // Clean up if no valid interaction
            this.isDragSelecting = false;
            this.dragSelectionBox?.destroy();
            this.dragSelectionBox = null;
            this.dragStartItem = null;
        }
    }

    private selectItem(item: Phaser.GameObjects.Image) {
        // In tutorial mode, prevent selecting more than 2 items
        if (this.GAME_MODE === "tutorial" && this.selectedItems.length >= 2) {
            return;
        }
        
        // Add item to selected items
        if (!this.selectedItems.includes(item)) {
            this.selectedItems.push(item);
        }

        // Change the item texture to its selected version
        const currentTexture = item.texture.key;
        const selectedTexture = `${currentTexture}_selected`;
        item.setTexture(selectedTexture);

        // Store the original texture for later restoration
        item.setData("originalTexture", currentTexture);

        // Add count label at top left corner in circle
        this.updateAllItemCountLabels();

        // Set up drag events for the item
        item.setInteractive({ draggable: true });
        this.scene.input.setDraggable(item);
    }

    private deselectItem(item: Phaser.GameObjects.Image) {
        // Don't remove the item if it is dragging or if we're in drag selection mode
        if (item.getData("isDragging") || this.isDragSelecting) return;

        // Remove the item from the selected items array
        const index = this.selectedItems.indexOf(item);
        if (index === -1) return;
        this.selectedItems.splice(index, 1);

        // Restore the original texture
        const originalTexture = item.getData("originalTexture");
        if (originalTexture) {
            item.setTexture(originalTexture);
            item.setData("originalTexture", null);
        }

        // Remove the label container
        this.updateAllItemCountLabels();
    }

    private getTargetPlate(dragX: number, dragY: number) {
        let targetPlate = null;

        for (const plate of this.plates) {
            // dropzone padding
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
                targetPlate = plate;
                break;
            }
        }
        return targetPlate;
    }

    private handleItemDrag(
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
    ) {
        // Only drag if we're not in drag selection mode and the item is selected
        if (
            !this.isDragSelecting &&
            this.selectedItems.includes(gameObject as Phaser.GameObjects.Image)
        ) {
            // Move all selected items together in a stacked row
            const spacing = 150 * this.scene.getScaledValue(this.itemScale); // Space between items
            const totalWidth = (this.selectedItems.length - 1) * spacing;
            const startX = dragX - totalWidth / 2;

            let itemDepth = 3; // depth when selected

            this.selectedItems.forEach((selectedItem, index) => {
                const newX = startX + index * spacing;
                const newY = dragY;

                selectedItem.x = newX;
                selectedItem.y = newY;
                selectedItem.setDepth(itemDepth++);

                // Set Dragging to true to not deselect the item
                selectedItem.setData("isDragging", true);

                // Hide the label container while dragging
                const labelContainer = selectedItem.getData("labelContainer");
                if (labelContainer) {
                    labelContainer.setVisible(false);
                }
            });

            // Create or update group label container
            const containterX = dragX;
            const containterY = dragY - this.scene.getScaledValue(35);
            this.createGroupLabelContainer(containterX, containterY);

            // Check if the items are over a plate and update plate texture
            const targetPlate = this.getTargetPlate(dragX, dragY);

            // Set DragX and DragY to the item
            gameObject.setData("dragX", dragX);
            gameObject.setData("dragY", dragY);

            // if in tutorial mode, check if the target plate is allowed to drop items
            if (this.GAME_MODE === "tutorial") {
                if (targetPlate && targetPlate.getData("isDropAllowed")) {
                    this.updatePlateHover(targetPlate);
                    return;
                }
            } else {
                this.updatePlateHover(targetPlate);
            }
        }
    }

    private handleItemDragEnd(
        _pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject
    ) {
        // Only handle drag end if the dragged item is in selected items
        if (
            this.selectedItems.includes(gameObject as Phaser.GameObjects.Image)
        ) {
            const item = gameObject as Phaser.GameObjects.Image;

            if(!item.getData("isDragging")) {
                return;
            }

            let dragEndX = item.getData("dragX") || item.x;
            let dragEndY = item.getData("dragY") || item.y;
            // clear the dragX and dragY data
            item.setData("dragX", null);
            item.setData("dragY", null);

            // Check if items should be dropped on a plate
            const targetPlate = this.getTargetPlate(dragEndX, dragEndY);
            let isDropAllowed = true;
            if (this.GAME_MODE === "tutorial") {
                isDropAllowed = targetPlate?.getData("isDropAllowed") || false;
            }

            // check if the target plate has reached its max items
            if (targetPlate) {
                const maxItems = targetPlate.getData("maxItems");
                const itemsInPlate =
                    this.itemsInPlates.get(targetPlate.getData("plateIndex")) ||
                    [];
                if (
                    itemsInPlate.length + this.selectedItems.length >
                    maxItems
                ) {
                    isDropAllowed = false;
                }
            }

            if (targetPlate && isDropAllowed) {
                // Drop all selected items on the plate
                this.dropSelectedItemsOnPlate(targetPlate);
            } else {
                // Return all selected items to their original positions
                this.returnSelectedItemsToOriginalPositions();
            }

            // Hide group label container
            if (this.groupLabelContainer) {
                this.groupLabelContainer.destroy();
                this.groupLabelContainer = null;
            }

            // Reset any hovered plate to its original texture
            this.updatePlateHover(null);
        }
    }

    private dropSelectedItemsOnPlate(targetPlate: Phaser.GameObjects.Image) {
        const plateIndex = targetPlate.getData("plateIndex");
        const plateX = targetPlate.x;
        const plateY = targetPlate.y;

        // Get existing items in this plate
        const itemsInThisPlate = this.itemsInPlates.get(plateIndex) || [];

        // Add all selected items to the plate
        this.selectedItems.forEach((item) => {
            itemsInThisPlate.push(item);

            // Restore original texture when placing on plate
            const originalTexture = item.getData("originalTexture");
            if (originalTexture) {
                item.setTexture(originalTexture);
                item.setData("originalTexture", null);
            }
            
            // Remove from original items array and clean up overlay
            const itemIndexInOriginal = this.items.indexOf(item);
            if (itemIndexInOriginal > -1) {
                this.items.splice(itemIndexInOriginal, 1);
                
                // Remove and destroy the overlay so it's no longer tabbable
                const overlay = this.itemOverlays.get(item);
                if (overlay) {
                    overlay.destroy();
                    this.itemOverlays.delete(item);
                }
            }
        });

        // Update the plate's items
        this.itemsInPlates.set(plateIndex, itemsInThisPlate);

        // Play plate sound on successful placement
        this.scene.audioManager.playSoundEffect("plate");

        // Position all items in the plate in a row
        const targetScale = this.scene.getScaledValue(this.itemScale - 0.15);
        const itemWidth = 200 * targetScale;
        const gap = -15 * targetScale;
        const count = itemsInThisPlate.length;
        const totalWidth = (count - 1) * (itemWidth + gap) + itemWidth;
        const startX = plateX - totalWidth / 2 + itemWidth / 2;
        const startY = plateY - this.scene.getScaledValue(10);

        itemsInThisPlate.forEach((item, index) => {
            const x = startX + index * (itemWidth + gap);
            const y = startY;
            this.scene.tweens.add({
                targets: item,
                x: x,
                y: y,
                scale: targetScale,
                duration: 300,
                ease: "Power2",
                onComplete: () => {
                    item.setData("isDragging", false);
                },
            });
        });

        // Clear selection
        this.selectedItems = [];
    }

    private returnSelectedItemsToOriginalPositions() {
        this.selectedItems.forEach((item) => {
            const originalX = this.scene.getScaledValue(
                item.getData("originalX")
            );
            const originalY = this.scene.getScaledValue(
                item.getData("originalY")
            );

            // set depth to default
            item.setDepth(2);

            this.scene.tweens.add({
                targets: item,
                x: originalX,
                y: originalY,
                duration: 300,
                ease: "Power2",
                onComplete: () => {
                    item.setData("isDragging", false);

                    // Show the label container
                    const labelContainer = item.getData("labelContainer");
                    if (labelContainer) {
                        labelContainer.setVisible(true);
                    }
                },
            });
        });
    }

    private updatePlateHover(targetPlate: Phaser.GameObjects.Image | null) {
        // Reset previous hovered plate to original texture
        if (this.hoveredPlate && this.hoveredPlate !== targetPlate) {
            const plateType = this.hoveredPlate.getData("plateType");
            this.hoveredPlate.setTexture(`plate_${plateType}`);
        }

        // Update current hovered plate
        if (targetPlate && targetPlate !== this.hoveredPlate) {
            const plateType = targetPlate.getData("plateType");
            targetPlate.setTexture(`plate_${plateType}_selected`);
        }

        // Update the hoveredPlate reference
        this.hoveredPlate = targetPlate;
    }

    private updateAllItemCountLabels() {
        // First, destroy all existing label containers
        this.items.forEach((item) => {
            const labelContainer = item.getData("labelContainer");
            if (labelContainer) {
                labelContainer.destroy();
                item.setData("labelContainer", null);
            }
        });

        // Then create new label containers only for selected items
        this.selectedItems.forEach((item, index) => {
            const containerX = item.x - this.scene.getScaledValue(25);
            const containerY = item.y - this.scene.getScaledValue(25);
            const container = this.scene.add
                .container(containerX, containerY)
                .setDepth(10);
            const circle = this.scene
                .addCircle(0, 0, 12, 0xffffff, 1)
                .setOrigin(0.5);
            const countText = this.scene
                .addText(0, 2, `${index + 1}`, {
                    font: "700 16px Exo",
                    color: "#000000",
                    stroke: "#000000",
                })
                .setOrigin(0.5);
            container.add([circle, countText]);
            container.setDepth(10);

            item.setData("labelContainer", container);
        });
    }

    private checkAnswer() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const expectedItemsPerPlate = parseInt(this.currentQuestion.itemPerPlate);

        let isCorrect = true;

        const analyticsQuestion = `${this.currentQuestion.question_en} (${this.currentQuestion.equation} = ?)`;

        let studentResponse: string[] = [];

        // Check if all plates have the correct number of items
        for (const plate of this.plates) {
            const plateIndex = plate.getData("plateIndex");
            const itemsInPlate = this.itemsInPlates.get(plateIndex) || [];
            const isCorrectItems = itemsInPlate.length === expectedItemsPerPlate;
            
            studentResponse.push(itemsInPlate.length.toString());

            if (!isCorrectItems) {
                isCorrect = false;
            }
            // update Alien expression
            const alien = this.aliens[plateIndex];
            alien.stopBlinking();
            if(alien && isCorrectItems) {
                alien.makeHappy();
            } else if(alien && !isCorrectItems) {
                alien.makeSad();
            }
        }

        if (isCorrect) {
            // update equation text
            const equation = this.currentQuestion.equation + " = " + this.currentQuestion.answer;
            this.equationText.setText(equation);
            const equationOverlay = this.equationText.getData("overlay");
            if (equationOverlay) {
                equationOverlay.updateContent(equation);
            }

            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: analyticsQuestion,
                isCorrect: true,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: studentResponse.join(","),
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
            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.loadNextQuestion();
                });
                return;
            }
            this.showSuccessAnimation();
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: analyticsQuestion,
                isCorrect: false,
                questionMechanic: this.MECHANIC_TYPE,
                gameLevelInfo: 'game.space_party.default',
                studentResponse: studentResponse.join(","),
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
        const successKey = Math.random() < 0.5 ? "game.superb" : "game.amazing";
        const successText = this.scene.addText(70, 0, i18n.t(successKey), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5);
        successContainer.add(successText);
        const icon = this.scene.addImage(-60, 0, "correct_icon").setOrigin(0.5);
        successContainer.add(icon);

        // Delay announcement to avoid focus interference
        this.scene.time.delayedCall(1200, () => {
            announceToScreenReader(i18n.t("common.correct") + "\u200B".repeat(++this.announcementCount));
        });
        
        // Announce the specific feedback message after a delay
        this.scene.time.delayedCall(1700, () => {
            announceToScreenReader(i18n.t(successKey));
        });

        // Get all UI elements to fade out
        const uiElements: Phaser.GameObjects.GameObject[] = [];
 
        if (this.numberPad) {
            uiElements.push(...this.numberPad.getButtonContainers());
        }

        const inputBg = this.scene.children.getByName("input_bg") as Phaser.GameObjects.Image;
        if (inputBg) uiElements.push(inputBg);
        if (this.answerDisplay) uiElements.push(this.answerDisplay);

        this.scene.children.list
            .filter(child => child.name === "resetButton" || child.name === "checkButton")
            .forEach(child => uiElements.push(child));

        // Fade out all UI elements
        this.scene.tweens.add({
            targets: uiElements,
            alpha: 0.0,
            duration: 300,
            ease: "Power2"
        });
    
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
                new ImageOverlay(this.scene, icon, {
                    label: i18n.t("common.correct"),
                });
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
                            // Fade UI elements back in
                            this.scene.tweens.add({
                                targets: uiElements,
                                alpha: 1,
                                duration: 300,
                                ease: "Power2"
                            });
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
        const errorKey = Math.random() < 0.5 ? "game.keepTrying" : "game.oops";
        const errorText = this.scene.addText(75, 0, i18n.t(errorKey), {
            font: "700 36px Exo",
            color: "#FFFFFF",
        }).setOrigin(0.5);
        errorContainer.add(errorText);
        const icon = this.scene.addImage(-75, 0, "incorrect_icon").setOrigin(0.5);
        errorContainer.add(icon);

        // Delay announcement to avoid focus interference
        this.scene.time.delayedCall(1200, () => {
            announceToScreenReader(i18n.t("common.incorrect") + "\u200B".repeat(++this.announcementCount));
        });
        
        // Announce the specific feedback message after a delay
        this.scene.time.delayedCall(1700, () => {
            announceToScreenReader(i18n.t(errorKey));
        });
    
        // Get all UI elements to fade out
        const uiElements: Phaser.GameObjects.GameObject[] = [];
        
        // Add numpad if it exists
        if (this.numberPad) {
            uiElements.push(...this.numberPad.getButtonContainers());
        }
        
        // Add answer display elements
        const inputBg = this.scene.children.getByName("input_bg") as Phaser.GameObjects.Image;
        if (inputBg) uiElements.push(inputBg);
        if (this.answerDisplay) uiElements.push(this.answerDisplay);
        
        // Add buttons
        this.scene.children.list
            .filter(child => child.name === "resetButton" || child.name === "checkButton")
            .forEach(child => uiElements.push(child));

    
        // Fade out all UI elements
        this.scene.tweens.add({
            targets: uiElements,
            alpha: 0.0,
            duration: 300,
            ease: "Power2"
        });
    
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
                new ImageOverlay(this.scene, icon, {
                    label: i18n.t("common.incorrect"),
                });
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
                            // Fade UI elements back in
                            this.scene.tweens.add({
                                targets: uiElements,
                                alpha: 1,
                                duration: 300,
                                ease: "Power2"
                            });
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

    private resetItems() {
        // Clean up drag selection
        this.isDragSelecting = false;
        this.dragSelectionBox?.destroy();
        this.dragSelectionBox = null;
        this.dragStartItem = null;

        // clear all items from plates
        this.itemsInPlates.forEach((itemsInPlate) => {
            itemsInPlate.forEach((item) => {
                // set item scale to normal
                item.setScale(this.itemScale);
            this.items.push(item);
            // Recreate accessibility overlay if it doesn't exist
            if (!this.itemOverlays.has(item)) {
                const itemIndex = item.getData("itemIndex");
                const itemName = item.texture.key;
                const overlay = new ImageOverlay(this.scene, item, {
                    label: `${itemName} ${itemIndex + 1}`,
                    cursor: 'pointer',
                });
                this.itemOverlays.set(item, overlay);
                
                // Re-setup keyboard interaction
                const domElement = (overlay as any).domElement;
                if (domElement?.node) {
                    const htmlElement = domElement.node as HTMLElement;
                    htmlElement.setAttribute('tabindex', '0');
                    htmlElement.setAttribute('role', 'button');
                    htmlElement.setAttribute('aria-label', i18n.t('accessibility.draggableItem', { itemName: itemName, number: itemIndex + 1 }));
                    
                    // Add focus styles for visibility
                    htmlElement.style.cssText += `
                        outline: none;
                        border-radius: 8px;
                        transition: all 0.2s ease;
                    `;
                    
                    // Add focus and blur event listeners for visual feedback
                    htmlElement.addEventListener('focus', () => {
                        const currentTexture = item.texture.key;
                        if (!currentTexture.endsWith('_selected')) {
                            item.setTexture(`${currentTexture}_selected`);
                        }
                    });
                    
                    htmlElement.addEventListener('blur', () => {
                        // Only restore texture if item is not in selectedItems
                        if (!this.selectedItems.includes(item)) {
                            const currentTexture = item.texture.key;
                            if (currentTexture.endsWith('_selected')) {
                                const originalTexture = currentTexture.replace('_selected', '');
                                item.setTexture(originalTexture);
                            }
                        }
                    });
                    
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
        });
        this.itemsInPlates.clear();
        
        // add all selected items back to the items array
        this.selectedItems.forEach((item) => {
            // if item is not in the items array, add it
            if (!this.items.includes(item)) {
                this.items.push(item);
            }
        });
        
        // clear groupLabelContainer
        if (this.groupLabelContainer) {
            this.groupLabelContainer.destroy();
            this.groupLabelContainer = null;
        }
        
        this.items.forEach((item) => {
            // set item to its original position
            const originalX = this.scene.getScaledValue(
                item.getData("originalX")
            );
            const originalY = this.scene.getScaledValue(
                item.getData("originalY")
            );
            item.setPosition(originalX, originalY);
            
            // Reset depth to default
            item.setDepth(2);
            
            // set item to its original texture (for items that were selected)
            const originalTexture = item.getData("originalTexture");
            if (originalTexture) {
                item.setTexture(originalTexture);
                item.setData("originalTexture", null);
            }
            
            // remove label container
            const labelContainer = item.getData("labelContainer");
            if (labelContainer) {
                labelContainer.destroy();
                item.setData("labelContainer", null);
            }
            
            // Reset dragging state
            item.setData("isDragging", false);
            
            // Reset draggable to false - this is critical!
            // When items are selected, they are made draggable
            // We need to reset this so they can be selected again properly
            this.scene.input.setDraggable(item, false);
        });
        
        // clear all items from selected items AFTER processing them
        this.selectedItems = [];
        
        // Clear keyboard selection state
        this.selectedItemsForKeyboard = [];
    }

    private cleanup() {
        // Clean up drag selection
        this.isDragSelecting = false;
        this.dragSelectionBox?.destroy();
        this.dragSelectionBox = null;
        this.dragStartItem = null;

        const targets = [
            ...this.plates,
            ...this.aliens,
            ...this.items,
            ...Array.from(this.itemsInPlates.values()).flat(),
        ];
        this.scene.tweens.add({
            targets,
            scale: this.scene.getScaledValue(0),
            duration: 300,
            ease: "Power2",
            onComplete: () => {
                this.plates.forEach((item) => item.destroy());
                this.plates = [];
                this.aliens.forEach((alien) => alien.alienContainer.destroy());
                this.aliens = [];
                this.selectedItems.forEach((item) => {
                    const labelContainer = item.getData("labelContainer");
                    if (labelContainer) {
                        labelContainer.destroy();
                    }
                    item.destroy();
                });
                if (this.groupLabelContainer) {
                    this.groupLabelContainer.destroy();
                    this.groupLabelContainer = null;
                }
                this.selectedItems = [];
                this.items.forEach((item) => item.destroy());
                this.items = [];
                this.itemsInPlates.forEach((itemsInPlate) => {
                    itemsInPlate.forEach((item) => item.destroy());
                });
                this.itemsInPlates.clear();
            },
        });

        //  Numpad cleanup
        this.numberPad?.destroy();
        this.numberPad = null;
        this.scene.children.getByName("input_bg")?.destroy();
        this.answerDisplay?.destroy();
        this.answerDisplay = null;
        this.scene.children.list
            .filter(child => child.name === "resetButton" || child.name === "checkButton")
            .forEach(child => child.destroy());

        this.userAnswer = "";
        this.clearItemSelectionEvents();
        this.clearItemDragEvents();
        
        // Clear keyboard selection state
        this.selectedItemsForKeyboard = [];
        
        // Clear overlays
        this.itemOverlays.forEach(overlay => overlay.destroy());
        this.itemOverlays.clear();
        this.plateOverlays.forEach(overlay => overlay.destroy());
        this.plateOverlays.clear();
        
        // Clear focus indicators
        // this.focusIndicators.forEach(indicator => indicator.destroy());
        // this.focusIndicators.clear();
    }

    /**
     * Creates a white outline focus indicator around an item
     */
    // private createFocusIndicator(item: Phaser.GameObjects.Image): void {
    //     // Remove any existing focus indicator for this item
    //     this.removeFocusIndicator(item);
        
    //     const indicator = this.scene.add.graphics();
    //     indicator.lineStyle(4, 0xffffff, 1);
        
    //     // Draw a rectangle around the item
    //     const padding = 10;
    //     const rect = item.getBounds();
    //     indicator.strokeRect(
    //         rect.x - padding, 
    //         rect.y - padding, 
    //         rect.width + padding * 2, 
    //         rect.height + padding * 2
    //     );
        
    //     // Set depth to be above the item
    //     indicator.setDepth(item.depth + 1);
        
    //     // Store the indicator
    //     this.focusIndicators.set(item, indicator);
    // }

    /**
     * Removes the focus indicator for an item
     */
    // private removeFocusIndicator(item: Phaser.GameObjects.Image): void {
    //     const indicator = this.focusIndicators.get(item);
    //     if (indicator) {
    //         indicator.destroy();
    //         this.focusIndicators.delete(item);
    //     }
    // }

    /**
     * Selects an item for keyboard-based dropping (supports multiple selection)
     */
    private selectItemForKeyboard(item: Phaser.GameObjects.Image): void {
        // In tutorial mode, prevent selecting more than 2 items
        if (this.GAME_MODE === "tutorial" && this.selectedItems.length >= 2) {
            this.scene.audioManager.playSoundEffect('incorrect');
            return;
        }

        // Toggle selection - if already selected, deselect it
        if (this.selectedItems.includes(item)) {
            // Use the existing deselect method for consistency
            this.deselectItem(item);
            // Also remove from keyboard selection
            const keyboardIndex = this.selectedItemsForKeyboard.indexOf(item);
            if (keyboardIndex > -1) {
                this.selectedItemsForKeyboard.splice(keyboardIndex, 1);
            }
            return;
        }
        
        // Use the existing selectItem method for consistency
        this.selectItem(item);
        
        // Also add to keyboard selection tracking
        if (!this.selectedItemsForKeyboard.includes(item)) {
            this.selectedItemsForKeyboard.push(item);
        }
        
        // Update aria-label to indicate selection
        const overlay = this.itemOverlays.get(item);
        if (overlay) {
            const domElement = (overlay as any).domElement;
            if (domElement?.node) {
                const htmlElement = domElement.node as HTMLElement;
                const itemIndex = item.getData('itemIndex');
                const itemTexture = item.getData('originalTexture') || item.texture.key;
                htmlElement.setAttribute('aria-label', i18n.t('accessibility.selectedItem', { 
                    itemName: itemTexture, 
                    number: itemIndex + 1, 
                    count: this.selectedItems.length 
                }));
            }
        }
        
        // Play positive sound to indicate selection
        this.scene.audioManager.playSoundEffect('correct');
    }

    /**
     * Updates aria-labels for deselected items
     */




    /**
     * Attempts to drop the selected items on the specified plate
     */
    private dropSelectedItemsWithKeyboard(targetPlate: Phaser.GameObjects.Image): void {
        if (this.selectedItems.length === 0) {
            // No items selected, play negative sound
            this.scene.audioManager.playSoundEffect('incorrect');
            return;
        }
        
        const plateIndex = targetPlate.getData("plateIndex");
        const maxItems = targetPlate.getData("maxItems");
        const currentItemsInPlate = this.itemsInPlates.get(plateIndex) || [];
        
        // Check if plate can accommodate all selected items
        if (currentItemsInPlate.length + this.selectedItems.length > maxItems) {
            // Plate doesn't have enough space, play negative sound and animate items to plate then back
            this.scene.audioManager.playSoundEffect('incorrect');
            this.animateItemsToPlateAndBack(this.selectedItems, targetPlate);
            return;
        }
        
        // Check tutorial constraints  
        let isDropAllowed = true;
        if (this.GAME_MODE === "tutorial") {
            isDropAllowed = targetPlate?.getData("isDropAllowed") || false;
        }
        
        if (!isDropAllowed) {
            this.scene.audioManager.playSoundEffect('incorrect');
            this.animateItemsToPlateAndBack(this.selectedItems, targetPlate);
            return;
        }
        
        // Valid drop - animate items to plate, then drop them
        this.animateItemsToPlate(this.selectedItems, targetPlate, () => {
            // Clear number labels before dropping
            this.selectedItems.forEach(item => {
                const labelContainer = item.getData("labelContainer");
                if (labelContainer) {
                    labelContainer.destroy();
                    item.setData("labelContainer", null);
                }
            });
            
            this.dropSelectedItemsOnPlate(targetPlate);
            this.selectedItemsForKeyboard = []; // Clear keyboard tracking
        });
    }

    /**
     * Animates items to plate position and then back to original positions (for failed drops)
     */
    private animateItemsToPlateAndBack(items: Phaser.GameObjects.Image[], targetPlate: Phaser.GameObjects.Image): void {
        const plateX = targetPlate.x;
        const plateY = targetPlate.y;
        
        items.forEach((item, index) => {
            const offsetX = (index - items.length / 2) * 20; // Spread items slightly
            
            this.scene.tweens.add({
                targets: item,
                x: plateX + offsetX,
                y: plateY,
                duration: 300,
                ease: 'Linear',
                onComplete: () => {
                    // Return to original position
                    const originalX = item.getData("originalX");
                    const originalY = item.getData("originalY");
                    this.scene.tweens.add({
                        targets: item,
                        x: originalX,
                        y: originalY,
                        duration: 300,
                        ease: 'Linear',
                        onComplete: () => {
                            if (index === items.length - 1) {
                                // Clear number labels and selection after all items return
                                [...this.selectedItems].forEach(selectedItem => {
                                    const labelContainer = selectedItem.getData("labelContainer");
                                    if (labelContainer) {
                                        labelContainer.destroy();
                                        selectedItem.setData("labelContainer", null);
                                    }
                                    this.deselectItem(selectedItem);
                                });
                            }
                        }
                    });
                }
            });
        });
    }

    /**
     * Animates items to plate position for successful drops
     */
    private animateItemsToPlate(items: Phaser.GameObjects.Image[], targetPlate: Phaser.GameObjects.Image, onComplete: () => void): void {
        const plateX = targetPlate.x;
        const plateY = targetPlate.y;
        let completedAnimations = 0;
        
        items.forEach((item, index) => {
            const offsetX = (index - items.length / 2) * 20; // Spread items slightly
            
            this.scene.tweens.add({
                targets: item,
                x: plateX + offsetX,
                y: plateY,
                duration: 300,
                ease: 'Linear',
                onComplete: () => {
                    completedAnimations++;
                    if (completedAnimations === items.length) {
                        onComplete();
                    }
                }
            });
        });
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

        if (this.MECHANIC_TYPE === "distribute") {
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
}
