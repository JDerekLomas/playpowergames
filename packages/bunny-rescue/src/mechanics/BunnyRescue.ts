import { BaseScene, ButtonHelper, Question, ScoreCoins, ScoreHelper, TextOverlay, VolumeSlider, i18n, GameConfigManager, ButtonOverlay, AnalyticsHelper, announceToScreenReader } from '@k8-games/sdk';
import { MultiverseQuestionSelector, MathFact, StudentResponse, FactMasteryItem, parseMathFact, topicToTagsMapping, withinFilter } from '@k8-games/sdk/multiverse';
import { ASSETS_PATHS, BUTTONS, MULTIVERSE_TOPICS } from '../config/common';
import { continueGameAfterWrongAnswer } from '../utils/helper';

export class BunnyRescue {
    private scene!: BaseScene;
    private scoreCoins!: ScoreCoins;
    private scoreHelper: ScoreHelper;
    // private lang: string = i18n.getLanguage() || 'en';

    // Question bank / selector
    public currentQuestion!: Question;
    private questionOverlay?: TextOverlay;
    private currentQuestionIndex: number = 0;
    private totalQuestions: number = 10;

    // Multiverse integration
    private questionSelector!: MultiverseQuestionSelector;
    private multiverseQuestion: MathFact | null = null;
    private questionStartTime: number = 0;
    private topic: string = '';

    // UI elements
    private bunnyWithHoles: Phaser.GameObjects.Sprite[] = [];
    public numpadBtns: Phaser.GameObjects.Container[] = [];
    // private items: Phaser.GameObjects.Image[] = [];

    private isInstructionMode: boolean = false;
    private isProcessing: boolean = false;

    // Layers
    private worldContainer!: Phaser.GameObjects.Container;
    private backgroundLayer!: Phaser.GameObjects.Container;
    private mamaBunnyLayer!: Phaser.GameObjects.Container;
    private groundLayer!: Phaser.GameObjects.Container;

    private analyticsHelper!: AnalyticsHelper;

    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2); // Base bonus of 2 for streaks

        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade2_topic1';

        // Initialize multiverse question selector
        if (!isInstructionMode) {
            if (MULTIVERSE_TOPICS.includes(this.topic)) {
                const tagKeys = topicToTagsMapping[this.topic];
                if (tagKeys && !this.questionSelector) {
                    this.questionSelector = new MultiverseQuestionSelector(tagKeys);
                }
            }
        }
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || 'en';

        ScoreCoins.preload(scene, 'blue');
        VolumeSlider.preload(scene, 'blue');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('bg', 'bg.png');
        scene.load.image('trees', 'trees.png');
        scene.load.image('ground', 'ground.png');
        scene.load.image('question_board_small', 'question_board_small.png');
        scene.load.image('question_board_large', 'question_board_large.png');
        scene.load.image('carrot', 'carrot.png');
        scene.load.image('carrot_empty', 'carrot_empty.png');
        scene.load.image('clear_icon', 'clear_icon.png');
        scene.load.image('enter_icon', 'enter_icon.png');
        scene.load.image('cloud', 'cloud.png');
        scene.load.image('volume', 'volume.png');
        scene.load.image('volume_1', 'volume_1.png');
        scene.load.image('volume_2', 'volume_2.png');
        scene.load.image('continue_btn_bg', 'continue_btn_bg.png');

        // Load bunny animations
        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/bunny`);
        scene.load.atlas('bunny', 'bunny.png', 'bunny.json');
        scene.load.atlas('mama_bunny', 'mama_bunny.png', 'mama_bunny.json');

        // Load audio
        scene.load.setPath(ASSETS_PATHS.AUDIOS);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('positive-sfx', 'positive.wav');
        scene.load.audio('negative-sfx', 'negative.wav');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/game_screen`);
        scene.load.audio(`instruction`, `instruction_${lang}.mp3`);
        scene.load.audio(`giggle_sound`, `giggle_sound.mp3`);
        scene.load.audio(`positive_feedback`, `positive_feedback.mp3`);
        scene.load.audio(`negative_feedback`, `negative_feedback.mp3`);

        // Load numberpad buttons
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('numpad_btn', 'numpad_btn.png');
        scene.load.image('numpad_btn_hover', 'numpad_btn_hover.png');
        scene.load.image('numpad_btn_pressed', 'numpad_btn_pressed.png');

        // Load buttons
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        // scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        // scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        // scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);
    }

    init(data?: { reset?: boolean }) {
        if (data?.reset) {
            this.resetGame();
        }
        ScoreCoins.init(this.scene);

        // Create bunny animations from atlas
        this.createBunnyAnimations();
    }

    create() {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
                this.analyticsHelper?.createSession('game.multiverse.bunny_rescue');
            } else {
                console.error('AnalyticsHelper not found');
            }
        }

        this.createLayers();

        this.createUI();

        if (!this.isInstructionMode) {
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'blue');
            this.scoreCoins.create(
                this.scene.getScaledValue(90),
                this.scene.getScaledValue(62)
            );
            // Create control buttons
            this.createControlButtons();

            // Play bg music
            this.scene.audioManager.playBackgroundMusic('bg_music');
        }

        this.loadNextQuestion();
    }

    private createLayers() {
        this.worldContainer = this.scene.add.container(0, 0);
        this.backgroundLayer = this.scene.add.container(0, 0);
        this.mamaBunnyLayer = this.scene.add.container(0, 0);
        this.groundLayer = this.scene.add.container(0, 0);

        this.worldContainer.add([this.backgroundLayer, this.mamaBunnyLayer, this.groundLayer]);
    }

    private createUI() {
        // Create question board
        this.createQuestionBoard();

        // Create background
        const bg = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'bg');
        bg.setName('bg');
        this.backgroundLayer.add(bg);
        this.animateClouds();

        // Create trees
        const trees = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'trees');
        trees.setName('trees');
        this.backgroundLayer.add(trees);

        // Create mama bunny
        const mamaBunny = this.scene.addSprite(213, 286, 'mama_bunny');
        mamaBunny.setName('mama_bunny');
        mamaBunny.setScale(0.6);
        mamaBunny.setFrame("mama_bunny/default/0001");
        this.mamaBunnyLayer.add(mamaBunny);
        // Start mama bunny blink
        this.startMamaBunnyBlink();

        // Create ground
        const ground = this.scene.addImage(this.scene.display.width / 2, 575, 'ground');
        ground.setName('ground');
        this.groundLayer.add(ground);

        // Create numpad buttons
        this.createNumPadBtns(true);

        // Create bunny with holes
        this.createBunnyWithHoles();
    }

    private animateClouds() {
        const clouds = [
            {
                x: 144,
                y: 130,
                scale: 1,
                repeatDelay: 4000,
                startDelay: 0,
                duration: 120_000,
            },
            {
                x: 1040,
                y: 236,
                scale: 0.8,
                repeatDelay: 5000,
                startDelay: 0,
                duration: 120_000,
            },
            {
                x: 1160,
                y: 200,
                scale: 0.7,
                repeatDelay: 8000,
                startDelay: 0,
                duration: 120_000,
            },
        ]

        clouds.forEach((cloud) => {
            const cloudImage = this.scene.addImage(cloud.x, cloud.y, 'cloud');
            cloudImage.setScale(cloud.scale);
            this.backgroundLayer.add(cloudImage);

            this.scene.tweens.add({
                targets: cloudImage,
                delay: cloud.startDelay,
                repeatDelay: cloud.repeatDelay,
                alpha: 1,
                duration: cloud.duration,
                repeat: -1,
                onUpdate: (tween: any) => {
                    const cloudImage = tween.targets[0] as Phaser.GameObjects.Image;
                    cloudImage.setX((cloudImage.x + 0.2) % (this.scene.getScaledValue(this.scene.display.width) + cloudImage.displayWidth));
                },
            });
        });
    }

    private createQuestionBoard() {
        const questionBoardX = this.scene.getScaledValue(this.scene.display.width / 2);
        const questionBoardY = this.scene.getScaledValue(this.isInstructionMode ? 220 : 193);
        const questionBoard = this.scene.add.container(questionBoardX, questionBoardY);
        questionBoard.setName('question_board');

        // Background
        const bg = this.scene.addImage(0, 0, 'question_board_large');
        bg.setName('bg');

        // Text
        const text = this.scene.addText(0, -140, i18n.t('game.questionTitle'), {
            font: '400 20px Exo',
            color: '#000000'
        });
        text.setName('title');
        text.setOrigin(0.5);


        // Add text overlay
        const textOverlay = new TextOverlay(this.scene, text, {
            label: `${i18n.t('game.questionTitle')}`,
            style: {
                top: `${questionBoardY}px`,
                left: `${questionBoardX}px`,
            }
        })
        questionBoard.setData('textOverlay', textOverlay);

        questionBoard.add([bg, text]);

        if (!this.isInstructionMode) {
            // Add volume icon
            const gap = this.scene.getScaledValue(20);
            const volumeIcon = this.createQuestionVolumeIcon(text.x - text.displayWidth / 2 - gap, text.y);
            questionBoard.add(volumeIcon);
        }

        // For accessibility, add a dummy question text
        const dummyQuestionText = this.scene.addText(questionBoardX / this.scene.display.scale, questionBoardY / this.scene.display.scale + 20, '');
        this.questionOverlay = new TextOverlay(this.scene, dummyQuestionText, {
            label: '',
            ariaLive: 'off',
        });
    }

    private updateQuestionBoardPosition(type: "large" | "small") {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const bg = questionBoard.getByName('bg') as Phaser.GameObjects.Image;
        const title = questionBoard.getByName('title') as Phaser.GameObjects.Text;
        const questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;
        const volumeIcon = questionBoard.getByName('question_volume_icon') as Phaser.GameObjects.Container;
        bg.setTexture(type === "large" ? 'question_board_large' : 'question_board_small');

        if (type === "large") {
            title.setY(this.scene.getScaledValue(-140));
            volumeIcon?.setY(this.scene.getScaledValue(-142));
            const cy = bg.displayHeight / 2 - this.scene.getScaledValue(100);
            questionContainer.setY(cy);

        } else {
            title.setY(this.scene.getScaledValue(-85));
            volumeIcon?.setY(this.scene.getScaledValue(-87));
            questionContainer.setY(0);
        }
    }

    public fadeQuestionContainer(type: "in" | "out") {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;

        this.scene.tweens.add({
            targets: questionContainer,
            alpha: {
                from: type === "in" ? 0 : 1,
                to: type === "in" ? 1 : 0,
            },
            duration: 500,
            ease: 'Power2',
        })
    }

    // private createItems(x: number, y: number, isFirstTime: boolean = false) {
    //     const itemsContainer = this.scene.add.container(x, y);
    //     const items: Phaser.GameObjects.Image[] = [];
    //     const operator = this.currentQuestion.operator;
    //     const opr1 = parseInt(this.currentQuestion.operand1)
    //     const opr2 = operator === '+' ? parseInt(this.currentQuestion.operand2) : 0;

    //     // Create items
    //     for (let i = 0; i < opr1 + opr2; i++) {
    //         let textureKey = i < opr1 ? 'carrot' : 'carrot_empty';
    //         const item = this.scene.addImage(0, 0, textureKey);
    //         item.setVisible(isFirstTime ? false : true);
    //         item.setName(`item_${i}`);
    //         items.push(item);
    //     }

    //     if (items.length === 0) {
    //         this.items = items;
    //         return itemsContainer;
    //     }

    //     // Align items in a grid
    //     const itemWidth = items[0].displayWidth;
    //     const itemHeight = items[0].displayHeight;
    //     const gapX = this.scene.getScaledValue(8);
    //     const cols = 10;
    //     const startX = -cols / 2 * (itemWidth + gapX);
    //     Phaser.Actions.GridAlign(items, {
    //         width: 10,
    //         height: 2,
    //         cellWidth: itemWidth + gapX,
    //         cellHeight: itemHeight,
    //         x: startX,
    //         y: 0,
    //         position: Phaser.Display.Align.CENTER,
    //     });

    //     // animate items if they are created for the first time
    //     if (isFirstTime) {
    //         this.animateItems(items);
    //     }

    //     this.items = items;
    //     itemsContainer.add(items);
    //     return itemsContainer;
    // }

    // private async animateItems(items: Phaser.GameObjects.Image[]) {
    //     const fallOffset = this.scene.getScaledValue(80);
    //     const duration = 100;
    //     const gap = 80;

    //     for (const item of items) {
    //         const targetY = item.y;
    //         item.setY(targetY - fallOffset);
    //         item.setVisible(true);

    //         await new Promise<void>((resolve) => {
    //             this.scene.tweens.add({
    //                 targets: item,
    //                 y: targetY,
    //                 duration,
    //                 ease: 'Bounce.easeOut',
    //             });
    //             this.scene.time.delayedCall(gap, () => resolve());
    //         });
    //     }

    //     // Fade in question container
    //     // this.fadeQuestionContainer("in");
    // }

    // private showItemFeedback() {
    //     if (this.items.length === 0) {
    //         return;
    //     }
    //     const operator = this.currentQuestion.operator;
    //     const opr2 = parseInt(this.currentQuestion.operand2);
    //     let targetItems = this.items.slice(-opr2);
    //     let targetTexture = operator === '+' ? 'carrot' : 'carrot_empty';

    //     this.scene.tweens.chain({
    //         targets: targetItems,
    //         tweens: [
    //             {
    //                 scale: this.scene.getScaledValue(0.5),
    //                 duration: 300,
    //                 ease: "Power2",
    //                 onComplete: () => {
    //                     targetItems.forEach(item => {
    //                         item.setTexture(targetTexture);
    //                     });
    //                 }
    //             },
    //             {
    //                 scale: this.scene.getScaledValue(1),
    //                 duration: 300,
    //                 ease: "Power2",
    //             }
    //         ]
    //     });

    // }

    private createQuestion(x: number, y: number,) {
        const questionContainer = this.scene.add.container(x, y).setName('question_container');

        const textConfig = {
            font: "700 50px Exo",
            color: "#000000",
        }

        const len = this.currentQuestion.answer.length;
        const opr1 = this.currentQuestion.operand1;
        const opr2 = this.currentQuestion.operand2;
        const operator = this.currentQuestion.operator === '+' ? '+' : '−';
        const gap = this.scene.getScaledValue(15);

        const equationText = this.scene.addText(0, 20, `${opr1} ${operator} ${opr2} =`, textConfig).setOrigin(0.5).setName('equation_text');
        const answerBox = this.scene.addRectangle(0, 15, len === 1 ? 93 : 125, 68).setStrokeStyle(this.scene.getScaledValue(4), 0x000000).setOrigin(0.5).setName('answer_box');

        const totalWidth = equationText.displayWidth + answerBox.displayWidth + 2 * gap;

        equationText.setX(-totalWidth / 2 + equationText.displayWidth / 2 + gap);
        let answerBoxX = totalWidth / 2 - answerBox.displayWidth / 2;
        answerBox.setX(answerBoxX);

        answerBoxX /= this.scene.display.scale;
        const cursors: Phaser.GameObjects.Rectangle[] = [];
        if (len === 1) {
            const cursor = this.scene.addRectangle(answerBoxX, 40, 44, 3, 0x000000).setOrigin(0.5).setName('cursor_1');
            cursors.push(cursor);
        } else {
            const cursor1 = this.scene.addRectangle(answerBoxX - 22, 40, 40, 3, 0x000000).setOrigin(0.5).setName('cursor_1');
            const cursor2 = this.scene.addRectangle(answerBoxX + 22, 40, 40, 3, 0x000000).setOrigin(0.5).setName('cursor_2');
            cursors.push(cursor1, cursor2);
        }

        questionContainer.add([equationText, answerBox, ...cursors]);

        this.questionOverlay?.updateContent(`${opr1} ${operator} ${opr2} = ?`);
        questionContainer.setData('questionOverlay', this.questionOverlay);

        return questionContainer;
    }

    private updateQuestion() {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const oldQuestionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;
        if (oldQuestionContainer) {
            questionBoard.remove(oldQuestionContainer);
            oldQuestionContainer.destroy();
        }

        // Create new question container
        const questionContainer = this.createQuestion(0, 0);
        questionContainer.setAlpha(0);
        questionBoard.add(questionContainer);

        const prevItemsContainer = questionBoard.getByName('items_container') as Phaser.GameObjects.Container;

        // Remove previous items container
        if (prevItemsContainer) {
            questionBoard.remove(prevItemsContainer);
            prevItemsContainer.destroy();
        }

        // let maxNumRange = Math.max(parseInt(this.currentQuestion.operand1), parseInt(this.currentQuestion.answer));
        // console.log(maxNumRange, this.topic);
        // // Create new items container
        // if (maxNumRange <= 20 && this.topic === 'grade2_topic1') {
        //     const itemsContainer = this.createItems(0, this.scene.getScaledValue(-94), this.isInstructionMode);
        //     itemsContainer.setName('items_container');
        //     questionBoard.add(itemsContainer);
        //     this.updateQuestionBoardPosition("large");
        // } else {
        //     // Update question board background
        //     this.updateQuestionBoardPosition("small");
        // }

        this.updateQuestionBoardPosition("small");

        if (!this.isInstructionMode) {
            // Fade in question container
            this.fadeQuestionContainer("in");
            // Enable numpad buttons
            this.changeNumpadBtnsState("enable");
        }
    }

    private setAnswer(answer: string) {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;
        const cursor1 = questionContainer.getByName('cursor_1') as Phaser.GameObjects.Rectangle;
        const cursor2 = questionContainer.getByName('cursor_2') as Phaser.GameObjects.Rectangle;

        // Clear previous answer
        const dig1 = questionContainer.getByName('ans_digit_1') as Phaser.GameObjects.Text;
        const dig2 = questionContainer.getByName('ans_digit_2') as Phaser.GameObjects.Text;

        if (dig1) {
            dig1.destroy();
        }
        if (dig2) {
            dig2.destroy();
        }

        questionContainer.setData('answer', answer);

        const textConfig = {
            font: "700 50px Exo",
            color: "#000000",
        }

        const len = this.currentQuestion.answer.length;
        const scale = this.scene.display.scale;
        if (len === 1) {
            const digit1 = this.scene.addText(cursor1.x / scale, 20, answer, textConfig).setOrigin(0.5).setName('ans_digit_1');
            questionContainer.add(digit1);
        } else {
            const digit1 = this.scene.addText(cursor1.x / scale, 20, answer.slice(0, 1), textConfig).setOrigin(0.5).setName('ans_digit_1');
            const digit2 = this.scene.addText(cursor2.x / scale, 20, answer.slice(1, 2), textConfig).setOrigin(0.5).setName('ans_digit_2');
            questionContainer.add([digit1, digit2]);
        }
    }

    public showQuestionFeedback(type: "success" | "error") {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;
        const answerBox = questionContainer.getByName('answer_box') as Phaser.GameObjects.Rectangle;
        const cursor1 = questionContainer.getByName('cursor_1') as Phaser.GameObjects.Rectangle;
        const cursor2 = questionContainer.getByName('cursor_2') as Phaser.GameObjects.Rectangle;

        const updateStyles = (color: number, fillColor?: number) => {
            answerBox.setStrokeStyle(this.scene.getScaledValue(4), color);
            answerBox.setFillStyle(fillColor || 0x000000);
            cursor1.setFillStyle(color);
            cursor2?.setFillStyle(color);
        }

        if (type === "success") {
            updateStyles(0x3B8D00, 0xA6FF65);
        } else {
            updateStyles(0xF20400, 0xFFBDBC);
        }

        // this.showItemFeedback();

        return new Promise(async (resolve) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Show correct answer if error
            if (type === "error") {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                updateStyles(0x3B8D00, 0xA6FF65);
                this.setAnswer(this.currentQuestion.answer);
                return resolve(void 0);
            }
            resolve(void 0);
        });

    }

    private createNumPadBtns(isFirstTime: boolean = false) {
        // destroy previous numpad buttons
        this.clearNumpadBtns();

        const numPadBtnCount = 9;
        const numberPad: Phaser.GameObjects.Container[] = [];

        const btnWidth = 81;
        const btnHeight = 85;
        const gap = 20;
        const startX = 333 + btnWidth / 2;
        const startY = 458;
        const colCount = 5;

        for (let i = 0; i <= numPadBtnCount; i++) {
            const row = Math.floor(i / colCount);
            const col = i % colCount;
            const x = startX + col * (gap + btnWidth);
            const y = startY + row * (gap + btnHeight);

            const btn = ButtonHelper.createButton({
                scene: this.scene,
                imageKeys: {
                    default: 'numpad_btn',
                    hover: 'numpad_btn_hover',
                    pressed: 'numpad_btn_pressed'
                },
                text: i.toString(),
                label: `Number ${i}`,
                textStyle: {
                    font: "700 40px Exo",
                    color: "#000000",
                },
                x: x,
                y: y,
                onClick: () => {
                    this.scene.input.keyboard?.emit('keydown', { key: i.toString() });
                },
            });
            btn.setName(`number_pad_btn_${i}`);
            btn.setAlpha(isFirstTime ? 0 : 1);
            btn.setDepth(-1);
            numberPad.push(btn);

            if(i===4){
                // Create Backspace button
                const backspaceButton = ButtonHelper.createIconButton({
                    scene: this.scene,
                    icon: 'clear_icon',
                    label: i18n.t('common.backspace'),
                    imageKeys: {
                        default: 'numpad_btn',
                        hover: 'numpad_btn_hover',
                        pressed: 'numpad_btn_pressed'
                    },
                    x: 840 + btnWidth / 2,
                    y: 458,
                    onClick: () => {
                        this.scene.input.keyboard?.emit('keydown', { key: 'Backspace' });
                    }
                });
                backspaceButton.setName('backspace_button');
                backspaceButton.setAlpha(isFirstTime ? 0 : 1);
                numberPad.push(backspaceButton);
            }
        }
        
        // Create Enter button
        const enterButton = ButtonHelper.createIconButton({
            scene: this.scene,
            icon: 'enter_icon',
            label: i18n.t('common.enter'),
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            x: 840 + btnWidth / 2,
            y: 461   + btnWidth + gap,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: 'Enter' });
            }
        });
        enterButton.setName('enter_button');
        enterButton.setAlpha(isFirstTime ? 0 : 1);
        numberPad.push(enterButton);

        // Create Enter button

        this.numpadBtns = numberPad;
        // Add number pad buttons to ground layer
        this.groundLayer.add(numberPad);
    }

    private clearNumpadBtns() {
        this.numpadBtns.forEach(btn => {
            btn.destroy();
        });
        this.numpadBtns = [];
    }

    public changeNumpadBtnsState(state: "enable" | "disable") {
        this.numpadBtns.forEach(btn => {
            if (state === "enable") {
                btn.setAlpha(1);
                ButtonHelper.enableButton(btn);
            } else {
                btn.setAlpha(0.5);
                ButtonHelper.disableButton(btn);
            }
        });

        // Setup keyboard listener
        if (state === "enable") {
            this.setupKeyboardListener();
        } else {
            this.clearKeyboardListener();
        }
    }

    public setupKeyboardListener() {
        this.clearKeyboardListener();
        this.scene.input.keyboard?.on('keydown', this.handleKeyDown, this);
    }

    private clearKeyboardListener() {
        this.scene.input.keyboard?.off('keydown', this.handleKeyDown, this);
        this.scene.input.keyboard?.removeAllListeners('keydown');
    }

    private handleKeyDown(event: KeyboardEvent) {
        const questionBoard = this.scene.children.getByName('question_board') as Phaser.GameObjects.Container;
        const questionContainer = questionBoard.getByName('question_container') as Phaser.GameObjects.Container;
        const currentAnswer = questionContainer.getData('answer') || '';

        // TODO: Update this for multiple digits
        if (this.isInstructionMode && event.key !== this.currentQuestion.answer && event.key !== 'Enter') {
            return;
        } else {
            this.scene.events.emit('enteranswer');
        }

        if (event.key >= '0' && event.key <= '9') {
            const prevVal = currentAnswer;
            if (prevVal === '') {
                this.setAnswer(event.key);
            } else if (currentAnswer.length < this.currentQuestion.answer.length) {
                this.setAnswer(prevVal + event.key);
            }
            // If answer is correct, check answer if it is from button click
            // const correctAnswer = questionContainer.getData('answer');
            // if (correctAnswer?.length === this.currentQuestion.answer.length) {
            //     this.checkAnswer(correctAnswer);
            // }
        } else if (event.key === 'Backspace') {
            if (currentAnswer.length > 0) {
                this.setAnswer(currentAnswer.slice(0, -1));
            }
        } else if (event.key === 'Enter') {
            if (currentAnswer.length > 0) {
                this.checkAnswer(currentAnswer);
            }
        }
    }

    private createBunnyWithHoles() {
        const bunnyWithHolesCount = 10;
        const bunnyScale = 0.38;
        const bunnyWithHoles: Phaser.GameObjects.Sprite[] = [];

        // Create holes
        for (let i = 0; i < bunnyWithHolesCount; i++) {
            const bunnyWithHole = this.scene.addSprite(0, 0, 'bunny');
            bunnyWithHole.setFrame("bunny/default/0001");
            bunnyWithHole.setName(`bunny_${i}`);
            bunnyWithHole.setScale(bunnyScale);
            bunnyWithHoles.push(bunnyWithHole);
        }

        // Align holes in a grid
        const gap = 25;
        Phaser.Actions.GridAlign(bunnyWithHoles, {
            width: 10,
            height: 1,
            cellWidth: this.scene.getScaledValue(98 + gap),
            cellHeight: this.scene.getScaledValue(82),
            x: this.scene.getScaledValue(25),
            y: this.scene.getScaledValue(625),
            position: Phaser.Display.Align.CENTER,
        });

        if (this.isInstructionMode) {
            this.giggleRandomBunnies(bunnyWithHoles);
        }

        // Make some bunnies excited
        if(this.isInstructionMode) {
            this.scene.time.delayedCall(3000, () => {
                this.makeBunniesExcited(bunnyWithHoles);
            });
        } else {
            this.makeBunniesExcited(bunnyWithHoles);
        }

        this.bunnyWithHoles = bunnyWithHoles;
        // Add holes to ground layer
        this.groundLayer.add(bunnyWithHoles);
    }

    private giggleRandomBunnies(bunnyWithHoles: Phaser.GameObjects.Sprite[]) {
        const randomBunnyCount = Phaser.Math.Between(2, 8);
        const randomBunnies = Phaser.Utils.Array.Shuffle([...bunnyWithHoles]).slice(0, randomBunnyCount);

        this.makeBunniesGiggle(randomBunnies, true);
    }

    private async makeBunniesGiggle(bunnyWithHoles: Phaser.GameObjects.Sprite[], withRandomDelay: boolean = false) {
        const promices = bunnyWithHoles.map(bunny => {
            bunny.play({
                key: 'bunny_giggle',
                delay: withRandomDelay ? Phaser.Math.Between(0, 1000) : 0,
                repeat: 1,
            });
            return new Promise((resolve) => {
                bunny.once('animationcomplete', () => {
                    bunny.setFrame("bunny/default/0001");
                    resolve(void 0);
                });
            });
        });
        await Promise.all(promices);
    }

    private makeBunniesExcited(bunnyWithHoles: Phaser.GameObjects.Sprite[]) {
        bunnyWithHoles.forEach(bunny => {
            if (['bunny_negative', 'bunny_positive'].includes(bunny.anims.currentAnim?.key || '')) return;
            bunny.play({
                key: 'bunny_excited',
                delay: Phaser.Math.Between(3000, 5000),
                repeat: -1,
                repeatDelay: Phaser.Math.Between(6000, 10000),
            });
        });
    }

    private async makeBunniesHappy(bunnyWithHoles: Phaser.GameObjects.Sprite[]) {
        const promices = bunnyWithHoles.map(bunny => {
            bunny.play('bunny_positive');
            return new Promise((resolve) => {
                bunny.once('animationcomplete', () => {
                    // Start blinking
                    bunny.play({
                        key: 'bunny_blink',
                        repeat: -1,
                        delay: 1000,
                        repeatDelay: 3000,
                    });
                    resolve(void 0);
                });
            });
        });
        await Promise.all(promices);
    }

    private async makeBunniesSad(bunnyWithHoles: Phaser.GameObjects.Sprite[]) {
        const promices = bunnyWithHoles.map(bunny => {
            bunny.play('bunny_negative');
            return new Promise((resolve) => {
                bunny.once('animationcomplete', () => {
                    resolve(void 0);
                });
            });
        });
        await Promise.all(promices);
    }

    private startMamaBunnyBlink() {
        const mamaBunny = this.mamaBunnyLayer.getByName('mama_bunny') as Phaser.GameObjects.Sprite;
        mamaBunny.play({
            key: 'mama_bunny_blink',
            repeatDelay: 3000,
            repeat: -1,
        });
    }

    private makeMamaBunnyHappy() {
        const mamaBunny = this.mamaBunnyLayer.getByName('mama_bunny') as Phaser.GameObjects.Sprite;
        mamaBunny.play('mama_bunny_positive');
        return new Promise((resolve) => {
            mamaBunny.once('animationcomplete', () => {
                // Start mama bunny blink
                this.startMamaBunnyBlink();
                resolve(void 0);
            });
        });
    }

    private makeMamaBunnySad() {
        const mamaBunny = this.mamaBunnyLayer.getByName('mama_bunny') as Phaser.GameObjects.Sprite;
        mamaBunny.play('mama_bunny_negative');
        return new Promise((resolve) => {
            mamaBunny.once('animationcomplete', () => {
                // Start mama bunny blink
                this.startMamaBunnyBlink();
                resolve(void 0);
            });
        });
    }

    public playStartAnimation() {
        const mamaBunny = this.mamaBunnyLayer.getByName('mama_bunny') as Phaser.GameObjects.Sprite;
        mamaBunny.play({
            key: 'mama_bunny_left',
            frameRate: 4
        });

        const timer1 = this.scene.time.delayedCall(1500, () => {
            mamaBunny.play('mama_bunny_down');
        });

        const timer2 = this.scene.time.delayedCall(2500, () => {
            mamaBunny.play('mama_bunny_right');
        });

        const timer3 = this.scene.time.delayedCall(4500, () => {
            this.startMamaBunnyBlink();
        });

        mamaBunny.on('destroy', () => {
            timer1.destroy();
            timer2.destroy();
            timer3.destroy();
        });
    }

    private createBunnyAnimations() {
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

        // Bunny animations
        // Idle (single frame loop)
        make({ key: 'bunny_default', frames: seq('bunny', 'bunny/default/', 1, 1), repeat: 0, frameRate: 1 });
        // Blink
        make({ key: 'bunny_blink', frames: seq('bunny', 'bunny/blink/', 1, 3), repeat: 0, frameRate: 6 });
        // Positive reaction
        make({ key: 'bunny_positive', frames: seq('bunny', 'bunny/positive/', 1, 8), repeat: 0, frameRate: 6 });
        // Negative reaction
        make({ key: 'bunny_negative', frames: seq('bunny', 'bunny/negative/', 1, 6), repeat: 0, frameRate: 6 });
        // Excited
        const excitedFrames = [
            ...seq('bunny', 'bunny/excited/', 1, 5),
            ...seq('bunny', 'bunny/excited/', 1, 5),
        ];
        make({ key: 'bunny_excited', frames: excitedFrames, repeat: 0, frameRate: 12 });
        // Giggle
        make({ key: 'bunny_giggle', frames: seq('bunny', 'bunny/giggle/', 1, 4), repeat: 0, frameRate: 6 });

        // Mama bunny animations
        // Default (single frame loop)
        make({ key: 'mama_bunny_default', frames: seq('mama_bunny', 'mama_bunny/default/', 1, 1), repeat: 0, frameRate: 1 });
        // Blink
        make({ key: 'mama_bunny_blink', frames: seq('mama_bunny', 'mama_bunny/blink/', 1, 4), repeat: 0, frameRate: 12 });
        // Negative reaction
        make({ key: 'mama_bunny_negative', frames: seq('mama_bunny', 'mama_bunny/negative/', 1, 5), repeat: 0, frameRate: 10 });
        // Positive reaction (frames 4-8 repeated twice)
        const positiveFrames = [
            ...seq('mama_bunny', 'mama_bunny/positive/', 1, 3),
            ...seq('mama_bunny', 'mama_bunny/positive/', 4, 8),
            ...seq('mama_bunny', 'mama_bunny/positive/', 4, 8),
            ...seq('mama_bunny', 'mama_bunny/positive/', 9, 10),
        ];
        make({ key: 'mama_bunny_positive', frames: positiveFrames, repeat: 0, frameRate: 12 });
        make({ key: 'mama_bunny_left', frames: seq('mama_bunny', 'mama_bunny/start/left/', 1, 4), repeat: 0, frameRate: 6 });
        make({ key: 'mama_bunny_right', frames: seq('mama_bunny', 'mama_bunny/start/right/', 1, 3), repeat: 0, frameRate: 6 });
        make({ key: 'mama_bunny_down', frames: seq('mama_bunny', 'mama_bunny/start/down/', 1, 4), repeat: 0, frameRate: 6 });
    }

    private createTopicFilter(): ((fm: FactMasteryItem) => boolean) | undefined {
        switch (this.topic) {
            case 'grade2_topic1':
                return (fm: FactMasteryItem) => withinFilter(fm, 20, 10);
            case 'grade2_topic3':
            case 'grade2_topic4':
                return (fm: FactMasteryItem) => withinFilter(fm, 100);
            default:
                return undefined;
        }
    }

    private extractQuestionFromMathFact(questionText: string): Question {
        const parsed = parseMathFact(questionText);
        if (!parsed) {
            throw new Error(`Unable to parse question: ${questionText}`);
        }

        return {
            operand1: parsed.operand1.toString(),
            operand2: parsed.operand2.toString(),
            answer: parsed.result.toString(),
            operator: parsed.operation,
        };
    }

    private getTutorialQuestion() {
        if (this.topic === 'grade2_topic4') {
            return {
                operand1: "10",
                operand2: "7",
                answer: "3",
                operator: "-",
            };
        } else {
            return {
                operand1: "5",
                operand2: "3",
                answer: "8",
                operator: "+",
            };
        }
    }

    private async loadNextQuestion(response?: StudentResponse) {
        let nextQuestion: Question | null = null;

        if (this.isInstructionMode) {
            nextQuestion = this.getTutorialQuestion();
        } else if (MULTIVERSE_TOPICS.includes(this.topic)) {
            // Use multiverse question selector
            const filter = this.createTopicFilter();
            if (this.topic === 'grade2_topic1') {
                this.multiverseQuestion = this.questionSelector.getNextQuestionAddSub(response, filter)
            } else {
                this.multiverseQuestion = this.questionSelector.getNextQuestion(response, filter)
            }

            if (!this.multiverseQuestion || this.currentQuestionIndex >= this.totalQuestions) {
                this.gameOver();
                return;
            }
            nextQuestion = this.extractQuestionFromMathFact(this.multiverseQuestion["question text"]);
        } else {
            throw new Error("No question found");
        }

        this.currentQuestionIndex++;
        this.currentQuestion = nextQuestion;
        this.questionStartTime = Date.now();

        if (!this.isInstructionMode) {
            // Fade in question container
            // Delay a little to ensure pause/resume events in ButtonOverlay are handled properly
            this.scene.time.delayedCall(5, () => {
                this.changeNumpadBtnsState("enable");
            });

            // Question announcement for tutorial is in Instructions scene
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(
                    `${nextQuestion.operand1} ${nextQuestion.operator.replace("-", "−")} ${nextQuestion.operand2} = ?`
                );
            });
        }
        this.updateQuestion();
    }

    private async checkAnswer(numValue: string) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const isCorrect = numValue === this.currentQuestion.answer;
        const currentBunnie = this.bunnyWithHoles[this.currentQuestionIndex - 1];

        if (this.isInstructionMode) {
            // Emmit correctanswer event
            this.scene.events.emit('correctanswer');
            this.makeBunniesHappy([this.bunnyWithHoles[0]]);
            this.isProcessing = false;
            return;
        }

        this.changeNumpadBtnsState("disable");

        // Create student response for multiverse tracking
        let studentResponse: StudentResponse | undefined;
        if (MULTIVERSE_TOPICS.includes(this.topic) && this.multiverseQuestion) {
            const responseTime = Date.now() - this.questionStartTime;
            studentResponse = this.questionSelector.createStudentResponse(
                this.multiverseQuestion,
                responseTime,
                isCorrect
            );
        }

        const questionText = this.multiverseQuestion?.["question text"] || '';
        const [questionPart] = questionText.split('=');
        const formattedQuestionText = `${questionPart}=?`;

        if (isCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                questionText: formattedQuestionText,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: 'game.multiverse.bunny_rescue',
                studentResponse: numValue,
                studentResponseAccuracyPercentage: '100%',
            });

            // update score
            this.scoreHelper.answerCorrectly();
            this.scoreCoins.updateScoreDisplay(true);

            // Play positive sound effect
            this.scene.audioManager.playSoundEffect('positive_feedback');

            await Promise.all([
                this.showQuestionFeedback("success"),
                this.makeBunniesHappy([currentBunnie]),
                this.makeMamaBunnyHappy(),
            ]);

            if (this.scoreHelper.showStreakAnimation()) {
                this.showMascotCelebration(() => {
                    this.loadNextQuestion(studentResponse);
                    this.isProcessing = false;
                });
                return;
            }

            // Announce feedback
            announceToScreenReader(i18n.t('common.correctFeedback', { value: `${this.currentQuestion.answer}`}));
            this.scene.time.delayedCall(1500, () => {
                this.isProcessing = false;
                this.loadNextQuestion(studentResponse);
            });
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: formattedQuestionText,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: 'game.multiverse.bunny_rescue',
                studentResponse: numValue,
                studentResponseAccuracyPercentage: '0%',
            });

            this.scoreHelper.answerIncorrectly();
            this.scoreCoins.updateScoreDisplay(false);

            // Play negative sound effect
            this.scene.audioManager.playSoundEffect('negative_feedback');

            await Promise.all([
                this.showQuestionFeedback("error"),
                this.makeMamaBunnySad(),
                this.makeBunniesSad([currentBunnie]),
            ]);

            // Announce feedback
            announceToScreenReader(i18n.t('common.incorrectFeedback', { value: `${this.currentQuestion.answer}`}));          
            continueGameAfterWrongAnswer(this.scene, async() => {
                // Add delay before loading next question
                this.scene.time.delayedCall(1500, () => {
                    this.isProcessing = false;
                    this.loadNextQuestion(studentResponse);
                });
            });   
        }
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.time.delayedCall(1000, () => {
            this.scene.scene.pause();
            this.scene.scene.launch('CelebrationScene', {
                scoreHelper: this.scoreHelper,
                progress: this.currentQuestionIndex / this.totalQuestions,
                callback: () => {
                    cb?.();
                }
            });
            this.scene.scene.bringToTop('CelebrationScene');
        });
    }

    resetGame() {
        // Reset expected number
        this.currentQuestionIndex = 0;
        this.scoreHelper.reset();
        this.questionSelector.reset();
        this.clearNumpadBtns();
        this.questionOverlay?.destroy();
        this.questionOverlay = undefined;
    }

    private gameOver() {
        // Stop bg music
        this.scene.audioManager.stopBackgroundMusic();

        const finalScore = this.scoreHelper.endGame();
        this.scene.time.delayedCall(1000, () => {
            this.scene.audioManager.unduckBackgroundMusic();
            this.scene.scene.start("Scoreboard", {
                totalRounds: this.scoreHelper.getTotalQuestions(),
                rounds: this.scoreHelper.getCorrectAnswers(),
                score: finalScore,
            });
        });
    }

    private createQuestionVolumeIcon(x: number, y: number) {
        const questionVolumeIcon = this.scene.add.container(x, y).setName('question_volume_icon');
        const iconImage = this.scene
            .addImage(0, 0, "volume_2")
            .setOrigin(0.5)
            .setScale(0.5);
        questionVolumeIcon.add(iconImage);

        const playVolumeAnimation = () => {
            const volumeLevels = ["volume_2", "volume_1", "volume", "volume_1", "volume_2"];
            let currentIndex = 0;

            // Set initial texture
            iconImage.setTexture(volumeLevels[currentIndex]);

            // clear previous tween
            this.scene.tweens.killTweensOf(iconImage);

            this.scene.tweens.add({
                targets: iconImage,
                alpha: 1,
                duration: 200,
                repeat: volumeLevels.length - 1,
                onRepeat: () => {
                    currentIndex = (currentIndex + 1) % volumeLevels.length;
                    iconImage.setTexture(volumeLevels[currentIndex]);
                }
            });
        }

        const handleAudioPlayback = () => {
            // Lower bg music volume
            this.scene.audioManager.duckBackgroundMusic();
            // Stop all sound effects
            this.scene.audioManager.stopAllSoundEffects();
            // Play the audio
            const audio = this.scene.audioManager.playSoundEffect('instruction');
            // Start volume animation
            playVolumeAnimation();

            audio?.once("complete", () => {
                // Restore bg music volume
                this.scene.audioManager.unduckBackgroundMusic();
            });
        }

        // Make it interactive
        questionVolumeIcon.setSize(40, 40);
        questionVolumeIcon.setInteractive({ useHandCursor: true });
        questionVolumeIcon.on("pointerdown", handleAudioPlayback, this);

        // Add accessibility overlay
        new ButtonOverlay(this.scene, questionVolumeIcon, {
            label: i18n.t("common.playQuestionAudio"),
            onKeyDown: handleAudioPlayback,
            style: {
                height: `${iconImage.displayHeight}px`,
                width: `${iconImage.displayWidth}px`,
                top: `${this.scene.getScaledValue(250)}px`,
                left: `${this.scene.getScaledValue(this.scene.display.width / 2)}px`,
            },
        });

        return questionVolumeIcon;
    }

    private createControlButtons() {
        // Pause button
        const pauseBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.scene.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.audioManager.pauseAll();
                this.scene.scene.launch('PauseScene', {
                    parentScene: 'GameScene',
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
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.scene.display.width - 54,
            y: 142,
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
        this.scene.events.on('update', handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        muteBtn.on('destroy', () => {
            this.scene.events.off('update', handleMuteBtnUpdate);
        });

        // Volume slider
        const volumeSlider = new VolumeSlider(this.scene);
        volumeSlider.create(
            this.scene.display.width - 190,
            240,
            'blue',
            i18n.t('common.volume')
        );
        const volumeBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.scene.display.width - 54,
            y: 218,
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
            label: i18n.t('common.help'),
            x: this.scene.display.width - 54,
            y: 294,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.audioManager.pauseAll();
                this.scene.audioManager.unduckBackgroundMusic();
                this.scene.scene.launch("InstructionsScene", {
                    parentScene: 'GameScene',
                });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        });
        helpBtn.setDepth(2);
    }

    private queueAnnouncement(msg: string) {
        this.announcementQueue.push(msg);
        this.processAnnouncementQueue();
    }
    
    private processAnnouncementQueue() {
        if (this.isAnnouncing || this.announcementQueue.length === 0) return;
    
        this.isAnnouncing = true;
        const msg = this.announcementQueue.shift()!;
        announceToScreenReader(msg);
    
        const duration = msg.split(' ').length * 400 + 500;
    
        this.scene.time.delayedCall(duration, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }    
}
