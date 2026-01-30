import { BaseScene, ButtonOverlay, GameConfigManager, i18n, TextOverlay } from "@k8-games/sdk";
import { ASSETS_PATHS, BUTTONS } from "../config/common";
import { topics } from "../data/topics.json";
import { LevelStateManager } from "../managers/LevelStateManager";

interface Topic {
    name: string;
    levels: Level[];
}

interface Level {
    level: number;
    mechanic: string;
    title: string;
    subtitle: string;
    subtitleEs: string;
    equation: string;
}

export class MenuScene extends BaseScene {
    private topics: Topic[] = [];
    private currentTopic: Topic | null = null;
    private gameConfigManager!: GameConfigManager;

    constructor() {
        super('MenuScene');
        this.topics = topics;
        this.gameConfigManager = GameConfigManager.getInstance();
    }
    
    init() {
        // Get topic from GameConfigManager
        const topicName = this.gameConfigManager.get('topic') || 'one_step_equations';
        this.currentTopic = this.topics.find(topic => topic.name === topicName) || this.topics.find(topic => topic.name === 'grade6_topic4') || null;
    }

    create() {
        // Background
        this.addImage(this.display.width / 2, this.display.height / 2, 'menu_bg')
        .setOrigin(0.5);

        // Title
        const title = this.addText(this.display.width / 2, 50, i18n.t("menu.title"), {
            font: "700 36px Exo",
            color: '#00FCF8'
        }).setOrigin(0.5);
        new TextOverlay(this, title, { label: i18n.t("menu.title"), tag: 'h1', role: 'heading' });

        this.createLevelButtons();
    }

    private createLevelButtons() {
        if (!this.currentTopic) {
            console.error('No topic found for:', this.gameConfigManager.get('topic'));
            return;
        }
        
        const buttonWidth = 311;
        const buttonHeight = 238;
        const startY = 130;
        const rowGap = 100;
        const colGap = 100;
        const levelsCount = this.currentTopic.levels.length;
        let cards: { x: number, y: number }[] = [];

        if (levelsCount === 4) {
            cards = [
            {
                x: this.display.width / 2 - buttonWidth / 2 - colGap / 2,
                y: startY + buttonHeight / 2
            },
            {
                x: this.display.width / 2 + buttonWidth / 2 + colGap / 2,
                y: startY + buttonHeight / 2
            },
            {
                x: this.display.width / 2 - buttonWidth / 2 - colGap / 2,
                y: startY + buttonHeight + rowGap + buttonHeight / 2
            },
            {
                x: this.display.width / 2 + buttonWidth / 2 + colGap / 2,
                y: startY + buttonHeight + rowGap + buttonHeight / 2
            },
            ];
        } else if (levelsCount === 3) {
            // First two cards on the first row (left and right), third card centered on the next row
            cards = [
                {
                    x: this.display.width / 2 - buttonWidth / 2 - colGap / 2,
                    y: startY + buttonHeight / 2
                },
                {
                    x: this.display.width / 2 + buttonWidth / 2 + colGap / 2,
                    y: startY + buttonHeight / 2
                },
                {
                    x: this.display.width / 2,
                    y: startY + buttonHeight + rowGap + buttonHeight / 2
                }
            ];
        } else {
            // Fallback: single row, centered
            const totalWidth = buttonWidth * levelsCount + colGap * (levelsCount - 1);
            const startX = (this.display.width - totalWidth) / 2 + buttonWidth / 2;
            for (let i = 0; i < levelsCount; i++) {
                cards.push({
                    x: startX + i * (buttonWidth + colGap),
                    y: startY + buttonHeight / 2
                });
            }
        }

        this.currentTopic.levels.forEach((levelData, index) => {
            const card = cards[index];
            const button = this.add.container(this.getScaledValue(card.x), this.getScaledValue(card.y));

            const cardImageKey = `card_level_${levelData.level}`;
            const cardSelectedImageKey = `card_level_${levelData.level}_selected`;
            const cardWaterImageKey = `card_level_${levelData.level}_water`;
            const cardShadowImageKey = `card_level_${levelData.level}_shadow`;

            const buttonBg = this.addImage(0, 0, cardImageKey);
            const buttonHoverBg = this.addImage(0, 0, cardSelectedImageKey);
            const buttonWaterBg = this.addImage(0, 0, cardWaterImageKey);
            const buttonShadowBg = this.addImage(0, 150, cardShadowImageKey);
            const completedStateBanner = this.addImage(0, -100, 'completed_state_banner');
            buttonHoverBg.setVisible(false);
            
            // Check if level is completed and show banner
            const levelStateManager = LevelStateManager.getInstance();
            const topicName = this.gameConfigManager.get('topic') || 'grade6_topic4';
            const isCompleted = levelStateManager.isLevelCompleted(topicName, levelData.level);
            completedStateBanner.setVisible(isCompleted);

            const mechanicNameText = i18n.getLanguage() === 'es' ? levelData.subtitleEs : levelData.subtitle;
            let y = -100;
            if(mechanicNameText.includes('\n')) {
                y = -107;
            }
            const mechanicName = this.addText(0, y, mechanicNameText, {
                font: "700 14px Exo",
                color: isCompleted ? '#FFFFFF' : '#000000',
                wordWrap: { width: 290 },
                align: 'center'
            }).setOrigin(0.5, 0);

            button.add(buttonShadowBg);
            button.add(buttonWaterBg);
            button.add(buttonHoverBg);
            button.add(buttonBg);
            button.add(completedStateBanner);
            button.add(mechanicName);

            button.setSize(buttonBg.getBounds().width, buttonBg.getBounds().height);
            button.setInteractive({ useHandCursor: true });

            let pulseTween: Phaser.Tweens.Tween | null = null;
            
            button.on('pointerover', () => {
                buttonHoverBg.visible = true;
                // Pulse out and return after 400ms
                pulseTween = this.tweens.add({
                    targets: button,
                    scale: { from: 1, to: 1.04 },
                    duration: 400,
                    yoyo: true,      // Go back to original scale
                    repeat: 0,       // Only once
                    ease: 'Sine.easeInOut'
                });
            });
            
            button.on('pointerout', () => {
                buttonHoverBg.visible = false;
                // Stop pulse animation and reset scale
                if (pulseTween) {
                    pulseTween.stop();
                    pulseTween = null;
                }
                button.setScale(1);
            });

            const handlePointerDown = () => {
                this.scene.start('InstructionsScene', {
                    level: levelData.level,
                    mechanic: levelData.mechanic,
                    parentScene: 'SplashScene',
                });
            }

            new ButtonOverlay(this, button, { label: mechanicNameText, onKeyDown: handlePointerDown });

            button.on('pointerdown', handlePointerDown);
        });
    }
    
    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/menu_screen`);
        scene.load.image('menu_bg', 'bg.png');
        // Load card_level_1.png to card_level_4.png
        for (let i = 1; i <= 4; i++) {
            scene.load.image(`card_level_${i}`, `card_level_${i}.png`);
            scene.load.image(`card_level_${i}_selected`, `card_level_${i}_selected.png`);
            scene.load.image(`card_level_${i}_water`, `card_level_${i}_water.png`);
            scene.load.image(`card_level_${i}_shadow`, `card_level_${i}_shadow.png`);
        }
        scene.load.image('completed_state_banner', 'completed_state_banner.png');

        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.BUTTON.KEY, BUTTONS.BUTTON.PATH);
        scene.load.image(BUTTONS.BUTTON_HOVER.KEY, BUTTONS.BUTTON_HOVER.PATH);
        scene.load.image(BUTTONS.BUTTON_PRESSED.KEY, BUTTONS.BUTTON_PRESSED.PATH);
    }
} 