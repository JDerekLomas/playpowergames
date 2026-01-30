import { BaseScene, ButtonHelper, i18n, VolumeSlider, setSceneBackground, ScoreboardHelper, ButtonOverlay, AnalyticsHelper } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, SUCCESS_TEXT_KEYS } from '../config/common';
// import { animateDoors } from '../utils/helper';

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
}

export class ScoreboardScene extends BaseScene {
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;
    // private doorLeft!: Phaser.GameObjects.Image;
    // private doorRight!: Phaser.GameObjects.Image;
    private scoreboardHelper!: ScoreboardHelper;
    private gameData!: ScoreboardData;

    constructor() {
        super('Scoreboard');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
    }

    init(data: ScoreboardData) {
        this.gameData = data;

        ScoreboardHelper.init(this);
    }

    create() {
        setSceneBackground('assets/images/scoreboard/scoreboard_screen_bg.png', true);
        // this.createDoors();
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, 'scoreboard_screen_bg').setOrigin(0.5);
        bg.setDepth(-2);
        this.audioManager.initialize(this);

        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);
        this.scoreboardHelper.createTextBlock(this.gameData.rounds, this.gameData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.gameData.score, this.gameData.rounds, this.gameData.totalRounds, 10);
            this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            }, this.gameData.rounds === this.gameData.totalRounds, () => {
                this.audioManager.stopBackgroundMusic();
                this.scene.start('GameScene', { reset: true });
                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }
            });
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
        this.volumeSlider.create(this.display.width - 220, 160, 'blue', i18n.t('common.volume'));
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

        // this.openDoors();

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

    // private closeDoors() {
    //     animateDoors({
    //         scene: this,
    //         leftDoor: this.doorLeft,
    //         rightDoor: this.doorRight,
    //         open: false,
    //         duration: 1000,
    //         delay: 500,
    //         soundEffectKey: 'door_close',
    //         onComplete: () => {
    //             this.audioManager.stopBackgroundMusic();
    //             this.scene.start('GameScene', { reset: true });
    //         }
    //     });
    // }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');
        ScoreboardHelper._preload(scene);
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
