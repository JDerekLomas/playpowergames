import { BaseScene, ButtonHelper, i18n, setSceneBackground, TextOverlay, ButtonOverlay, focusToGameContainer } from "@k8-games/sdk";
import { BUTTONS, BUTTONS_YELLOW, COMMON_ASSETS, TOPICS } from "../config/common";

export class FractionLabScene extends BaseScene {
    private parentScene?: string;
    private numerator: number = 0;
    private denominator: number = 1;
    private numeratorText?: Phaser.GameObjects.Text;
    private denominatorText?: Phaser.GameObjects.Text;
    private decimalLabelText?: Phaser.GameObjects.Text;
    private decimalValueText?: Phaser.GameObjects.Text;
    private percentageLabelText?: Phaser.GameObjects.Text;
    private percentageValueText?: Phaser.GameObjects.Text;
    private numberLineGraphics?: Phaser.GameObjects.Graphics;
    private numberLineLabels: Phaser.GameObjects.Text[] = [];
    private currentTween?: Phaser.Tweens.Tween;
    private squareGraphicsContainer?: Phaser.GameObjects.Container;
    private isProcessing: boolean = false;
    private topic: string = '';
    private labRoot?: Phaser.GameObjects.Container; // root container for dialog semantics
    private previouslyFocusedElement?: HTMLElement | null; // restore focus after close
    private isAudioPlaying: boolean = false;

    // Constants for better maintainability
    private readonly MAX_VALUE = 12;
    private readonly CARD_WIDTH = this.getScaledValue(830);
    private readonly CARD_HEIGHT = this.getScaledValue(575);

    constructor() {
        super('FractionLabScene');
    }

    init(data: { parentScene: string, topic: string }) {
        this.parentScene = data.parentScene;
        this.topic = data.topic;
        this.numerator = 0;
        this.denominator = 1;
        this.isAudioPlaying = false;

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const firstChild = gameContainer.firstChild as HTMLDivElement;
            if (firstChild) {
                firstChild.setAttribute('role', 'dialog');
                firstChild.setAttribute('aria-modal', 'true');
                firstChild.setAttribute('aria-labelledby', 'fractionLabTitle');
            }
        }
    }

    create() {
        // Set the scene background with a dark overlay
        setSceneBackground('assets/images/common/bg.png', true); // true enables the dark overlay
    // Capture previously focused element (outside modal) and set focus to game container for SR context
    this.previouslyFocusedElement = (document.activeElement as HTMLElement) || null;
    focusToGameContainer();
        
        this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.BACKGROUND.KEY)
            .setOrigin(0.5)
            .setDepth(0);
        
        this.createCloseButton();
        this.createHeader();
        this.createCard();
        this.installFocusTrap();

        this.input.keyboard?.on("keydown-ESC", () => {
            this.handleCloseButtonClick();
        });
    }

    private createHeader() {
        // Title
        const title = this.addText(this.display.width / 2, 40, i18n.t('fractionLab.title'), {
            font: '700 36px Exo',
            color: '#000',
        }).setOrigin(0.5);
        const titleOverlay = new TextOverlay(this, title, { label: i18n.t('fractionLab.title'), tag: 'h1', role: 'heading' });
        titleOverlay.element.setAttribute('id', 'fractionLabTitle');

        // Create title text audio button
        this.topic === TOPICS.compare_numbers.TYPE && this.createInfoTextAudio((this.display.width / 2) - (title.width / 2) - 20, 40, 'fraction_lab_title', i18n.t('fractionLab.playTitleAudio'));
        // Lab icon
        this.addImage(this.display.width / 2 + title.displayWidth / 2 + 25, 37, BUTTONS_YELLOW.LAB_ICON.KEY)
            .setOrigin(0.5)
            .setTint(0x000000);

        // Description
        const description = this.addText(this.display.width / 2, 90, i18n.t('fractionLab.description'), {
            font: '500 22px Exo',
            color: '#000',
        }).setOrigin(0.5);
        new TextOverlay(this, description, { label: i18n.t('fractionLab.description'), tag: 'h2', role: 'heading' });
        
        // Create description text audio button
        this.topic === TOPICS.compare_numbers.TYPE && this.createInfoTextAudio((this.display.width / 2) - (description.width / 2) - 20, 90, 'fraction_lab_description', i18n.t('fractionLab.playDescriptionAudio'));
    }

    private createInfoTextAudio(
    x: number, 
    y: number, 
    soundEffect: string,
    label: string = ''
    ): Phaser.GameObjects.GameObject {
        const finalConfig = {
            imageKeys: {
                default: 'transparent',
                hover: 'transparent',
                pressed: 'transparent',
            },
            icon: 'info_text_audio_button',
            label: label,
            raisedOffset: 0,
        };

        const infoTextAudioButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: finalConfig.imageKeys,
            icon: finalConfig.icon,
            label: finalConfig.label,
            x,
            y,
            raisedOffset: finalConfig.raisedOffset,
            onClick: () => {
                if (this.isAudioPlaying) return;
                infoTextAudioButton.disableInteractive();
                this.audioManager.duckBackgroundMusic();
                this.isAudioPlaying = true;
                const sound = this.audioManager.playSoundEffect(soundEffect);
                if (sound) {
                    sound.once(Phaser.Sound.Events.COMPLETE, () => {
                        this.isAudioPlaying = false;
                        if (infoTextAudioButton.scene && infoTextAudioButton.scene.sys.isActive()) {
                            this.audioManager.unduckBackgroundMusic();
                            infoTextAudioButton.setInteractive();
                        }
                    });
                } else {
                    this.isAudioPlaying = false;
                    if (infoTextAudioButton.scene && infoTextAudioButton.scene.sys.isActive()) {
                        this.audioManager.unduckBackgroundMusic();
                        infoTextAudioButton.setInteractive();
                    }
                }
            },
        });
        // Disable for screen readers
        // infoTextAudioButton.setData('aria-hidden', 'true');
        return infoTextAudioButton;
    }

    private createCard() {
        const cardX = this.getScaledValue(this.display.width / 2);
        const cardY = this.getScaledValue(this.display.height / 2 + 40);
        
        // Create card background
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xffffff, 1);
        cardBg.lineStyle(4, 0xdbe6f7, 1);
        cardBg.fillRoundedRect(-this.CARD_WIDTH/2, -this.CARD_HEIGHT/2, this.CARD_WIDTH, this.CARD_HEIGHT, 24);
        cardBg.strokeRoundedRect(-this.CARD_WIDTH/2, -this.CARD_HEIGHT/2, this.CARD_WIDTH, this.CARD_HEIGHT, 24);
        
        const cardContainer = this.add.container(cardX, cardY, [cardBg]);
        cardContainer.setDepth(10);
        this.labRoot = cardContainer;

        // Create all card components
        this.createFractionControls(cardContainer);
        this.createDecimalPercentage(cardContainer);
        this.createRepresentations(cardContainer);
    }

    private handleCloseButtonClick() {

        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            const firstChild = gameContainer.firstChild as HTMLDivElement;
            if (firstChild) {
                firstChild.removeAttribute('role');
                firstChild.removeAttribute('aria-modal');
                firstChild.removeAttribute('aria-labelledby');
                firstChild.removeAttribute('tabindex');
            }
        }

        if (this.parentScene) {
            this.scene.resume('GameScene');
            this.scene.stop('FractionLabScene');
        }
        // Restore focus to previously focused element after teardown
        this.time.delayedCall(0, () => {
            this.previouslyFocusedElement?.focus?.();
        });
    }

    private createCloseButton() {
        const closeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: 'icon_close',
            label: i18n.t('common.closeFractionLab'),
            x: this.display.width - 120,
            y: 40,
            onClick: () => this.handleCloseButtonClick()
        }).setDepth(100);
        // Ensure overlay element exists
        const overlay = (closeBtn as any).buttonOverlay;
        overlay?.focus();
    }

    // Simple focus trap within dialog while open
    private installFocusTrap() {
        const root = this.labRoot;
        if (!root) return;
        // Prefer game container scope
        const containerEl = document.getElementById('game-container');
        if (!containerEl) return;
        const handleKeydown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const focusables = containerEl.querySelectorAll<HTMLElement>(
                '[tabindex]:not([tabindex="-1"]), button, [role="button"]'
            );
            const list = Array.from(focusables).filter(el => el.offsetParent !== null && !el.hasAttribute('disabled'));
            if (list.length < 2) return; // nothing to trap
            const first = list[0];
            const last = list[list.length - 1];
            if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            } else if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        };
        containerEl.addEventListener('keydown', handleKeydown);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            containerEl.removeEventListener('keydown', handleKeydown);
        });
    }

    private createFractionControls(cardContainer: Phaser.GameObjects.Container) {
        // Numerator row
        const numeratorLabel = this.addText(-180, -200, i18n.t('fractionLab.numerator'), {
            font: '400 22px Exo', color: '#000',
        }).setOrigin(0.5, 0.5);
        cardContainer.add(numeratorLabel);
        new TextOverlay(this, numeratorLabel, { label: i18n.t('fractionLab.numerator'), tag: 'h2', role: 'heading' });

        this.createMinusButton(cardContainer, -80, -200, 'numerator');
        this.createNumberText(cardContainer, 0, -200, 'numerator');
        this.createPlusButton(cardContainer, 80, -200, 'numerator');

        // Denominator row
        const denominatorLabel = this.addText(-190, -100, i18n.t('fractionLab.denominator'), {
            font: '400 22px Exo', color: '#000',
        }).setOrigin(0.5, 0.5);
        cardContainer.add(denominatorLabel);
        new TextOverlay(this, denominatorLabel, { label: i18n.t('fractionLab.denominator'), tag: 'h2', role: 'heading' });

        // For now, reuse the same controls for denominator as a placeholder
        // You can implement separate state/logic for denominator if needed
        this.createMinusButton(cardContainer, -80, -100, 'denominator');
        this.createNumberText(cardContainer, 0, -100, 'denominator');
        this.createPlusButton(cardContainer, 80, -100, 'denominator');

        // Horizontal line between numerator and denominator
        const line = this.add.graphics();
        line.lineStyle(10, 0x2196f3, 1);
        line.strokeLineShape(new Phaser.Geom.Line(-60, 0, 60, 0));
        line.y = this.getScaledValue(-150);
        cardContainer.add(line);
    }

    private createMinusButton(cardContainer: Phaser.GameObjects.Container, x: number, y: number, type: 'numerator' | 'denominator') {
        const btn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            label: type === 'numerator' ? i18n.t('fractionLab.decreaseNumerator') : i18n.t('fractionLab.decreaseDenominator'),
            icon: 'icon_minus',
            x, y,
            onClick: () => this.handleButtonClick(type, 'minus')
        });
        cardContainer.add(btn);

        const overlay = (btn as any).buttonOverlay;
        overlay?.recreate();
    }

    private createPlusButton(cardContainer: Phaser.GameObjects.Container, x: number, y: number, type: 'numerator' | 'denominator') {
        const btn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            label: type === 'numerator' ? i18n.t('fractionLab.increaseNumerator') : i18n.t('fractionLab.increaseDenominator'),
            icon: 'icon_plus',
            x, y,
            onClick: () => this.handleButtonClick(type, 'plus')
        });
        cardContainer.add(btn);

        const overlay = (btn as any).buttonOverlay;
        overlay?.recreate();
    }

    private handleButtonClick(type: 'numerator' | 'denominator', operation: 'plus' | 'minus') {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const value = type === 'numerator' ? this.numerator : this.denominator;
        let newValue: number;

        if (type === 'numerator') {
            // Numerator can cycle from 0 to MAX_VALUE
            newValue = operation === 'plus' 
                ? Math.min(value + 1, this.MAX_VALUE)
                : Math.max(value - 1, 0);
        } else {
            // Denominator stays between 1 and MAX_VALUE
            newValue = operation === 'plus'
                ? Math.min(value + 1, this.MAX_VALUE)
                : Math.max(value - 1, 1);
        }

        if (type === 'numerator') {
            this.numerator = newValue;
        } else {
            this.denominator = newValue;
        }

        this.updateNumberDisplay(type);
    }

    private createNumberText(cardContainer: Phaser.GameObjects.Container, x: number, y: number, type: 'numerator' | 'denominator') {
        const boxWidth = this.getScaledValue(80);
        const boxHeight = this.getScaledValue(60);
        // Draw rounded rectangle
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1);
        graphics.lineStyle(2, 0xdbe6f7, 1);
        graphics.fillRoundedRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 10);
        graphics.strokeRoundedRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 10);
        // Add number text
        const numberText = this.addText(0, 0, type === 'numerator' ? this.numerator.toString() : this.denominator.toString(), {
            font: '700 36px Exo', color: '#2196f3',
        }).setOrigin(0.5);
        const overlay = new TextOverlay(this, numberText, { label: type === 'numerator' ? `${i18n.t('fractionLab.numerator')} ${this.numerator}` : `${i18n.t('fractionLab.denominator')} ${this.denominator}` });
        numberText.setData('overlay', overlay);
        // Group in a container
        const numberContainer = this.add.container(this.getScaledValue(x), this.getScaledValue(y), [graphics, numberText]);
        cardContainer.add(numberContainer);

        if (type === 'numerator') {
            this.numeratorText = numberText;
        } else {
            this.denominatorText = numberText;
        }
    }

    private createDecimalPercentage(cardContainer: Phaser.GameObjects.Container) {
        // Create a grey container for all text elements
        const containerWidth = this.getScaledValue(830);
        const containerHeight = this.getScaledValue(110);
        const greyContainer = this.add.graphics();
        greyContainer.fillStyle(0xf5f5f5, 1);
        greyContainer.fillRoundedRect(-containerWidth/2, -containerHeight/2, containerWidth, containerHeight, 12);
        
        // Create a container for all elements
        const textContainer = this.add.container(0, 0, [greyContainer]);
        
        // Decimal
        this.decimalLabelText = this.addText(-100, -20, i18n.t('fractionLab.decimal'), {
            font: '500 22px Exo', color: '#000',
        }).setOrigin(0.5);
        textContainer.add(this.decimalLabelText);
        const decimalOverlay = new TextOverlay(this, this.decimalLabelText, { label: i18n.t('fractionLab.decimal') + `: 0` });
        this.decimalLabelText.setData('overlay', decimalOverlay);

        this.decimalValueText = this.addText(-100, 20, '0', {
            font: '700 32px Exo', color: '#0075FF',
        }).setOrigin(0.5);
        textContainer.add(this.decimalValueText);
        
        // Percentage
        this.percentageLabelText = this.addText(100, -20, i18n.t('fractionLab.percentage'), {
            font: '500 22px Exo', color: '#000',
        }).setOrigin(0.5);
        textContainer.add(this.percentageLabelText);
        const percentageOverlay = new TextOverlay(this, this.percentageLabelText, { label: i18n.t('fractionLab.percentage') + `: 0%` });
        this.percentageLabelText.setData('overlay', percentageOverlay);

        this.percentageValueText = this.addText(100, 20, '0%', {
            font: '700 32px Exo', color: '#0075FF',
        }).setOrigin(0.5);
        textContainer.add(this.percentageValueText);
        
        // Add the text container to the card container
        textContainer.y = 0;
        cardContainer.add(textContainer);
    }

    private createRepresentations(cardContainer: Phaser.GameObjects.Container) {
        // Number Line Representation
        const numberLineLabel = this.addText(-60, 80, i18n.t('fractionLab.numberLineRepresentation'), {
            font: '400 22px Exo', color: '#000',
        }).setOrigin(0.5);
        cardContainer.add(numberLineLabel);
        new TextOverlay(this, numberLineLabel, { label: i18n.t('fractionLab.numberLineRepresentation'), tag: 'h2', role: 'heading' });

        // Add an inert, focusable overlay over the label without changing visuals
        const nlOverlay = this.add.container(numberLineLabel.x, numberLineLabel.y);
        nlOverlay.setSize(numberLineLabel.width, numberLineLabel.height);
        // Invisible hit area to ensure consistent bounds
        const nlHit = this.addRectangle(0, 0, numberLineLabel.width, numberLineLabel.height, 0x000000, 0)
            .setOrigin(0.5);
        nlOverlay.add(nlHit);
        cardContainer.add(nlOverlay);
        new ButtonOverlay(this, nlOverlay, {
            label: i18n.t('fractionLab.numberLineRepresentation'),
            onKeyDown: (e?: KeyboardEvent) => {
                const key = e?.key;
                if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                }
            },
        });

        // Draw the number line and keep a reference for updates
        this.numberLineGraphics = this.add.graphics();
        cardContainer.add(this.numberLineGraphics);
        this.drawNumberLine();

        // Square Representation
        const squareLabel = this.addText(-90, 170, i18n.t('fractionLab.squareRepresentation'), {
            font: '400 22px Exo', color: '#000',
        }).setOrigin(0.5);
        cardContainer.add(squareLabel);
        new TextOverlay(this, squareLabel, { label: i18n.t('fractionLab.squareRepresentation'), tag: 'h2', role: 'heading' });

        // Add an inert, focusable overlay over the label without changing visuals
        const sqOverlay = this.add.container(squareLabel.x, squareLabel.y);
        sqOverlay.setSize(squareLabel.width, squareLabel.height);
        // Invisible hit area to ensure consistent bounds
        const sqHit = this.addRectangle(0, 0, squareLabel.width, squareLabel.height, 0x000000, 0)
            .setOrigin(0.5);
        sqOverlay.add(sqHit);
        cardContainer.add(sqOverlay);
        new ButtonOverlay(this, sqOverlay, {
            label: i18n.t('fractionLab.squareRepresentation'),
            onKeyDown: (e?: KeyboardEvent) => {
                const key = e?.key;
                if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                }
            },
        });

        // Draw squares and keep a reference for updates
        this.squareGraphicsContainer = this.add.container();
        cardContainer.add(this.squareGraphicsContainer);
        this.drawSquares();
    }

    private drawNumberLine() {
        if (!this.numberLineGraphics) return;
        const g = this.numberLineGraphics;
        g.clear();

        // Clear old labels
        this.numberLineLabels.forEach(label => label.destroy());
        this.numberLineLabels = [];

        // Number line dimensions
        const lineWidth = this.getScaledValue(400);
        const lineHeight = this.getScaledValue(24);
        const lineX = this.getScaledValue(0);
        const lineY = this.getScaledValue(100);
        const tickOffsetWidth = this.getScaledValue(2.8);

        // Fraction value (avoid division by zero)
        const value = this.denominator === 0 ? 0 : this.numerator / this.denominator;
        
        // Calculate the scale factor based on the value
        const scaleFactor = Math.max(1, Math.ceil(value));
        const scaledValue = value / scaleFactor;

        // Use denominator for total ticks
        const totalTicks = scaleFactor <= 1 ? this.denominator : this.denominator * scaleFactor;

        // Draw number line border (thick black)
        g.lineStyle(8, 0x000000, 1);
        // Draw top line
        g.beginPath();
        g.moveTo(lineX - lineWidth / 2 - tickOffsetWidth, lineY);
        g.lineTo(lineX + lineWidth / 2 + tickOffsetWidth, lineY);
        g.strokePath();

        // Draw left vertical line
        g.lineStyle(8, 0x000000, 1);
        g.beginPath();
        g.moveTo(lineX - lineWidth / 2, lineY);
        g.lineTo(lineX - lineWidth / 2, lineY + lineHeight + tickOffsetWidth);
        g.strokePath();

        // Draw blue fill
        if (scaledValue > 0) {
            g.fillStyle(0x007AFF, 1);
            g.fillRect(lineX - lineWidth / 2 + tickOffsetWidth, lineY + tickOffsetWidth, lineWidth * scaledValue, lineHeight);
        }

        // Draw gray fill only if not 100%
        if (scaledValue < 1) {
            g.fillStyle(0xDCDCDC, 1);
            g.fillRect(lineX - lineWidth / 2 + lineWidth * scaledValue + tickOffsetWidth, lineY + tickOffsetWidth, lineWidth * (1 - scaledValue), lineHeight);
        }

        // Draw right vertical line last to ensure it's always visible
        g.lineStyle(8, 0x000000, 1);
        g.beginPath();
        g.moveTo(lineX + lineWidth / 2, lineY);
        g.lineTo(lineX + lineWidth / 2, lineY + lineHeight + tickOffsetWidth);
        g.strokePath();

        // Draw tick marks based on denominator
        for (let i = 1; i < totalTicks; i++) {
            const tickX = lineX - lineWidth / 2 + (lineWidth * i) / totalTicks;
            const isWholeNumber = scaleFactor > 1 && i % this.denominator === 0;
            
            // Draw tick mark
            g.lineStyle(6, 0x000000, 1);
            g.beginPath();
            g.moveTo(tickX, lineY);
            const tickHeight = isWholeNumber ? lineHeight + tickOffsetWidth : lineHeight - 10;
            g.lineTo(tickX, lineY + tickHeight);
            g.strokePath();

            // Only add label if it's a whole number and value is above 1
            if (isWholeNumber) {
                const label = this.addText(
                    tickX / this.display.scale,
                    (lineY + lineHeight) / this.display.scale + 20,
                    `${i/this.denominator}`,
                    { font: '700 16px Exo', color: '#000' }
                ).setOrigin(0.5);
                this.numberLineGraphics?.parentContainer?.add(label);
                this.numberLineLabels.push(label);
            }
        }

        // Always add 0 label at the start
        const zeroLabel = this.addText(
            (lineX - lineWidth / 2) / this.display.scale,
            (lineY + lineHeight) / this.display.scale + 20,
            '0',
            { font: '700 16px Exo', color: '#000' }
        ).setOrigin(0.5);
        this.numberLineGraphics?.parentContainer?.add(zeroLabel);
        this.numberLineLabels.push(zeroLabel);

        // Add end label based on scale factor
        const endLabel = this.addText(
            (lineX + lineWidth / 2) / this.display.scale,
            (lineY + lineHeight) / this.display.scale + 20,
            scaleFactor.toString(),
            { font: '700 16px Exo', color: '#000' }
        ).setOrigin(0.5);
        this.numberLineGraphics?.parentContainer?.add(endLabel);
        this.numberLineLabels.push(endLabel);
    }

    private drawSquares() {
        // Remove old graphics
        if (this.squareGraphicsContainer) {
            this.squareGraphicsContainer.removeAll(true);
        }

        const denominator = this.denominator || 1; // Avoid division by zero
        const numerator = this.numerator;

        // If percentage is 0, don't create any squares
        if (numerator === 0) {
            return;
        }

        // How many full bars and what is the remainder?
        const fullBars = Math.floor(numerator / denominator);
        const remainder = numerator % denominator;
        // Always show at least one bar
        const totalBars = Math.max(1, fullBars + (remainder > 0 ? 1 : 0));

        const barWidth = this.getScaledValue(400);
        const barHeight = this.getScaledValue(50);
        const barGap = this.getScaledValue(8);
        const totalWidth = barWidth; // The total width for all bars combined
        const singleBarWidth = (totalWidth - (totalBars - 1) * barGap) / totalBars;
        const xStart = -totalWidth / 2;
        const y = this.getScaledValue(200);

        let filledSegmentsLeft = numerator;

        for (let barIndex = 0; barIndex < totalBars; barIndex++) {
            // How many segments to fill in this bar?
            let filledSegments = Math.min(filledSegmentsLeft, denominator);
            filledSegmentsLeft -= filledSegments;

            // Draw the bar background (border)
            const bar = this.add.graphics();
            bar.lineStyle(6, 0x000000, 1);
            const x = xStart + barIndex * (singleBarWidth + barGap);
            bar.strokeRect(x, y, singleBarWidth, barHeight);

            // Draw filled and unfilled segments
            const segmentWidth = singleBarWidth / denominator;
            for (let i = 0; i < denominator; i++) {
                const segX = x + i * segmentWidth;
                const color = i < filledSegments ? 0x007AFF : 0xDCDCDC;
                const segment = this.add.graphics();
                segment.fillStyle(color, 1);
                segment.fillRect(segX, y, segmentWidth, barHeight);
                segment.lineStyle(6, 0x000000, 1);
                segment.strokeRect(segX, y, segmentWidth, barHeight);
                this.squareGraphicsContainer?.add(segment);
            }

            // Draw segment dividers
            for (let i = 1; i < denominator; i++) {
                const dividerX = x + i * segmentWidth;
                const divider = this.add.graphics();
                divider.lineStyle(6, 0x000000, 1);
                divider.beginPath();
                divider.moveTo(dividerX, y);
                divider.lineTo(dividerX, y + barHeight);
                divider.strokePath();
                this.squareGraphicsContainer?.add(divider);
            }

            // Add the bar border last so it appears on top
            this.squareGraphicsContainer?.add(bar);
        }
    }

    private updateNumberDisplay(type: 'numerator' | 'denominator') {
        const text = type === 'numerator' ? this.numeratorText : this.denominatorText;
        if (!text) return;
        const originalY = text.y;
        
        if (this.currentTween?.isPlaying()) {
            this.currentTween.destroy();
            text.alpha = 1;
        }
        
        this.currentTween = this.tweens.add({
            targets: text,
            alpha: 0,
            y: text.y + 50,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
                this.updateDisplayValues(text, type, originalY);
            }
        });
    }

    private updateDisplayValues(text: Phaser.GameObjects.Text, type: 'numerator' | 'denominator', originalY: number) {
        const decimalValue = this.denominator === 0 ? 0 : (this.numerator / this.denominator);
        const percentageValue = decimalValue * 100;
        
        text.setText(type === 'numerator' ? this.numerator.toString() : this.denominator.toString());
        text.y -= this.getScaledValue(50);
        this.decimalValueText?.setText(decimalValue.toFixed(2));
        this.percentageValueText?.setText(percentageValue.toFixed(0) + '%');

        const overlay = text.getData('overlay') as TextOverlay;
        if (overlay) {
            overlay.updateContent(type === 'numerator' ? `${i18n.t('fractionLab.numerator')} ${this.numerator}` : `${i18n.t('fractionLab.denominator')} ${this.denominator}`);
        }
        const decimalOverlay = this.decimalLabelText?.getData('overlay') as TextOverlay;
        if (decimalOverlay) {
            decimalOverlay.updateContent(`${i18n.t('fractionLab.decimal')}: ${decimalValue.toFixed(2)}`);
        }
        const percentageOverlay = this.percentageLabelText?.getData('overlay') as TextOverlay;
        if (percentageOverlay) {
            percentageOverlay.updateContent(`${i18n.t('fractionLab.percentage')}: ${percentageValue.toFixed(0)}%`);
        }
        
        this.drawNumberLine();
        this.drawSquares();
        
        this.currentTween = this.tweens.add({
            targets: text,
            alpha: 1,
            y: originalY,
            duration: 100,
            ease: 'Power2',
            onComplete: () => {
                this.isProcessing = false;
            }
        });
    }
}