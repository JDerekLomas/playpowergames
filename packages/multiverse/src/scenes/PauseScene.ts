import { BaseScene, i18n } from '@k8-games/sdk';
import { ButtonHelper } from '@k8-games/sdk';
import { BUTTONS } from '../config/common';

export class PauseScene extends BaseScene {
    private parentScene?: string;

    constructor() {
        super('PauseScene');
    }

    init(data: { parentScene: string }) {
        this.parentScene = data.parentScene;
    }

    create() {
        // Create dark overlay
        this.addRectangle(0, 0, this.display.width, this.display.height, 0x000000, 0.7)
            .setOrigin(0)
            .setScrollFactor(0)
            .setInteractive()
            .on('pointerup', () => {
                this.resumeGame();
            });

        // Add resume button
        ButtonHelper.createIconButton({
            scene: this,
            imageKeys: {
                default: BUTTONS.ICON_BTN.KEY,
                hover: BUTTONS.ICON_BTN_HOVER.KEY,
                pressed: BUTTONS.ICON_BTN_PRESSED.KEY,
            },
            icon: BUTTONS.RESUME_ICON.KEY,
            label: i18n.t('common.resume'),
            x: this.display.width - 60,
            y: 61,
            onClick: () => this.resumeGame(),
        });

        // Add keyboard listener for ESC
        this.input.keyboard?.on('keydown-ESC', () => {
            this.resumeGame();
        });
    }

    static _preload(scene: BaseScene) {
        scene.load.setPath(`${BUTTONS.PATH}`);
        scene.load.image(BUTTONS.RESUME_ICON.KEY, BUTTONS.RESUME_ICON.PATH);
    }

    private resumeGame() {
        this.scene.stop();
        this.audioManager.resumeAll();
        this.scene.resume(this.parentScene);
    }
}
