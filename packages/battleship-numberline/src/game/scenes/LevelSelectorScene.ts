import { BaseScene } from './BaseScene';
import { LevelSelectorConfig as Config } from '../config/LevelSelectorConfig';
import { UIUtils } from '../utils/UIUtils';
import { ScrollContainerManager } from '../utils/ScrollContainerManager';
import { CommonConfig } from '../config/CommonConfig';
import { TopicName } from '../interfaces/gameplay';
import { LevelProgress } from '../managers/GameStateManager';
import { i18n, setSceneBackground } from '@k8-games/sdk';

export class LevelSelectorScene extends BaseScene {
    private scrollContainer: ScrollContainerManager;
    private woodUp: Phaser.GameObjects.Image;
    private woodDown: Phaser.GameObjects.Image;
    private currentTopic: TopicName;
    private topicText: string;

    constructor() {
        super('LevelSelectorScene');
        this.audioManager.initialize(this);
    }

    init(): void {
        this.currentTopic = this.gameState.getCurrentTopic();
        if (this.currentTopic === 'fractions') {
            this.topicText = i18n.t('levelSelector.fractions');
        } else if (this.currentTopic === 'decimals') {
            this.topicText = i18n.t('levelSelector.decimals');
        } else if (this.currentTopic === 'mixed') {
            this.topicText = i18n.t('levelSelector.mixed');
        } else {
            this.topicText = i18n.t('levelSelector.fractions');
        }
    }

    static _preload(scene: BaseScene): void {
        // Load all images from level selector directory
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
        // Create background
        const bg = UIUtils.createCoverBackground(this, Config.ASSETS.KEYS.BACKGROUND);

        // Add wooden planks
        this.woodUp = this.addImage(this.display.width / 2, 0, Config.ASSETS.KEYS.WOOD.UP).setOrigin(
            Config.WOOD.ORIGIN.TOP.X,
            Config.WOOD.ORIGIN.TOP.Y,
        );

        this.woodDown = this.addImage(
            this.display.width / 2,
            this.display.height,
            Config.ASSETS.KEYS.WOOD.DOWN,
        ).setOrigin(Config.WOOD.ORIGIN.BOTTOM.X, Config.WOOD.ORIGIN.BOTTOM.Y);

        // Create banner
        const bannerX = this.display.width * Config.BANNER.POSITION.X;
        const bannerY = Config.BANNER.POSITION.Ypx;

        this.addImage(bannerX, bannerY, Config.ASSETS.KEYS.BANNER).setOrigin(0.5);

        // Add banner text
        const bannerText = this.addText(bannerX, bannerY, this.topicText, {
            fontSize: Config.BANNER.FONT.SIZE,
            color: Config.BANNER.FONT.COLOR,
            fontFamily: Config.BANNER.FONT.FAMILY,
            stroke: Config.BANNER.FONT.STROKE_COLOR,
            strokeThickness: Config.BANNER.FONT.STROKE_THICKNESS,
        })
            .setOrigin(0.5)
            .setLetterSpacing(Config.BANNER.FONT.LETTER_SPACING);

        // Create scroll container for level buttons
        const scrollArea = {
            x: 0,
            y: this.woodUp.displayHeight,
            width: this.display.canvasWidth,
            maxScroll: -453 * this.display.scale,
            height: this.display.canvasHeight - this.woodUp.displayHeight - this.woodDown.displayHeight + 2,
        };

        this.scrollContainer = new ScrollContainerManager(this, scrollArea);
        this.scrollContainer.getContainer().setAbove(bg).setBelow(this.woodUp);

        this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scrollContainer.destroy();
        });

        // Create level buttons
        this.createLevelButtons();
    }

    private createLevelButtons(): void {
        const levelProgress = this.gameState.getLevelProgress(this.currentTopic);
        const startX = this.display.width * Config.LEVEL_BUTTON.GRID.START_X;
        const startY = 95 + 30; // Relative to container
        const spacingX = this.display.width * Config.LEVEL_BUTTON.GRID.SPACING_X;
        const spacingY = this.display.height * Config.LEVEL_BUTTON.GRID.SPACING_Y;

        levelProgress.forEach((progress, index) => {
            const row = Math.floor(index / Config.LEVEL_BUTTON.GRID.COLS);
            const col = index % Config.LEVEL_BUTTON.GRID.COLS;
            const x = startX + col * spacingX;
            const y = startY + row * spacingY;

            const buttonContainer = this.add.container(x, y);
            this.scrollContainer.add(buttonContainer);
            this.createLevelButton(buttonContainer, index, progress);
        });
    }

    private createLevelButton(
        container: Phaser.GameObjects.Container,
        level: number,
        progress: { unlocked: boolean; stars: number },
    ): void {
        // Add button shadow
        container.add(
            this.add
                .image(
                    Config.LEVEL_BUTTON.SHADOW_OFFSET.X,
                    Config.LEVEL_BUTTON.SHADOW_OFFSET.Y,
                    Config.ASSETS.KEYS.LEVEL_BUTTON.SHADOW,
                )
                .setOrigin(0.5),
        );

        // Add button
        const buttonTexture = progress.unlocked
            ? Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL
            : Config.ASSETS.KEYS.LEVEL_BUTTON.LOCKED;

        const button = this.add.image(0, 0, buttonTexture).setOrigin(0.5).setScale(Config.LEVEL_BUTTON.SCALE);

        container.add(button);

        const handlePointerDown = () => {
            button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.PRESSED);
        };

        const handlePointerUp = () => {
            button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL);
            this.startLevel(level);
        };

        const handlePointerOut = () => {
            button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.NORMAL);
        };

        const handlePointerOver = () => {
            button.setTexture(Config.ASSETS.KEYS.LEVEL_BUTTON.PRESSED);
        };

        if (progress.unlocked) {
            button
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => handlePointerDown())
                .on('pointerup', () => handlePointerUp())
                .on('pointerout', () => handlePointerOut());
        }

        // Add level number
        const levelText = this.add
            .text(0, Config.LEVEL_BUTTON.TEXT.Y_OFFSET, i18n.t('common.level', { level: level + 1 }), {
                fontSize: Config.LEVEL_BUTTON.TEXT.FONT.SIZE,
                color: Config.LEVEL_BUTTON.TEXT.FONT.COLOR,
                fontFamily: Config.LEVEL_BUTTON.TEXT.FONT.FAMILY,
                stroke: Config.LEVEL_BUTTON.TEXT.FONT.STROKE_COLOR,
                strokeThickness: Config.LEVEL_BUTTON.TEXT.FONT.STROKE_THICKNESS,
            })
            .setOrigin(0.5)
            .setLetterSpacing(Config.LEVEL_BUTTON.TEXT.FONT.LETTER_SPACING);

        container.add(levelText);

        // Add stars
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
                    // Use star1, star2, star3 in sequence for filled stars
                    const starTexture = Config.ASSETS.KEYS.STAR[`STAR${i + 1}` as keyof typeof Config.ASSETS.KEYS.STAR];
                    const star = this.add.image(starX, starY, starTexture).setOrigin(0.5);
                    container.add(star);
                }
            }
        }
    }

    private startLevel(level: number): void {
        // this.scene.start('GameScreen', { level, topic: this.currentTopic });
        this.scene.start('HowToPlayScene', {
            useQuestionBank: false,
            level,
            topic: this.currentTopic,
            parentScene: this.scene.key,
        });
    }

    shutdown(): void {
        this.audioManager.stopAllSoundEffects();
    }
}
