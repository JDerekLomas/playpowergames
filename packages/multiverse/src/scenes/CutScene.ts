import { BaseScene, ButtonHelper, GameConfigManager, i18n, TextOverlay } from '@k8-games/sdk';
import { ASSETS_PATHS } from '../config/common';
import { createGlitch } from '../utils/helper';

export class CutScene extends BaseScene {
    private topic: string = 'grade3_topic2';
    private bgImage!: Phaser.GameObjects.Image;
    private instructionText!: Phaser.GameObjects.Text;
    private instructionTextOverlay!: TextOverlay;
    private isSkipped: boolean = false;
    private skipBtn?: Phaser.GameObjects.Container;
    private bgZoomTween?: Phaser.Tweens.Tween;

    constructor() {
        super('CutScene');
        const gameConfigManager = GameConfigManager.getInstance();
        this.topic = gameConfigManager.get('topic') || 'grade3_topic2';
    }

    init() {
        this.isSkipped = false;
    }

    create() {
        this.bgImage = this.addImage(this.display.width / 2, this.display.height / 2, 'scene_1_bg').setOrigin(0.5);

        this.addRectangle(this.display.width / 2, this.display.height, this.display.width, 123, 0x000000).setOrigin(0.5, 1);

        this.instructionText = this.addText(this.display.width / 2, this.display.height - 70, '', {
            font: '400 26px Exo',
        }).setOrigin(0.5);

        this.instructionTextOverlay = new TextOverlay(this, this.instructionText, { label: '', announce: true });

        this.cutScene1();
        this.createSkipButton();
    }

    private cutScene1() {
        if (this.isSkipped) return;

        this.bgImage.setTexture('scene_1_bg');
        this.instructionText.setText(i18n.t('cutscene.scene_1_instruction'));
        this.time.delayedCall(100, () => {
            this.instructionTextOverlay.updateContent(i18n.t('cutscene.scene_1_instruction'));
        });

        this.startBgZoomTween(1.1, 5000);

        const instructionAudio = this.audioManager.playSoundEffect('cutscene_1');
        instructionAudio?.on('complete', () => {
            this.time.delayedCall(200, () => {
                this.stopBgZoomTween();
                createGlitch(this, () => {
                    this.cutScene2a();
                });
            })
        });
    }

    private cutScene2a() {
        if (this.isSkipped) return;

        this.bgImage.setTexture('scene_2a_bg');
        this.instructionText.setText(i18n.t('cutscene.scene_2_instruction'));   
        this.instructionTextOverlay.updateContent(i18n.t('cutscene.scene_2_instruction'));

        const instructionAudio = this.audioManager.playSoundEffect('cutscene_2');
        this.time.delayedCall(3000, () => {
            createGlitch(this, () => {
                this.cutScene2b(instructionAudio);
            });
        })
    }

    private cutScene2b(instructionAudio: Phaser.Sound.WebAudioSound | undefined) {
        if (this.isSkipped) return;

        this.bgImage.setTexture('scene_2b_bg');

        instructionAudio?.on('complete', () => {
            this.time.delayedCall(200, () => {
                createGlitch(this, () => {
                    this.cutScene3();
                });
            });
        });
    }

    private cutScene3() {
        if (this.isSkipped) return;

        this.bgImage.setTexture('scene_3_bg');
        this.instructionText.setText(i18n.t('cutscene.scene_3_instruction'));
        this.instructionTextOverlay.updateContent(i18n.t('cutscene.scene_3_instruction'));

        const topText = this.addText(this.display.width / 2, 195, 'CATASTROPHIC MALFUNCTION — ALL PORTALS SEALED', {
            font: '700 24px Exo',
            color: '#FF2D18'
        }).setOrigin(0.5);

        new TextOverlay(this, topText, { label: 'CATASTROPHIC MALFUNCTION — ALL PORTALS SEALED' });

        const bottomText = this.addText(this.display.width / 2, 521, 'PORTAL GATE SYSTEM: OFFLINE', {
            font: '700 24px Exo',
            color: '#FF2D18'
        }).setOrigin(0.5);

        new TextOverlay(this, bottomText, { label: 'PORTAL GATE SYSTEM: OFFLINE' });

        const instructionAudio = this.audioManager.playSoundEffect('cutscene_3');
        instructionAudio?.on('complete', () => {
            this.audioManager.stopAllSoundEffects();
            this.skipBtn?.destroy();
            createGlitch(this, () => {
                if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                    this.scene.start('SelectScene');
                } else {
                    this.scene.start('GameScene');
                }
            });
        });
    }

    private startBgZoomTween(scaleTo: number = 1.05, duration: number = 4000) {
        // If a previous tween exists, stop and remove it
        if (this.bgZoomTween && this.bgZoomTween.isPlaying()) {
            this.bgZoomTween.stop();
            this.bgZoomTween.remove();
        }
    
        // Always ensure starting scale is 1
        this.bgImage.setScale(1);
    
        // Create and store new tween
        this.bgZoomTween = this.tweens.add({
            targets: this.bgImage,
            scale: this.getScaledValue(scaleTo),
            duration,
            ease: 'Sine.easeInOut',
            yoyo: false,
            repeat: 0,
        });
    }

    private stopBgZoomTween(resetScale: boolean = true) {
        if (this.bgZoomTween) {
            if (this.bgZoomTween.isPlaying()) this.bgZoomTween.stop();
            this.bgZoomTween.remove();
            this.bgZoomTween = undefined;
        }
    
        if (resetScale) {
            this.bgImage.setScale(1);
        }
    }

    private createSkipButton() {
        this.skipBtn = ButtonHelper.createButton({
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
            x: this.display.width - 84,
            y: 80,
            onClick: () => {
                if (this.isSkipped) return;
                this.audioManager.stopAllSoundEffects();
                this.isSkipped = true;
                this.skipBtn?.destroy();
                createGlitch(this, () => {
                    if (this.topic === 'g5_g6' || this.topic === 'g7_g8') {
                        this.scene.start('SelectScene');
                    } else {
                        this.scene.start('GameScene');
                    }
                });
            }
        });
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage();
        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/cut_screen`);
        scene.load.image('scene_1_bg', 'scene_1_bg.png');
        scene.load.image('scene_2a_bg', 'scene_2a_bg.png');
        scene.load.image('scene_2b_bg', 'scene_2b_bg.png');
        scene.load.image('scene_3_bg', 'scene_3_bg.png');
        scene.load.image('glitch_1', 'glitch_1.png');
        scene.load.image('glitch_2', 'glitch_2.png');
        scene.load.image('glitch_3', 'glitch_3.png');

        scene.load.setPath('assets/audios');
        scene.load.audio('cutscene_1', `cutscene_1_${lang}.mp3`);
        scene.load.audio('cutscene_2', `cutscene_2_${lang}.mp3`);
        scene.load.audio('cutscene_3', `cutscene_3_${lang}.mp3`);
        scene.load.audio('glitch_sfx', 'glitch_sfx.mp3');

        scene.load.setPath(`${ASSETS_PATHS.IMAGES}/common`);
        scene.load.image('half_button_default', 'half_button_default.png');
        scene.load.image('half_button_hover', 'half_button_hover.png');
        scene.load.image('half_button_pressed', 'half_button_pressed.png');
    }
}
