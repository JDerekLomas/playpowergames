export class ImageOverlay {
    public element!: HTMLImageElement;
    public domElement: Phaser.GameObjects.DOMElement | null = null;
    private dragEventHandlers: { [key: string]: EventListener } = {};
    private prevState: { hidden: boolean } | null = null;

    constructor(
        private scene: Phaser.Scene,
        private target: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
        private options: {
            label: string;
            cursor?: string;
            ariaLive?: 'off' | 'polite' | 'assertive';
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
        const { label, cursor = 'default', ariaLive = 'polite', announce = false, style = {} } = this.options;

        const matrix = this.target.getWorldTransformMatrix();

        const worldScaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
        const worldScaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);

        const frameWidth = (this.target as Phaser.GameObjects.Sprite).frame?.width || this.target.width;
        const frameHeight = (this.target as Phaser.GameObjects.Sprite).frame?.height || this.target.height;

        const scaledWidth = frameWidth * worldScaleX;
        const scaledHeight = frameHeight * worldScaleY;

        this.element = document.createElement('img');

        // Apply base styles
        const baseStyles = {
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: 'transparent',
            border: 'none !important',
            outline: 'none !important',
            padding: '0',
            margin: '0',
            opacity: '0',
            textAlign: 'center',
            color: 'transparent',
            cursor,
            userSelect: 'none',
            position: 'absolute',
        };
        Object.assign(this.element.style, baseStyles, style);

        // Set a transparent image to have a valid src attribute
        // Use a more reliable transparent pixel for Safari compatibility
        this.element.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+';

        // Add drag event handlers
        this.dragEventHandlers = {
            dragstart: ((e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            }) as EventListener,
            drag: ((e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            }) as EventListener,
            dragend: ((e: Event) => {
                e.preventDefault();
                e.stopPropagation();
            }) as EventListener
        };

        // Add event listeners
        Object.entries(this.dragEventHandlers).forEach(([event, handler]) => {
            this.element.addEventListener(event, handler);
        });

        // Apply ARIA attributes
        this.element.setAttribute('role', 'img');
        this.element.setAttribute('aria-live', ariaLive);
        this.element.setAttribute('aria-label', label);

        // Handle announcement
        if (announce) {
            this.element.textContent = '';
            this.scene.time.delayedCall(100, () => {
                this.element.textContent = label;
            });
        }

        // Calculate position using world transform matrix
        const originX = this.target.originX !== undefined ? this.target.originX : 0;
        const originY = this.target.originY !== undefined ? this.target.originY : 0;
        const x = matrix.tx - scaledWidth * originX;
        const y = matrix.ty - scaledHeight * originY;

        // Add directly to scene
        const centerX = x + scaledWidth * 0.5;
        const centerY = y + scaledHeight * 0.5;
        this.domElement = this.scene.add.dom(centerX, centerY, this.element);
        this.domElement.setOrigin(0.5);        
    }

    public updateLabel(label: string) {
        if (!this.element) return;
        this.element.setAttribute('aria-label', label);
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

    public recreate() {
        this.destroy();
        this.create();
    }

    public destroy() {
        // Remove event listeners
        if (this.element) {
            Object.entries(this.dragEventHandlers).forEach(([event, handler]) => {
                this.element.removeEventListener(event, handler);
            });
        }

        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        if (this.domElement && !this.domElement.scene) {
            this.domElement.destroy();
        }
        this.domElement = null;
    }
}
