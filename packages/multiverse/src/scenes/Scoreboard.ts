import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, Question, TextOverlay, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS } from '../config/common';

export class ScoreboardScene extends BaseScene {
    private dcpmCount: number[] = [];
    private incorrectQuestions: Question[] = [];
    private listContainer!: Phaser.GameObjects.Container;
    private sidebarHeader!: Phaser.GameObjects.Text;
    private scrollUpBtn!: Phaser.GameObjects.Image;
    private scrollDownBtn!: Phaser.GameObjects.Image;

    private readonly sidebarWidth = 281;
    private readonly scoreboardLeftPadding = 25;

    constructor() {
        super('ScoreboardScene');
    }

    create() {
        this.audioManager.playBackgroundMusic('bg-music');
        this.audioManager.playSoundEffect('scorecard_sfx');
        const contentWidth = this.display.width - this.sidebarWidth - this.scoreboardLeftPadding;

        // background
        this.addImage(this.display.width / 2, this.display.height / 2, 'scene_1_bg').setOrigin(0.5);
        
        // tinted overlay
        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.7).setOrigin(0.5);
        
        // scoreboard display background
        const bg = this.addImage(this.scoreboardLeftPadding, 28, 'scoreboard_display_bg').setOrigin(0);
        bg.y -= this.getScaledValue(300);
        this.tweens.add({
            targets: bg,
            y: "+=" + this.getScaledValue(300),
            duration: 100,
            ease: 'Bounce.easeOut',
            onComplete: () => {
                const centerX = this.scoreboardLeftPadding + contentWidth / 2;
                
                const calibrationReportText = this.addText(centerX, 114, i18n.t('additionAdventure.scoreboard.calibrationReport'), {
                    font: '700 36px Exo',
                    color: '#00A6FF',
                    align: 'center',
                }).setOrigin(0.5);

                new TextOverlay(this, calibrationReportText, { label: i18n.t('additionAdventure.scoreboard.calibrationReport'), tag: 'h1', role: 'heading' });

                const correctAnswerText = i18n.t('additionAdventure.scoreboard.correctAnswer');
                const dcpmValue = this.dcpmCount[this.dcpmCount.length - 1] || 0;

                const dcpmValueText = this.addText(centerX, 197, dcpmValue.toString(), {
                    font: '700 70px Exo',
                    color: '#fff',
                }).setOrigin(0.5, 0.5);

                new TextOverlay(this, dcpmValueText, { label: i18n.t('additionAdventure.instructions.numberCorrect') + ' ' + dcpmValue.toString(), announce: true });

                // Create texts at (0, textY) first
                this.addText(centerX, 252, correctAnswerText, {
                    font: '700 30px Exo',
                    color: '#FFFFFF',
                }).setOrigin(0.5, 0.5);

                this.createBarChart();
                this.createButtons();
                this.displaySidebar();
            }
        })
    }

    private createButtons(): void {
        const lang = i18n.getLanguage() || 'en';
        const contentWidth = this.display.width - this.sidebarWidth - this.scoreboardLeftPadding;
        const rectX = contentWidth / 2 + this.scoreboardLeftPadding;
        const buttonWidth = lang === 'en' ? 310 : 330;
        const buttonHeight = 70;
        const gap = 40;
        const y = this.display.height - 50 - buttonHeight / 2;
        const totalWidth = buttonWidth * 2 + gap;
        const startX = rectX - totalWidth / 2;

        // Retake Challenge (blue)
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: `${BUTTONS.BUTTON.KEY}_blue`,
                hover: `${BUTTONS.BUTTON_HOVER.KEY}_blue`,
                pressed: `${BUTTONS.BUTTON_PRESSED.KEY}_blue`,
            },
            text: i18n.t('additionAdventure.scoreboard.retakeChallenge'),
            label: i18n.t('additionAdventure.scoreboard.retakeChallenge'),
            textStyle: {
                font: '700 26px Exo',
                color: '#fff',
            },
            imageScale: 1.1, // adjust if needed
            x: startX + buttonWidth / 2,
            y,
            onClick: () => {
                this.audioManager.stopBackgroundMusic();

                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }

                const gameConfigManager = GameConfigManager.getInstance();
                const topic = gameConfigManager.get('topic') || 'grade3_topic2';
                if (topic === 'g5_g6' || topic === 'g7_g8') {
                    this.scene.start('SelectScene', { reset: true, parentScene: 'Scoreboard' });
                } else {
                    this.scene.start('GameScene', { reset: true, parentScene: 'Scoreboard' });
                }
            },
            icon: {
                key: 'calibrate_icon',
                gap: 12,
                position: 'left',
            }
        });

        // Enter Multiverse (purple)
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: `${BUTTONS.BUTTON.KEY}_purple`,
                hover: `${BUTTONS.BUTTON_HOVER.KEY}_purple`,
                pressed: `${BUTTONS.BUTTON_PRESSED.KEY}_purple`,
            },
            text: i18n.t('additionAdventure.scoreboard.enterMultiverse'),
            label: i18n.t('additionAdventure.scoreboard.enterMultiverse'),
            textStyle: {
                font: '700 26px Exo',
                color: '#fff',
            },
            imageScale: 1.1, // adjust if needed
            x: startX + buttonWidth + gap + buttonWidth / 2,
            y,
            onClick: () => {
                this.scene.start('MenuScene');
                // Add your multiverse logic here
            },
            icon: {
                key: 'door_icon',
                gap: 12,
                position: 'right',
            }
        });
    }

    private createBarChart(): void {
        const chartData = [...this.dcpmCount];
        if (!chartData.length) return;

        const visibleCount = 3; // number of bars visible at a time
        const barWidth = 125;
        const barSpacing = 30;
        const barMaxHeight = 160;
        const labelSpace = 36; // space below bars for X labels
        const axisLeftPadding = 25; // space for Y-axis labels
        const chartAreaWidth = axisLeftPadding + visibleCount * (barWidth + barSpacing) - barSpacing + 60;
        const chartAreaHeight = barMaxHeight + labelSpace + 100;

        // Main content area (excluding sidebar)
        const contentWidth = this.display.width - this.sidebarWidth - this.scoreboardLeftPadding;
        const contentHeight = this.display.height - 78;
        const contentX = this.scoreboardLeftPadding + contentWidth / 2;
        const contentY = contentHeight / 2 + 195;

        // Center the chart area in the main content
        const chartOriginX = contentX - chartAreaWidth / 2;
        const chartOriginY = contentY - chartAreaHeight / 2;

        let startIndex = chartData.length > 3 ? chartData.length - 3 : 0; // index of first visible item

        // ===== GRAPHICS CONTAINERS =====
        const chartContainer = this.add.container(
            this.getScaledValue(chartOriginX),
            this.getScaledValue(chartOriginY - 50),
        );
        const xAxisGraphics = this.add.graphics();
        const barsContainer = this.add.container(0, 0);
        const labelsContainer = this.add.container(0, 0);

        chartContainer.add([xAxisGraphics, barsContainer, labelsContainer]);

        // ===== RENDER FUNCTION =====
        const renderChart = () => {
            xAxisGraphics.clear();
            barsContainer.removeAll(true);
            labelsContainer.removeAll(true);

            // Get current visible slice
            const visibleBars = chartData.slice(startIndex, startIndex + visibleCount);
            const visibleBarsMax = Math.max(...visibleBars);
            const chartMax = Math.max(...chartData);

            // X-axis line
            xAxisGraphics.lineStyle(5, 0xBCE2FF, 1).setDepth(2);
            xAxisGraphics.beginPath();
            xAxisGraphics.moveTo(this.getScaledValue(axisLeftPadding) - 4, this.getScaledValue(40 + barMaxHeight) + 5);
            xAxisGraphics.lineTo(
                this.getScaledValue(axisLeftPadding + visibleCount * (barWidth + barSpacing) + barSpacing),
                this.getScaledValue(40 + barMaxHeight) + 5,
            );
            xAxisGraphics.strokePath();

            // Check if all visible bars have zero score
            const allVisibleBarsAreZero = visibleBars.every(score => score === 0);

            // Render bars & X labels
            visibleBars.forEach((data, i) => {
                const x = axisLeftPadding + barSpacing + i * (barWidth + barSpacing) + barWidth / 2;
                const lastElement = startIndex + i === chartData.length - 1;
                const isZeroScore = data === 0;

                // Actual bar
                const scaledX = this.getScaledValue(x);
                const scaledY = this.getScaledValue(40 + barMaxHeight);
                const scaledWidth = this.getScaledValue(barWidth - 8);

                if (isZeroScore) {
                    // Draw dotted bar for zero scores
                    const dottedBarHeight = barMaxHeight * 0.4; // 40% of max height
                    const scaledHeight = this.getScaledValue(dottedBarHeight);

                // Create dotted bar graphics
                const dottedBarGraphics = this.add.graphics();
                dottedBarGraphics.lineStyle(4, lastElement ? 0xBCE2FF : 0x7A9FB8, 1);
                
                // Draw dotted rectangle outline
                const dashLength = 8;
                const gapLength = 4;
                const rectX = scaledX - scaledWidth / 2;
                const rectY = scaledY - scaledHeight;
                
                // Top line (dashed)
                for (let x = 0; x < scaledWidth; x += dashLength + gapLength) {
                    const lineWidth = Math.min(dashLength, scaledWidth - x);
                    dottedBarGraphics.strokeLineShape(new Phaser.Geom.Line(
                        rectX + x, rectY, 
                        rectX + x + lineWidth, rectY
                    ));
                }
                
                // Right line (dashed)
                for (let y = 0; y < scaledHeight; y += dashLength + gapLength) {
                    const lineHeight = Math.min(dashLength, scaledHeight - y);
                    dottedBarGraphics.strokeLineShape(new Phaser.Geom.Line(
                        rectX + scaledWidth, rectY + y, 
                        rectX + scaledWidth, rectY + y + lineHeight
                    ));
                }
                
                // Bottom line (dashed)
                for (let x = scaledWidth; x > 0; x -= dashLength + gapLength) {
                    const lineWidth = Math.min(dashLength, x);
                    dottedBarGraphics.strokeLineShape(new Phaser.Geom.Line(
                        rectX + x, rectY + scaledHeight, 
                        rectX + x - lineWidth, rectY + scaledHeight
                    ));
                }
                
                // Left line (dashed)
                for (let y = scaledHeight; y > 0; y -= dashLength + gapLength) {
                    const lineHeight = Math.min(dashLength, y);
                    dottedBarGraphics.strokeLineShape(new Phaser.Geom.Line(
                        rectX, rectY + y, 
                        rectX, rectY + y - lineHeight
                    ));
                }

                // Value label at center
                const isCurrentAttempt = lastElement;
                const shouldShowNoWorries = isCurrentAttempt && allVisibleBarsAreZero;
                
                const valueText = this.addText(
                    x, 
                    50 + barMaxHeight - dottedBarHeight - 10, 
                    shouldShowNoWorries ? i18n.t('additionAdventure.scoreboard.noWorries') : '0', 
                    {
                        font: shouldShowNoWorries ? '700 24px Exo' : '700 40px Exo',
                        color: lastElement ? '#fff' : '#BCE2FF',
                        align: 'center',
                    }
                ).setOrigin(0.5, 1);

                barsContainer.add([dottedBarGraphics, valueText]);

                if (lastElement) {
                    new TextOverlay(this, valueText, { label: i18n.t('additionAdventure.scoreboard.currentAttemptScore', { score: 0 }) });
                } else {
                    new TextOverlay(this, valueText, { label: i18n.t('additionAdventure.scoreboard.attemptScore', { attempt: startIndex + i + 1, score: 0 }) });
                }
            } else {
                // Draw normal bar for non-zero scores
                const height = (data / visibleBarsMax) * barMaxHeight;
                const scaledHeight = this.getScaledValue(height);

                // Create a graphics object for the bar
                const barGraphics = this.add.graphics();

                // Set fill color
                barGraphics.fillStyle(lastElement ? 0x167ff8 : 0xc4e5ff, 1);

                // Draw a rounded rectangle with only top corners rounded (5px radius)
                barGraphics.fillRoundedRect(
                    scaledX - scaledWidth / 2, // x (top-left)
                    scaledY - scaledHeight, // y (top-left)
                    scaledWidth, // width
                    scaledHeight, // height
                    { tl: 5, tr: 5, bl: 0, br: 0 }, // radius per corner
                );

                // Value label
                const textX = data === chartMax ? x + 15 : x;
                const valueText = this.addText(textX, 50 + barMaxHeight - height, `${data}`, {
                    font: '700 40px Exo',
                    color: lastElement ? '#fff' : '#BCE2FF',
                }).setOrigin(0.5, 1);

                // If this bar is the max, add a trophy to its left
                if (data === chartMax) {
                    const trophy = this.addImage(x - 15, 35 + barMaxHeight - height, 'trophy')
                        .setScale(1) // adjust scale as needed
                        .setOrigin(1, 1);
                    barsContainer.add(trophy);
                }

                barsContainer.add([barGraphics, valueText]);

                if (lastElement) {
                    new TextOverlay(this, valueText, { label: i18n.t('additionAdventure.scoreboard.currentAttemptScore', { score: data }) })
                } else {
                    new TextOverlay(this, valueText, { label: i18n.t('additionAdventure.scoreboard.attemptScore', { attempt: startIndex + i + 1, score: data }) });
                }
            }
            
            // X label (same for both zero and non-zero scores)
                const label = this.addText(
                    x,
                    40 + barMaxHeight + 17,
                    lastElement
                        ? `${i18n.t('additionAdventure.scoreboard.current')}`
                        : `${i18n.t('additionAdventure.scoreboard.attempt')} ${startIndex + i + 1}`,
                    {
                        font: '700 20px Exo',
                        align: 'center',
                        color: lastElement ? '#fff' : '#BCE2FF',
                    },
                ).setOrigin(0.5, 0);

                labelsContainer.add(label);
            });

            // Update buttons
            leftBtn.setAlpha(startIndex > 0 ? 1 : 0.4).setInteractive(startIndex > 0);
            rightBtn
                .setAlpha(startIndex + visibleCount < chartData.length ? 1 : 0.4)
                .setInteractive(startIndex + visibleCount < chartData.length);
        };

        // ===== BUTTONS =====
        const btnY = 40 + barMaxHeight / 2;
        const leftBtn = this.addImage(axisLeftPadding - 70, btnY, 'arrow_left')
            .setScale(0.6)
            .setAlpha(0.4)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (startIndex > 0) {
                    startIndex--;
                    renderChart();
                }
            });

        const rightBtn = this.addImage(
            axisLeftPadding + visibleCount * (barWidth + barSpacing) + 50,
            btnY,
            'arrow_right',
        )
            .setScale(0.6)
            .setAlpha(0.4)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (startIndex + visibleCount < chartData.length) {
                    startIndex++;
                    renderChart();
                }
            });

        chartContainer.add([leftBtn, rightBtn]);

        // ===== INITIAL RENDER =====
        renderChart();
    }

    private displaySidebar(): void {
        const sidebarX = this.display.width - this.sidebarWidth / 2;
        // const sidebarY = this.display.height / 2;
        const boxWidth = 236;

        this.sidebarHeader = this.addText(sidebarX, 50, i18n.t('additionAdventure.scoreboard.factsToReview'), {
            font: '700 24px Exo',
            color: '#00A6FF',
            align: 'center',
        })
            .setOrigin(0.5, 0.5)
            .setAlpha(0);

        const sidebarHeaderOverlay = new TextOverlay(this, this.sidebarHeader, { label: i18n.t('additionAdventure.scoreboard.factsToReview'), tag: 'h2', role: 'heading' });
        this.sidebarHeader.setData('overlay', sidebarHeaderOverlay);
        sidebarHeaderOverlay.setAriaHidden(true);

        // --- Scrollable list setup ---
        // 1. Create a mask graphics for the scroll area
        const sidebarTop = 100;
        const sidebarHeight = this.display.height - sidebarTop - 45;
        const maskGraphics = this.add.graphics();
        maskGraphics.fillStyle(0xffffff, 0);
        maskGraphics.beginPath();
        maskGraphics.fillRect(
            this.getScaledValue(this.display.width - this.sidebarWidth + (this.sidebarWidth - boxWidth) / 2),
            this.getScaledValue(sidebarTop),
            this.getScaledValue(boxWidth + 50),
            this.getScaledValue(sidebarHeight),
        );
        maskGraphics.closePath();

        // Container for the question list
        this.listContainer = this.add.container(
            this.getScaledValue(sidebarX - this.sidebarWidth / 2 + (this.sidebarWidth - boxWidth) / 2),
            this.getScaledValue(sidebarTop),
        );

        // Add scroll up and down buttons
        this.scrollUpBtn = this.addImage(sidebarX, sidebarTop - 20, 'arrow_up');
        this.scrollUpBtn.setAlpha(0.5);
        this.scrollUpBtn.on('pointerdown', () => {
            const bounds = this.listContainer.getBounds();
            if (bounds.top < topY) {
                this.tweens.add({
                    targets: this.listContainer,
                    y: Math.min(this.listContainer.y + this.getScaledValue(88 * 2), topY), // 2 times item box height
                    duration: 200,
                    ease: 'Power2.easeOut',
                });
                this.scrollDownBtn.setAlpha(1);
                this.scrollDownBtn.setInteractive({ useHandCursor: true });
            }
            else {
                this.scrollUpBtn.setAlpha(0.5);
                this.scrollUpBtn.disableInteractive(true);
            }
        });
        this.scrollDownBtn = this.addImage(sidebarX, sidebarTop + sidebarHeight + 22, 'arrow_down');
        this.scrollDownBtn.setInteractive({ useHandCursor: true });
        this.scrollDownBtn.on('pointerdown', () => {
            const bounds = this.listContainer.getBounds();
            if (bounds.bottom > topY + this.getScaledValue(sidebarHeight)) {
                this.tweens.add({
                    targets: this.listContainer,
                    y: this.listContainer.y - this.getScaledValue(88 * 2), // 2 times item box height
                    duration: 200,
                    ease: 'Power2.easeOut',
                });
                this.scrollUpBtn.setAlpha(1);
                this.scrollUpBtn.setInteractive({ useHandCursor: true });
            }
            else {
                this.scrollDownBtn.setAlpha(0.5);
                this.scrollDownBtn.disableInteractive(true);
            }
        });

        this.populateIncorrectQuestions();
        this.listContainer.setMask(new Phaser.Display.Masks.GeometryMask(this, maskGraphics));
        // 4. Add mouse wheel scroll
        const topY = this.getScaledValue(sidebarTop);
        const visibleHeight = this.getScaledValue(sidebarHeight);
        const contentHeight = this.listContainer.getBounds().height;
        const minY = Math.min(0, visibleHeight - contentHeight);

        this.input.on('wheel', (_pointer: any, _over: any, _dx: number, dy: number) => {
            let newY = this.listContainer.y - dy;
            if (newY < topY + minY) newY = topY + minY;
            if (newY > topY) newY = topY;
            this.listContainer.y = newY;

            // Update scroll buttons
            const bounds = this.listContainer.getBounds();
            if(bounds.top < topY) {
                this.scrollUpBtn.setAlpha(1);
                this.scrollUpBtn.setInteractive({ useHandCursor: true });
            }
            else {
                this.scrollUpBtn.setAlpha(0.5);
                this.scrollUpBtn.disableInteractive(true);
            }
            if(bounds.bottom > topY + visibleHeight) {
                this.scrollDownBtn.setAlpha(1);
                this.scrollDownBtn.setInteractive({ useHandCursor: true });
            }
            else {
                this.scrollDownBtn.setAlpha(0.5);
                this.scrollDownBtn.disableInteractive(true);
            }
        });
    }

    populateIncorrectQuestions(): void {
        const boxHeight = 68;
        const boxSpacing = 20;
        let yPos = 0;
        const boxWidth = 236;

        if (this.incorrectQuestions.length) {
            this.sidebarHeader.setAlpha(1);
            const sidebarHeaderOverlay = this.sidebarHeader.getData('overlay');
            if (sidebarHeaderOverlay) {
                sidebarHeaderOverlay.setAriaHidden(false);
            }
        }
        let isOverflow = false;
        const listItems: { box: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[] = [];
        this.incorrectQuestions.forEach((q) => {
            const box = this.addImage(
                (this.sidebarWidth - (this.sidebarWidth - boxWidth)) / 2,
                yPos + boxHeight / 2,
                'sidebar_question',
            ).setOrigin(0.5);

            const textVal = `${i18n.formatNumber(+q.operand1)} ${q.operator} ${i18n.formatNumber(+q.operand2)} = ${i18n.formatNumber(+q.answer)}`;
            const text = this.addText(
                (this.sidebarWidth - (this.sidebarWidth - boxWidth)) / 2,
                yPos + boxHeight / 2 + 2,
                textVal,
                { font: '700 26px Exo', color: '#fff', align: 'center' },
            ).setOrigin(0.5);

            if (text.displayWidth > box.displayWidth) {
                console.log(text.displayWidth, box.displayWidth);
                isOverflow = true;
            }

            this.listContainer.add([box, text]);
            new TextOverlay(this, text, { label: textVal });
            listItems.push({ box, text });
            yPos += boxHeight + boxSpacing;
        });

        if (isOverflow) {
            const leftPadding = this.getScaledValue(15);
            this.listContainer.setX(this.listContainer.x - leftPadding / 2);
            this.sidebarHeader.setX(this.sidebarHeader.x + leftPadding / 2);
            this.scrollUpBtn.setX(this.scrollUpBtn.x + leftPadding / 2);
            this.scrollDownBtn.setX(this.scrollDownBtn.x + leftPadding / 2);
            listItems.forEach((item) => {
                item.box.setDisplaySize(this.getScaledValue(boxWidth) + leftPadding, this.getScaledValue(boxHeight));
                item.box.setX(item.box.x + leftPadding);
                item.text.setX(item.text.x + leftPadding);
                item.text.setFontSize("18px");
            });
        }
    }

    init(data?: { dcpm?: number; incorrectQuestions: Question[] }) {
        if (data && typeof data.dcpm === 'number') {
            this.dcpmCount.push(data.dcpm);
            this.incorrectQuestions = data.incorrectQuestions || [];
        } else {
            console.warn('[ScoreboardScene.init] Missing or invalid dcpm in data; defaulting.');
        }
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/scoreboard_screen/addition_adventure');
        scene.load.image('scoreboard_display_bg', 'scoreboard_display_bg.png');
        scene.load.image('sidebar_question', 'sidebar_question.png');
        scene.load.image('arrow_left', 'arrow_left.png');
        scene.load.image('arrow_right', 'arrow_right.png');
        scene.load.image('arrow_up', 'arrow_up.png');
        scene.load.image('arrow_down', 'arrow_down.png');
        scene.load.image('trophy', 'trophy.png');
        scene.load.setPath(`${BUTTONS.PATH}/blue`);
        scene.load.image(`${BUTTONS.BUTTON.KEY}_blue`, BUTTONS.BUTTON.PATH);
        scene.load.image(`${BUTTONS.BUTTON_HOVER.KEY}_blue`, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(`${BUTTONS.BUTTON_PRESSED.KEY}_blue`, BUTTONS.BUTTON_PRESSED.PATH);
        scene.load.setPath(`${BUTTONS.PATH}/purple`);
        scene.load.image(`${BUTTONS.BUTTON.KEY}_purple`, BUTTONS.BUTTON.PATH);
        scene.load.image(`${BUTTONS.BUTTON_HOVER.KEY}_purple`, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(`${BUTTONS.BUTTON_PRESSED.KEY}_purple`, BUTTONS.BUTTON_PRESSED.PATH);
        
        VolumeSlider.preload(scene, 'blue');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('scorecard_sfx', 'scorecard_sfx.mp3');
    }
}
