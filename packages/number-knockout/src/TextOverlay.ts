
export class TextOverlay {
    private element!: HTMLElement;
    private domElement: Phaser.GameObjects.DOMElement | null = null;
    private prevState: { hidden: boolean } | null = null;

    constructor(
        private scene: Phaser.Scene,
        private target: Phaser.GameObjects.Text,
        private options: {
            label: string;
            role?: string;
            ariaLive?: 'off' | 'polite' | 'assertive';
            tag?: keyof HTMLElementTagNameMap;
            cursor?: string;
            announce?: boolean;
            style?: Partial<CSSStyleDeclaration>;
        },
    ) {
        this.create();
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
        this.scene.events.on("pause", this.handlePause);
        this.scene.events.on("resume", this.handleResume);
        this.target.once('destroy', () => this.destroy());
    }

    private create() {
        const {
            label,
            role = 'status',
            ariaLive = 'polite',
            tag = 'p',
            cursor = 'default',
            announce = false,
            style = {},
        } = this.options;

        const matrix = this.target.getWorldTransformMatrix();

        const worldScaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
        const worldScaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);

        const scaledWidth = this.target.width * worldScaleX;
        const scaledHeight = this.target.height * worldScaleY;

        // Create and configure element
        this.element = document.createElement(tag);

        // Apply base styles
        const baseStyles = {
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: 'transparent',
            border: 'none',
            opacity: '0',
            textAlign: 'center',
            color: 'transparent',
            userSelect: 'none',
            padding: '0',
            margin: '0',
            cursor,
            position: 'absolute',
        };
        Object.assign(this.element.style, baseStyles, style);

        // Apply ARIA attributes
        this.element.setAttribute('role', role);
        this.element.setAttribute('aria-live', ariaLive);

        // Handle content and announcement
        if (announce) {
            this.element.textContent = '';
            this.scene.time.delayedCall(100, () => {
                this.element.textContent = label;
            });
        } else {
            this.element.textContent = label;
        }

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

    public updateContent(label: string) {
        if (!this.element) return;

        this.element.textContent = label;

        // Update dimensions
        const matrix = this.target.getWorldTransformMatrix();
        const worldScaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
        const worldScaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
        const scaledWidth = this.target.width * worldScaleX;
        const scaledHeight = this.target.height * worldScaleY;

        this.element.style.width = `${scaledWidth}px`;
        this.element.style.height = `${scaledHeight}px`;
    }

    public setAriaHidden(hidden: boolean) {
        if (hidden) {
            this.element.setAttribute('aria-hidden', 'true');
        } else {
            if(!this.prevState || this.prevState.hidden === false) {
                this.element.removeAttribute('aria-hidden');
            }
        }
    }

    private handlePause = () => {
        if (this.prevState) return; // already paused
        this.prevState = { 
            hidden: this.element.getAttribute('aria-hidden') === 'true',
        };
        this.setAriaHidden(true);
    }

    private handleResume = () => {
        if (!this.prevState) return; // not paused
        this.setAriaHidden(false);
        this.prevState = null;
    }

    public destroy() {
        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        if (this.domElement?.destroy) {
            this.domElement.destroy();
        }
    }
}
