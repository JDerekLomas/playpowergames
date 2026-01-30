import { AnalyticsHelper, announceToScreenReader, BaseScene, ButtonHelper, ButtonOverlay, GameConfigManager, i18n, Question, ScoreCoins, ScoreHelper, TextOverlay, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, ENEMY_NAMES, QuestionType } from './config/common';
import { MathFact, MultiverseQuestionSelector, StudentResponse } from '@k8-games/sdk/multiverse';
import { getTagKeysForTopic, getFilterForTopic } from './config/topicMapping';
import { continueGameAfterWrongAnswer } from './utils/helper';

export class GameMechanic {
    private scene: BaseScene;
    private isInstructionMode: boolean;
    private topic: string;
    private mode: string | null = null;
    private question: Question | null = null;
    private questionSelector?: MultiverseQuestionSelector;
    private numpadContainer!: Phaser.GameObjects.Container;
    private isNumpadEnabled: boolean = true;
    private allowedKeys: Set<string> | null = null;

    // Multiverse variables
    private questionStartTime: number = 0;
    private questionCompletionTime: number = 0;
    private multiverseQuestion: MathFact | null = null;

    // Lifeline UI elements
    private userLifelineContainer?: Phaser.GameObjects.Container;
    private enemyLifelineContainer?: Phaser.GameObjects.Container;

    // Emoji UI elements
    private userEmojiContainer?: Phaser.GameObjects.Container;
    private enemyEmojiContainer?: Phaser.GameObjects.Container;
    private userIdleTween?: Phaser.Tweens.Tween;
    private enemyIdleTween?: Phaser.Tweens.Tween;
    private enemyNameText?: Phaser.GameObjects.Text;

    // Game variables
    private selectedHeroId: number = 1;
    private userLives: number = 5;
    private enemyLives: number = 3;
    private currentEnemy: number = 1;
    private enemySequence: number[] = [];
    private currentEnemyIndex: number = 0;
    private BOSS_ENEMY_POS = { x: 8, y: -22 };

	private bossSecondChanceUsed: boolean = false;

    private scoreHelper: ScoreHelper;
    private scoreCoins?: ScoreCoins;

    // Question UI elements
    public questionContainer?: Phaser.GameObjects.Container;
    private questionTextObj?: Phaser.GameObjects.Text;
    private questionOverlay?: TextOverlay;
    private answerGraphics?: Phaser.GameObjects.Graphics;
    private answerInputText: Phaser.GameObjects.Text[] = [];
    private commaText: Phaser.GameObjects.Text[] = [];
    private inputValue: string = '';

    // Announcement queue system
    private announcementQueue: string[] = [];
    private isAnnouncing: boolean = false;
    private enemyNameTextOverlay?: TextOverlay;

    private analyticsHelper!: AnalyticsHelper;

    constructor(scene: BaseScene, isInstructionMode: boolean = false) {
        this.scene = scene;
        this.isInstructionMode = isInstructionMode;
        this.scoreHelper = new ScoreHelper(2);

        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade2_topic1';
        this.mode = gameConfigManager.get('mode') || null;
        const tagKeys = getTagKeysForTopic(this.topic, this.mode || undefined);
        if (!this.questionSelector) {
            this.questionSelector = new MultiverseQuestionSelector(tagKeys);
        }
        
        // Generate random enemy sequence
        this.generateEnemySequence();
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/game_screen`);
        scene.load.image('game_bg', 'game_bg.png');
        scene.load.image('numpad_bg', 'numpad_bg.png');
        scene.load.image('numpad_bg_decimal', 'numpad_bg_decimal.png');
        scene.load.image('numpad_btn', 'numpad_btn.png');
        scene.load.image('numpad_btn_hover', 'numpad_btn_hover.png');
        scene.load.image('numpad_btn_pressed', 'numpad_btn_pressed.png');
        scene.load.image('backspace_icon', 'backspace_icon.png');
        scene.load.image('check_icon', 'check_icon.png');
        scene.load.image('question_bg', 'question_bg.png');
        scene.load.image('continue_btn_bg', 'continue_btn_bg.png');
        
        scene.load.image('lifeline_full', 'lifeline_full.png');
        scene.load.image('lifeline_empty', 'lifeline_empty.png');

        scene.load.image('emoji_shadow', 'emoji_shadow.png');
        for (let i = 1; i <= 6; i++) {
            scene.load.image(`hero_${i}`, `hero_${i}.png`);
            scene.load.image(`enemy_${i}`, `enemy_${i}.png`);
        }
        scene.load.image('enemy_7', 'enemy_7.png'); // final boss
        scene.load.image('spaceship_beam', 'spaceship_beam.png');

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
        scene.load.image(BUTTONS.HALF_BUTTON.KEY, BUTTONS.HALF_BUTTON.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_HOVER.KEY, BUTTONS.HALF_BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.HALF_BUTTON_PRESSED.KEY, BUTTONS.HALF_BUTTON_PRESSED.PATH);

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/shoot_animation`);
        scene.load.atlas('shoot', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/star_animation`);
        scene.load.atlas('star', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.ATLAS}/heart_break_animation`);
        scene.load.atlas('heart_break', 'spritesheet.png', 'spritesheet.json');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('bg_music', 'bg_music.mp3');
        scene.load.audio('shoot_sfx', 'shoot_sfx.mp3');
        scene.load.audio('correct_sfx', 'correct_sfx.mp3');
        scene.load.audio('incorrect_sfx', 'incorrect_sfx.mp3');
        scene.load.audio('question_change_sfx', 'question_change_sfx.mp3');
        scene.load.audio('character_appear', 'character_appear.mp3');
        scene.load.audio('character_disappear', 'character_disappear.mp3');
        scene.load.audio('enemy_change_sfx', 'enemy_change_sfx.mp3');
        scene.load.audio('life_lost_sfx', 'life_lost_sfx.mp3');

        ScoreCoins.preload(scene, 'purple');
        VolumeSlider.preload(scene, 'purple');
    }

    init(data?: { reset?: boolean }) {
        ScoreCoins.init(this.scene);

        if (data?.reset) {
            this.resetGame();
        }

        this.createAnimations();
    }

    create() {
        if (!this.isInstructionMode) {
            const _analyticsHelper = AnalyticsHelper.getInstance();
            if (_analyticsHelper) {
                this.analyticsHelper = _analyticsHelper;
                if (this.topic === 'grade2_topic3') {
                    this.analyticsHelper?.createSession('game.emoji_battle.default');
                } else {
                    this.analyticsHelper?.createSession('game.multiverse.emoji_battle');
                }
            } else {
                console.error('AnalyticsHelper not found');
            }
        }

        this.scene.audioManager.initialize(this.scene);
        this.selectedHeroId = this.scene.registry.get('selected_hero_id');

        if (!this.isInstructionMode) {
            this.scene.audioManager.playBackgroundMusic('bg_music');
            // Create score coins
            this.scoreCoins = new ScoreCoins(this.scene, this.scoreHelper, i18n, 'purple');
            this.scoreCoins.create(
                this.scene.getScaledValue(108),
                this.scene.getScaledValue(70)
            ).setDepth(1000);
        }

        this.scene.addImage(this.scene.display.width / 2, this.scene.display.height / 2, 'game_bg').setOrigin(0.5);
        
        this.generateEnemySequence();
        this.currentEnemy = this.enemySequence[this.currentEnemyIndex];
        
        this.createEmojis();
        
        this.createQuestionUI();

        if (!this.isInstructionMode) {
            this.createButtons();
        }
        
        this.createUserLifeline();

        this.questionOverlay = new TextOverlay(this.scene, this.questionTextObj as Phaser.GameObjects.Text, { label: '', announce: true });

        this.createEnemyLifeline();
        
        this.createNumberpad();
        
        this.setupKeyboardInput();
        
        this.loadNextQuestion();
    }

    private createQuestionUI() {
        const baseY = this.isInstructionMode ? 218 : 152;
        const depth = 100;
        this.scene.addRectangle(this.scene.display.width / 2, baseY, this.scene.display.width, 101, 0x00080B).setOrigin(0.5).setDepth(depth);

        this.scene.addImage(this.scene.display.width / 2, baseY, 'question_bg').setOrigin(0.5).setDepth(depth).setName('question_bg');

        this.questionContainer = this.scene.add.container(
            this.scene.getScaledValue(this.scene.display.width / 2),
            this.scene.getScaledValue(baseY)
        ).setDepth(depth);

        this.questionTextObj = this.scene.addText(0, 0, '', {
            font: "700 30px Exo",
            color: "#000000",
        }).setOrigin(0.5);

        this.answerGraphics = this.scene.add.graphics();

        this.questionContainer.add([
            this.questionTextObj,
            this.answerGraphics,
        ]);
    }

    private isCurrentQuestionDecimal(): boolean {
        if (!this.question) return false;
        const { operand1, operand2, answer } = this.question;
        return String(operand1).includes('.') || String(operand2).includes('.') || String(answer).includes('.');
    }

    private updateQuestion() {
        if (!this.questionContainer || !this.questionTextObj || !this.answerGraphics) return;
        if (!this.question) return;

		const q = this.question;

		// Decide layout: horizontal if all parts <= 2 digits; else vertical (ignore decimals)
		const firstLen = this.getDigitCount(q.operand1 || '');
		const secondLen = this.getDigitCount(q.operand2 || '');
		const answerLen = this.getDigitCount(q.answer || '');
        const hasDecimal = this.isCurrentQuestionDecimal();
        const useHorizontal = (firstLen <= 2 && secondLen <= 2 && answerLen <= 2) && !hasDecimal;

		// Typography and box metrics scale with font size
		const questionFontSize = useHorizontal ? 50 : 30;
		const answerFontSize = useHorizontal ? 50 : 30;
		const borderRadius = this.scene.getScaledValue(useHorizontal ? 12 : 10);
		const sidePadding = this.scene.getScaledValue(8);
		const linePadding = this.scene.getScaledValue(useHorizontal ? 8 : 8);
		const underlineLength = this.scene.getScaledValue(useHorizontal ? 38 : 24);
		const underlineGap = this.scene.getScaledValue(6);
		const borderPadding = this.scene.getScaledValue(24);
		const gapBetween = this.scene.getScaledValue(useHorizontal ? 16 : 12);
		const boxHeight = this.scene.getScaledValue(useHorizontal ? 70 : 50);

		// Set question text based on layout (no '=' in vertical)
		const formattedOperand1 = this.formatNumberWithCommas(q.operand1);
		const formattedOperand2 = this.formatNumberWithCommas(q.operand2);
        const formattedOperand2WithBrackets = Number(q.operand2) < 0 ? `(${formattedOperand2})` : formattedOperand2;
		const questionPart = useHorizontal
			? `${formattedOperand1.replace('-', '−')} ${q.operator.replace('-', '−')} ${formattedOperand2WithBrackets.replace('-', '−')} =`
			: `${formattedOperand1.replace('-', '−')} ${q.operator.replace('-', '−')} ${formattedOperand2WithBrackets.replace('-', '−')}`;
		this.questionTextObj.setText(questionPart);
        this.scene.time.delayedCall(1000, () => {
            this.questionOverlay?.updateContent(questionPart);
        })
		this.questionTextObj.setStyle({ font: `700 ${questionFontSize}px Exo`, color: "#000000" });

		const n = Math.max(1, this.getDigitCount(q.answer || ''));
		const commaCount = this.getCommaPositions(n).length;
		const extraCommaSpacing = this.scene.getScaledValue(8) * commaCount; // Extra space for all commas
		const totalUnderline = underlineLength * n + underlineGap * (n - 1) + extraCommaSpacing;
		const boxWidth = totalUnderline + sidePadding * 2 + borderPadding;

		// Clear and redraw answer graphics
		this.answerGraphics.clear();
		this.answerGraphics.lineStyle(this.scene.getScaledValue(3), 0x000000, 1);

		// Remove any previous per-digit text objects
		this.answerInputText.forEach(t => t.destroy());
		this.answerInputText = [];
		this.commaText.forEach(t => t.destroy());
		this.commaText = [];

        if (useHorizontal) {
			// Horizontal: center question + '=' + box in one line
			const totalWidth = this.questionTextObj.displayWidth + gapBetween + boxWidth;
			const questionCenterX = -totalWidth / 2 + this.questionTextObj.displayWidth / 2;
			const boxCenterX = questionCenterX + this.questionTextObj.displayWidth / 2 + gapBetween + boxWidth / 2;

			// Place elements
			this.questionTextObj.setPosition(questionCenterX, 0);
			this.answerGraphics.setPosition(boxCenterX, 0);

			// Draw rounded rectangle centered at graphics local (0,0)
			this.answerGraphics.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius);

			// Draw underlines inside the box (aligned near bottom)
			const startX = -boxWidth / 2 + sidePadding + borderPadding / 2;
			const y = boxHeight / 2 - linePadding;
			const commaPositions = this.getCommaPositions(n);
			const extraCommaGap = this.scene.getScaledValue(8); // Extra gap for comma spacing
			
			let currentX = startX;
			for (let i = 0; i < n; i++) {
				this.answerGraphics.lineBetween(currentX, y, currentX + underlineLength, y);
				
				// Add comma after this position if needed (from left to right)
				if (commaPositions.includes(i + 1)) {
					const commaX = (boxCenterX + currentX + underlineLength + (underlineGap + extraCommaGap) / 2) / this.scene.display.scale;
					const commaY = (y - this.scene.getScaledValue(5)) / this.scene.display.scale; // Moved down by 3px
					const commaObj = this.scene.addText(commaX, commaY, this.getGroupingSeparator(), {
						font: "700 24px Exo",
						color: "#000000"
					}).setOrigin(0.5);
					this.questionContainer!.add(commaObj);
					this.commaText.push(commaObj);
					
					// Add extra spacing after comma
					currentX += underlineLength + underlineGap + extraCommaGap;
				} else {
					currentX += underlineLength + underlineGap;
				}
			}

			// Create per-digit answer text centered above each underline
			currentX = startX; // Reset position tracker
			for (let i = 0; i < n; i++) {
				const centerX = currentX + underlineLength / 2;
				const textYOffset = this.scene.getScaledValue(useHorizontal ? 25 : 18);
				const textX = (boxCenterX + centerX) / this.scene.display.scale;
				const textY = (y - textYOffset) / this.scene.display.scale;
				const textObj = this.scene.addText(textX, textY, '', {
					font: `700 ${answerFontSize}px Exo`,
					color: "#000000",
				}).setOrigin(0.5);
				this.questionContainer.add(textObj);
				this.answerInputText.push(textObj);
				
				// Update position with comma spacing consideration
				if (commaPositions.includes(i + 1)) {
					currentX += underlineLength + underlineGap + extraCommaGap;
				} else {
					currentX += underlineLength + underlineGap;
				}
			}
        } else {
            // Vertical: question centered above, box centered below
            const questionY = this.scene.getScaledValue(-30);
            const answerY = this.scene.getScaledValue(25);
            this.questionTextObj.setPosition(0, questionY);
            this.answerGraphics.setPosition(0, answerY);

            // Decimal questions: single underline and centered text with dynamic width
            if (hasDecimal) {
                const currentLength = Math.max(1, Math.min(10, this.inputValue.length || 1));
                const charWidth = underlineLength; // scaled space per character
                const decimalBoxWidth = charWidth * currentLength + borderPadding; // exclude side padding from width

                // Draw rounded rectangle centered at graphics local (0,0)
                this.answerGraphics.strokeRoundedRect(-decimalBoxWidth / 2, -boxHeight / 2, decimalBoxWidth, boxHeight, borderRadius);

                // Draw a single long underline
                const y = boxHeight / 2 - linePadding;
                const underlineStartX = -decimalBoxWidth / 2 + sidePadding + borderPadding / 2;
                const underlineEndX = decimalBoxWidth / 2 - sidePadding - borderPadding / 2;
                this.answerGraphics.lineBetween(underlineStartX, y, underlineEndX, y);

                // Create a single centered text object at the box center
                const textYOffset = this.scene.getScaledValue(15);
                const textX = 0; // centered in container local space
                const textY = (answerY + y - textYOffset) / this.scene.display.scale;
                const textObj = this.scene.addText(textX, textY, '', {
                    font: `700 ${answerFontSize}px Exo`,
                    color: "#000000",
                }).setOrigin(0.5);
                this.questionContainer.add(textObj);
                this.answerInputText.push(textObj);
            } else {
                // Non-decimal: multiple underlines and per-digit texts
                // Draw rounded rectangle centered at graphics local (0,0)
                this.answerGraphics.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius);

                // Draw underlines inside the box (aligned near bottom)
                const startX = -boxWidth / 2 + sidePadding + borderPadding / 2;
                const y = boxHeight / 2 - linePadding;
                const commaPositions = this.getCommaPositions(n);
                const extraCommaGap = this.scene.getScaledValue(8); // Extra gap for comma spacing
                
                let currentX = startX;
                for (let i = 0; i < n; i++) {
                    this.answerGraphics.lineBetween(currentX, y, currentX + underlineLength, y);
                    
                    // Add comma after this position if needed (from left to right)
                    if (commaPositions.includes(i + 1)) {
                        const commaX = (currentX + underlineLength + (underlineGap + extraCommaGap) / 2) / this.scene.display.scale;
                        const commaY = (answerY + y - this.scene.getScaledValue(5)) / this.scene.display.scale; // Moved down by 3px
                        const commaObj = this.scene.addText(commaX, commaY, this.getGroupingSeparator(), {
                            font: "700 24px Exo",
                            color: "#000000"
                        }).setOrigin(0.5);
                        this.questionContainer!.add(commaObj);
                        this.commaText.push(commaObj);
                        
                        // Add extra spacing after comma
                        currentX += underlineLength + underlineGap + extraCommaGap;
                    } else {
                        currentX += underlineLength + underlineGap;
                    }
                }

                // Create per-digit answer text centered above each underline
                currentX = startX; // Reset position tracker
                for (let i = 0; i < n; i++) {
                    const centerX = currentX + underlineLength / 2;
                    const textYOffset = this.scene.getScaledValue(15);
                    const textX = (centerX) / this.scene.display.scale;
                    const textY = (answerY + y - textYOffset) / this.scene.display.scale;
                    const textObj = this.scene.addText(textX, textY, '', {
                        font: `700 ${answerFontSize}px Exo`,
                        color: "#000000",
                    }).setOrigin(0.5);
                    this.questionContainer.add(textObj);
                    this.answerInputText.push(textObj);
                    
                    // Update position with comma spacing consideration
                    if (commaPositions.includes(i + 1)) {
                        currentX += underlineLength + underlineGap + extraCommaGap;
                    } else {
                        currentX += underlineLength + underlineGap;
                    }
                }
            }
        }

		// Initial render of input characters
		this.refreshAnswerDisplay();
    }

    private getDecimalSeparator(): string {
        return i18n.getLanguage() === 'es' ? ',' : '.';
    }

    private getGroupingSeparator(): string {
        return i18n.getLanguage() === 'es' ? '.' : ',';
    }

    private createNumberpad() {
        this.numpadContainer = this.scene.add.container(0, 0);

        const isBigNumpad = this.topic === 'grade6_topic1' || this.topic === 'g7_g8';

        const numpadBgKey = isBigNumpad ? 'numpad_bg_decimal' : 'numpad_bg';
        const numpadBg = this.scene.addImage(this.scene.display.width / 2, this.scene.display.height, numpadBgKey).setOrigin(0.5, 1).setName('numpad_bg');
        
        this.numpadContainer.add(numpadBg);

        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        const startX = isBigNumpad ? 310 : 365;
        const startY = 592;
        const gapX = 110;
        const gapY = 110;
        numbers.forEach((number, index) => {
            if (index === 5) {
                // create backspace button after 5th button
                if (this.topic === 'grade6_topic1') {
                    this.createDecimalButton(startX + 5 * gapX, startY);
                } else if (this.topic === 'g7_g8') {
                    this.createNegativeButton(startX + 5 * gapX, startY);
                } else {
                    this.createBackspaceButton(startX + 5 * gapX, startY);
                }
            }

            const x = startX + (index % 5) * gapX;
            const y = startY + Math.floor(index / 5) * gapY;
            
            this.createNumberButton(x, y, number);
        });

        if (isBigNumpad) {
            this.createBackspaceButton(startX + 5 * gapX, startY + gapY);
            this.createCheckButton(startX + 6 * gapX, startY + gapY / 2);
        } else {
            this.createCheckButton(startX + 5 * gapX, startY + gapY);
        }
    }

    private createBackspaceButton(x: number, y: number) {
        const backspaceButton = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            icon: 'backspace_icon',
            label: i18n.t('common.backspace'),
            x,
            y,
            onClick: () => this.handleBackspace()
        }).setName('backspace_button');

        this.numpadContainer.add(backspaceButton);
    }

    private createCheckButton(x: number, y: number) {
        const checkButton = ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            icon: 'check_icon',
            label: i18n.t('common.check'),
            x,
            y,
            onClick: () => {
                if (this.canSubmitCurrent()) {
                    this.checkAnswer();
                }
            }
        }).setName('check_button');

        this.numpadContainer.add(checkButton);
    }

    private createDecimalButton(x: number, y: number) {
        const decimalButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: this.getDecimalSeparator(),
            label: this.getDecimalSeparator(),
            textStyle: {
                font: "700 40px Exo",
                color: "#000000"
            },
            x,
            y,
            onClick: () => { this.appendDecimal(); }
        }).setName('decimal_button');
     
        this.numpadContainer.add(decimalButton);
    }

    private createNegativeButton(x: number, y: number) {
        const negativeButton = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: '−',
            label: '−',
            textStyle: {
                font: "700 40px Exo",
                color: "#000000"
            },
            x,
            y,
            onClick: () => { 
                if (this.inputValue.length === 0) {
                    this.inputValue = '-';
                    this.refreshAnswerDisplay();
                }
            }
        }).setName('negative_button');
     
        this.numpadContainer.add(negativeButton);
    }

    private createNumberButton(x: number, y: number, number: number) {
        const button = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: 'numpad_btn',
                hover: 'numpad_btn_hover',
                pressed: 'numpad_btn_pressed'
            },
            text: number.toString(),
            label: number.toString(),
            textStyle: {
                font: "700 40px Exo",
                color: "#000000"
            },
            x,
            y,
            onClick: () => { this.appendDigit(number.toString()); }
        }).setName(`number_pad_btn_${number}`);

        this.numpadContainer.add(button);
    }

    private setupKeyboardInput() {
        // Remove any existing handler to avoid duplicates
        this.scene.input.keyboard?.off('keydown');
        this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
            // During tutorials, when allowedKeys is set, we bypass global numpad enabled
            if (!this.isNumpadEnabled && !this.allowedKeys) return;

            const key = event.key;
            if (this.allowedKeys && !this.allowedKeys.has(key)) return;
            if (key >= '0' && key <= '9') {
                this.appendDigit(key);
            } else if (key === 'Backspace') {
                this.handleBackspace();
            } else if (key === this.getDecimalSeparator()) {
                this.appendDecimal();
            } else if (key === 'Enter') {
                if (this.canSubmitCurrent()) this.checkAnswer();
            } else if (key === '-' && this.topic === 'g7_g8') {
                if (this.inputValue.length === 0) {
                    this.inputValue = '-';
                    this.refreshAnswerDisplay();
                }
            }
        });
    }

    private appendDigit(digit: string) {
        if (!this.question) return;
        const maxDigits = Math.max(1, this.getDigitCount(this.question.answer || '1'));
        const currentDigits = this.inputValue.replace(/[^0-9]/g, '').length;
        const isDecimal = this.isCurrentQuestionDecimal();
        if (isDecimal) {
            if (this.inputValue.length >= 10) return;
        } else {
            if (currentDigits >= maxDigits) return;
        }
        this.inputValue += digit;
        this.refreshAnswerDisplay();
        // Notify instructions flow
        this.scene.events.emit('instruction:digit', digit, this.inputValue);
    }

    private appendDecimal() {
        if (!this.question) return;
        const isDecimalTopic = this.topic === 'grade6_topic1';
        if (!isDecimalTopic) return;
        if (this.inputValue.includes('.')) return;
        // Allow '.' at the beginning or after digits; cap total length to 10
        if (this.inputValue.length >= 10) return;
        this.inputValue += '.';
        this.refreshAnswerDisplay();
    }

    private handleBackspace() {
        if (this.inputValue.length === 0) return;
        this.inputValue = this.inputValue.slice(0, -1);
        this.refreshAnswerDisplay();
    }

    private refreshAnswerDisplay() {
        if (!this.answerInputText) return;
        const isDecimal = this.isCurrentQuestionDecimal();
        if (isDecimal) {
            // Single centered text and dynamic-width box/underline
            if (this.answerInputText.length > 0) {
                this.answerInputText[0].setText(this.inputValue.replace('.', this.getDecimalSeparator()));
            }

            if (!this.answerGraphics) return;

            // Recompute box width based on current input length (min 1, max 10)
            const currentLength = Math.max(1, Math.min(10, this.inputValue.length || 1));

            // Use vertical layout metrics (match updateQuestion vertical values)
            const borderRadius = this.scene.getScaledValue(10);
            const sidePadding = this.scene.getScaledValue(4);
            const linePadding = this.scene.getScaledValue(8);
            const underlineLength = this.scene.getScaledValue(19);
            const borderPadding = this.scene.getScaledValue(24);
            const boxHeight = this.scene.getScaledValue(50);

            const charWidth = currentLength === 1 ? this.scene.getScaledValue(24) : underlineLength; // scaled
            const boxWidth = charWidth * currentLength + borderPadding + sidePadding * 2;

            // Redraw box and single underline, keeping graphics centered
            this.answerGraphics.clear();
            this.answerGraphics.lineStyle(this.scene.getScaledValue(3), 0x000000, 1);
            this.answerGraphics.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, borderRadius);

            const y = boxHeight / 2 - linePadding;
            const underlineStartX = -boxWidth / 2 + sidePadding + borderPadding / 2;
            const underlineEndX = boxWidth / 2 - sidePadding - borderPadding / 2;
            this.answerGraphics.lineBetween(underlineStartX, y, underlineEndX, y);
            return;
        }

        // Non-decimal: per-slot display
        const slotCount = this.answerInputText.length;
        const displayStrings = this.buildSlotDisplayStrings(this.inputValue, slotCount);
        for (let i = 0; i < this.answerInputText.length; i++) {
            this.answerInputText[i].setText(displayStrings[i] ?? '');
        }
    }

    // Returns count of numeric digits in a value (ignores decimal points and signs)
    private getDigitCount(value: string | number): number {
        if (this.topic === 'g7_g8') {
            return String(value)
            .replace(/[^0-9\-−]/g, '') // keep digits, hyphen-minus, and Unicode minus
            .length;
        }
        return String(value)
            .replace(/[^0-9]/g, '')
            .length;
    }

    // Formats numbers with commas for 4+ digit numbers (e.g., "1,000", "10,500")
    private formatNumberWithCommas(value: string | number): string {
        const numValue = Number(value);
        if (isNaN(numValue)) return String(value);
        
        return i18n.formatNumber(numValue);
    }

    // Helper to determine where commas should appear in the answer input lines
    private getCommaPositions(digitCount: number): number[] {
        const positions: number[] = [];
        if (digitCount <= 3) return positions;
        
        // Add comma positions from right to left (every 3 digits)
        for (let pos = digitCount - 3; pos > 0; pos -= 3) {
            positions.push(pos);
        }
        return positions.reverse(); // Return in left-to-right order
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
            } else if (ch === '-') {
                if (slotIndex === 0) {
                    slots[slotIndex] = '−';
                    slotIndex++;
                }
            }
        }
        return slots;
    }

    private canSubmitCurrent(): boolean {
        if (!this.question) return false;
        const isDecimal = this.isCurrentQuestionDecimal();
        const maxDigits = this.getDigitCount(this.question.answer);
        let digitCount = 0;
        if (this.topic === 'g7_g8') {
            digitCount = this.inputValue.replace(/[^0-9\-−]/g, '').length;
        } else {
            digitCount = this.inputValue.replace(/[^0-9]/g, '').length;
        }
        if (isDecimal) {
            // Allow submit as soon as at least one digit is present
            return digitCount >= 1;
        }
        return digitCount === maxDigits;
    }

    private checkAnswer() {
        if (!this.question || !this.isNumpadEnabled) return;

        this.scene.events.emit('instruction:enter');

        // Stop timer and calculate completion time
        this.questionCompletionTime = Date.now() - this.questionStartTime;

        let isCorrect = false;
        if (this.isCurrentQuestionDecimal()) {
            const expectedNum = parseFloat(String(this.question.answer));
            const studentNum = parseFloat(this.inputValue);
            isCorrect = !isNaN(studentNum) && !isNaN(expectedNum) && studentNum === expectedNum;
        } else {
            isCorrect = this.inputValue === this.question.answer;
        }

        const questionText = this.multiverseQuestion?.["question text"] || '';
        const [questionPart] = questionText.split('=');
        const formattedQuestionText = `${questionPart}=?`;

        const gameLevelInfo = this.topic === 'grade2_topic3' ? 'game.emoji_battle.default' : 'game.multiverse.emoji_battle';

        if (isCorrect) {
            this.disableNumberpad();
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('common.correctFeedback'));
                this.queueAnnouncement(i18n.t('game.enemyLives', { lives: this.enemyLives - 1 }));
            })
            if (!this.isInstructionMode) {
                this.analyticsHelper?.createTrial({
                    questionMaxPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    achievedPoints: this.scoreHelper.getCurrentMultiplier() || 1,
                    questionText: formattedQuestionText,
                    isCorrect: true,
                    questionMechanic: 'default',
                    gameLevelInfo: gameLevelInfo,
                    studentResponse: this.inputValue,
                    studentResponseAccuracyPercentage: '100%',
                });
                this.scoreHelper.answerCorrectly();
                this.scoreCoins?.updateScoreDisplay(true);
            }
            const questionBg = this.scene.children.getByName('question_bg') as Phaser.GameObjects.Image;
            questionBg?.setTint(0xAFFF74);

            let correctTextContainer: Phaser.GameObjects.Container | null = null;
            if (!this.isInstructionMode) {
                correctTextContainer = this.createCorrectTextContainer();
            }

            this.stopIdleMovement('enemy');
            this.playShootAnimation('user', () => {
                this.decrementEnemyLifeline(() => {
                    correctTextContainer?.destroy();
                    if (this.isInstructionMode) {
                        this.scene.events.emit('instruction:afterSubmit', { isCorrect: true });
                        this.startIdleMovement('enemy');
                    } else {
                        this.startIdleMovement('enemy');
                        this.loadNextQuestion(
                            this.questionSelector!.createStudentResponse(
                                this.multiverseQuestion!,
                                this.questionCompletionTime,
                                true
                            )
                        );
                    }
                });
            });
        } else {
            if (this.isInstructionMode) return;
            this.disableNumberpad(0.15);
            this.scene.time.delayedCall(1000, () => {
                this.queueAnnouncement(i18n.t('common.incorrectFeedback'));
                this.queueAnnouncement(i18n.t('game.yourLives', { lives: this.userLives - 1 }));
            })
            this.analyticsHelper?.createTrial({
                questionMaxPoints: (this.scoreHelper.getCurrentMultiplier() || 1),
                achievedPoints: 0,
                questionText: formattedQuestionText,
                isCorrect: false,
                questionMechanic: 'default',
                gameLevelInfo: gameLevelInfo,
                studentResponse: this.inputValue,
                studentResponseAccuracyPercentage: '0%',
            });
            this.scoreHelper.answerIncorrectly();
            this.scoreCoins?.updateScoreDisplay(false);
            const questionBg = this.scene.children.getByName('question_bg') as Phaser.GameObjects.Image;
            questionBg?.setTint(0xFF9E9E);
            this.stopIdleMovement('user');
            this.playShootAnimation('enemy', () => {
                this.decrementUserLifeline(() => {
                    continueGameAfterWrongAnswer(this.scene, () => {
                        // If on boss, user lives are 0, and second chance not used, show retry overlay
                        if (this.currentEnemy === 7 && this.userLives === 0 && !this.bossSecondChanceUsed) {
                            this.showBossRetryOverlay();
                            return;
                        }
                        // Clear the input
                        this.inputValue = '';
                        this.refreshAnswerDisplay();
                        this.startIdleMovement('user');
                        this.loadNextQuestion(
                            this.questionSelector!.createStudentResponse(
                                this.multiverseQuestion!,
                                this.questionCompletionTime,
                                false
                            )
                        );
                    });
                });            
            });
        }
    }

    private createCorrectTextContainer(): Phaser.GameObjects.Container {
        const correctTextContainer = this.scene.add.container(this.scene.getScaledValue(this.scene.display.width / 2), this.scene.getScaledValue(40));
        const graphics = this.scene.add.graphics();
        const correctText = this.scene.addText(0, 0, i18n.t('common.correctFeedback'), {
        font: '700 34px Exo',
        color: '#6BFF00'
        }).setOrigin(0.5);
        graphics.fillStyle(0x000000, 0.5);
        const width = this.scene.getScaledValue(correctText.width + 30);
        const height = this.scene.getScaledValue(50);
        graphics.fillRoundedRect(-width/2, -height/2, width, height, this.scene.getScaledValue(6));
        correctTextContainer.add(graphics);
        correctTextContainer.add(correctText);

        return correctTextContainer;
    }

    private loadNextQuestion(response?: StudentResponse) {
        if (this.isInstructionMode) {
            this.question = this.getTutorialQuestion();

            this.updateQuestion();
            return;
        }

        const questionBg = this.scene.children.getByName('question_bg') as Phaser.GameObjects.Image;
        questionBg?.setTint(0xffffff);

        const filter = getFilterForTopic(this.topic);
        this.multiverseQuestion = response 
        ? this.questionSelector!.getNextQuestion(response, filter) 
        : this.questionSelector!.getNextQuestion(undefined, filter);

        const isHeroDead = this.userLives === 0;
        const areAllEnemiesDead = (this.enemyLives === 0 && this.currentEnemyIndex >= this.enemySequence.length - 1);
        
        if (!this.multiverseQuestion) {
            this.gameOver();
            return;
        }

        if (isHeroDead || areAllEnemiesDead) {
            const emoji = isHeroDead ? 'enemy' : 'user';
            this.stopIdleMovement('user');
            this.stopIdleMovement('enemy');
            this.playCharacterJumpAnimation(emoji, () => {
                this.gameOver();
            });
            return;
        }

        this.scene.time.delayedCall(100, () => {
            this.enableNumberpad();
        });
        
        this.scene.audioManager.playSoundEffect('question_change_sfx');

        this.question = this.extractQuestion(this.multiverseQuestion["question text"]);

        this.questionStartTime = Date.now();

        this.inputValue = '';
        this.updateQuestion();
    }

    private getTutorialQuestion() {
        const tutorialQuestion: Record<string, { operand1: string, operand2: string, answer: string, operator: string }> = {
            grade2_topic1: { operand1: '5', operand2: '3', answer: '8', operator: '+' },
            grade2_topic3: { operand1: '20', operand2: '30', answer: '50', operator: '+' },
            grade2_topic4: { operand1: '60', operand2: '20', answer: '40', operator: '-' },
            grade3_topic2: { operand1: '5', operand2: '2', answer: '10', operator: '×' },
            grade3_topic3: { operand1: '5', operand2: '2', answer: '10', operator: '×' },
            grade3_topic4: { operand1: '12', operand2: '2', answer: '6', operator: '÷' },
            grade4_topic2: { operand1: '1000', operand2: '200', answer: '1200', operator: '+' },
            grade5_topic3: { operand1: '10', operand2: '50', answer: '500', operator: '×' },
            grade6_topic1: { operand1: '0.6', operand2: '0.4', answer: '1', operator: '+' },
        };
      
        if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
            if (this.mode === 'add') {
                return { operand1: '70', operand2: '80', answer: '150', operator: '+' };
            } else if (this.mode === 'sub') {
                return { operand1: '150', operand2: '70', answer: '80', operator: '-' };
            } else if (this.mode === 'mul') {
                return { operand1: '7', operand2: '9', answer: '63', operator: '×' };
            } else if (this.mode === 'div') {
                return { operand1: '56', operand2: '7', answer: '8', operator: '÷' };
            } else {
                return { operand1: '70', operand2: '80', answer: '150', operator: '+' };
            }
        }

        return tutorialQuestion[this.topic] ?? { operand1: '5', operand2: '3', answer: '8', operator: '+' };
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

    private createEmojis() {
        this.userEmojiContainer = this.scene.add.container(
            this.scene.getScaledValue(250),
            this.scene.getScaledValue(394)
        ).setDepth(10);

        const userEmojiShadow = this.scene.addImage(0, 62, 'emoji_shadow');
        userEmojiShadow.setName('user_emoji_shadow');
        const userEmoji = this.scene.addImage(0, 0, `hero_${this.selectedHeroId}`).setScale(0.8);
        userEmoji.setName('user_emoji');

        this.userEmojiContainer.add([userEmojiShadow, userEmoji]);

        this.startIdleMovement('user');

        this.enemyEmojiContainer = this.scene.add.container(
            this.scene.getScaledValue(1035),
            this.scene.getScaledValue(394)
        ).setDepth(10);

        const enemyEmojiShadow = this.scene.addImage(0, 62, 'emoji_shadow').setFlipX(true);
        enemyEmojiShadow.setName('enemy_emoji_shadow');
        enemyEmojiShadow.setScale(this.currentEnemy === 7 ? 1.4 : 1);
        const enemyEmoji = this.scene.addImage(0, 0, 'enemy_1').setScale(0.8);
        enemyEmoji.setName('enemy_emoji');

        this.enemyEmojiContainer.add([enemyEmojiShadow, enemyEmoji]);
        
        enemyEmoji.setTexture(`enemy_${this.currentEnemy}`);

        this.startIdleMovement('enemy');
    }

    /**
     * Starts a looping, subtle curvy idle movement on the specified emoji image.
     * The motion moves slightly up-left, then down at center, then up-right, returning to origin.
     */
    public startIdleMovement(emoji: 'user' | 'enemy' = 'user') {
        const emojiImage = this.getEmojiImage(emoji);
        if (!emojiImage) return;

        // Ensure only one timeline is active per emoji
        this.stopIdleMovement(emoji);

        const dx = this.scene.getScaledValue(6);
        const dyEdge = this.scene.getScaledValue(3);   // slight lift on edges (upwards)
        const dyMid = this.scene.getScaledValue(6);   // center dips more
        let bossXOffset = 0;
        let baseYOffset = 0;
        if (emoji === 'enemy' && this.currentEnemy === 7) {
            bossXOffset = this.BOSS_ENEMY_POS.x;
            baseYOffset = this.BOSS_ENEMY_POS.y;
        }

        // Drive a smooth parametric curve using a counter tween
        const tween = this.scene.tweens.addCounter({
            from: 0,
            to: Math.PI * 2,
            ease: 'Linear',
            duration: 2400,
            repeat: -1,
            onUpdate: (tw) => {
                const theta = tw.getValue();
                const x = dx * Math.sin(theta);
                const y = (dyEdge) - (dyMid * Math.sin(theta) * Math.sin(theta));
                emojiImage.setPosition(x + bossXOffset, y + baseYOffset);

                const shadowImage = this.getEmojiShadow(emoji);
                if (shadowImage) {
                    const baseY = this.scene.getScaledValue(62);
                    shadowImage.setPosition(x, baseY + y * 0.35);
                }
            }
        });

        if (emoji === 'user') this.userIdleTween = tween;
        else this.enemyIdleTween = tween;
    }

    public stopIdleMovement(emoji: 'user' | 'enemy' = 'user') {
        const tween = emoji === 'user' ? this.userIdleTween : this.enemyIdleTween;
        if (tween) {
            tween.stop();
            tween.remove();
        }
        if (emoji === 'user') this.userIdleTween = undefined;
        else this.enemyIdleTween = undefined;

        const emojiImage = this.getEmojiImage(emoji);
        let emojiXOffset = 0;
        let emojiYOffset = 0;
        if (emoji === 'enemy' && this.currentEnemy === 7) {
            emojiXOffset = this.BOSS_ENEMY_POS.x;
            emojiYOffset = this.BOSS_ENEMY_POS.y;
        }
        emojiImage?.setPosition(emojiXOffset, emojiYOffset);

        const shadowImage = this.getEmojiShadow(emoji);
        if (shadowImage) shadowImage.setPosition(0, this.scene.getScaledValue(62));
    }

    private getEmojiImage(emoji: 'user' | 'enemy'): Phaser.GameObjects.Image | null {
        const container = emoji === 'user' ? this.userEmojiContainer : this.enemyEmojiContainer;
        if (!container) return null;
        return container.getByName(`${emoji}_emoji`) as Phaser.GameObjects.Image | null;
    }

    private getEmojiShadow(emoji: 'user' | 'enemy'): Phaser.GameObjects.Image | null {
        const container = emoji === 'user' ? this.userEmojiContainer : this.enemyEmojiContainer;
        if (!container) return null;
        return container.getByName(`${emoji}_emoji_shadow`) as Phaser.GameObjects.Image | null;
    }

    private changeEnemy(onComplete?: () => void) {
        if (!this.enemyEmojiContainer) return;

        const beam = this.scene.addImage(1035, 225, 'spaceship_beam').setOrigin(0.5);

        this.scene.audioManager.playSoundEffect('character_disappear');

        this.currentEnemyIndex++;
        this.currentEnemy = this.enemySequence[this.currentEnemyIndex];
        const enemyEmoji = this.enemyEmojiContainer.getByName('enemy_emoji') as Phaser.GameObjects.Image;
        const enemyEmojiShadow = this.enemyEmojiContainer.getByName('enemy_emoji_shadow') as Phaser.GameObjects.Image;
        
        this.scene.tweens.add({
            targets: enemyEmoji,
            y: "-=" + this.scene.getScaledValue(500),
            x: "+=" + this.scene.getScaledValue(40),
            scale: this.scene.getScaledValue(0.5),
            duration: 800,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                const enemyChangeSfx = this.scene.audioManager.playSoundEffect('enemy_change_sfx');
                enemyChangeSfx?.on("complete", () => {
                    enemyEmoji.setTexture(`enemy_${this.currentEnemy}`);
                    this.scene.audioManager.playSoundEffect('character_appear');

                    // Reset enemy lives - final boss (enemy 7) gets 5 lives, others get 3
                    this.enemyLives = this.currentEnemy === 7 ? 5 : 3;
                    
                    // Update lifeline display
                    this.updateEnemyLifelineDisplay();

                    let enemyXOffset = 0;
                    let enemyYOffset = 0;
                    if (this.currentEnemy === 7) {
                        enemyXOffset = this.BOSS_ENEMY_POS.x;
                        enemyYOffset = this.BOSS_ENEMY_POS.y;
                    }
                    this.scene.tweens.add({
                        targets: enemyEmoji,
                        y: enemyYOffset,
                        x: enemyXOffset,
                        scale: this.scene.getScaledValue(this.currentEnemy === 7 ? 1 : 0.8),
                        duration: 800,
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            beam.destroy();
                            this.scene.time.delayedCall(1200, () => {
                                this.showMascotCelebration(() => {
                                    onComplete?.();
                                })
                            });
                        }
                    })

                    // Scale up enemy emoji shadow
                    this.scene.tweens.add({
                        targets: enemyEmojiShadow,
                        scale: this.scene.getScaledValue(this.currentEnemy === 7 ? 1.4 : 1),
                        duration: 800,
                        ease: 'Sine.easeInOut',
                    })
                });
            }
        });

        // Scale down enemy emoji shadow
        this.scene.tweens.add({
            targets: enemyEmojiShadow,
            scale: this.scene.getScaledValue(0.6),
            duration: 800,
            ease: 'Sine.easeInOut',
            repeat: 0,
        })
    }

    private createUserLifeline() {
        const baseY = this.isInstructionMode ? 221 : 155;
        this.userLifelineContainer = this.scene.add.container(
            this.scene.getScaledValue(155),
            this.scene.getScaledValue(baseY)
        ).setDepth(100);

        const text = this.scene.addText(175, -23, i18n.t('game.you'), {
            font: '700 24px Exo',
        }).setOrigin(1, 0.5);

        this.userLifelineContainer.add(text);

        new TextOverlay(this.scene, text, { label: i18n.t('game.you') });

        const gapX = 10;
        const imageWidth = 30;
        for (let i = 0; i < this.userLives; i++) {
            const lifelineImage = this.scene.addImage(i * (gapX + imageWidth), 15, 'lifeline_full').setOrigin(0.5).setName(`user_lifeline_${i}`);
            this.userLifelineContainer.add(lifelineImage);
        }
    }

    private createEnemyLifeline() {
        const baseY = this.isInstructionMode ? 221 : 155;
        this.enemyLifelineContainer = this.scene.add.container(
            this.scene.getScaledValue(946),
            this.scene.getScaledValue(baseY)
        ).setDepth(100);
        
        // Initialize with first enemy's lives (3 for non-boss enemies)
        this.enemyLives = this.currentEnemy === 7 ? 5 : 3;
        this.updateEnemyLifelineDisplay();
    }

    private updateUserLifelineDisplay() {
        if (!this.userLifelineContainer) return;

        // Remove existing user lifeline images
        this.userLifelineContainer.getAll().forEach(child => {
            if (child.name?.startsWith('user_lifeline_')) {
                child.destroy();
            }
        });

        const gapX = 10;
        const imageWidth = 30;
        for (let i = 0; i < this.userLives; i++) {
            const lifelineImage = this.scene.addImage(i * (gapX + imageWidth), 15, 'lifeline_full').setOrigin(0.5).setName(`user_lifeline_${i}`);
            this.userLifelineContainer.add(lifelineImage);
        }
    }

    private updateEnemyLifelineDisplay() {
        if (!this.enemyLifelineContainer) return;
        
        // Clear existing lifeline images
        this.enemyLifelineContainer.getAll().forEach(child => {
            if (child.name?.startsWith('enemy_lifeline_')) {
                child.destroy();
            }
        });
        
        // Remove existing name text
        if (this.enemyNameText) {
            this.enemyNameText.destroy();
        }
        
        const gapX = 10;
        const imageWidth = 30;
        const startX = imageWidth / 2;
        
        for (let i = 0; i < this.enemyLives; i++) {
            const lifelineImage = this.scene.addImage(startX + i * (gapX + imageWidth), 15, 'lifeline_full').setOrigin(0.5).setName(`enemy_lifeline_${i}`);
            this.enemyLifelineContainer.add(lifelineImage);
        }

        let textVal = ENEMY_NAMES[this.currentEnemy];
        if (this.currentEnemy === 7) {
            const lang = i18n.getLanguage();
            textVal = lang === 'es' ? 'Jefe' : 'Boss';
        }
        this.enemyNameText = this.scene.addText(0, -23, textVal, {
            font: '700 24px Exo',
        }).setOrigin(0, 0.5);
        this.enemyLifelineContainer.add(this.enemyNameText);

        if (this.enemyNameTextOverlay) {
            this.enemyNameTextOverlay.updateContent(textVal);
            this.queueAnnouncement(i18n.t('game.newEnemy', { name: textVal }));
        }
        else {
            this.enemyNameTextOverlay = new TextOverlay(this.scene, this.enemyNameText, { label: textVal });
        }
    }

    private createAnimations() {
        if (!this.scene.anims.exists('shoot_animation')) {
            this.scene.anims.create({
                key: 'shoot_animation',
                frames: 'shoot',
                frameRate: 24,
                repeat: 0,
                hideOnComplete: true
            })
        }

        if (!this.scene.anims.exists('star_animation')) {
            this.scene.anims.create({
                key: 'star_animation',
                frames: 'star',
                frameRate: 8,
                repeat: 0,
                hideOnComplete: true
            })
        }

        if (!this.scene.anims.exists('heart_break_animation')) {
            this.scene.anims.create({
                key: 'heart_break_animation',
                frames: 'heart_break',
                frameRate: 16,
                repeat: 0,
                hideOnComplete: true
            });
        }
    }

    private playShootAnimation(from: 'user' | 'enemy', onComplete?: () => void) {
        this.scene.audioManager.playSoundEffect('shoot_sfx');
        const offset = from === 'user' ? 35 : -35;
        const shoot = this.scene.addSprite(640 + offset, 416, 'shoot').setOrigin(0.5).setDepth(100);
        shoot.setFlipX(from === 'enemy');
        shoot.setOrigin(0.5);
        shoot.play('shoot_animation');
        shoot.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            shoot.destroy();
            if (from === 'user') {
                this.scene.audioManager.playSoundEffect('correct_sfx');
                this.playStarAnimation('enemy', onComplete);
            }
            else {
                this.scene.audioManager.playSoundEffect('incorrect_sfx');
                this.playStarAnimation('user', onComplete);
            }
        });
    }

    private playStarAnimation(emoji: 'user' | 'enemy', onComplete?: () => void) {
        let x = 0;
        let y = 0;

        const emojiContainer = emoji === 'user' ? this.userEmojiContainer : this.enemyEmojiContainer;
        if (emojiContainer) {
            x = emojiContainer.getBounds().centerX / this.scene.display.scale;
            y = emojiContainer.getBounds().top / this.scene.display.scale + 20;
        }

        const star = this.scene.addSprite(x, y, 'star').setOrigin(0.5).setDepth(100);
        star.setFlipX(emoji === 'user');
        star.setOrigin(0.5);
        star.play('star_animation');

        this.scene.tweens.add({
            targets: [emojiContainer, star],
            duration: 80,
            alpha: 0.5,
            x: "-=" + this.scene.getScaledValue(10),
            yoyo: true,
            repeat: 1,
        });

        star.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            star.destroy();
            onComplete?.();
        });
    }

    private playCharacterJumpAnimation(emoji: 'user' | 'enemy', onComplete?: () => void) {
        const emojiContainer = emoji === 'user' ? this.userEmojiContainer : this.enemyEmojiContainer;

        if (!emojiContainer) {
            onComplete?.();
            return;
        }

        const emojiShadow = emojiContainer.getByName(`${emoji}_emoji_shadow`) as Phaser.GameObjects.Image;
        const emojiBg = emojiContainer.getByName(`${emoji}_emoji`) as Phaser.GameObjects.Image;

        const duration = 250;
        const repeat = 1;
        const ease = 'Sine.easeInOut';
        this.scene.tweens.add({
            targets: emojiBg,
            y: "-=" + this.scene.getScaledValue(50),
            duration: duration,
            ease: ease,
            yoyo: true,
            repeat: repeat,
            onComplete: () => {
                onComplete?.();
            }
        });

        this.scene.tweens.add({
            targets: emojiShadow,
            scale: this.scene.getScaledValue(0.97),
            duration: duration,
            ease: ease,
            yoyo: true,
            repeat: repeat,
        });
    }

    private gameOver() {
        this.scene.scene.pause();
        const finalScore = this.scoreHelper.endGame();
        this.scene.scene.launch('Scoreboard', {
            totalRounds: this.scoreHelper.getTotalQuestions(),
            rounds: this.scoreHelper.getCorrectAnswers(),
            score: finalScore,
        });
        this.scene.scene.bringToTop('Scoreboard');
    }

    private showBossRetryOverlay() {
        const gameButtons = [
            this.scene.children.getByName('pause_btn') as Phaser.GameObjects.Container,
            this.scene.children.getByName('mute_btn') as Phaser.GameObjects.Container,
            this.scene.children.getByName('volume_btn') as Phaser.GameObjects.Container,
            this.scene.children.getByName('help_btn') as Phaser.GameObjects.Container,
        ]

        // disable game buttons before showing overlay
        gameButtons.forEach(button => {
            ButtonHelper.disableButton(button);
        });

        const enableGameButtons = () => {
            gameButtons.forEach(button => {
                ButtonHelper.enableButton(button);
            });
        }

        // Create overlay container
        const overlay = this.scene.add.container(0, 0).setDepth(2000);

        // Dark tint background
        const bg = this.scene.addRectangle(
            0,
            0,
            this.scene.display.width,
            this.scene.display.height,
            0x000000,
            0.7
        ).setOrigin(0).setScrollFactor(0).setInteractive();

        overlay.add(bg);

        // Try Again button
        const tryAgainBtn = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.tryAgain'),
            label: i18n.t('common.tryAgain'),
            textStyle: { 
                font: '700 24px Exo'
            },
            x: this.scene.display.width / 2,
            y: this.scene.display.height / 2 - 70,
            onClick: () => {
                // Remove overlay
                overlay.destroy();
                enableGameButtons();
                this.bossSecondChanceUsed = true;
                // Reset lives to 5 and update UI
                this.userLives = 5;
                this.updateUserLifelineDisplay();
                // Continue game similar to continue button
                this.inputValue = '';
                this.refreshAnswerDisplay();
                this.startIdleMovement('user');
                this.loadNextQuestion(
                    this.questionSelector!.createStudentResponse(
                        this.multiverseQuestion!,
                        this.questionCompletionTime,
                        false
                    )
                );
            }
        });

        const tryAgainBtnOverlay = (tryAgainBtn as any).buttonOverlay;
        if (tryAgainBtnOverlay && tryAgainBtnOverlay.element) {
            tryAgainBtnOverlay.element.focus();
        }

        // Go to scoreboard button
        const goToScoreboardBtn = ButtonHelper.createButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            text: i18n.t('common.goToScoreboard'),
            label: i18n.t('common.goToScoreboard'),
            textStyle: { 
                font: '700 24px Exo'
            },
            x: this.scene.display.width / 2,
            y: this.scene.display.height / 2 + 70,
            onClick: () => {
                overlay.destroy();
                enableGameButtons();
                this.gameOver();
            }
        });

        overlay.add([tryAgainBtn, goToScoreboardBtn]);
    }

    private generateEnemySequence() {
        const allEnemies = [1, 2, 3, 4, 5, 6];
        
        // Shuffle the array using Fisher-Yates algorithm
        for (let i = allEnemies.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allEnemies[i], allEnemies[j]] = [allEnemies[j], allEnemies[i]];
        }
        
        // Take first 3 enemies and add enemy 7 as final boss
        this.enemySequence = [...allEnemies.slice(0, 3), 7];

        this.enemySequence.sort((a, b) => a - b);
    }

    private resetGame() {
        this.scoreHelper.reset();
        this.questionSelector?.reset();
        this.userLives = 5;
        this.enemyLives = 3;
        this.currentEnemyIndex = 0;
        this.bossSecondChanceUsed = false;
        this.generateEnemySequence(); // Generate new random sequence on reset
        this.currentEnemy = this.enemySequence[this.currentEnemyIndex];
    }

    private decrementUserLifeline(onFinished?: () => void) {
        if (this.userLives <= 0) return;

        this.scene.time.delayedCall(200, () => {
            this.userLives -= 1;
            const indexToEmpty = this.userLives; // after decrement, this is the rightmost full
            const img = this.userLifelineContainer?.getByName(`user_lifeline_${indexToEmpty}`) as Phaser.GameObjects.Image | null;
            img?.setTexture('lifeline_empty');

            this.playHeartBreakAnimation('user', () => {
                this.scene.time.delayedCall(800, () => {
                    this.showCorrectAnswer(() => {
                        onFinished?.();
                    });
                })
            })
        })
    }

    private showCorrectAnswer(onComplete?: () => void) {
        if (!this.question) {
            onComplete?.();
            return;
        }

        // Set the correct answer in the input box
        this.inputValue = this.question.answer;
        this.refreshAnswerDisplay();

        // Change question background to white
        const questionBg = this.scene.children.getByName('question_bg') as Phaser.GameObjects.Image;
        questionBg?.setTint(0xAFFF74);

        // Wait for 1.5 seconds, then clear and call onComplete
        // this.scene.time.delayedCall(1500, () => {
        //     // Clear the input
        //     this.inputValue = '';
        //     this.refreshAnswerDisplay();
            
        // });
        // Call the completion callback
        onComplete?.();
    }

    private decrementEnemyLifeline(onFinished?: () => void) {
        if (this.enemyLives <= 0) return;

        this.scene.time.delayedCall(200, () => {
            this.enemyLives -= 1;
            const indexToEmpty = this.enemyLives; // after decrement, this is the rightmost full
            const img = this.enemyLifelineContainer?.getByName(`enemy_lifeline_${indexToEmpty}`) as Phaser.GameObjects.Image | null;
            img?.setTexture('lifeline_empty');

            this.playHeartBreakAnimation('enemy', () => {
                if (this.enemyLives === 0 && this.currentEnemyIndex < this.enemySequence.length - 1) {
                    this.scene.time.delayedCall(500, () => {
                        this.changeEnemy(() => {
                            onFinished?.();
                        });
                    });
                } else {
                    this.scene.time.delayedCall(1200, () => {
                        onFinished?.();
                    })
                }
            })
        });
    }

    private playHeartBreakAnimation(emoji: 'user' | 'enemy', onComplete?: () => void) {
        let x = 0;
        let y = 0;

        const emojiContainer = emoji === 'user' ? this.userEmojiContainer : this.enemyEmojiContainer;
        if (emojiContainer) {
            x = emojiContainer.getBounds().centerX / this.scene.display.scale;
            y = emojiContainer.getBounds().top / this.scene.display.scale - 30;
        }
        
        const heartBreak = this.scene.addSprite(x, y, 'heart_break').setOrigin(0.5).setDepth(100);
        heartBreak.play('heart_break_animation');
        this.scene.audioManager.playSoundEffect('life_lost_sfx');

        heartBreak.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            heartBreak.destroy();
            onComplete?.();
        });
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
            y: 63,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.scene.pause();
                this.scene.scene.launch("PauseScene", { parentScene: "GameScene" });
                this.scene.audioManager.pauseAll();
                this.scene.scene.bringToTop("PauseScene");
            },
        }).setDepth(100).setName('pause_btn');

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
            x: this.scene.display.width - 60,
            y: 149,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.setMute(!this.scene.audioManager.getIsAllMuted());
            },
        }).setDepth(100).setName('mute_btn');

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
        volumeSlider.create(this.scene.display.width - 220, 255, 'purple', i18n.t('common.volume'));
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
            y: 235,
            raisedOffset: 3.5,
            onClick: () => {
                volumeSlider.toggleControl();
            },
        }).setDepth(100).setName('volume_btn');

        // Help button
        ButtonHelper.createIconButton({
            scene: this.scene,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.HELP_ICON.KEY,
            label: i18n.t('common.help'),
            x: this.scene.display.width - 60,
            y: 321,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.audioManager.pauseAll();
                this.scene.scene.pause();
                this.scene.scene.launch('InstructionsScene', { parentScene: 'GameScene' });
                this.scene.scene.bringToTop("InstructionsScene");
            },
        }).setDepth(100).setName('help_btn');
    }

    private disableNumberpad(alpha: number = 0.5) {
        this.isNumpadEnabled = false;
        this.numpadContainer.getAll().forEach((child) => {
            if (child.name === 'numpad_bg') return;
            (child as Phaser.GameObjects.Container).setAlpha(alpha);
            ButtonHelper.disableButton(child as Phaser.GameObjects.Container);
        });
    }

    private enableNumberpad() {
        this.isNumpadEnabled = true;
        this.numpadContainer.getAll().forEach((child) => {
            if (child.name === 'numpad_bg') return;
            (child as Phaser.GameObjects.Container).setAlpha(1);
            ButtonHelper.enableButton(child as Phaser.GameObjects.Container);
        });
    }

    public destroyNumberpad() {
        this.numpadContainer.destroy();
        this.scene.input.keyboard?.off('keydown');
    }

    private showMascotCelebration(cb?: () => void) {
        this.scene.scene.pause();
        this.scene.scene.launch('CelebrationScene', {
            scoreHelper: this.scoreHelper,
            callback: () => {
                cb?.();
            }
        });
        this.scene.scene.bringToTop('CelebrationScene');
    }

    // Public helpers for Instructions Scene
    public setAllowedKeys(keys: Set<string> | null) {
        this.allowedKeys = keys;
    }

    public setNumberpadEnabled(enabled: boolean) {
        if (enabled) {
            this.enableNumberpad();
        } else {
            this.disableNumberpad();
        }
    }

    public getNumpadButtonByName(name: string): Phaser.GameObjects.Container | null {
        if (!this.numpadContainer) return null;
        return (this.numpadContainer.getByName(name) as Phaser.GameObjects.Container) || null;
    }

    public getCurrentQuestion(): Question | null {
        return this.question;
    }

    public getAllNumpadButtons(): Phaser.GameObjects.Container[] {
        if (!this.numpadContainer) return [];
        return this.numpadContainer.getAll().filter(c => c instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container[];
    }

    public setInputValueForInstruction(value: string) {
        if (!this.isInstructionMode) return;
        this.inputValue = value;
        this.refreshAnswerDisplay();
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
        const delay = Math.max(estimatedDuration + 500, 1000); // Minimum 1 second
    
        this.scene.time.delayedCall(delay, () => {
            this.isAnnouncing = false;
            this.processAnnouncementQueue();
        });
    }
}