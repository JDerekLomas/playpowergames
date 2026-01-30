import { BaseScene, ButtonHelper, i18n, VolumeSlider, ScoreboardHelper, ButtonOverlay, AnalyticsHelper, GameConfigManager } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, SUCCESS_TEXT_KEYS } from '../config/common';

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
}

export class ScoreboardScene extends BaseScene {
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    private scoreboardHelper!: ScoreboardHelper;
    private gameData!: ScoreboardData;
    private isMultiverse: boolean = true;

    constructor() {
        super('Scoreboard');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS, 'emoji_battle');
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || '';
        if (topic === 'grade2_topic3') {
            this.isMultiverse = false; // standalone fact mastery game for grade2_topic3
        }
    }

    init(data: ScoreboardData) {
        this.gameData = data;
        ScoreboardHelper.init(this);
    }

    create() {
        // this.createDoors();
        this.registry.set('isGameCompleted', true);
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

        this.createMuteButton();
        this.createVolumeSliderButton();

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });
    }

    private createMuteButton() {
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
            x: this.display.width - 60,
            y: 63,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
    }

    private createVolumeSliderButton() {
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
            x: this.display.width - 60,
            y: 149,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
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
                window.parent.postMessage({ 
                    type: 'GAME_COMPLETED',
                    gameName: 'emoji_battle'
                }, '*');
            }

            window.parent.postMessage({ type: 'CLOSE_GAME' }, '*');
        };

        const backToMapButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
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

    // private createDoors() {
    //     this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(3);
    //     this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(3);
    // }

    // private openDoors() {
    //     animateDoors({
    //         scene: this,
    //         leftDoor: this.doorLeft,
    //         rightDoor: this.doorRight,
    //         open: true,
    //         duration: 1000,
    //         delay: 500,
    //         soundEffectKey: 'door_close',
    //         onComplete: () => {
    //             this.audioManager.setMusicVolume(0.3);
    //         }
    //     });
    // }

    private closeDoors() {
        // TODO: Implement doors
        this.audioManager.stopBackgroundMusic();
        this.scene.start('GameScene', { reset: true });
        const analyticsHelper = AnalyticsHelper.getInstance();
        if (analyticsHelper) {
            analyticsHelper.endLevelSession(true);
        }
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');
        ScoreboardHelper._preload(scene, 'emoji_battle');
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
