import { ScoreboardSceneConfig as Config } from "../config/ScoreboardSceneConfig";
import { AssetsConfig } from "../config/AssetsConfig";
import { AnalyticsHelper, BaseScene, ButtonHelper, GameConfigManager, i18n, ScoreboardHelper, setSceneBackground, VolumeSlider } from "@k8-games/sdk";
import { MuteButton } from "../components/MuteButton";
import { DoorUtils } from "../utils/DoorUtils";
import { MULTIVERSE_TOPICS, SUCCESS_TEXT_KEYS } from "../config/CommonConfig";

export class ScoreboardScene extends BaseScene {
    private volumeSlider: VolumeSlider;
    private scoreboardHelper: ScoreboardHelper;
    private isMultiverse: boolean = false;

    constructor() {
        super("ScoreboardScene");
        this.audioManager.initialize(this);
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || '';
        if (MULTIVERSE_TOPICS.includes(topic)) {
            this.isMultiverse = true;
        }
    }

    init() {
        ScoreboardHelper.init(this);
    }

    create(data: {
        scoreData: { correctAnswers: number; totalQuestions: number };
        score: number;
    }) {
        this.registry.set('isGameCompleted', true);
        const doorUtils = new DoorUtils(this);
        doorUtils.openDoors();
        this.setupBackground();
        this.createMuteButton();
        this.createVolumeSliderButton();

        this.scoreboardHelper.createTextBlock(data.scoreData.correctAnswers, data.scoreData.totalQuestions, () => {
            this.scoreboardHelper.createMainBoard(data.score, data.scoreData.correctAnswers, data.scoreData.totalQuestions, 10);
            const playAgainButton = this.scoreboardHelper.createPlayAgainButton({
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            }, data.scoreData.correctAnswers === data.scoreData.totalQuestions, () => {
                this.audioManager.stopAllSoundEffects();
                doorUtils.closeDoors(() => {
                    const gameScene = this.scene.get("GameScene");
                    gameScene.scene.stop();  
                    this.scene.start("GameScene", { reset: true });
                    const analyticsHelper = AnalyticsHelper.getInstance();
                    if (analyticsHelper) {
                        analyticsHelper.endLevelSession(true);
                    }
                });
            });

            if (this.isMultiverse) {
                const buttonContainer = this.add.container(
                    this.getScaledValue(this.display.width / 2),
                    this.getScaledValue(this.display.height - 80),
                )

                playAgainButton.setPosition(playAgainButton.width / 2, 0);

                buttonContainer.add(playAgainButton);

                const backToMapButton = this.createBackToMultiverseButton();
                backToMapButton.setPosition(backToMapButton.width / 2, 0);

                const x_position = 3 * playAgainButton.width / 2 + this.getScaledValue(36);
                backToMapButton.setPosition(x_position, 0);
                buttonContainer.add(backToMapButton);
                const buttonContainerWidth = backToMapButton.getBounds().right - playAgainButton.getBounds().left;
                buttonContainer.setSize(buttonContainerWidth, backToMapButton.height);
                buttonContainer.setX(this.getScaledValue(this.display.width / 2) - buttonContainerWidth / 2);

                // recreate button overlay
                const playAgainButtonOverlay = (playAgainButton as any).buttonOverlay;
                playAgainButtonOverlay?.recreate();
                const backToMapButtonOverlay = (backToMapButton as any).buttonOverlay;
                backToMapButtonOverlay?.recreate();
            }
        });

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });
    }

    private createBackToMultiverseButton() {
        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            this.scene.stop('ScoreBoard');

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }

            if (this.registry.get('isGameCompleted') === true) {
                const gameConfigManager = GameConfigManager.getInstance();
                const mode = gameConfigManager.get('mode') || 'make_ten';
                window.parent.postMessage({ 
                    type: 'GAME_COMPLETED',
                    gameName: mode === 'make_20' ? 'make_20' : 'make_ten'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.DEFAULT,
                hover: AssetsConfig.KEYS.BUTTONS.HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.PRESSED,
            },
            imageScale: 1,
            text: i18n.t('scoreboard.backToMultiverse'),
            label: i18n.t('scoreboard.backToMultiverse'),
            textStyle: {
                font: '700 30px Exo',
                color: '#ffffff',
            },
            x: 0,
            y: 0,
            onClick: handleClick,
        });

        return backToMapButton;
    }

    private setupBackground() {
        setSceneBackground('assets/images/scoreboard_bg.png');
        this.addImage(
            Config.BACKGROUND.POSITION.X,
            Config.BACKGROUND.POSITION.Y,
            'scoreboard_bg'
        )
            .setOrigin(0.5)
            .setScale(Config.BACKGROUND.SCALE)
            .setDepth(-2);
        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);
    }

    private createMuteButton() {
        new MuteButton(
            this,
            this.display.width - 54,
            64
        );
    }

    private createVolumeSliderButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 162, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: AssetsConfig.KEYS.BUTTONS.ICON_BTN,
                hover: AssetsConfig.KEYS.BUTTONS.ICON_BTN_HOVER,
                pressed: AssetsConfig.KEYS.BUTTONS.ICON_BTN_PRESSED,
            },
            icon: AssetsConfig.KEYS.BUTTONS.VOLUME_CONTROL_ICON,
            label: i18n.t("common.volume"),
            x: this.display.width - 54,
            y: 142,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
            raisedOffset: 3.5,
        });
    }
}
