import { BaseScene, ButtonHelper, i18n, setSceneBackground, VolumeSlider, ImageOverlay, TextOverlay, MathExpressionHelper, GameConfigManager, ButtonOverlay, announceToScreenReader, focusToGameContainer } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, ITEM_MAPPING } from "../config/common";
import { CardHelper } from "../utils/CardHelper";

export class InfoScene extends BaseScene {
    private parentScene?: string;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private instructionLoopTimer?: Phaser.Time.TimerEvent;
    private hand!: Phaser.GameObjects.Image;
    private handTween!: Phaser.Tweens.Tween;
    private infoCard!: Phaser.GameObjects.Image;
    private infoCardGlow!: Phaser.GameObjects.Image;
    private step1Rect!: Phaser.GameObjects.Graphics;
    private step2Rect!: Phaser.GameObjects.Graphics;
    private equalBtn2!: Phaser.GameObjects.Container;
    private card1!: Phaser.GameObjects.Image;
    private card2!: Phaser.GameObjects.Image;
    private playButton!: Phaser.GameObjects.Container;
    private readonly RECT_COLOR = 0xFBC374;
    private readonly GREY_COLOR = 0xCCCCCC;
    private isClosing: boolean = false;
    private delayedCalls: Phaser.Time.TimerEvent[] = [];

    private topic: string;
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super('InfoScene');
        this.gameConfigManager = GameConfigManager.getInstance();
        this.topic = this.gameConfigManager.get('topic') || "compare_scientific";
    }

    init(data: { parentScene: string }) {
        this.parentScene = data.parentScene;
    }

    static _preload(scene: BaseScene) {
        const language = i18n.getLanguage() || "en";
        const topic = GameConfigManager.getInstance().get('topic');
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.EQUAL_BUTTON.KEY, COMMON_ASSETS.EQUAL_BUTTON.PATH);
        scene.load.image(COMMON_ASSETS.BACKGROUND.KEY, COMMON_ASSETS.BACKGROUND.PATH);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('info_card_bg_default', 'info_card_bg_default.png');
        scene.load.image('info_card_bg_correct', 'info_card_bg_correct.png');
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');
        scene.load.image('info_card_correct_icon', 'info_card_correct_icon.png');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        const pre = topic === "grade7_topic3" ? '_amount_' : '_';
        scene.load.audio('step_1', `step_1${pre}${language}.mp3`);
        scene.load.audio('step_2_1', `step_2_1${pre}${language}.mp3`);
        scene.load.audio('step_2_2', `step_2_2${pre}${language}.mp3`);
        scene.load.audio('step_3', `step_3_${language}.mp3`);
    }

    private greyOutRectangle(rect: Phaser.GameObjects.Graphics) {
        const x = rect === this.step1Rect ? 42 : 669;
        rect.setDepth(1);
        rect.clear();
        rect.fillStyle(this.GREY_COLOR);
        rect.fillRoundedRect(
            this.getScaledValue(x),
            this.getScaledValue(100),
            this.getScaledValue(569),
            this.getScaledValue(529),
            this.getScaledValue(20)
        );
    }

    private highlightRectangle(rect: Phaser.GameObjects.Graphics) {
        const x = rect === this.step1Rect ? 42 : 669;
        rect.setDepth(-1);
        rect.clear();
        rect.fillStyle(this.RECT_COLOR);
        rect.fillRoundedRect(
            this.getScaledValue(x),
            this.getScaledValue(100),
            this.getScaledValue(569),
            this.getScaledValue(529),
            this.getScaledValue(20)
        );
    }

    private highlightCard(card: Phaser.GameObjects.Image) {
        const border = this.add.graphics();
        const bounds = card.getBounds();
        border.lineStyle(4, 0x2A4F4F);
        border.strokeRoundedRect(bounds.x + this.getScaledValue(2), bounds.y + this.getScaledValue(2), bounds.width - this.getScaledValue(4), bounds.height - this.getScaledValue(8), this.getScaledValue(20));

        this.tweens.add({
            targets: border,
            alpha: { from: 1, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                border.destroy();
            }
        });
    }

    createRoundedRectangle(x: number, y: number, width: number, height: number, radius: number) {
        const graphics = this.add.graphics();

        graphics.fillStyle(this.RECT_COLOR);
        graphics.fillRoundedRect(this.getScaledValue(x), this.getScaledValue(y), this.getScaledValue(width), this.getScaledValue(height), this.getScaledValue(radius));
        graphics.setAlpha(0.5);

        return graphics;
    }

    async createAmount() {
        // Create shopping scenario question: "30,25,10% OFF,<, Skateboard"
        const question = {
            operand1: "25",
            operand2: "30",
            discount: "10% OFF",
            answer: "<",
            item: "Skateboard"
        };

        // Yellow value box (showing discounted value: 27 coins)
        const discountedValue = this.calculateDiscountedValue(question.operand2, question.discount);
        const [percentage, type] = question.discount.split(' ');

        // Step 1
        const step1TextContent = this.topic === "grade7_topic3" ? i18n.t('info.step1Amount') : i18n.t('info.step1');
        const step1Text = this.addText(121, 138, step1TextContent, {
            font: "500 26px Exo",
            color: '#000000',
        });
        new TextOverlay(this, step1Text, { label: step1TextContent });
        // card 1
        this.card1 = this.addImage(62, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.card1, { label: i18n.t('info.step1Card') });

        // coin image
        const coinsImage1 = this.addImage(184, 320, 'card_coins').setOrigin(0.5).setScale(0.7);
        new ImageOverlay(this, coinsImage1, { label: i18n.t('game.coins', { coins: question.operand1 }) });

        // coin text
        const coinsText1 = this.addText(184, 400, i18n.t('game.coins', { coins: question.operand1 }), {
            font: "700 32px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, coinsText1, { label: i18n.t('game.coins', { coins: question.operand1 }) });

        // card 2
        this.card2 = this.addImage(349, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.card2, { label: i18n.t('info.step1Card') });

        // yellowBox
        this.addImage(470, 245, 'yellow_box').setOrigin(0.5).setScale(0.7);
        const valueText = this.addText(470, 250, i18n.t('game.valueCoins', { value: discountedValue }), {
            font: '700 18px Exo',
            color: '#000000',
            align: 'center'
        }).setOrigin(0.5);
        // new ImageOverlay(this, yellowBox, { label: i18n.t('game.valueCoins', { value: discountedValue }) });
        new TextOverlay(this, valueText, { label: i18n.t('game.valueCoins', { value: discountedValue }) });

        // Item image
        const itemImage = this.addImage(470, 320, ITEM_MAPPING[question.item]).setOrigin(0.5).setScale(0.7);
        new ImageOverlay(this, itemImage, { label: i18n.t(`game.items.${ITEM_MAPPING[question.item]}`) });

        const coinsText2 = this.addText(470, 400, i18n.t('game.coins', { coins: question.operand2 }), {
            font: "700 32px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, coinsText2, { label: i18n.t('game.coins', { coins: question.operand2 }) });

        // Discount text background and text (step 1, centered)
        const discountBg = this.addImage(470, 450, type === 'UP' ? 'discount_text_bg_green' : 'discount_text_bg_red').setOrigin(0.5).setScale(0.7);
        const arrowKey1 = type === 'UP' ? 'arrow_up' : 'arrow_down';
        const arrowIconStep1 = this.addImage(0, 454, arrowKey1).setOrigin(0.5).setScale(0.6);
        const percentageTextStep1 = this.addText(0, 454, percentage, {
            font: '700 26px Exo',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        const typeTextStep1 = this.addText(0, 459, CardHelper.discountTypeConversion(type), {
            font: '700 16px Exo',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Get widths
        const arrowWidth1 = arrowIconStep1.displayWidth;
        const percentWidth1 = percentageTextStep1.displayWidth;
        const typeWidth1 = typeTextStep1.displayWidth;
        const totalWidth1 = arrowWidth1 + percentWidth1 + typeWidth1;

        // Center X
        const centerX1 = discountBg.x;
        let startX1 = centerX1 - totalWidth1 / 2;

        // Position arrow
        arrowIconStep1.x = startX1 + arrowWidth1 / 2;
        percentageTextStep1.x = arrowIconStep1.x + arrowWidth1 / 2 + percentWidth1 / 2 + this.getScaledValue(3);
        typeTextStep1.x = percentageTextStep1.x + percentWidth1 / 2 + typeWidth1 / 2 + this.getScaledValue(3);

        // Align vertically
        arrowIconStep1.y = discountBg.y + this.getScaledValue(6);
        percentageTextStep1.y = discountBg.y + this.getScaledValue(5);
        typeTextStep1.y = discountBg.y + this.getScaledValue(9);

        new ImageOverlay(this, discountBg, { label: question.discount });
        // new ImageOverlay(this, arrowIconStep1, { label: type });
        // new TextOverlay(this, percentageTextStep1, { label: percentage });
        // new TextOverlay(this, typeTextStep1, { label: CardHelper.discountTypeConversion(type) });

        // equal button
        const equalBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 327,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, equalBtn.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });

        // Step 2
        const step2Text = this.addText(726, 125, i18n.t('info.step2Amount'), {
            font: "500 26px Exo",
            color: '#000000',
            align: 'center',
            wordWrap: { width: 470 }
        });
        new TextOverlay(this, step2Text, { label: i18n.t('info.step2Amount') });

        // Card 1
        this.infoCardGlow = this.addImage(670, 185, 'card_glow_success').setOrigin(0).setScale(0.7).setAlpha(0);
        this.infoCard = this.addImage(689, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.infoCard, { label: i18n.t('info.step2Card') });

        const coinsImage1Step2 = this.addImage(811, 320, 'card_coins').setOrigin(0.5).setScale(0.7);
        new ImageOverlay(this, coinsImage1Step2, { label: i18n.t('game.coins', { coins: question.operand1 }) });

        const coinsText1Step2 = this.addText(811, 400, i18n.t('game.coins', { coins: question.operand1 }), {
            font: "700 32px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, coinsText1Step2, { label: i18n.t('game.coins', { coins: question.operand1 }) });

        // Card 2
        const step2CardStd = this.addImage(976, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, step2CardStd, { label: i18n.t('info.step2Card') });

        // Yellow value box for step 2
        // yellowBoxStep2
        this.addImage(1097, 245, 'yellow_box').setOrigin(0.5).setScale(0.7);
        const valueTextStep2 = this.addText(1097, 250, i18n.t('game.valueCoins', { value: discountedValue }), {
            font: '700 18px Exo',
            color: '#000000',
            align: 'center'
        }).setOrigin(0.5);
        // new ImageOverlay(this, yellowBoxStep2, { label: i18n.t('game.valueCoins', { value: discountedValue }) });
        new TextOverlay(this, valueTextStep2, { label: i18n.t('game.valueCoins', { value: discountedValue }) });

        // Item image for step 2
        const itemImageStep2 = this.addImage(1097, 320, ITEM_MAPPING[question.item]).setOrigin(0.5).setScale(0.7);
        new ImageOverlay(this, itemImageStep2, { label: i18n.t(`game.items.${ITEM_MAPPING[question.item]}`) });

        const coinsText2Step2 = this.addText(1097, 400, i18n.t('game.coins', { coins: question.operand2 }), {
            font: "700 32px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, coinsText2Step2, { label: i18n.t('game.coins', { coins: question.operand2 }) });

        // Discount text background and text for step 2
        const discountBgStep2 = this.addImage(1097, 450, type === 'UP' ? 'discount_text_bg_green' : 'discount_text_bg_red').setOrigin(0.5).setScale(0.7);

        // Calculate widths for centering
        const arrowKey = type === 'UP' ? 'arrow_up' : 'arrow_down';
        const arrowIconStep2 = this.addImage(0, 454, arrowKey).setOrigin(0.5).setScale(0.6);
        const percentageTextStep2 = this.addText(0, 454, percentage, {
            font: '700 26px Exo',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        const typeTextStep2 = this.addText(0, 459, CardHelper.discountTypeConversion(type), {
            font: '700 16px Exo',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        // Get widths
        const arrowWidth = arrowIconStep2.displayWidth;
        const percentWidth = percentageTextStep2.displayWidth;
        const typeWidth = typeTextStep2.displayWidth;
        const totalWidth = arrowWidth + percentWidth + typeWidth; // 12px padding between

        // Center X
        const centerX = discountBgStep2.x;
        let startX = centerX - totalWidth / 2;

        // Position arrow
        arrowIconStep2.x = startX + arrowWidth / 2;
        percentageTextStep2.x = arrowIconStep2.x + arrowWidth / 2 + percentWidth / 2 + this.getScaledValue(3);
        typeTextStep2.x = percentageTextStep2.x + percentWidth / 2 + typeWidth / 2 + this.getScaledValue(3);

        // Align vertically
        arrowIconStep2.y = discountBgStep2.y + this.getScaledValue(6);
        percentageTextStep2.y = discountBgStep2.y + this.getScaledValue(5);
        typeTextStep2.y = discountBgStep2.y + this.getScaledValue(9);

        new ImageOverlay(this, discountBgStep2, { label: question.discount });
        // new ImageOverlay(this, arrowIconStep2, { label: type });
        // new TextOverlay(this, percentageTextStep2, { label: percentage });
        // new TextOverlay(this, typeTextStep2, { label: CardHelper.discountTypeConversion(type) });

        this.equalBtn2 = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 954,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, this.equalBtn2.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });
    }

    private calculateDiscountedValue(coinsStr: string, discountStr: string): number {
        const coins = parseFloat(coinsStr);
        if (isNaN(coins)) return 0;

        const [percentStr, type] = discountStr.split(' ');
        const percent = parseFloat(percentStr.replace('%', ''));
        if (isNaN(percent) || !type) return coins;

        if (type.toUpperCase() === 'UP') {
            return coins + (coins * percent / 100);
        } else if (type.toUpperCase() === 'OFF') {
            return coins - (coins * percent / 100);
        }
        return coins;
    }

    async createQuestions() {
        const question = {
            operand1: "2x10^2",
            operand2: "20",
            answer: ">"
        }

        // Step 1
        const step1TextContent = this.topic === "grade7_topic3" ? i18n.t('info.step1Amount') : i18n.t('info.step1');
        const step1Text = this.addText(121, 138, step1TextContent, {
            font: "500 26px Exo",
            color: '#000000',
        });
        new TextOverlay(this, step1Text, { label: step1TextContent });

        this.card1 = this.addImage(62, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.card1, { label: i18n.t('info.step1CardSci') });

        const scientificNotationText = this.addText(184, 253, i18n.t('common.scientificNotation'), {
            font: "500 22px Exo",
            color: '#000000',
        },).setOrigin(0.5);
        new TextOverlay(this, scientificNotationText, { label: i18n.t('common.scientificNotation') });

        await new Promise((resolve) => {
            MathExpressionHelper.createMathExpression(this, question.operand1, 'mathjax-expression-1', {
                width: 150,
                height: 30,
                fontSize: 14,
            }, (image) => {
                image.x = this.getScaledValue(184);
                image.y = this.getScaledValue(353);
                new ImageOverlay(this, image, { label: question.operand1 });
                return resolve(void 0);
            });
        })

        this.card2 = this.addImage(349, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.card2, { label: i18n.t('info.step1CardStd') });

        const standardFormText = this.addText(470, 253, i18n.t('common.standardForm'), {
            font: "500 22px Exo",
            color: '#000000',
        },).setOrigin(0.5);
        new TextOverlay(this, standardFormText, { label: i18n.t('common.standardForm') });

        await new Promise((resolve) => {
            MathExpressionHelper.createMathExpression(this, question.operand2, 'mathjax-expression-3', {
                width: 150,
                height: 30,
                fontSize: 14,
            }, (image) => {
                image.x = this.getScaledValue(470);
                image.y = this.getScaledValue(353);
                new ImageOverlay(this, image, { label: question.operand2 });
                return resolve(void 0);
            });
        })

        const equalBtn = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 327,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, equalBtn.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });

        // Step 2
        const step2Text = this.addText(726, 125, i18n.t('info.step2'), {
            font: "500 26px Exo",
            color: '#000000',
            align: 'center',
            wordWrap: { width: 470 }
        });
        new TextOverlay(this, step2Text, { label: i18n.t('info.step2') });

        this.infoCardGlow = this.addImage(670, 185, 'card_glow_success').setOrigin(0).setScale(0.7).setAlpha(0);
        this.infoCard = this.addImage(689, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, this.infoCard, { label: i18n.t('info.step2CardSci') });

        const scientificNotationText2 = this.addText(811, 253, i18n.t('common.scientificNotation'), {
            font: "500 22px Exo",
            color: '#000000',
        },).setOrigin(0.5);
        new TextOverlay(this, scientificNotationText2, { label: i18n.t('common.scientificNotation') });

        await new Promise((reslove) => {
            MathExpressionHelper.createMathExpression(this, question.operand1, 'mathjax-expression-2', {
                width: 150,
                height: 30,
                fontSize: 14,
            }, (image) => {
                image.x = this.getScaledValue(811);
                image.y = this.getScaledValue(353);
                new ImageOverlay(this, image, { label: question.operand1 });
                return reslove(void 0);
            });
        })

        const step2CardStd = this.addImage(976, 209, 'card_front').setOrigin(0).setScale(0.7);
        new ImageOverlay(this, step2CardStd, { label: i18n.t('info.step2CardStd') });

        const standardFormText2 = this.addText(1097, 253, i18n.t('common.standardForm'), {
            font: "500 22px Exo",
            color: '#000000',
        },).setOrigin(0.5);
        new TextOverlay(this, standardFormText2, { label: i18n.t('common.standardForm') });

        await new Promise((resolve) => {
            MathExpressionHelper.createMathExpression(this, question.operand2, 'mathjax-expression-4', {
                width: 150,
                height: 30,
                fontSize: 14,
            }, (image) => {
                image.x = this.getScaledValue(1097);
                image.y = this.getScaledValue(353);
                new ImageOverlay(this, image, { label: question.operand2 });
                return resolve(void 0);
            });
        })

        this.equalBtn2 = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('game.equal'),
            textStyle: {
                font: "700 24px Exo",
                color: '#ffffff',
            },
            x: 954,
            y: 558,
            imageScale: 0.7,
            isDisabled: true,
            onClick: () => {
            }
        });

        new ImageOverlay(this, this.equalBtn2.getAt(0) as Phaser.GameObjects.Image, { label: i18n.t('game.equal') });
    }

    private highlightEqualBtn() {
        const btn = this.equalBtn2.getAt(0) as Phaser.GameObjects.Image;

        const border = this.add.graphics();
        const bounds = btn.getBounds();
        border.lineStyle(4, 0x5025a3);
        border.strokeRoundedRect(bounds.x - this.getScaledValue(2), bounds.y - this.getScaledValue(2), bounds.width + this.getScaledValue(4), bounds.height + this.getScaledValue(4), this.getScaledValue(10));

        this.tweens.add({
            targets: border,
            alpha: { from: 1, to: 0.2 },
            duration: 500,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                border.destroy();
            }
        });
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 160, 'blue', i18n.t('common.volume')).setDepth(1);
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
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        }).setDepth(5);
    }

    private createMuteButton() {
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            label: this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        }).setDepth(5);

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteBtn.getData('state');
            if(muteBtnState != label) {
                this.muteBtn.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteBtn.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private async createStepCards() {
        this.step1Rect = this.createRoundedRectangle(42, 100, 569, 529, 20);
        this.greyOutRectangle(this.step1Rect);
        this.step2Rect = this.createRoundedRectangle(669, 100, 569, 529, 20);
        this.greyOutRectangle(this.step2Rect);

        if(this.topic === "grade7_topic3") {
            await this.createAmount();
        } else {
            await this.createQuestions();
        }
    }

    async create() {
        setSceneBackground('assets/images/common/bg.png');

        if (this.parentScene !== 'SplashScene') {
            focusToGameContainer();
            this.time.delayedCall(1000, () => {
                announceToScreenReader(i18n.t('info.helpPage'));
            })
        }

        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY).setOrigin(0.5).setDepth(-2);
        const howToPlayText = this.addText(this.display.width / 2, 55, i18n.t('info.howToPlay'), {
            font: "700 36px Exo",
            color: '#000000',
        }).setOrigin(0.5);
        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'heading' });

        this.createMuteButton();
        this.createVolumeSlider();

        await this.createStepCards();

        this.playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t(`common.${this.parentScene === 'SplashScene' ? 'play' : 'back'}`),
            label: i18n.t(`common.${this.parentScene === 'SplashScene' ? 'play' : 'back'}`),
            textStyle: {
                font: "700 32px Exo",
                color: '#ffffff',
            },
            x: this.display.width / 2,
            y: 698,
            imageScale: 0.8,
            raisedOffset: 3.5,
            onClick: () => {
                if (this.isClosing) return;

                this.audioManager.stopAllSoundEffects();
                this.destroyTweens();
                this.destroyTimers();

                if (this.parentScene === 'SplashScene') {
                    this.isClosing = true;
                    this.closeDoors(() => {
                        this.isClosing = false;
                        this.scene.start('GameScene');
                        this.scene.stop('InfoScene');
                    });
                } else {
                    this.scene.resume('GameScene');
                    this.audioManager.setMusicMute(false);
                    this.scene.stop('InfoScene');
                }
            }
        });

        if (this.parentScene === 'SplashScene') {
            this.audioManager.initialize(this);
        } else {
            this.audioManager.setMusicMute(true);
        }

        const timer = this.time.delayedCall(1000, () => {
            this.playStep1();
        });
        this.delayedCalls.push(timer);
    }

    private destroyTimers() {
        // Destroy all delayed calls
        this.delayedCalls.forEach(timer => {
            if (timer) {
                timer.destroy();
            }
        });
        this.delayedCalls = [];
    }

    private playStep1() {
        const step1 = this.audioManager.playSoundEffect('step_1');
        this.highlightRectangle(this.step1Rect);
        this.greyOutRectangle(this.step2Rect);
        this.highlightCard(this.card1);
        this.highlightCard(this.card2);

        step1?.on('complete', () => {
            const timer = this.time.delayedCall(1000, () => {
                this.playStep2();
            });
            this.delayedCalls.push(timer);
        })
    }

    private playStep2() {
        // Add hand animation
        const handX = ((this.infoCard.x / this.display.scale) + this.infoCard.width / 2);
        const handY = (this.infoCard.y / this.display.scale) + (this.infoCard.displayHeight / this.display.scale) - 60;
        this.hand = this.addImage(handX, handY, 'hand').setOrigin(0).setScale(0.13).setDepth(5);
        this.hand.x = this.hand.x + this.getScaledValue(200);
        this.highlightRectangle(this.step2Rect);
        this.greyOutRectangle(this.step1Rect);

        this.handTween = this.tweens.add({
            targets: this.hand,
            x: this.infoCard.x + this.infoCard.width / 2,
            y: this.hand.y,
            duration: 1000,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.tweens.add({
                    targets: this.infoCardGlow,
                    alpha: 1,
                    duration: 500,
                    ease: 'Back.easeIn',
                });

                // Chain a scale animation after the movement completes
                this.handTween = this.tweens.add({
                    targets: { progress: 0 },
                    progress: 1,
                    duration: 800,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    onUpdate: () => {
                        const target = this.handTween.targets[0] as { progress: number };
                        if (target.progress < 0.5) {
                            this.hand.setTexture('hand_click');
                        } else {
                            this.hand.setTexture('hand');
                        }
                    }
                });

                const step2_1 = this.audioManager.playSoundEffect('step_2_1');
                step2_1?.on('complete', () => {
                    this.highlightEqualBtn();
                    const step2_2 = this.audioManager.playSoundEffect('step_2_2');
                    step2_2?.on('complete', () => {
                        this.hand.setTexture('hand');
                        this.hand.setVisible(false);
                        this.handTween.stop();
                        this.handTween.destroy();
                        this.tweens.add({
                            targets: this.infoCardGlow,
                            alpha: 0,
                            duration: 500,
                            ease: 'Back.easeOut',
                        });
                        this.greyOutRectangle(this.step1Rect);
                        this.greyOutRectangle(this.step2Rect);

                        if (this.parentScene === 'SplashScene') {
                            const timer = this.time.delayedCall(1000, () => {
                                this.playStep3();
                            });
                            this.delayedCalls.push(timer);
                        } else {
                            this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                                this.playStep1();
                            });
                        }
                    });
                });
            },
        });
    }

    private playStep3() {
        const step3 = this.audioManager.playSoundEffect('step_3');

        let playButtonTween: Phaser.Tweens.Tween;

        if (this.parentScene === 'SplashScene') {
            playButtonTween = ButtonHelper.startBreathingAnimation(this.playButton, {
                scale: 1.1,
                duration: 1000,
                ease: 'Sine.easeInOut'
            });
        }

        step3?.on('complete', () => {
            this.instructionLoopTimer = this.time.delayedCall(5000, () => {
                if (this.parentScene === 'SplashScene') {
                    ButtonHelper.stopBreathingAnimation(playButtonTween, this.playButton);
                }
                this.playStep1();
            });
        });
    }

    private destroyTweens() {
        // Stop and destroy any active tween
        if (this.handTween) {
            this.handTween.stop();
            this.handTween?.destroy();
        }

        // Stop the instruction loop timer
        if (this.instructionLoopTimer) {
            this.instructionLoopTimer?.destroy();
            this.instructionLoopTimer = undefined;
        }

        // Reset all game objects to their initial state
        if (this.hand) {
            this.hand?.destroy();
        }
        // if (this.infoCard) {
        //     this.infoCard.setTexture('info_card_bg_default');
        // }

        // Stop any playing audio
        this.audioManager.stopAllSoundEffects();
    }

    private closeDoors(cb?: () => void) {
        const doorLeft = this.addImage(0, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        const doorRight = this.addImage(this.display.width, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);

        this.audioManager.playSoundEffect('door_close');
        this.tweens.add({
            targets: doorLeft,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: doorRight,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.audioManager.stopSoundEffect('door_close');
                cb?.();
            }
        });
    }
}