import { AnalyticsHelper, BaseScene, ButtonHelper, ButtonOverlay, GameConfigManager, i18n, ScoreboardHelper, setSceneBackground, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, SUCCESS_TEXT_KEYS } from '../config/common';

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
}

export class ScoreBoardScene extends BaseScene {
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;
    private scoreboardHelper!: ScoreboardHelper;
    private gameData!: ScoreboardData;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private isClosing: boolean = false;

    constructor() {
        super('ScoreBoardScene');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
    }

    private createDoors() {
        this.doorLeft = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(1, 0.5).setDepth(100);
        this.doorRight = this.addImage(this.display.width / 2, this.display.height / 2, COMMON_ASSETS.DOOR.KEY).setOrigin(0, 0.5).setFlipX(true).setDepth(100);
    }

    private openDoors() {
        setTimeout(() => {
            this.audioManager.playSoundEffect('door_open');
        }, 500);

        this.tweens.add({
            targets: this.doorLeft,
            x: 0,
            duration: 1000,
            delay: 500,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: this.doorRight,
            x: this.getScaledValue(this.display.width),
            duration: 1000,
            delay: 500,
            ease: 'Power2',
        });
    }

    private closeDoors(cb?: () => void) {
        if (this.isClosing) return;

        this.isClosing = true;
        this.audioManager.playSoundEffect('door_close');
        this.tweens.add({
            targets: this.doorLeft,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2'
        });
        this.tweens.add({
            targets: this.doorRight,
            x: this.getScaledValue(this.display.width / 2),
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                this.isClosing = false;
                cb?.();
            }
        });
    }

    create() {
        this.createDoors();
        const gameConfigManager = GameConfigManager.getInstance();
        const topic = gameConfigManager.get('topic') || "compare_percents";
        const backgroundImage = topic === "grade7_topic3" ? 'celebration_bg_amount' : 'scoreboard_screen_bg';
        setSceneBackground(`assets/images/scoreboard/${backgroundImage}.png`, true);
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, backgroundImage).setOrigin(0.5);
        bg.setDepth(-2);
        this.audioManager.initialize(this);

        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);
        this.scoreboardHelper.createTextBlock(this.gameData.rounds, this.gameData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.gameData.score, this.gameData.rounds, this.gameData.totalRounds, 10);
            this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            }, this.gameData.rounds === this.gameData.totalRounds, () => this.closeDoors(() => {
                this.scene.stop();
                this.scene.start('GameScene', { reset: true })
                const analyticsHelper = AnalyticsHelper.getInstance();
                if (analyticsHelper) {
                    analyticsHelper.endLevelSession(true);
                }
            }));
        });

        this.createMuteButton();
        this.createVolumeSlider();

        this.events.on('shutdown', () => {
            this.audioManager.stopAllSoundEffects();
        });

        this.openDoors();
    }

    init(data: ScoreboardData) {
        this.gameData = data;
        ScoreboardHelper.init(this);
    }

    private createVolumeSlider() {
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
    }

    private createMuteButton() {
        this.muteBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY,
            label: i18n.t('common.mute'),
            ariaLive: 'off',
            x: this.display.width - 54,
            y: 66,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        })

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteBtn.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

            // Update mute button state
            const label = this.audioManager.getIsAllMuted() ? i18n.t('common.unmute') : i18n.t('common.mute');
            const overlay = (this.muteBtn as any).buttonOverlay as ButtonOverlay;
            const muteBtnState = this.muteBtn.getData('state');
            if(muteBtnState != label) {
                this.muteBtn.setData('state', label);
                overlay.setLabel(label);
            }
        }
        // Add update event listener to the mute button
        this.events.on("update", handleMuteBtnUpdate);
        // Remove event listener when mute button is destroyed
        this.muteBtn.on("destroy", () => {
            this.events.off("update", handleMuteBtnUpdate);
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/scoreboard`);
        scene.load.image('scoreboard_screen_bg', 'scoreboard_screen_bg.png');
        ScoreboardHelper._preload(scene);
        VolumeSlider.preload(scene, 'blue');
    }
}
