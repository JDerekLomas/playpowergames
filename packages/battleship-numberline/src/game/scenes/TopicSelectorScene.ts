import { BaseScene } from './BaseScene';
import { TopicSelectorConfig as Config } from '../config/TopicSelectorConfig';
import { UIUtils } from '../utils/UIUtils';
import { tweenTint } from '../utils/tweenTint';
import { CommonConfig } from '../config/CommonConfig';
import { TopicName } from '../interfaces/gameplay';
import { i18n, setSceneBackground } from '@k8-games/sdk';

const {
    ASSETS: {
        KEYS: {
            IMAGE: { BACKGROUND, TOPIC_BANNER, TOPIC_BUTTON },
        },
    },
    A11Y,
} = Config;

export class TopicSelectorScene extends BaseScene {
    constructor() {
        super('TopicSelectorScene');
        this.audioManager.initialize(this);
    }

    static _preload(scene: BaseScene): void {
        // Load all images from topic selector directory
        scene.load.setPath(Config.ASSETS.PATHS.TOPIC_SELECTOR);
        scene.load.image(BACKGROUND, 'bg.png');
        scene.load.image(TOPIC_BANNER, 'topic_banner.png');
        scene.load.image(TOPIC_BUTTON.FRACTION, 'topic_button(fraction).png');
        scene.load.image(TOPIC_BUTTON.SHADOW, 'topicbutton_sh.png');
    }

    create(): void {
        // Create background
        setSceneBackground('assets/images/topic_selector/bg.png');
        UIUtils.createCoverBackground(this, BACKGROUND);

        // Create topic banner
        const bannerX = this.display.width * Config.BANNER.POSITION.X;
        const bannerY = this.display.height * Config.BANNER.POSITION.Y;

        this.addImage(bannerX, bannerY, TOPIC_BANNER).setOrigin(0.5);

        // Add banner text
        const bannerText = this.addText(bannerX, bannerY, i18n.t('topicSelector.chooseTopic'), {
            fontSize: Config.BANNER.FONT.SIZE,
            color: Config.BANNER.FONT.COLOR,
            fontFamily: Config.BANNER.FONT.FAMILY,
            stroke: Config.BANNER.FONT.STROKE_COLOR,
            strokeThickness: Config.BANNER.FONT.STROKE_THICKNESS,
        }).setOrigin(0.5);

        // Create topic buttons
        this.createTopicButton(
            Config.TOPIC_BUTTON.POSITIONS.FRACTION.X,
            Config.TOPIC_BUTTON.POSITIONS.FRACTION.Y,
            TOPIC_BUTTON.FRACTION,
            () => this.startTopic('fractions'),
        );

        // TODO: Add other topic buttons (whole numbers, decimals) when assets are available
    }

    private createTopicButton(xRatio: number, yRatio: number, texture: string, callback: () => void): void {
        const x = this.display.width * xRatio;
        const y = this.display.height * yRatio;

        // Add button shadow
        this.addImage(
            x + Config.TOPIC_BUTTON.SHADOW_OFFSET.X,
            y + Config.TOPIC_BUTTON.SHADOW_OFFSET.Y,
            TOPIC_BUTTON.SHADOW,
        ).setOrigin(0.5);

        // Add button
        const button = this.addImage(x, y, texture)
            .setOrigin(0.5)
            .setScale(Config.TOPIC_BUTTON.SCALE)
            .setInteractive({ useHandCursor: true });

        const handlePointerDown = () => {
            tweenTint(button, {
                startColor: button.tint,
                endColor: Config.TOPIC_BUTTON.TINT.DARK,
                time: Config.TOPIC_BUTTON.TINT.TIME,
            });
        };

        const handlePointerUp = () => {
            button.setTexture(texture);
            callback();
        };

        const handlePointerOver = () => {
            tweenTint(button, {
                startColor: button.tint,
                endColor: Config.TOPIC_BUTTON.TINT.LIGHT,
                time: Config.TOPIC_BUTTON.TINT.TIME,
            });
        };

        const handlePointerOut = () => {
            tweenTint(button, {
                startColor: button.tint,
                endColor: Config.TOPIC_BUTTON.TINT.RESET,
                time: Config.TOPIC_BUTTON.TINT.TIME,
            });
            button.setTexture(texture);
        };

        // Setup button interactions
        button
            .on('pointerdown', () => handlePointerDown())
            .on('pointerup', () => handlePointerUp())
            .on('pointerover', () => handlePointerOver())
            .on('pointerout', () => handlePointerOut());

        this.addText(
            x,
            y + Config.TOPIC_BUTTON_TEXT.POSITION.Y,
            i18n.t('common.fractions'),
            {
                fontSize: Config.TOPIC_BUTTON_TEXT.FONT.SIZE,
                color: Config.TOPIC_BUTTON_TEXT.FONT.COLOR,
                fontFamily: Config.TOPIC_BUTTON_TEXT.FONT.FAMILY,
                stroke: Config.TOPIC_BUTTON_TEXT.FONT.STROKE_COLOR,
                strokeThickness: Config.TOPIC_BUTTON_TEXT.FONT.STROKE_THICKNESS,
            },
        ).setOrigin(0.5);
    }

    private startTopic(topic: TopicName): void {
        this.gameState.setCurrentTopic(topic);
        this.scene.start('LevelSelectorScene');
    }

    shutdown(): void {
        this.audioManager.stopAllSoundEffects();
    }
}
