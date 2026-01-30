import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay, VolumeSlider } from '@k8-games/sdk';
import { createGlitch } from '../utils/helper';
import { BUTTONS } from '../config/common';

export class SelectScene extends BaseScene {
    private parentScene: string = 'SplashScreen';
    private reset: boolean = false;
    private muteBtn!: Phaser.GameObjects.Container;
    private volumeSlider!: VolumeSlider;

    constructor() {
        super('SelectScene');
    }

    init(data?: { reset?: boolean; parentScene?: string }) {
        this.parentScene = data?.parentScene || 'SplashScreen';
        this.reset = data?.reset || false;
    }

    create() {
        const lang = i18n.getLanguage() || 'en';
        this.addImage(this.display.width / 2, this.display.height / 2, 'topic_scene_bg').setOrigin(0.5);

        this.audioManager.playSoundEffect('select_topic_portal');

        const title = this.addText(this.display.width / 2 + 8, 47, i18n.t('topic.selectTopic'), {
            font: `700 ${lang === 'es' ? '24px' : '30px'} Exo`,
        }).setOrigin(0.5);

        new TextOverlay(this, title, { label: i18n.t('topic.selectTopic'), tag: 'h1', role: 'heading' });

        this.createButtons();

        this.createTopicButton(513, 342, 'add');
        this.createTopicButton(783, 342, 'sub');
        this.createTopicButton(513, 598, 'mul');
        this.createTopicButton(783, 598, 'div');
    }

    private createTopicButton(x: number, y: number, topic: 'add' | 'sub' | 'mul' | 'div') {
        const button = this.add.container(
            this.getScaledValue(x),
            this.getScaledValue(y)
        );

        const buttonBg = this.addImage(0, 0, `${topic}_default`).setOrigin(0.5);
        const buttonText = this.addText(0, 32, i18n.t(`topic.${topic}`), {
            font: '700 16px Exo',
            color: '#000000',
        }).setOrigin(0.5);
        
        button.add([buttonBg, buttonText]);
        button.setSize(buttonBg.displayWidth, buttonBg.displayHeight);
        button.setInteractive({ useHandCursor: true });

        const scaleDownUp = (target: Phaser.GameObjects.Container, duration: number = 100, scaleDownAmount: number = 0.9) => {
            const originalScale = target.scale;
    
            // Create a quick scale down and up effect
            target.scene.tweens.add({
                targets: target,
                scaleX: originalScale * scaleDownAmount,
                scaleY: originalScale * scaleDownAmount,
                duration: duration / 2,
                ease: 'Power2',
                yoyo: true,
                onComplete: () => {
                    target.setScale(originalScale);
                }
            });
        }

        const pointerOver = () => {
            buttonBg.setTexture(`${topic}_hover`);
            button.setScale(1.05);
            this.audioManager.playSoundEffect('portal_hover_sfx');
        }

        const pointerOut = () => {
            buttonBg.setTexture(`${topic}_default`);
            button.setScale(1);
        }

        const pointerDown = () => {
            buttonBg.setTexture(`${topic}_pressed`);
            this.audioManager.playSoundEffect('button_click');
            button.setScale(1);
            scaleDownUp(button, 100, 0.9);
        }

        const pointerUp = () => {
            buttonBg.setTexture(`${topic}_default`);
            this.registry.set('topic', topic);
            createGlitch(this, () => {
                this.scene.start('GameScene', { reset: this.reset, parentScene: this.parentScene });
            })
        }

        new ButtonOverlay(this, button, { label: i18n.t(`topic.${topic}`), ariaLive: 'off', onKeyDown: pointerDown, onKeyUp: pointerUp, onFocus: pointerOver, onBlur: pointerOut });

        button.on('pointerdown', pointerDown);
        button.on('pointerup', pointerUp);
        button.on('pointerover', pointerOver);
        button.on('pointerout', pointerOut);

        return button;
    }

    private createButtons() {
        // Pause button
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.PAUSE_ICON.KEY,
            label: i18n.t('common.pause'),
            x: this.display.width - 60,
            y: 61,
            raisedOffset: 3.5,
            onClick: () => {
                this.scene.pause(this);
                this.scene.launch('PauseScene', { parentScene: 'SelectScene' });
                this.audioManager.pauseAll();
                this.scene.bringToTop('PauseScene');
            },
        });

        // Mute button (always create)
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
            y: 149,
            raisedOffset: 3.5,
            onClick: () => {
                this.audioManager.setMute(!this.audioManager.getIsAllMuted());
            },
        });

        // Volume slider (always create)
        this.volumeSlider = new VolumeSlider(this);
        this.volumeSlider.create(this.display.width - 220, 257, 'blue', i18n.t('common.volume'));
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
            y: 237,
            raisedOffset: 3.5,
            onClick: () => {
                this.volumeSlider.toggleControl();
            },
        });
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

    static _preload(scene: BaseScene) {
        const ops = ['add', 'sub', 'mul', 'div'];
        const lang = i18n.getLanguage() || 'en';

        scene.load.setPath('assets/images/select_screen');
        ops.forEach(op => {
            scene.load.image(`${op}_default`, `${op}_default.png`);
            scene.load.image(`${op}_hover`, `${op}_hover.png`);
            scene.load.image(`${op}_pressed`, `${op}_pressed.png`);
        });
        scene.load.image('topic_scene_bg', 'topic_scene_bg.png');

        scene.load.setPath('assets/audios');
        scene.load.audio('select_topic_portal', `select_topic_portal_${lang}.mp3`);
        scene.load.audio('portal_hover_sfx', `portal_hover_sfx.mp3`);
    }
}
