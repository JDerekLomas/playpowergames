import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground, ScoreboardHelper, ButtonOverlay, AnalyticsHelper, GameConfigManager } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, SUCCESS_TEXT_KEYS } from '../config/common';
import { animateDoors } from '../utils/helper';
import { LevelStateManager } from '../managers/LevelStateManager';

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
    mechanic: string;
    level: number;
}

export class ScoreboardScene extends BaseScene {
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private scoreboardHelper!: ScoreboardHelper;
    private gameData!: ScoreboardData;

    constructor() {
        super('Scoreboard');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS, 'queen_quanta');
    }

    init(data: ScoreboardData) {
        this.gameData = data;

        ScoreboardHelper.init(this);

        // Check if level should be marked as completed (70% or more correct)
        if (this.gameData.totalRounds > 0) {
            const percentage = (this.gameData.rounds / this.gameData.totalRounds) * 100;
            if (percentage >= 70) {
                const gameConfigManager = GameConfigManager.getInstance();
                const topicName = gameConfigManager.get('topic') || 'grade6_topic4';
                const levelStateManager = LevelStateManager.getInstance();
                levelStateManager.setLevelCompleted(topicName, this.gameData.level, true);
            }
        }
    }

    create() {
        setSceneBackground('assets/images/scoreboard/scoreboard_screen_bg.png', true);
        this.createDoors();
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, 'scoreboard_screen_bg').setOrigin(0.5);
        bg.setDepth(-2);
        this.audioManager.initialize(this);

        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);
        this.scoreboardHelper.createTextBlock(this.gameData.rounds, this.gameData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.gameData.score, this.gameData.rounds, this.gameData.totalRounds, 10);
            const playAgainButton = this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            }, this.gameData.rounds === this.gameData.totalRounds, () => this.closeDoors());

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
        });

        // Mute button
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });

        // Volume slider
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 160, 'purple', i18n.t('common.volume'));
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 142,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });

        this.openDoors();

    }

    private createBackToMapButton() {
        const handleClick = () => {
            this.audioManager.stopAllSoundEffects();
            this.audioManager.stopBackgroundMusic();
            this.scene.stop('Scoreboard');
            this.scene.start('MenuScene');
            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession();
            }
        };

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('common.backToMap'),
            label: i18n.t('common.backToMap'),
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

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(3);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(3);
    }

    private openDoors() {
        animateDoors({
            scene: this,
            leftDoor: this.doorLeft,
            rightDoor: this.doorRight,
            open: true,
            duration: 1000,
            delay: 500,
            soundEffectKey: 'door_close',
            onComplete: () => {
                // Respect the user's current volume setting. Do not force a new volume here.
            }
        });
    }

    private closeDoors() {
        animateDoors({
            scene: this,
            leftDoor: this.doorLeft,
            rightDoor: this.doorRight,
            open: false,
            duration: 1000,
            delay: 500,
            soundEffectKey: 'door_close',
            onComplete: () => {
                this.audioManager.stopBackgroundMusic();
                this.scene.start('GameScene', { reset: true, mechanic: this.gameData.mechanic, level: this.gameData.level });
                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }
            }
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');
        
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', 'door_close.mp3');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}${COMMON_ASSETS.PATH}`);
        scene.load.image(COMMON_ASSETS.DOOR.KEY, COMMON_ASSETS.DOOR.PATH);

        ScoreboardHelper._preload(scene, 'queen_quanta');
    }

    override update(): void {
        // Update mute button icon
        const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
        if (this.audioManager.getIsAllMuted()) {
            muteBtnItem.setTexture(BUTTONS.MUTE_ICON.KEY);
        } else {
            muteBtnItem.setTexture(BUTTONS.UNMUTE_ICON.KEY);
        }

        // Update mute button state
        const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
        const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
        const muteBtnState = this.muteBtn.getData('state');
        if(muteBtnState != label) {
            this.muteBtn.setData('state', label);
            overlay.setLabel(label);
        }
    }
}
