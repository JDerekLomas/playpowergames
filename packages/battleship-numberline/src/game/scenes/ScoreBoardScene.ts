import { BaseScene } from './BaseScene';
import { ScoreBoardConfig as Config } from '../config/ScoreBoardConfig';
import { UIUtils } from '../utils/UIUtils';
import { CommonConfig } from '../config/CommonConfig';
import { AnalyticsHelper, ButtonHelper, ButtonOverlay, i18n, ScoreboardHelper, setSceneBackground, VolumeSlider } from '@k8-games/sdk';
import { DoorUtils } from '../utils/DoorUtils';
import { topics } from '../../resources/topics.json';
import { islandState } from '../managers/IslandStateManager';
import { CAMPAIGN_FALLBACK_MAP } from '../config/CampaignFallbackMap';

interface ScoreBoardData {
    score: number;
    rounds: number;
    totalRounds: number;
    accuracy: number;
    totalTime: number;
    useQuestionBank: boolean;
    topic: string;
    topicHeading: string;
    level?: number;
}

interface ImgObject {
    [key: string]: string | ImgObject;
}

const imageKeys = Config.ASSETS.KEYS.IMAGE;

const buttonKeys = CommonConfig.ASSETS.KEYS.IMAGE.BUTTON;
const iconKeys = CommonConfig.ASSETS.KEYS.IMAGE.ICON;

const SUCCESS_TEXT_KEYS = [
    'greatJob',
    'awesomeWork',
    'youreAmazing',
    'keepItUp',
    'fantasticEffort',
    'wellDone'
];

export class ScoreBoardScene extends BaseScene {
    private scoreData: ScoreBoardData;
    private muteButton: Phaser.GameObjects.Container;
    private volumeSlider: VolumeSlider;
    private scoreboardHelper: ScoreboardHelper;
    private isMapAvailable: boolean = false;

    constructor() {
        super('ScoreBoardScene');
        this.audioManager.initialize(this);
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
    }

    static _preload(scene: BaseScene): void {
        const { IMAGE } = Config.ASSETS.KEYS;
        scene.load.setPath(Config.ASSETS.PATHS.SCORE_BOARD);

        function loadImages(scene: BaseScene, object: ImgObject): void {
            Object.values(object).forEach((value) => {
                if (typeof value === 'string') {
                    scene.load.image(value, value);
                } else if (typeof value === 'object') {
                    loadImages(scene, value);
                }
            });
        }

        // Load all images
        loadImages(scene, IMAGE);

        // Back to Map Button
        scene.load.setPath('assets/components/button/images/purple');
        scene.load.image('map_button_default', 'btn_default.png');
        scene.load.image('map_button_hover', 'btn_hover.png');
        scene.load.image('map_button_pressed', 'btn_pressed.png');

        ScoreboardHelper._preload(scene);
    }

    init(data: ScoreBoardData): void {
        this.scoreData = data;
        // Reset cursor to default
        document.body.style.cursor = 'default';
        if (this.scoreData.topic === 'campaign') {
            this.isMapAvailable = true;
        } else if (topics.find((t) => t.name === this.scoreData.topic)?.levels?.length) {
            this.isMapAvailable = true;
        }

        // Track completed level if at least 60% of questions were answered correctly
        if ((this.scoreData.rounds >= 0.6 * this.scoreData.totalRounds) && this.scoreData.level !== undefined) {
            // Question bank topics pass 1-indexed mapLevel; campaign passes 0-indexed level
            const completedLevel = this.scoreData.useQuestionBank ? this.scoreData.level : this.scoreData.level + 1;
            islandState.addCompletedLevel(this.scoreData.topic, completedLevel);
            // Clear failed attempts on success
            if (this.scoreData.topic === 'campaign') {
                islandState.clearFailedAttempts(this.scoreData.topic, this.scoreData.level);
            }
        } else if (this.scoreData.topic === 'campaign' && this.scoreData.level !== undefined) {
            // Track failed attempt
            islandState.addFailedAttempt(this.scoreData.topic, this.scoreData.level);
        }

        ScoreboardHelper.init(this);
    }

    async create() {
        const doorUtils = new DoorUtils(this);
        doorUtils.openDoors();

        // Create background
        setSceneBackground('assets/images/score_board/bg.png');
        const bg = UIUtils.createCoverBackground(this, imageKeys.BACKGROUND).setName('background');
        bg.setDepth(-2);

        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);

        this.scoreboardHelper.createTextBlock(this.scoreData.rounds, this.scoreData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.scoreData.score, this.scoreData.rounds, this.scoreData.totalRounds, 10);
            const playAgainButton = this.scoreboardHelper.createPlayAgainButton({
                default: buttonKeys.DEFAULT,
                hover: buttonKeys.HOVER,
                pressed: buttonKeys.PRESSED,
            }, this.scoreData.rounds === this.scoreData.totalRounds, () => {
                // Emit event to hide back to map button when transitioning to game
                this.audioManager.stopAllSoundEffects();
                const doorUtils = new DoorUtils(this);
                doorUtils.closeDoors(() => {
                    this.scene.start('GameScreen', {
                        useQuestionBank: this.scoreData.useQuestionBank,
                        topic: this.scoreData.topic,
                        ...(this.scoreData.useQuestionBank ? { mapLevel: this.scoreData.level } : { level: this.scoreData.level }),
                        reset: true,
                        parentScene: 'ScoreBoardScene',
                    });

                    const analyticsHelper = AnalyticsHelper.getInstance();
                    if (analyticsHelper) {
                        analyticsHelper.endLevelSession(true);
                    }
                });
            });

            if (this.isMapAvailable) {
                const buttonContainer = this.add.container(
                    this.getScaledValue(this.display.width / 2),
                    this.getScaledValue(this.display.height - 80),
                )

                playAgainButton.setPosition(playAgainButton.width / 2, 0);

                buttonContainer.add(playAgainButton);

                const backToMapButton = this.createBackToMapButton();
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

            // Show "Try something different" button when failed campaign level 2+ times
            if (this.scoreData.topic === 'campaign' && this.scoreData.level !== undefined) {
                const failCount = islandState.getFailedAttempts(this.scoreData.topic, this.scoreData.level);
                const fallback = CAMPAIGN_FALLBACK_MAP[this.scoreData.level];
                if (failCount >= 2 && fallback) {
                    const fallbackButton = this.createFallbackButton(fallback);
                    fallbackButton.setPosition(
                        this.getScaledValue(this.display.width / 2),
                        this.getScaledValue(this.display.height - 30),
                    );
                }
            }
        });

        this.createMuteButton();

        this.createVolumeSlider();
    }

    private createFallbackButton(fallback: import('../config/CampaignFallbackMap').FallbackEntry) {
        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            if (fallback.type === 'replay' && fallback.level !== undefined) {
                const doorUtils = new DoorUtils(this);
                doorUtils.closeDoors(() => {
                    this.scene.start('GameScreen', {
                        topic: 'campaign',
                        level: fallback.level,
                        useQuestionBank: false,
                        reset: true,
                        parentScene: 'ScoreBoardScene',
                    });
                });
            } else if (fallback.type === 'external' && fallback.url) {
                window.location.href = fallback.url;
            }
        };

        const buttonLabel = 'Try something different';

        const button = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'map_button_default',
                hover: 'map_button_hover',
                pressed: 'map_button_pressed',
            },
            imageScale: 0.9,
            text: buttonLabel,
            label: buttonLabel,
            textStyle: {
                font: '700 24px Exo',
                color: '#ffffff',
            },
            x: 0,
            y: 0,
            onClick: handleClick,
        });

        return button;
    }

    private createBackToMapButton() {
        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            this.scene.stop('ScoreBoardScene');

            const completedLevels = islandState.getCompletedLevels(this.scoreData.topic);
            this.scene.start('MapScene', {
                topic: this.scoreData.topic,
                completedLevels: completedLevels,
            });

            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }
        };

        const buttonLabel = i18n.t('scoreboard.backToMap');

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'map_button_default',
                hover: 'map_button_hover',
                pressed: 'map_button_pressed',
            },
            imageScale: 0.9,
            text: buttonLabel,
            label: buttonLabel,
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

    private createMuteButton() {
        const handleMuteButtonClick = () => {
            this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
            icon.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);
        };

        this.muteButton = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            raisedOffset: 3.5,
            x: this.display.width - 60,
            y: 66,
            onClick: handleMuteButtonClick,
        });

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? iconKeys.MUTE_ICON : iconKeys.SOUND_ICON);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteButton as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteButton.getData('state');
            if(muteBtnState != label) {
                this.muteButton.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteButton.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    private createVolumeSlider() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 162, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: buttonKeys.SQ_DEFAULT,
                hover: buttonKeys.SQ_HOVER,
                pressed: buttonKeys.SQ_PRESSED,
            },
            icon: iconKeys.VOLUME_CONTROL_ICON,
            label: i18n.t('common.volume'),
            raisedOffset: 3.5,
            x: this.display.width - 60,
            y: 142,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
    }
}
