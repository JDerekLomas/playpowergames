import { AnalyticsHelper, BaseScene, ButtonHelper, ButtonOverlay, i18n, ScoreboardHelper, setSceneBackground, VolumeSlider } from '@k8-games/sdk';
import { ASSETS_PATHS, BUTTONS, COMMON_ASSETS, PIGGY_THEMES, SUCCESS_TEXT_KEYS } from '../config/common';

interface ScoreboardData {
    rounds: number;
    totalRounds: number;
    score: number;
    themeIndex: number;
}

export class ScoreboardScene extends BaseScene {
    private gameData!: ScoreboardData;
    private volumeSlider!: VolumeSlider;
    private muteButton!: Phaser.GameObjects.Container;
    private doorLeft!: Phaser.GameObjects.Image;
    private doorRight!: Phaser.GameObjects.Image;
    private scoreboardHelper!: ScoreboardHelper;
    private isClosing: boolean = false;

    constructor() {
        super('ScoreboardScene');
        this.scoreboardHelper = new ScoreboardHelper(this, i18n, SUCCESS_TEXT_KEYS);
    }

    init(data: ScoreboardData) {
        this.gameData = data;
        this.audioManager.initialize(this);

        ScoreboardHelper.init(this);
    }

    static _preload(scene: BaseScene) {
        ScoreboardHelper._preload(scene);
    }

    private createButtons() {
        this.createMuteButton();
        this.createSettingsButton();
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
        const themeAssets = PIGGY_THEMES[0];
        setSceneBackground(`${ASSETS_PATHS.IMAGES}/piggy_themes/${themeAssets.BACKGROUND.PATH}`, true);
        const bg = this.addImage(this.display.width / 2, this.display.height / 2, themeAssets.BACKGROUND.KEY).setOrigin(0.5);
        bg.setDepth(-2);

        // Add an overlay
        this.addRectangle(this.display.width / 2, this.display.height / 2, this.display.width, this.display.height, 0x000000, 0.5);

        this.createButtons();
        this.scoreboardHelper.createTextBlock(this.gameData.rounds, this.gameData.totalRounds, () => {
            this.scoreboardHelper.createMainBoard(this.gameData.score, this.gameData.rounds, this.gameData.totalRounds, 70);
            this.scoreboardHelper.createPlayAgainButton({
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            }, this.gameData.rounds === this.gameData.totalRounds, () => this.handlePlayAgainClick(this));
        });
        this.openDoors();
    }

    private createMuteButton() {
        this.muteButton = ButtonHelper.createIconButton({
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
            y: 64,
            onClick: () => this.toggleMute()
        });

        const handleMuteBtnUpdate = () => {
            const muteBtnItem = this.muteButton.getAt(1) as Phaser.GameObjects.Sprite;
            muteBtnItem.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);

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

    private toggleMute() {
        this.audioManager.setMute(!this.audioManager.getIsAllMuted());
        const icon = this.muteButton.getAt(1) as Phaser.GameObjects.Image;
        icon.setTexture(this.audioManager.getIsAllMuted() ? BUTTONS.MUTE_ICON.KEY : BUTTONS.UNMUTE_ICON.KEY);
    }

    private createSettingsButton() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 210, 160, 'blue', i18n.t('common.volume'));
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
            onClick: () => this.volumeSlider.toggleControl(),
        });
    }

    private handlePlayAgainClick(scene: BaseScene) {
        this.closeDoors(() => {
            scene.scene.stop();
            const { themeIndex } = this.gameData;
            const nextThemeIndex = themeIndex + 1 > PIGGY_THEMES.length - 1 ? 0 : themeIndex + 1;
            scene.scene.start('GameScene', { restart: true, themeIndex: nextThemeIndex });
            const analyticsHelper = AnalyticsHelper.getInstance();
            if (analyticsHelper) {
                analyticsHelper.endLevelSession(true);
            }
        });
    }
}
