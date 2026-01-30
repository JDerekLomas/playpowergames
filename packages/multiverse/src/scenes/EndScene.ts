import { BaseScene, i18n, Question, TextOverlay } from "@k8-games/sdk";
import { createGlitch } from "../utils/helper";
import { ASSETS_PATHS } from "../config/common";

export class EndScene extends BaseScene {
    private bgImage!: Phaser.GameObjects.Image;
    private dcpmCount: number = 0;
    private incorrectQuestions: Question[] = [];

    constructor() {
        super('EndScene');
    }

    init(data: { dcpm: number; incorrectQuestions: Question[] }) {
        this.dcpmCount = data.dcpm;
        this.incorrectQuestions = data.incorrectQuestions;
    }

    create() {
        this.bgImage = this.addImage(this.display.width / 2, this.display.height / 2, 'scene_2a_bg').setOrigin(0.5);

        this.addRectangle(this.display.width / 2, this.display.height, this.display.width, 123, 0x000000).setOrigin(0.5, 1).setDepth(1);

        const instructionText = this.addText(this.display.width / 2, this.display.height - 70, '', {
            font: '400 26px Exo',
        }).setOrigin(0.5).setDepth(1);

        createGlitch(this, () => {
            instructionText.setText(i18n.t('additionAdventure.instructions.endSceneInstruction'));
            new TextOverlay(this, instructionText, { label: i18n.t('additionAdventure.instructions.endSceneInstruction'), announce: true });

            this.changeBg();

            const endAudio = this.audioManager.playSoundEffect('end_instruction');

            endAudio?.on('complete', () => {
                this.scene.start('ScoreboardScene', {
                    dcpm: this.dcpmCount,
                    incorrectQuestions: this.incorrectQuestions,
                });
            });
        })
    }

    private changeBg() {
        const bgImage2 = this.addImage(this.display.width / 2, this.display.height / 2, 'scene_1_bg').setOrigin(0.5);
        bgImage2.setAlpha(0);

        this.tweens.add({
            targets: [bgImage2],
            alpha: 1,
            duration: 1500,
            ease: 'Power2',
        });

        this.tweens.add({
            targets: [this.bgImage],
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
        });
    }

    static _preload(scene: BaseScene) {
        const lang = i18n.getLanguage();
        scene.load.setPath(`${ASSETS_PATHS.AUDIOS}`);
        scene.load.audio('end_instruction', `end_instruction_${lang}.mp3`);
    }
}