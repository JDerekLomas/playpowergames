import { BaseScene, ButtonHelper, ButtonOverlay, i18n, TextOverlay } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class ChoiceScene extends BaseScene {
    private selectedHero: number = 1;
    private choiceButtons: Phaser.GameObjects.Container[] = [];
    private selectedHeroImg?: Phaser.GameObjects.Image;
    
    constructor() {
        super('ChoiceScene');
    }

    init() {
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath('assets/images/choice_screen');
        scene.load.image('choice_screen_bg', 'bg.png');
        scene.load.image('choice_box', 'choice_box.png');
        scene.load.image('choice_box_selected', 'choice_box_selected.png');
        scene.load.image('selected_hero_shadow', 'selected_hero_shadow.png');
    }

    create() {
        this.addImage(this.display.width / 2, this.display.height / 2, 'choice_screen_bg').setOrigin(0.5);
        const headingText = this.addText(this.display.width / 2, 70, i18n.t('choiceScene.chooseAvatar'), {
            font: "700 30px Exo"
        }).setOrigin(0.5);

        new TextOverlay(this, headingText, { label: i18n.t('choiceScene.chooseAvatar'), tag: 'h1', role: 'heading' });

        this.createChoiceButtons();

        this.addImage(785, 475, 'selected_hero_shadow').setOrigin(0.5);
        this.selectedHeroImg = this.addImage(785, 500, `hero_${this.selectedHero}`).setOrigin(0.5, 1);
        this.selectedHeroImg.setScale(1.5);

        ButtonHelper.createButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY,
            },
            text: i18n.t('choiceScene.select'),
            label: i18n.t('choiceScene.select'),
            textStyle: {
                font: "700 36px Exo",
            },
            x: 804,
            y: 665.5,
            onClick: () => {
                this.registry.set('selected_hero_id', this.selectedHero);
                this.scene.start('InstructionsScene', { parentScene: 'ChoiceScene' });
            }
        })
    }

    private createChoiceButtons() {
        const startX = 109.5;
        const startY = 298;
        const gap = 36;
        const width = 147;
        const height = 132;

        for (let i = 0; i <= 5; i++) {
            const x = startX + (i % 2) * (width + gap);
            const y = startY + Math.floor(i / 2) * (height + gap);
            const button = this.createChoiceButton(x, y, i + 1);
            this.choiceButtons.push(button);
        }
    }

    createChoiceButton(x: number, y: number, id: number) {
        const buttonContainer = this.add.container(
            this.getScaledValue(x),
            this.getScaledValue(y)
        );

        const buttonBgTexture = id === this.selectedHero ? 'choice_box_selected' : 'choice_box';
        const buttonBg = this.addImage(0, 0, buttonBgTexture).setOrigin(0.5).setName('choice_box_bg');
        const heroImg = this.addImage(0, 0, `hero_${id}`).setOrigin(0.5).setName('hero_img');
        heroImg.setScale(0.57);

        buttonContainer.add([buttonBg, heroImg]);

        buttonContainer.setSize(buttonBg.displayWidth, buttonBg.displayHeight);

        buttonContainer.setInteractive({ useHandCursor: true });

        const handlePointerDown = () => {
            this.audioManager.playSoundEffect('button_click');
            this.choiceButtons.forEach((button) => {
                const buttonBg = button.getByName('choice_box_bg') as Phaser.GameObjects.Image;
                buttonBg.setTexture('choice_box');
            });
            this.selectedHero = id;
            buttonBg.setTexture('choice_box_selected');
            this.selectedHeroImg?.setTexture(`hero_${id}`);
        }

        new ButtonOverlay(this, buttonContainer, { label: i18n.t('choiceScene.avatar', { id }), onKeyDown: handlePointerDown, style: { outline: 'revert' } })

        buttonContainer.on('pointerdown', handlePointerDown);

        return buttonContainer;
    }
}