import { AnalyticsHelper, BaseScene, ButtonHelper, ButtonOverlay, GameConfigManager, TextOverlay, VolumeSlider, i18n } from '@k8-games/sdk';
import {
    getBonusMultiverseTagsByMode,
    MultiverseQuestionSelector,
    type MathFact,
    type StudentResponse,
} from '@k8-games/sdk/multiverse';
import { BUTTONS } from '../config/common';
import { getTagKeysForTopic, getFilterForTopic } from '../config/topicMapping';
import { createGlitch } from '../utils/helper';
import { PortalStateManager } from '../utils/PortalStateManager';

export type QuestionType = {
    operand1: string;
    operand2: string;
    operator: string;
    answer: string;
};

export class AdditionAdventure {
    private scene: BaseScene;
    // private parentScene: string = 'SplashScreen';
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private questionSelectors: Map<string, MultiverseQuestionSelector> = new Map(); // Store question selectors for bonus multiverse based on topic (add, sub, mul, div)
    private questionSelector: MultiverseQuestionSelector | null = null;
    private question!: QuestionType;
    private multiverseQuestion: MathFact | null = null;
    private isRetake: boolean = false;

    // Timer properties
    private totalTime: number = 60;
    private timeLeft: number = this.totalTime;

    // DCPM properties
    private dcpmTextObject?: Phaser.GameObjects.Text;
    private dcpmCount: number = 0;

    // Addition question UI
    private firstValueText?: Phaser.GameObjects.Text;
    private secondValueText?: Phaser.GameObjects.Text;
    private plusSymbolText?: Phaser.GameObjects.Text;
    private equalsSymbolText?: Phaser.GameObjects.Text;
    private answerInputText: Phaser.GameObjects.Text[] = [];
    private answerCommaText: Phaser.GameObjects.Text[] = [];
    private answerInputValue: string = '';
    private answerBoxCoordinates = { x: 0, y: 0 };
    private answerBoxCenterX: number = 0;
    private answerBoxEdges: { left: number, right: number, top: number, bottom: number } = { left: 0, right: 0, top: 0, bottom: 0 };
    private answerBox?: Phaser.GameObjects.Graphics;
    private questionBg?: Phaser.GameObjects.Rectangle;
    private feedbackText?: Phaser.GameObjects.Text;
    private questionBoxXOffset = 10;
    private questionBoxYOffset = 102;
    private startTime: number = 0;
    private timerTween?: Phaser.Tweens.Tween;
    private topic: string = 'grade3_topic2';
    private calibratingText?: Phaser.GameObjects.Text;
    private isVerticalLayout: boolean = false;
    private questionA11yOverlay?: TextOverlay;

    private analyticsHelper!: AnalyticsHelper;
    private isMobile: boolean = false;
    private numpadBtns: Phaser.GameObjects.Container[] = [];

    constructor(scene: BaseScene) {
        this.scene = scene;
        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade3_topic2';
    }

    // Recreate the question selector so the pool is refreshed (allows replay after scoreboard)
    private resetQuestionPool(): void {
        let tagKeys = getTagKeysForTopic(this.topic);
        const mode = this.scene.registry.get('topic') || 'add';
        if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
            tagKeys = getBonusMultiverseTagsByMode(this.topic, mode);
        }
        this.questionSelector = new MultiverseQuestionSelector(tagKeys);

        if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
            this.questionSelectors.set(mode, this.questionSelector);
        }
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage();
        // Load assets for AdditionAdventure here
        scene.load.setPath('assets/images/game_screen/addition_adventure');
        scene.load.image('question_box', 'question_box.png');
        scene.load.image('question_box_mobile', 'question_box_mobile.png');
        scene.load.image('bg', 'bg.png');
        scene.load.image('bg_mobile', 'bg_mobile.png');
        scene.load.image('numpad_btn', 'numpad_btn.png');
        scene.load.image('numpad_btn_hover', 'numpad_btn_hover.png');
        scene.load.image('numpad_btn_pressed', 'numpad_btn_pressed.png');
        scene.load.image('enter_icon', 'enter_icon.png');
        scene.load.image('backspace_icon', 'backspace_icon.png');
        scene.load.image('clock_small', 'clock_small.png');
        scene.load.image('checkmark', 'checkmark.png');
        scene.load.image('gear_icon', 'gear_icon.png');
        scene.load.image('gear_icon_blur', 'gear_icon_blur.png');
        scene.load.image('progress_bar_fill', 'progress_bar_fill.png');
        scene.load.image('progress_bar_bg', 'progress_bar_bg.png');

        scene.load.setPath(`${BUTTONS.PATH}/blue`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.PAUSE_ICON.KEY, BUTTONS.PAUSE_ICON.PATH);
        scene.load.image(BUTTONS.HELP_ICON.KEY, BUTTONS.HELP_ICON.PATH);
        scene.load.image(BUTTONS.ICON_BTN.KEY, BUTTONS.ICON_BTN.PATH);
        scene.load.image(BUTTONS.ICON_BTN_HOVER.KEY, BUTTONS.ICON_BTN_HOVER.PATH);
        scene.load.image(BUTTONS.ICON_BTN_PRESSED.KEY, BUTTONS.ICON_BTN_PRESSED.PATH);
        scene.load.image(BUTTONS.SETTINGS_ICON.KEY, BUTTONS.SETTINGS_ICON.PATH);
        scene.load.image(BUTTONS.MUTE_ICON.KEY, BUTTONS.MUTE_ICON.PATH);
        scene.load.image(BUTTONS.UNMUTE_ICON.KEY, BUTTONS.UNMUTE_ICON.PATH);

        scene.load.setPath('assets/audios');
        scene.load.audio('calibration_active', `calibration_active_${lang}.mp3`);
        scene.load.audio('countdown', 'countdown.mp3');
        scene.load.audio('bg-music', 'bg-music.mp3');
        scene.load.audio('correct_sfx', 'correct_sfx.mp3');
        scene.load.audio('incorrect_sfx', 'incorrect_sfx.mp3');

        VolumeSlider.preload(scene, 'blue');

        scene.load.setPath('assets/images/common');
        scene.load.image('calibrate_icon', 'calibrate_icon.png');
        scene.load.image('door_icon', 'door_icon.png');
    }

    init(data?: { reset?: boolean; parentScene?: string }) {
        // this.parentScene = data?.parentScene || 'SplashScreen';
        if (data?.reset) {
            this.totalTime = 30;
            
            // Bonus multiverse reset logic
            if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                const mode = this.scene.registry.get('topic') || 'add';
                if (this.questionSelectors.has(mode)) {
                    this.questionSelector = this.questionSelectors.get(mode)!;
                    this.questionSelector.reset();
                } else {
                    this.questionSelector = new MultiverseQuestionSelector(getBonusMultiverseTagsByMode(this.topic, mode));
                    this.questionSelectors.set(mode, this.questionSelector);
                }
            } 
            
            // Normal multiverse reset logic
            else {
                this.questionSelector!.reset();
            }
            this.isRetake = true;
        } else {
            let tagKeys = getTagKeysForTopic(this.topic);
            if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                const mode = this.scene.registry.get('topic') || 'add';
                tagKeys = getBonusMultiverseTagsByMode(this.topic, mode);
            }

            if (!this.questionSelector) {
                this.questionSelector = new MultiverseQuestionSelector(tagKeys);
                if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                    const mode = this.scene.registry.get('topic') || 'add';
                    this.questionSelectors.set(mode, this.questionSelector);
                }
            }
        }

        this.isMobile = this.scene.isTouchDevice();
        if (this.isMobile) {
            this.questionBoxXOffset = 0;
            this.questionBoxYOffset = 0;
        }
    }

    private timerGraphics!: Phaser.GameObjects.Graphics;

    // Returns count of numeric digits in a value (ignores decimal points and signs)
    private getDigitCount(value: string | number): number {
        if (this.topic === 'g7_g8') {
            return String(value).replace(/[^0-9\-−]/g, '').length;
        }
        return String(value)
            .replace(/[^0-9]/g, '')
            .length;
    }

    // Builds per-slot display strings from the raw input value (digits and optional '.')
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

    // Determines if a comma should be added after the digit at the given position
    private shouldAddCommaAfterPosition(position: number, totalDigits: number): boolean {
        // Position is 0-based, so we need to calculate from the right
        const digitFromRight = totalDigits - position - 1;
        // Add comma every 3 digits from the right, but not after the last digit
        return digitFromRight > 0 && digitFromRight % 3 === 0;
    }

    create() {
        const _analyticsHelper = AnalyticsHelper.getInstance();
        if (_analyticsHelper) {
            this.analyticsHelper = _analyticsHelper;
            this.analyticsHelper?.createSession('game.multiverse.quiz');
        } else {
            console.error('AnalyticsHelper not found');
        }

        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, this.isMobile ? 'bg_mobile' : 'bg').setOrigin(0.5);

        this.createButtons();

        this.scene.addCircle(
            this.scene.display.width / 2 + this.questionBoxXOffset,
            this.scene.display.height / 2 + this.questionBoxYOffset,
            this.isMobile ? 295 : 358,
            0x386C88,
        );
        this.timerGraphics = this.scene.add.graphics();

        this.scene
            .addImage(
                this.scene.display.width / 2 + this.questionBoxXOffset,
                this.scene.display.height / 2 + this.questionBoxYOffset,
                this.isMobile ? 'question_box_mobile' : 'question_box',
            )
            .setOrigin(0.5);

        const gearIconYOffset = this.isMobile ? -65 : 0;
        const gearIconBlur = this.scene.addImage(this.scene.display.width / 2, 403 + gearIconYOffset, 'gear_icon_blur').setOrigin(0.5);
        gearIconBlur.setVisible(false);
        const gearIcon = this.scene.addImage(this.scene.display.width / 2, 403 + gearIconYOffset, 'gear_icon').setOrigin(0.5);

        const titleText = this.scene.addText(this.scene.display.width / 2, 480 + gearIconYOffset, i18n.t('additionAdventure.instructions.title'), {
            font: `700 ${this.isMobile ? '26px' : '30px'} Exo`,
            color: '#FF2D18',
            align: 'center',
        }).setOrigin(0.5, 0);

        new TextOverlay(this.scene, titleText, { label: i18n.t('additionAdventure.instructions.title'), announce: true });

        const gearTimer = this.scene.time.addEvent({
            delay: 300,
            loop: true,
            callback: () => {
                gearIconBlur.setVisible(!gearIconBlur.visible);
            }
        })

        const calibrationActiveAudio = this.scene.audioManager.playSoundEffect('calibration_active');

        calibrationActiveAudio?.on('complete', () => {
            this.scene.tweens.add({
                targets: [gearIcon, titleText],
                duration: 400,
                alpha: 0.5,
                onComplete: () => {
                    createGlitch(this.scene);
                    this.scene.tweens.add({
                        targets: [gearIcon, titleText],
                        duration: 200,
                        alpha: 1,
                        onComplete: () => {
                            gearTimer.remove();
                            gearTimer.destroy();
                            gearIcon.destroy();
                            gearIconBlur.destroy();
                            titleText.destroy();
                            this.updateTimerGraphics();
                            this.displayDCPM();
                            this.createProgressBar();
                            this.createQuestionA11yOverlay();
                            this.questionBg = this.scene.addRectangle(0, 0, 0, 0, 0x000000).setOrigin(0.5);
                            this.loadNextQuestion();
                            this.startTimer();
                            this.updateDCPMCount(this.dcpmCount);
                            this.createFeedbackText();
                            this.createNumberpad();
                            this.scene.audioManager.playBackgroundMusic('bg-music');
                        }
                    })
                }
            })
        })
    }

    private createNumberpad(): void {
        if (!this.isMobile) return;

        this.clearNumberpad();

        const isDecimal = String(this.question.answer).includes('.') || String(this.question.operand1).includes('.') || String(this.question.operand2).includes('.');

        this.scene.addRectangle(this.scene.display.width / 2, this.scene.display.height, this.scene.display.width, 180, 0x000D14).setOrigin(0.5, 1);

        const btnWidth = 71;
        const btnHeight = 75;
        const rowGap = 10;
        const colGap = 15;
        
        const colCount = (isDecimal || this.topic === 'g7_g8') ? 6 : 5;
        const startX = (isDecimal || this.topic === 'g7_g8') ? 383 : 426;
        const startY = 636;

        for (let i = 1; i <= 10; i++) {
            const row = Math.floor((i - 1) / colCount);
            const col = (i - 1) % colCount;

            const x = startX + col * (colGap + btnWidth);
            const y = startY + row * (rowGap + btnHeight);

            this.createNumberButton(x, y, i === 10 ? 0 : i);
        }

        if (isDecimal) {
            this.createDecimalButton(startX + 4 * (colGap + btnWidth), startY + btnHeight + rowGap);
            this.createBackspaceButton(startX + 5 * (colGap + btnWidth), startY + btnHeight + rowGap);
            this.createEnterButton(startX + colCount * (colGap + btnWidth), startY + (btnHeight + rowGap) / 2);
        } else if (this.topic === 'g7_g8') {
            this.createNegativeButton(startX + 4 * (colGap + btnWidth), startY + btnHeight + rowGap);
            this.createBackspaceButton(startX + 5 * (colGap + btnWidth), startY + btnHeight + rowGap);
        } else {
            this.createBackspaceButton(startX +colCount * (colGap + btnWidth), startY + (btnHeight + rowGap) / 2);
        }
    }

    private createNumberButton(x: number, y: number, num: number): Phaser.GameObjects.Container {
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: num.toString(),
            label: num.toString(),
            textStyle: {
                font: "700 36px Exo",
                color: "#000000",
            },
            x: x,
            y: y,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: num.toString() });
            },
        }).setName(`number_pad_btn_${num}`);

        this.numpadBtns.push(button);

        return button;
    }

    private createDecimalButton(x: number, y: number): Phaser.GameObjects.Container {
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: this.getDecimalSeparator(),
            label: this.getDecimalSeparator(),
            textStyle: {
                font: "700 36px Exo",
                color: "#000000",
            },
            x: x,
            y: y,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: this.getDecimalSeparator() });
            }
        }).setName('decimal_button');

        this.numpadBtns.push(button);

        return button;
    }

    private createNegativeButton(x: number, y: number): Phaser.GameObjects.Container {
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: '−',
            label: '−',
            textStyle: {
                font: "700 36px Exo",
                color: "#000000",
            },
            x: x,
            y: y,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: '-' });
            }
        }).setName('negative_button');

        this.numpadBtns.push(button);

        return button;
    }

    private createBackspaceButton(x: number, y: number): Phaser.GameObjects.Container {
        const button = ButtonHelper.createIconButton({
            scene: this.scene,
            icon: 'backspace_icon',
            iconScale: 0.75,
            label: i18n.t('common.backspace'),
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            x: x,
            y: y,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: 'Backspace' });
            }
        }).setName('backspace_button');

        this.numpadBtns.push(button);

        return button;
    }

    private createEnterButton(x: number, y: number): Phaser.GameObjects.Container {
        const button = ButtonHelper.createIconButton({
            scene: this.scene,
            icon: 'enter_icon',
            iconScale: 0.75,
            label: i18n.t('common.enter'),
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            x: x,
            y: y,
            onClick: () => {
                this.scene.input.keyboard?.emit('keydown', { key: 'Enter' });
            }
        }).setName('enter_button');

        this.numpadBtns.push(button);

        return button;
    }

    private clearNumberpad(): void {
        this.numpadBtns.forEach(btn => {
            btn.destroy();
        });
        this.numpadBtns = [];
    }

    private createProgressBar(): void {
        if (this.calibratingText) {
            this.calibratingText.destroy();
            this.calibratingText = undefined;
        }
        
        this.calibratingText = this.scene.addText(this.scene.display.width / 2, this.isMobile ? 215 : 240, i18n.t('additionAdventure.instructions.calibratingPortal'), {
            font: '400 24px Exo',
            color: '#00A1FF',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        const overlay = new TextOverlay(this.scene, this.calibratingText, { label: i18n.t('additionAdventure.instructions.calibratingPortal') });
        this.calibratingText.setData('overlay', overlay);

        this.scene.tweens.add({
            targets: [this.calibratingText],
            alpha: 1,
            duration: 500,
            ease: 'Power2',
        })
    }

    private createQuestionA11yOverlay(): void {
        if (this.questionBg) {
            this.questionBg.destroy();
            this.questionBg = undefined;
        }
        if (this.questionA11yOverlay) {
            this.questionA11yOverlay.destroy();
            this.questionA11yOverlay = undefined;
        }

        const questionA11yText = this.scene.addText(this.scene.display.width / 2, this.scene.display.height / 2, '', {
            font: '400 24px Exo',
            color: '#000000',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        this.questionA11yOverlay = new TextOverlay(this.scene, questionA11yText, { label: '' });
    }

    private createFeedbackText(): void {
        if (this.feedbackText) {
            this.feedbackText.destroy();
            this.feedbackText = undefined;
        }

        let text = i18n.t('additionAdventure.instructions.awaitingCalculation');
        if (this.topic === 'grade6_topic1') {
            text = i18n.t('additionAdventure.instructions.pressEnterToSubmit');
        }
        this.feedbackText = this.scene.addText(this.scene.display.width / 2, this.isMobile ? 539 : 685, text, {
            font: '400 26px Exo',
            color: '#FF9D00',
            align: 'center',
        }).setOrigin(0.5).setAlpha(0);

        const overlay = new TextOverlay(this.scene, this.feedbackText, { label: text });
        this.feedbackText.setData('overlay', overlay);

        this.scene.tweens.add({
            targets: this.feedbackText,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
        })
    }

    private updateFeedbackText(state: 'awaiting' | 'correct' | 'incorrect'): void {
        const overlay = this.feedbackText?.getData('overlay');
        if (state === 'awaiting') {
            let text = i18n.t('additionAdventure.instructions.awaitingCalculation');
            if (this.topic === 'grade6_topic1') {
                text = i18n.t('additionAdventure.instructions.pressEnterToSubmit');
            }
            this.feedbackText?.setText(text);
            this.feedbackText?.setColor('#FF9D00');
            overlay?.updateContent(text);
        } else if (state === 'correct') {
            this.feedbackText?.setText(i18n.t('additionAdventure.instructions.correctInputReceived'));
            this.feedbackText?.setColor('#00FF0D');
            overlay?.updateContent(i18n.t('additionAdventure.instructions.correctInputReceived'));
        } else if (state === 'incorrect') {
            this.feedbackText?.setText(i18n.t('additionAdventure.instructions.calculationMismatch'));
            this.feedbackText?.setColor('#FF2800');
            overlay?.updateContent(i18n.t('additionAdventure.instructions.calculationMismatch'));
        }
    }

    private updateTimerGraphics(): void {
        const centerX = this.scene.display.width / 2 + this.questionBoxXOffset;
        const centerY = this.scene.display.height / 2 + this.questionBoxYOffset;
        const radius = this.isMobile ? 295 : 358;

        // Calculate progress (assuming total time = 60 seconds)
        const progress = 1 - this.timeLeft / this.totalTime;
        // -235 to 55
        const startAngleVal = this.isMobile ? -226 : -235;
        const totalAngleVal = this.isMobile ? 272 : 290;
        const startAngle = Phaser.Math.DegToRad(startAngleVal);
        const endAngle = Phaser.Math.DegToRad(startAngleVal + totalAngleVal * progress);

        this.timerGraphics.clear();
        this.timerGraphics.fillStyle(0x00D4FF, 1);
        this.timerGraphics.slice(
            this.scene.getScaledValue(centerX),
            this.scene.getScaledValue(centerY),
            this.scene.getScaledValue(radius),
            startAngle,
            endAngle,
            false,
        );
        this.timerGraphics.fillPath();
    }

    private startTimer(): void {
        this.timeLeft = this.totalTime;
        this.timerTween = this.scene.tweens.addCounter({
            from: 0,
            to: this.totalTime,
            duration: this.totalTime * 1000, // 60 seconds
            onUpdate: (_, target) => {
                // target.value goes from 0 to 60
                const elapsed = target.value;
                this.timeLeft = this.totalTime - elapsed;
                this.updateTimerGraphics();
            },
            onComplete: () => {
                this.gameOver();
            },
        });
    }

    private gameOver(): void {
        this.UICleanup();
        if (this.timerGraphics) {
            this.timerGraphics.clear();
        }
        if (this.timerTween) {
            this.timerTween.stop();
            this.timerTween = undefined;
        }
        this.resetTimer();
        this.scene.input.keyboard?.off('keydown');
        const incorrectQuestions = this.questionSelector!.getIncorrectlyAnsweredQuestions().map((question) => {
            return this.extractQuestion(question['question text']);
        });

        const portalManager = PortalStateManager.getInstance();
        portalManager.unlockNextPortal();
        
        if (!this.isRetake) {
            // show end scene only on first attempt
            this.scene.scene.start('EndScene', {
                dcpm: this.dcpmCount,
                incorrectQuestions: incorrectQuestions,
            });
        } else {
            this.scene.scene.start('ScoreboardScene', {
                dcpm: this.dcpmCount,
                incorrectQuestions: incorrectQuestions,
            });
        }

        this.resetDCPMCount();
        this.scene.audioManager.stopBackgroundMusic();
    }

    // Add this method to reset timer
    private resetTimer(): void {
        this.timeLeft = this.totalTime;
    }

    // Add this method to reset DCPM count
    private resetDCPMCount(): void {
        this.dcpmCount = 0;
        if (this.dcpmTextObject) {
            this.dcpmTextObject.setText('0');
            const dcpmOverlay = this.dcpmTextObject?.getData('overlay');
            dcpmOverlay?.updateContent('0');
        }
    }

    private displayDCPM(): void {
        const posY = this.isMobile ? 35 : 45;
        const gap = this.scene.getScaledValue(this.isMobile ? 8 : 10);

        // Create the checkmark image
        const checkmark = this.scene.addImage(0, posY - 3, 'checkmark').setOrigin(0.5);
        if (this.isMobile) checkmark.setScale(0.84);

        const fontSize = this.isMobile ? '27px' : '30px';
        // Create the DCPM label text using i18n (from en.json, key: additionAdventure.instructions.dcpmLabel)
        const dcpmLabelText = this.scene
            .addText(0, posY, i18n.t('additionAdventure.instructions.numberCorrect'), {
                font: `700 ${fontSize} Exo`,
                color: '#00A6FF',
                align: 'center',
            })
            .setOrigin(0.5);

        // Create the DCPM count text to be updated later.
        this.dcpmTextObject = this.scene
            .addText(0, posY, '0', {
                font: `700 ${fontSize} Exo`,
                color: '#FFF',
                align: 'center',
            })
            .setOrigin(0.5);

        const dcpmOverlay = new TextOverlay(this.scene, this.dcpmTextObject, { label: '' });
        this.dcpmTextObject.setData('overlay', dcpmOverlay);

        const startX = this.scene.getScaledValue(this.scene.display.width / 2 - (this.isMobile ? 147 : 152));

        // Position checkmark.
        checkmark.x = startX + checkmark.displayWidth / 2;
        // Position the label: right after checkmark plus gap.
        dcpmLabelText.x = checkmark.x + checkmark.displayWidth / 2 + gap + dcpmLabelText.displayWidth / 2;
        // Position the DCPM count: after label plus gap.
        this.dcpmTextObject.x =
            dcpmLabelText.x + dcpmLabelText.displayWidth / 2 + gap + this.dcpmTextObject.displayWidth / 2;

        checkmark.setAlpha(0);
        dcpmLabelText.setAlpha(0);
        this.dcpmTextObject.setAlpha(0);

        const yOffset = this.scene.getScaledValue(20);
        checkmark.y += yOffset;
        dcpmLabelText.y += yOffset;
        this.dcpmTextObject.y += yOffset;
        this.scene.tweens.add({
            targets: [checkmark, dcpmLabelText, this.dcpmTextObject],
            alpha: 1,
            y: "-=" + yOffset,
            duration: 500,
            ease: 'Bounce.easeOut',
        })
    }

    // Method to update the DCPM count and its text object
    private updateDCPMCount(newCount: number): void {
        this.dcpmCount = newCount;
        this.dcpmTextObject?.setText(`${this.dcpmCount}`);
        const dcpmOverlay = this.dcpmTextObject?.getData('overlay');
        dcpmOverlay?.updateContent(`${i18n.t('additionAdventure.instructions.numberCorrect')} ${this.dcpmCount}`);
    }

    private extractQuestion(question: string): QuestionType {
        // Supported operators
        const operators = ['+', '−', '×', '÷', '-'];
        
        // Split on '=' to separate question from answer
        const [left, answer] = question.split('=').map((s) => s.trim());
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

    private loadNextQuestion(response?: StudentResponse): void {
        this.UICleanup();
        const filter = getFilterForTopic(this.topic);
        
        this.multiverseQuestion = response
            ? this.questionSelector!.getNextQuizQuestion(response, filter)
            : this.questionSelector!.getNextQuizQuestion(undefined, filter);
        if (!this.multiverseQuestion) {
            // Attempt a one-time pool reset so game can continue instead of ending immediately
            this.resetQuestionPool();
            this.multiverseQuestion = response
                ? this.questionSelector!.getNextQuestion(response, filter)
                : this.questionSelector!.getNextQuestion(undefined, filter);
            if (!this.multiverseQuestion) {
                this.gameOver(); // final fallback
                return;
            }
        }

        this.question = this.extractQuestion(this.multiverseQuestion['question text']);
        this.loadQuestionContent();
    }

    // Cleans up UI elements from previous question
    private UICleanup(): void {
        this.firstValueText?.destroy();
        this.secondValueText?.destroy();
        this.plusSymbolText?.destroy();
        this.equalsSymbolText?.destroy();
        this.answerBox?.destroy();
        this.firstValueText = undefined;
        this.secondValueText = undefined;
        this.plusSymbolText = undefined;
        this.equalsSymbolText = undefined;
        this.answerBox = undefined;
        this.answerBoxCoordinates = { x: 0, y: 0 };
        this.answerBoxCenterX = 0;
        this.answerInputValue = '';
        this.answerInputText.forEach((t) => t.destroy());
        this.answerInputText = [];
        this.answerCommaText.forEach((t) => t.destroy());
        this.answerCommaText = [];
    }

    private loadQuestionContent(): void {
        if (!this.question) return;
        
        const boxCenterX = this.scene.display.width / 2 + this.questionBoxXOffset;
        let boxCenterY = this.scene.display.height / 2 + this.questionBoxYOffset / 2 + 25;
        if (this.isMobile) {
            boxCenterY -= 40;
        }
        const gap = 20;
        
        // Get values from question object
        const first = this.question.operand1 ?? 0;
        const second = this.question.operand2 ?? 0;
        const operator = this.question.operator;
        const answer = this.question.answer ?? 0;
        const isDecimal = String(answer).includes('.') || String(first).includes('.') || String(second).includes('.');

        // Check if we need vertical layout (any operand or answer has more than 2 digits)
        this.isVerticalLayout = 
            isDecimal ||
            this.getDigitCount(first) > 2 || 
            this.getDigitCount(second) > 2 || 
            this.getDigitCount(answer) > 2;

        // Adjust font size for mobile
        const fontSize = this.isMobile ? 50 : 70;
        const fontStyle = {
            font: `700 ${fontSize}px Exo`,
            color: '#fff',
            align: 'center',
        };

        if (this.isVerticalLayout) {
            this.loadVerticalLayout(boxCenterX, boxCenterY, gap, fontStyle, first, second, operator, answer);
        } else {
            this.loadHorizontalLayout(boxCenterX, boxCenterY, gap, fontStyle, first, second, operator, answer);
        }

        // Listen for keyboard input
        this.scene.input.keyboard?.off('keydown'); // Remove previous listeners if any
        this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            if (!this.question) return;
            const maxDigits = this.getDigitCount(this.question.answer);
            const needsDecimal = String(this.question.answer).includes('.') || String(this.question.operand1).includes('.') || String(this.question.operand2).includes('.');
            const maybeCheck = () => {
                if (needsDecimal) return; // For decimals, do not auto-submit; require Enter
                let digitCount = 0;
                if (this.topic === 'g7_g8') {
                    digitCount = this.answerInputValue.replace(/[^0-9\-−]/g, '').length;
                } else {
                    digitCount = this.answerInputValue.replace(/[^0-9]/g, '').length;
                }
                if (digitCount === maxDigits) {
                    this.checkAnswer();
                }
            };
            if (/^[0-9]$/.test(event.key)) {
                const currentDigits = this.answerInputValue.replace(/[^0-9]/g, '').length;
                // For decimals allow up to 10 total characters; for integers cap by expected digits
                if ((needsDecimal ? this.answerInputValue.length < 10 : currentDigits < maxDigits)) {
                    this.answerInputValue += event.key;
                    this.updateAnswerInputText();
                    maybeCheck();
                }
            } else if (event.key === 'Backspace') {
                this.answerInputValue = this.answerInputValue.slice(0, -1);
                this.updateAnswerInputText();
            } else if (event.key === this.getDecimalSeparator()) {
                // Allow '.' at the beginning as well for decimals
                if (needsDecimal && !this.answerInputValue.includes('.') && this.answerInputValue.length < 10) {
                    this.answerInputValue += '.';
                    this.updateAnswerInputText();
                }
            } else if (event.key === 'Enter') {
                if (needsDecimal && this.answerInputValue.length > 0) {
                    this.checkAnswer();
                }
            } else if (event.key === '-' && this.topic === 'g7_g8') {
                if (this.answerInputValue.length === 0) {
                    this.answerInputValue = '-';
                    this.updateAnswerInputText();
                }
            }
        });

        this.startTime = Date.now();
    }

    private formatOperandWithBrackets(operand: string): string {
        if (Number(operand) < 0) {
            return `(${operand})`;
        }
        return operand;
    }

    private getDecimalSeparator(): string {
        return i18n.getLanguage() === 'es' ? ',' : '.';
    }

    private getGroupingSeparator(): string {
        return i18n.getLanguage() === 'es' ? '.' : ',';
    }

    private loadVerticalLayout(
        boxCenterX: number, 
        boxCenterY: number, 
        gap: number, 
        fontStyle: any, 
        first: any, 
        second: any, 
        operator: string, 
        answer: any
    ): void {
        // Vertical layout: question on top, answer input below
        const questionY = boxCenterY - 60; // Position question above center
        const answerY = boxCenterY + 60; // Position answer below center

        // Calculate question width for centering using the exact rendered strings/styles
        const formattedFirst = `${i18n.formatNumber(+first).replace('-', '−')}`;
        const formattedSecond = `${this.formatOperandWithBrackets(i18n.formatNumber(+second)).replace('-', '−')}`;
        const renderedOperator = `${operator.replace('-', '−')}`;
        const tempText1 = this.scene.addText(0, 0, formattedFirst, fontStyle).setVisible(false);
        const tempText2 = this.scene.addText(0, 0, formattedSecond, fontStyle).setVisible(false);
        const tempPlus = this.scene.addText(0, 0, renderedOperator, fontStyle).setVisible(false);
        const questionWidth = tempText1.width + gap + tempPlus.width + gap + tempText2.width;
        tempText1.destroy();
        tempText2.destroy();
        tempPlus.destroy();

        let startX = boxCenterX - questionWidth / 2;

        // Create question elements (without equals sign)
        this.firstValueText = this.scene.addText(startX, questionY, formattedFirst, fontStyle).setOrigin(0, 0.5);
        startX += this.firstValueText.width + gap;
        this.plusSymbolText = this.scene.addText(startX, questionY, renderedOperator, fontStyle).setOrigin(0, 0.5);
        startX += this.plusSymbolText.width + gap;
        this.secondValueText = this.scene.addText(startX, questionY, formattedSecond, fontStyle).setOrigin(0, 0.5);

        this.updateQuestionA11yOverlay(formattedFirst, renderedOperator, formattedSecond);

        // Determine if the current problem involves decimals
        const isDecimal = String(answer).includes('.') || String(first).includes('.') || String(second).includes('.');

        // Create answer input box below
        const boxHeight = this.isMobile ? 70 : 100;
        // For decimals, start with small width (1 char) and grow dynamically; for integers, width based on digit count
        const underlineLength = this.isMobile ? 32 : 44; // base char width reference
        const charWidthForInitial = underlineLength * 1.25;
        const borderPadding = this.isMobile ? 25 : 35; // vertical layout padding
        const n = this.getDigitCount(answer);
        const slotWidth = this.isMobile ? 60 : 82;
        const initialBoxWidth = isDecimal ? (charWidthForInitial * 1 + borderPadding) : (slotWidth * n);
        const boxX = boxCenterX - initialBoxWidth / 2;
        const boxY = answerY - boxHeight / 2;
        this.answerBoxCoordinates = { x: boxX, y: boxY };
        this.answerBoxCenterX = boxCenterX;
        this.answerInputValue = '';
        this.answerBox = this.scene.add.graphics();

        this.updateAnswerBox();

        const boxRectXPad = this.scene.getScaledValue(20);
        const boxRectYPad = this.scene.getScaledValue(20);

        const boxRectTop = this.firstValueText.getBounds().top;
        const boxRectBottom = this.answerBoxEdges.bottom;
        const boxRectLeft = Math.min(this.firstValueText.getBounds().left, this.answerBoxEdges.left);
        const boxRectRight = Math.max(this.secondValueText.getBounds().right, this.answerBoxEdges.right);
        const boxRectWidth = boxRectRight - boxRectLeft;
        const boxRectHeight = boxRectBottom - boxRectTop;
        const boxRectX = boxRectLeft + boxRectWidth / 2;
        const boxRectY = boxRectTop + boxRectHeight / 2;

        this.questionBg?.setPosition(boxRectX, boxRectY);
        this.questionBg?.setSize(boxRectWidth + 2 * boxRectXPad, boxRectHeight + 2 * boxRectYPad);

        // Add answer input text (virtual input)
        const scaledBoxX = boxX;
        const scaledBoxY = boxY;
        const scaledBoxWidth = initialBoxWidth;
        const scaledBoxHeight = boxHeight;
        const textY = scaledBoxY + scaledBoxHeight / 2;

        // Adjust answer text font size for mobile
        const answerFontSize = this.isMobile ? 50 : 70;

        if (isDecimal) {
            // Single centered text for decimals
            const textObj = this.scene
                .addText(boxCenterX, textY, '', {
                    font: `700 ${answerFontSize}px Exo`,
                    color: '#fff',
                    align: 'center',
                })
                .setOrigin(0.5);
            this.answerInputText?.push(textObj);
        } else {
            // Slot-based layout for non-decimals
            const sidePadding = this.isMobile ? 46 : 64;
            const totalLineLength = scaledBoxWidth - sidePadding;
            const gapWidth = 10;
            const totalGapWidth = gapWidth * (n - 1);
            const singleLineLength = (totalLineLength - totalGapWidth) / n;

            let currentX = scaledBoxX + sidePadding / 2;
            for (let i = 0; i < n; i++) {
                let centerX = currentX + singleLineLength / 2;

                const textObj = this.scene
                    .addText(centerX, textY, '', {
                        font: `700 ${answerFontSize}px Exo`,
                        color: '#fff',
                        align: 'center',
                    })
                    .setOrigin(0.5);
                this.answerInputText?.push(textObj);
                currentX += singleLineLength + gapWidth;

                // Add comma after this digit if needed (for 4+ digit numbers)
                if (n >= 4 && this.shouldAddCommaAfterPosition(i, n)) {
                    const commaX = currentX - gapWidth / 2; // Position comma between slots
                    const commaFontSize = this.isMobile ? 42 : 60;
                    const commaYOffset = this.isMobile ? 10 : 15;
                    const commaObj = this.scene
                        .addText(commaX, textY + commaYOffset, this.getGroupingSeparator(), {
                            font: `400 ${commaFontSize}px Exo`,
                            color: '#00BFFF',
                            align: 'center',
                        })
                        .setOrigin(0.5);
                    this.answerCommaText?.push(commaObj);
                }
            }
        }
    }

    private loadHorizontalLayout(
        boxCenterX: number, 
        boxCenterY: number, 
        gap: number, 
        fontStyle: any, 
        first: any, 
        second: any, 
        operator: string, 
        answer: any
    ): void {
        const formattedFirst = `${i18n.formatNumber(+first).replace('-', '−')}`;
        const formattedSecond = `${this.formatOperandWithBrackets(i18n.formatNumber(+second)).replace('-', '−')}`;
        const renderedOperator = `${operator.replace('-', '−')}`;
        // Original horizontal layout: firstValue + secondValue = [answer box]
        const tempText1 = this.scene.addText(0, 0, formattedFirst, fontStyle).setVisible(false);
        const tempText2 = this.scene.addText(0, 0, formattedSecond, fontStyle).setVisible(false);
        const tempPlus = this.scene.addText(0, 0, renderedOperator, fontStyle).setVisible(false);
        const tempEquals = this.scene.addText(0, 0, '=', fontStyle).setVisible(false);
        const slotWidth = this.isMobile ? 70 : 100;
        const boxWidth = slotWidth * this.getDigitCount(answer);
        const totalWidth =
            tempText1.width + gap + tempPlus.width + gap + tempText2.width + gap + tempEquals.width + gap + boxWidth;
        tempText1.destroy();
        tempText2.destroy();
        tempPlus.destroy();
        tempEquals.destroy();

        let startX = boxCenterX - totalWidth / 2;
        const y = boxCenterY;

        this.firstValueText = this.scene.addText(startX, y, formattedFirst, fontStyle).setOrigin(0, 0.5);
        startX += this.firstValueText.width + gap;
        this.plusSymbolText = this.scene.addText(startX, y, renderedOperator, fontStyle).setOrigin(0, 0.5);
        startX += this.plusSymbolText.width + gap;
        this.secondValueText = this.scene.addText(startX, y, formattedSecond, fontStyle).setOrigin(0, 0.5);
        startX += this.secondValueText.width + gap;
        this.equalsSymbolText = this.scene.addText(startX, y, '=', fontStyle).setOrigin(0, 0.5);
        startX += this.equalsSymbolText.width + gap;

        this.updateQuestionA11yOverlay(formattedFirst, renderedOperator, formattedSecond);

        // Add a regular box (not input) after equals symbol
        const boxHeight = this.isMobile ? 70 : 100;
        const boxX = startX;
        const boxY = y - boxHeight / 2;
        this.answerBoxCoordinates = { x: boxX, y: boxY };
        this.answerBox = this.scene.add.graphics();

        this.updateAnswerBox();

        const boxRectXPad = this.scene.getScaledValue(20);
        const boxRectYPad = this.scene.getScaledValue(20);
        const boxRectLeft = this.firstValueText.getBounds().left;
        const boxRectRight = this.answerBoxEdges.right;
        const boxRectWidth = boxRectRight - boxRectLeft;
        const boxRectHeight = this.firstValueText.getBounds().height;
        const boxRectX = boxRectLeft + boxRectWidth / 2;

        this.questionBg?.setPosition(boxRectX, this.firstValueText.getBounds().centerY);
        this.questionBg?.setSize(boxRectWidth + 2 * boxRectXPad, boxRectHeight + 2 * boxRectYPad);

        // Add answer input text (virtual input)
        this.answerInputValue = '';
        const n = this.getDigitCount(answer);
        const scaledBoxX = boxX;
        const scaledBoxY = boxY;
        const scaledBoxWidth = slotWidth * n;
        const scaledBoxHeight = boxHeight;

        const sidePadding = this.isMobile ? 46 : 64;
        const totalLineLength = scaledBoxWidth - sidePadding;
        const gapWidth = 10;
        const totalGapWidth = gapWidth * (n - 1);
        const singleLineLength = (totalLineLength - totalGapWidth) / n;

        let currentX = scaledBoxX + sidePadding / 2;
        const textY = scaledBoxY + scaledBoxHeight / 2;
        const answerFontSize = this.isMobile ? 50 : 70;

        for (let i = 0; i < n; i++) {
            let centerX = currentX + singleLineLength / 2;

            const textObj = this.scene
                .addText(centerX, textY, '', {
                    font: `700 ${answerFontSize}px Exo`,
                    color: '#fff',
                    align: 'center',
                })
                .setOrigin(0.5);
            this.answerInputText?.push(textObj);
            currentX += singleLineLength + gapWidth;

            // Add comma after this digit if needed (for 4+ digit numbers)
            if (n >= 4 && this.shouldAddCommaAfterPosition(i, n)) {
                const commaX = currentX - gapWidth / 2; // Position comma between slots
                const commaFontSize = this.isMobile ? 28 : 40;
                const commaObj = this.scene
                    .addText(commaX, textY, this.getGroupingSeparator(), {
                        font: `700 ${commaFontSize}px Exo`,
                        color: '#000',
                        align: 'center',
                    })
                    .setOrigin(0.5);
                this.answerCommaText?.push(commaObj);
            }
        }
    }

    private updateQuestionA11yOverlay(formattedFirst: string, renderedOperator: string, formattedSecond: string): void {
        if (!this.questionA11yOverlay) return;

        const text = `${formattedFirst} ${renderedOperator} ${formattedSecond} = ?`.replace(/[-−]/g, 'minus');

        if (this.questionA11yOverlay?.element.textContent === '') {
            this.scene.time.delayedCall(1000, () => {
                this.questionA11yOverlay?.updateContent(text);
            });
        } else {
            this.questionA11yOverlay?.updateContent(text);
        }
    }

    private shakeQuestion(): void {
        if (!this.questionBg) return;

        const targets = [this.questionBg, this.firstValueText, this.plusSymbolText, this.secondValueText, this.equalsSymbolText, this.answerBox, ...this.answerInputText, ...this.answerCommaText];

        for (const target of targets) {
            if (!target) continue;
            const x = target.x;
            const shakeAmount = this.scene.getScaledValue(3);
            this.scene.tweens.add({
                targets: target,
                x: { from: x - shakeAmount, to: x + shakeAmount },
                duration: 70,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    target.setX(x);
                },
            });
        }
    }

    private updateAnswerInputText(): void {
        if (!this.answerInputText) return;
        const isDecimal = !!this.question && (String(this.question.answer).includes('.') || String(this.question.operand1).includes('.') || String(this.question.operand2).includes('.'));
        if (isDecimal) {
            if (this.answerInputText[0]) {
                this.answerInputText[0].setText(this.answerInputValue.replace('.', this.getDecimalSeparator()));
            }
            this.resizeDecimalBox();
            return;
        }
        const slotCount = this.answerInputText.length;
        const displayStrings = this.buildSlotDisplayStrings(this.answerInputValue, slotCount);
        for (let i = 0; i < slotCount; i++) {
            this.answerInputText[i].setText(displayStrings[i] ?? '');
        }
    }

    // Dynamically resize the answer box for decimal inputs while keeping center X fixed
    private resizeDecimalBox(): void {
        if (!this.question || !this.answerBox) return;
        const currentLength = Math.max(1, Math.min(10, this.answerInputValue.length || 1));
        const underlineLength = this.isMobile ? 32 : 44;
        const charWidth = currentLength <= 1 ? underlineLength * 1.5 : underlineLength;
        const borderPadding = this.isMobile ? 25 : 35; // vertical layout only for decimals in this game
        const boxWidth = charWidth * currentLength + borderPadding;
        const boxX = this.answerBoxCenterX - boxWidth / 2;
        // Preserve Y
        this.answerBoxCoordinates = { x: boxX, y: this.answerBoxCoordinates.y };
        this.updateAnswerBox();
    }

    private updateAnswerBox(lineStyle: number = 0x009dff, fillStyle: number = 0x000000): void {
        if (!this.answerBox || !this.question) return;
        const isDecimal = String(this.question.answer).includes('.') || String(this.question.operand1).includes('.') || String(this.question.operand2).includes('.');
        const scaledBoxX = this.scene.getScaledValue(this.answerBoxCoordinates.x);
        const scaledBoxY = this.scene.getScaledValue(this.answerBoxCoordinates.y);
        const boxHeight = this.isMobile ? 70 : 100;
        const scaledBoxHeight = this.scene.getScaledValue(boxHeight);
        let scaledBoxWidth: number;
        if (isDecimal) {
            const underlineLength = this.isMobile ? 32 : 44;
            const currentLength = Math.max(1, Math.min(10, this.answerInputValue.length || 1));
            const charWidth = currentLength <= 1 ? underlineLength * 1.5 : underlineLength;
            const borderPadding = this.isMobile ? 25 : 35; // vertical padding
            const boxWidth = charWidth * currentLength + borderPadding;
            scaledBoxWidth = this.scene.getScaledValue(boxWidth);
        } else {
            if (this.isVerticalLayout) {
                const slotWidth = this.isMobile ? 60 : 82;
                scaledBoxWidth = this.scene.getScaledValue(slotWidth * this.getDigitCount(this.question.answer));
            } else {
                const slotWidth = this.isMobile ? 70 : 100;
                scaledBoxWidth = this.scene.getScaledValue(slotWidth * this.getDigitCount(this.question.answer));
            }
        }

        this.answerBox.clear();
        this.answerBox.lineStyle(this.scene.getScaledValue(7), lineStyle, 1);
        this.answerBox.fillStyle(fillStyle, 1);

        this.answerBoxEdges.right = scaledBoxX + scaledBoxWidth;
        this.answerBoxEdges.bottom = scaledBoxY + scaledBoxHeight;
        this.answerBoxEdges.left = scaledBoxX;
        this.answerBoxEdges.top = scaledBoxY;

        this.answerBox.fillRoundedRect(
            scaledBoxX,
            scaledBoxY,
            scaledBoxWidth,
            scaledBoxHeight,
            this.scene.getScaledValue(14),
        );
        this.answerBox.strokeRoundedRect(
            scaledBoxX,
            scaledBoxY,
            scaledBoxWidth,
            scaledBoxHeight,
            this.scene.getScaledValue(14),
        );

        const lineWidth = this.scene.getScaledValue(5);
        const lineColor = lineStyle;
        const linePadding = this.isMobile ? 12 : 18;
        const y = scaledBoxY + scaledBoxHeight - this.scene.getScaledValue(linePadding);

        if (isDecimal) {
            // Single long underline for decimals
            const sidePadding = this.isMobile ? 23 : 32;
            const startX = scaledBoxX + this.scene.getScaledValue(sidePadding);
            const endX = scaledBoxX + scaledBoxWidth - this.scene.getScaledValue(sidePadding);
            this.answerBox.lineStyle(lineWidth, lineColor, 1);
            this.answerBox.beginPath();
            this.answerBox.moveTo(startX, y);
            this.answerBox.lineTo(endX, y);
            this.answerBox.strokePath();
        } else {
            // Multiple underlines for integer digits
            const n = this.getDigitCount(this.question.answer);
            const sidePadding = this.isMobile ? 46 : 64;
            const totalLineLength = scaledBoxWidth - this.scene.getScaledValue(sidePadding);
            const gapWidth = this.scene.getScaledValue(8); // gap between lines
            const totalGapWidth = gapWidth * (n - 1);
            const singleLineLength = (totalLineLength - totalGapWidth) / n;
            let currentX = scaledBoxX + this.scene.getScaledValue(sidePadding / 2);
            for (let i = 0; i < n; i++) {
                this.answerBox.lineStyle(lineWidth, lineColor, 1);
                this.answerBox.beginPath();
                this.answerBox.moveTo(currentX, y);
                this.answerBox.lineTo(currentX + singleLineLength, y);
                this.answerBox.strokePath();
                currentX += singleLineLength + gapWidth;
            }
        }
    }

    private checkAnswer(): void {
        if (!this.question) return;
        const endTime = Date.now();
        const correctAnswer = String(this.question.answer);
        const isDecimalQuestion = String(this.question.answer).includes('.') || String(this.question.operand1).includes('.') || String(this.question.operand2).includes('.');
        let isCorrect: boolean;
        if (isDecimalQuestion) {
            const expectedNum = parseFloat(correctAnswer);
            const studentNum = parseFloat(this.answerInputValue);
            isCorrect = !isNaN(studentNum) && !isNaN(expectedNum) && studentNum === expectedNum;
        } else {
            isCorrect = this.answerInputValue === correctAnswer;
        }

        const questionText = this.multiverseQuestion?.["question text"] || '';
        const [questionPart] = questionText.split('=');
        const formattedQuestionText = `${questionPart}=?`;

        if (isCorrect) {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: 1,
                achievedPoints: 1,
                questionText: formattedQuestionText,
                isCorrect: true,
                questionMechanic: 'default',
                gameLevelInfo: 'game.multiverse.quiz',
                studentResponse: this.answerInputValue,
                studentResponseAccuracyPercentage: '100%',
            });

            this.scene.audioManager.playSoundEffect('correct_sfx');
            this.updateAnswerBox(0x00FF0D, 0x000000);
            // Increment by number of digits, not including decimal
            this.dcpmCount += 1;

            this.updateDCPMCount(this.dcpmCount);
            this.updateFeedbackText('correct');
            this.scene.time.delayedCall(500, () => {
                this.loadNextQuestion(
                    this.questionSelector!.createStudentResponse(
                        this.multiverseQuestion!,
                        this.startTime - endTime,
                        true,
                    ),
                );
                this.updateFeedbackText('awaiting');
            });
        } else {
            this.analyticsHelper?.createTrial({
                questionMaxPoints: 1,
                achievedPoints: 0,
                questionText: formattedQuestionText,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: 'game.multiverse.quiz',
                studentResponse: this.answerInputValue,
                studentResponseAccuracyPercentage: '0%',
            });

            this.shakeQuestion();
            this.scene.audioManager.playSoundEffect('incorrect_sfx');
            this.updateAnswerBox(0xFF2800, 0x000000);
            this.updateFeedbackText('incorrect');
            this.scene.time.delayedCall(500, () => {
                this.loadNextQuestion(
                    this.questionSelector!.createStudentResponse(
                        this.multiverseQuestion!,
                        this.startTime - endTime,
                        false,
                    ),
                );
                this.updateFeedbackText('awaiting');
            });
        }
    }

    private createButtons() {
        // Pause button
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.scene.display.width - 60,
            y: 61,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch('PauseScene', { parentScene: 'GameScene' });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop('PauseScene');
            },
        });

        // Mute button (always create)
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.scene.display.width - 60,
            y: 149,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        });

        // Volume slider (always create)
        this.volumeSlider = new VolumeSlider(this.scene);
        this.volumeSlider.create(this.scene.display.width - 220, 257, 'blue', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.scene.display.width - 60,
            y: 237,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
    }

    update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.scene.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.scene.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }

        // if (this.bgTileSprite) {
        //     this.bgTileSprite.tilePositionY -= 0; // Adjust speed as needed
        // }
    }
}
