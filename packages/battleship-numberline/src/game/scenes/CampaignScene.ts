import { BaseScene } from './BaseScene';
import { LevelSelectorConfig as Config } from '../config/LevelSelectorConfig';
import { UIUtils } from '../utils/UIUtils';
import { TopicName } from '../interfaces/gameplay';
import { LevelProgress } from '../managers/GameStateManager';
import { topics } from '../managers/GameplayManager';
import { setSceneBackground } from '@k8-games/sdk';

const campaignTopic = topics['campaign'];

export class CampaignScene extends BaseScene {
    constructor() {
        super('CampaignScene');
        this.audioManager.initialize(this);
    }

    init(): void {
        // Ensure campaign topic progress exists
        this.gameState.setCurrentTopic('campaign' as TopicName);
    }

    static _preload(scene: BaseScene): void {
        scene.load.setPath(Config.ASSETS.PATHS.LEVEL_SELECTOR);
        scene.load.image(Config.ASSETS.KEYS.BACKGROUND, 'bg.png');
        scene.load.image(Config.ASSETS.KEYS.BANNER, 'level_banner.png');
        scene.load.image(Config.ASSETS.KEYS.WOOD.UP, 'wood_up.png');
        scene.load.image(Config.ASSETS.KEYS.WOOD.DOWN, 'wood_down.png');
        scene.load.image(Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL, 'level_button.png');
        scene.load.image(Config.ASSETS.KEYS.LEVEL_BUTTON.PRESSED, 'level_button_press.png');
        scene.load.image(Config.ASSETS.KEYS.LEVEL_BUTTON.LOCKED, 'level_button_locked.png');
        scene.load.image(Config.ASSETS.KEYS.LEVEL_BUTTON.SHADOW, 'button_shadow.png');
        scene.load.image(Config.ASSETS.KEYS.STAR.STAR1, 'star1.png');
        scene.load.image(Config.ASSETS.KEYS.STAR.STAR2, 'star2.png');
        scene.load.image(Config.ASSETS.KEYS.STAR.STAR3, 'star3.png');
    }

    create(): void {
        setSceneBackground('assets/images/level_selector/bg.png');
        UIUtils.createCoverBackground(this, Config.ASSETS.KEYS.BACKGROUND);

        // Add wooden planks
        this.addImage(this.display.width / 2, 0, Config.ASSETS.KEYS.WOOD.UP).setOrigin(
            Config.WOOD.ORIGIN.TOP.X,
            Config.WOOD.ORIGIN.TOP.Y,
        );

        this.addImage(
            this.display.width / 2,
            this.display.height,
            Config.ASSETS.KEYS.WOOD.DOWN,
        ).setOrigin(Config.WOOD.ORIGIN.BOTTOM.X, Config.WOOD.ORIGIN.BOTTOM.Y);

        // Banner
        const bannerX = this.display.width * Config.BANNER.POSITION.X;
        const bannerY = Config.BANNER.POSITION.Ypx;
        this.addImage(bannerX, bannerY, Config.ASSETS.KEYS.BANNER).setOrigin(0.5);

        this.addText(bannerX, bannerY, 'Campaign', {
            fontSize: Config.BANNER.FONT.SIZE,
            color: Config.BANNER.FONT.COLOR,
            fontFamily: Config.BANNER.FONT.FAMILY,
            stroke: Config.BANNER.FONT.STROKE_COLOR,
            strokeThickness: Config.BANNER.FONT.STROKE_THICKNESS,
        })
            .setOrigin(0.5)
            .setLetterSpacing(Config.BANNER.FONT.LETTER_SPACING);

        // Create level buttons vertically
        this.createLevelButtons();
    }

    private createLevelButtons(): void {
        const levelProgress = this.gameState.getLevelProgress('campaign' as TopicName);
        const levels = campaignTopic.levels;
        const startX = this.display.width / 2;
        const startY = 170;
        const spacingY = 85;

        levels.forEach((levelData, index) => {
            const progress = levelProgress?.[index] ?? { unlocked: index === 0, stars: 0 };
            const y = startY + index * spacingY;

            const buttonContainer = this.add.container(this.getScaledValue(startX), this.getScaledValue(y));
            this.createLevelButton(buttonContainer, index, progress, levelData.label ?? `Level ${index + 1}`);
        });
    }

    private createLevelButton(
        container: Phaser.GameObjects.Container,
        level: number,
        progress: { unlocked: boolean; stars: number },
        label: string,
    ): void {
        // Shadow
        container.add(
            this.add
                .image(
                    Config.LEVEL_BUTTON.SHADOW_OFFSET.X,
                    Config.LEVEL_BUTTON.SHADOW_OFFSET.Y,
                    Config.ASSETS.KEYS.LEVEL_BUTTON.SHADOW,
                )
                .setOrigin(0.5),
        );

        const buttonTexture = progress.unlocked
            ? Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL
            : Config.ASSETS.KEYS.LEVEL_BUTTON.LOCKED;

        const button = this.add.image(0, 0, buttonTexture).setOrigin(0.5).setScale(Config.LEVEL_BUTTON.SCALE);
        container.add(button);

        if (progress.unlocked) {
            button
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.PRESSED))
                .on('pointerup', () => {
                    button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL);
                    this.startLevel(level);
                })
                .on('pointerout', () => button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL));
        }

        // Level label text
        const levelText = this.add
            .text(0, Config.LEVEL_BUTTON.TEXT.Y_OFFSET, `${level + 1}. ${label}`, {
                fontSize: '22px',
                color: Config.LEVEL_BUTTON.TEXT.FONT.COLOR,
                fontFamily: Config.LEVEL_BUTTON.TEXT.FONT.FAMILY,
                stroke: Config.LEVEL_BUTTON.TEXT.FONT.STROKE_COLOR,
                strokeThickness: Config.LEVEL_BUTTON.TEXT.FONT.STROKE_THICKNESS,
            })
            .setOrigin(0.5)
            .setLetterSpacing(Config.LEVEL_BUTTON.TEXT.FONT.LETTER_SPACING);

        container.add(levelText);

        // Stars
        this.createStars(container, progress);
    }

    private createStars(container: Phaser.GameObjects.Container, progress: LevelProgress): void {
        const starSpacing = Config.LEVEL_BUTTON.STARS.SPACING;
        const totalWidth = (Config.LEVEL_BUTTON.STARS.COUNT - 1) * starSpacing;
        const startX = -totalWidth / 2;
        const starY = Config.LEVEL_BUTTON.STARS.Y_OFFSET;

        if (progress.unlocked) {
            for (let i = 0; i < Config.LEVEL_BUTTON.STARS.COUNT; i++) {
                const starX = startX + i * starSpacing;
                if (i < progress.stars) {
                    const starTexture = Config.ASSETS.KEYS.STAR[`STAR${i + 1}` as keyof typeof Config.ASSETS.KEYS.STAR];
                    const star = this.add.image(starX, starY, starTexture).setOrigin(0.5);
                    container.add(star);
                }
            }
        }
    }

    private startLevel(level: number): void {
        this.scene.start('HowToPlayScene', {
            useQuestionBank: false,
            level,
            topic: 'campaign',
            parentScene: 'CampaignScene',
        });
    }

    shutdown(): void {
        this.audioManager.stopAllSoundEffects();
    }
}
