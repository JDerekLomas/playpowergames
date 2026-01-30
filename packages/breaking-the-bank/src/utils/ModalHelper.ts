import { BaseScene, ButtonHelper, i18n } from "@k8-games/sdk";
import { BUTTONS } from "../config/common";

export class ModalHelper {
    private isModalOpen: boolean = false;
    private modalBackground!: Phaser.GameObjects.Container;
    private modalContent!: Phaser.GameObjects.Container;

    constructor() {
    }

    public showModal(scene: BaseScene, background: Phaser.GameObjects.Container, content: Phaser.GameObjects.Container, onClose: () => void) {
        this.isModalOpen = true;

        // Create semi-transparent background
        this.modalBackground = background;
        this.modalBackground.setInteractive();

        // Create modal container
        this.modalContent = content;

        const closeButton = ButtonHelper.createButton({
            scene: scene,
            imageKeys: {
                default: BUTTONS.BUTTON.KEY,
                hover: BUTTONS.BUTTON_HOVER.KEY,
                pressed: BUTTONS.BUTTON_PRESSED.KEY
            },
            imageScale: 0.7,
            text: i18n.t('game.close'),
            textStyle: {
                fontFamily: "Exo",
                fontStyle: "bold",
                fontSize: 35,
                color: '#ffffff',
            },
            x: 0,
            y: 628 / 2,
            onClick: () => {
                this.hideModal(onClose);
            }
        });
        this.modalContent.add(closeButton);

        // Add click handler to background to close modal
        this.modalBackground.on('pointerdown', () => this.hideModal(onClose));
    }

    public hideModal(onClose: () => void) {
        if (this.modalBackground) {
            this.modalBackground.destroy();
        }
        if (this.modalContent) {
            this.modalContent.destroy();
        }
        this.isModalOpen = false;

        onClose();
    }

    public isOpen() {
        return this.isModalOpen;
    }
}
