import { i18n } from "./languageHelper";

export class ProgressBarOverlay {
    private element!: HTMLDivElement;
    private domElement: Phaser.GameObjects.DOMElement | null = null;

    constructor(
        private scene: Phaser.Scene,
        private target: Phaser.GameObjects.Container,
        private options?: {
            ariaLive?: "off" | "polite" | "assertive";
            style?: Partial<CSSStyleDeclaration>;
        }
    ) {
        this.create();
        this.scene.events.once("shutdown", () => this.destroy());
        this.scene.events.on("pause", () => this.setAriaHidden(true));
        this.scene.events.on("resume", () => this.setAriaHidden(false));
        this.scene.events.once("destroy", () => this.destroy());
        this.target.once("destroy", () => this.destroy());
    }

    private create() {
        const { ariaLive = "polite", style = {} } = this.options || {};

        const bound = this.target.getBounds();
        const matrix = this.target.getWorldTransformMatrix();
        const scaledHeight = bound.height;
        const scaledWidth = bound.width;

        // Create and configure element
        this.element = document.createElement("div");

        // Apply base styles
        const baseStyles = {
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: "transparent",
            border: "none",
            opacity: "0",
            color: "transparent",
            userSelect: "none",
            padding: "0",
            margin: "0",
            cursor: "default",
            position: "absolute",
        };
        Object.assign(this.element.style, baseStyles, style);

        // Apply ARIA attributes for progressbar
        this.element.setAttribute("role", "progressbar");
        this.element.setAttribute("aria-label", i18n.t("game.gameProgress") as string);
        this.element.setAttribute("aria-live", ariaLive);
        this.element.setAttribute("aria-atomic", "true");
        this.element.setAttribute("aria-valuemin", "0");
        this.element.setAttribute("aria-valuemax", "100");
        this.element.setAttribute("aria-valuenow", "0");
        this.element.setAttribute("aria-valuetext", i18n.t("game.progress", { progress: 0 }) as string);

        // Calculate position using world transform matrix
        const originX = this.target.originX !== undefined ? this.target.originX : 0;
        const originY = this.target.originY !== undefined ? this.target.originY : 0;
        const x = matrix.tx - scaledWidth * originX;
        const y = matrix.ty - scaledHeight * originY;

        // Create and position DOM element directly in scene
        const centerX = x + scaledWidth * 0.5;
        const centerY = y + scaledHeight * 0.5;
        this.domElement = this.scene.add.dom(centerX, centerY, this.element);
        this.domElement.setOrigin(0.5);
    }

    public updateProgress(
        progress: number,
        streak?: number,
    ) {
        if (!this.element) return;

        const progressPercentage = Math.round(progress * 100);
        this.element.setAttribute("aria-valuenow", progressPercentage.toString());

        // Update label with progress and optional streak information
        let label = i18n.t("game.progress", { progress: progressPercentage }) as string;
        if (streak && streak >= 3) {
            label += ", " + i18n.t("game.inARow", { count: streak });
        }
        this.element.setAttribute("aria-valuetext", label);
    }

    public setAriaHidden(hidden: boolean) {
        if (hidden) {
            this.element.setAttribute("aria-hidden", "true");
        } else {
            this.element.removeAttribute("aria-hidden");
        }
    }

    public destroy() {
        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        if (this.domElement && !this.domElement.scene) {
            this.domElement.destroy();
        }
        this.domElement = null;
    }
}
