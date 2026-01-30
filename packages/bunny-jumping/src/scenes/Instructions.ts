import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, VolumeSlider } from "@k8-games/sdk";
import { BunnyJumping } from "../BunnyJumping";
import { ASSETS_PATHS, BUTTONS } from "../config/common";

export class InstructionsScene extends BaseScene {
    private bunnyJumping: BunnyJumping;
    private parentScene: string = 'SplashScene';
    private delayedCalls: Phaser.Time.TimerEvent[] = [];
    private isSkipped: boolean = false;
    private volumeSlider!: VolumeSlider;
    private muteBtn!: Phaser.GameObjects.Container;

    constructor() {
        super("InstructionsScene");
        this.bunnyJumping = new BunnyJumping(this, true);
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage() || "en";
        BunnyJumping._preload(scene);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/info_screen`);
        scene.load.image('hand', 'hand.png');
        scene.load.image('hand_click', 'hand_click.png');

        // Load tutorial audio files
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}/info_screen`);
        scene.load.audio('step_1', `step_1_${lang}.mp3`);
        scene.load.audio('step_2', `step_2_${lang}.mp3`);
        scene.load.audio('step_3', `step_3_${lang}.mp3`);
        scene.load.audio('step_3_backward', `step_3_backward_${lang}.mp3`);
        scene.load.audio('step_4', `step_4_${lang}.mp3`);
        scene.load.audio('step_5', `step_5_${lang}.mp3`);

        // Preload volume slider assets
        VolumeSlider.preload(scene, 'blue');

        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('door_close', `door_close.mp3`);

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('half_button_default', 'half_button_default.png');
        scene.load.image('half_button_hover', 'half_button_hover.png');
        scene.load.image('half_button_pressed', 'half_button_pressed.png');
    }

    init(data: { reset?: boolean, parentScene: string }) {
        if (data.parentScene) {
            this.parentScene = data.parentScene;
        }
        this.bunnyJumping.init(data);
        this.bunnyJumping.isSkipped = false;
    }

    create() {
        const howToPlayText = this.addText(this.display.width / 2, 65, i18n.t('info.howToPlay'), {
            font: "700 30px Exo",
            color: '#000000',
        }).setOrigin(0.5).setDepth(20);

        new TextOverlay(this, howToPlayText, { label: i18n.t('info.howToPlay'), tag: 'h1', role: 'header' });

        this.createSkipButton();
        this.createMuteButton();
        this.createVolumeControls();

        this.bunnyJumping.create();
        this.bunnyJumping.disableNumberpad();

        const questionBox = this.bunnyJumping.questionBox;
        const questionBoxBg = questionBox?.getByName('question_box_bg') as Phaser.GameObjects.Image;
        if (questionBoxBg) {
            questionBoxBg.setTexture('tutorial_box');
        }

        const timer = this.time.delayedCall(1000, () => {
            this.bunnyJumping.playStep1();
        });
        this.delayedCalls.push(timer);

        this.events.once('showPlayButton', () => {
            if (this.parentScene === 'SplashScene') {
                this.audioManager.playSoundEffect('step_5');
            }
            this.createPlayButton();
        });
    }

    private createSkipButton() {
        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: 'half_button_default',
                hover: 'half_button_hover',
                pressed: 'half_button_pressed',
            },
            text: i18n.t('common.skip'),
            label: i18n.t('common.skip'),
            textStyle: {
                font: "700 32px Exo",
                color: '#FFFFFF',
            },
            imageScale: 1,
            x: this.display.width - 54,
            y: 80,
            onClick: () => {
                if (this.isSkipped) return;
                this.audioManager.stopAllSoundEffects();
                this.bunnyJumping.isSkipped = true;
                this.startGameScene();
            }
        }).setDepth(20);
    }

    private createPlayButton(): void {
        this.bunnyJumping.destroyNumberpad();
        
        const playButton = ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            label: this.parentScene === 'SplashScene' ? i18n.t("common.play") : i18n.t("common.back"),
            textStyle: {
                font: "700 32px Exo",
                color: "#ffffff",
            },
            imageScale: 0.8,
            raisedOffset: 3.5,
            x: this.display.width / 2,
            y: this.display.height - 79,
            onClick: () => {
                if (this.bunnyJumping.isSkipped) return;
                this.audioManager.stopAllSoundEffects();
                this.bunnyJumping.isSkipped = true;
                this.startGameScene();
            },
        });
        playButton.setDepth(20);

        ButtonHelper.startBreathingAnimation(playButton, {
            scale: 1.1,
            duration: 1000,
            ease: "Sine.easeInOut",
        });
    }

    public startGameScene() {
        if (this.parentScene === 'SplashScene') {
            this.audioManager.stopAllSoundEffects();
            this.scene.stop('InstructionsScene');
            this.scene.start('GameScene');
        } else {
            this.scene.stop('InstructionsScene');
            this.scene.resume('GameScene');
            this.audioManager.resumeAll();
        }
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
            y: 160,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });
        this.muteBtn.setDepth(20);
    }

    private createVolumeControls() {
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(
            this.display.width - 210,
            258,
            'blue',
            i18n.t('common.volume')
        );

        const volumeBtn = ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.SETTINGS_ICON.KEY,
            label: i18n.t('common.volume'),
            x: this.display.width - 54,
            y: 240,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
        volumeBtn.setDepth(20);
    }

    update(): void {
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