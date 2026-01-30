
export class ButtonOverlay {
    public element!: HTMLButtonElement;
    public domElement: Phaser.GameObjects.DOMElement | null = null;
    private cleanupHandlers: (() => void)[] = [];
    private prevState: { disabled: boolean, hidden: boolean, hadFocus: boolean } | null = null;

    constructor(
        private scene: Phaser.Scene,
        private target: Phaser.GameObjects.Container,
        private options: {
            label: string;
            role?: string;
            ariaLive?: 'off' | 'polite' | 'assertive';
            cursor?: string;
            onKeyDown?: () => void;
            onKeyUp?: () => void;
            onFocus?: () => void;
            onBlur?: () => void;
            disabled?: boolean;
            announce?: boolean;
            style?: Partial<CSSStyleDeclaration>;
        },
    ) {
        this.create();
    }

    private create() {
        const {
            label,
            role = 'button',
            ariaLive = 'polite',
            cursor = 'pointer',
            announce = false,
            style = {},
            disabled = false,
        } = this.options;

        const matrix = this.target.getWorldTransformMatrix();

        const worldScaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
        const worldScaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);

        const scaledWidth = this.target.width * worldScaleX;
        const scaledHeight = this.target.height * worldScaleY;

        this.element = document.createElement('button');
        this.element.setAttribute('aria-label', label);
        this.element.setAttribute('role', role);
        this.element.setAttribute('aria-live', ariaLive);

        if (disabled) {
            this.element.setAttribute('aria-disabled', 'true');
            this.element.setAttribute('disabled', 'true');
            this.element.tabIndex = -1;
        } else {
            this.element.tabIndex = 0;
        }

        // Apply styles
        const baseStyles = {
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            backgroundColor: 'transparent',
            color: 'transparent',
            border: 'none',
            opacity: '0',
            margin: '0',
            padding: '0',
            cursor: disabled ? 'not-allowed' : cursor,
            outline: 'none',
            pointerEvents: 'auto',
            userSelect: 'none',
            position: 'absolute',
        };
        Object.assign(this.element.style, baseStyles, style);

        // Setup event handlers
        const handlers = {
            focus: (event: FocusEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.scene?.scene?.isActive()) {
                    this.element.focus({ preventScroll: true });
                    if (this.options.onFocus) {
                        this.options.onFocus();
                    }
                }
            },
            blur: (event: FocusEvent) => {
                event.stopPropagation();
                if (this.scene?.scene?.isActive() && this.options.onBlur) {
                    this.options.onBlur();
                }
            },
            keyDown: (event: KeyboardEvent) => {
                if (this.scene?.scene?.isActive() && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (this.options.onKeyDown) this.options.onKeyDown();
                }
            },
            keyUp: (event: KeyboardEvent) => {
                if (this.scene?.scene?.isActive() && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (this.options.onKeyUp) this.options.onKeyUp();
                }
            },
            pointerDown: (event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.scene?.scene?.isActive() && this.options.onKeyDown && !this.element.hasAttribute('disabled')) {
                    this.options.onKeyDown();
                }
            },
            pointerUp: (event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.scene?.scene?.isActive() && this.options.onKeyUp && !this.element.hasAttribute('disabled')) {
                    this.options.onKeyUp();
                }
            },
            click: (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
            },
            touchStart: (event: TouchEvent) => {
                event.preventDefault();
                event.stopPropagation();
            },
            touchEnd: (event: TouchEvent) => {
                event.preventDefault();
                event.stopPropagation();
            },
        };

        // Attach event listeners
        this.element.addEventListener('focus', handlers.focus, { capture: true });
        this.element.addEventListener('blur', handlers.blur, { capture: true });
        this.element.addEventListener('keydown', handlers.keyDown, { capture: true });
        this.element.addEventListener('keyup', handlers.keyUp, { capture: true });
        this.element.addEventListener('pointerdown', handlers.pointerDown, { capture: true });
        this.element.addEventListener('pointerup', handlers.pointerUp, { capture: true });
        this.element.addEventListener('click', handlers.click, { capture: true });
        this.element.addEventListener('touchstart', handlers.touchStart, { capture: true, passive: false });
        this.element.addEventListener('touchend', handlers.touchEnd, { capture: true, passive: false });

        // Register cleanup
        this.cleanupHandlers.push(() => {
            this.element.removeEventListener('focus', handlers.focus, { capture: true });
            this.element.removeEventListener('blur', handlers.blur, { capture: true });
            this.element.removeEventListener('keydown', handlers.keyDown, { capture: true });
            this.element.removeEventListener('keyup', handlers.keyUp, { capture: true });
            this.element.removeEventListener('pointerdown', handlers.pointerDown, { capture: true });
            this.element.removeEventListener('pointerup', handlers.pointerUp, { capture: true });
            this.element.removeEventListener('click', handlers.click, { capture: true });
            this.element.removeEventListener('touchstart', handlers.touchStart, { capture: true });
            this.element.removeEventListener('touchend', handlers.touchEnd, { capture: true });
        });

        // Handle label announcement
        if (announce) {
            this.element.textContent = '';
            this.scene.time.delayedCall(100, () => {
                this.element.textContent = label;
            });
        } else {
            this.element.textContent = label;
        }

        // Position the element
        const originX = this.target.originX !== undefined ? this.target.originX : 0;
        const originY = this.target.originY !== undefined ? this.target.originY : 0;
        const x = matrix.tx - scaledWidth * originX;
        const y = matrix.ty - scaledHeight * originY;

        // Add directly to scene
        const centerX = x + scaledWidth * 0.5;
        const centerY = y + scaledHeight * 0.5;
        this.domElement = this.scene.add.dom(centerX, centerY, this.element);
        this.domElement.setOrigin(0.5);

        this.scene.events.once('shutdown', () => this.cleanup());
        this.scene.events.once('destroy', () => this.cleanup());
        this.scene.events.on('pause', () => this.handlePause());
        this.scene.events.on('resume', () => this.handleResume());
        this.target.once('destroy', () => this.cleanup());
    }

    public recreate() {
        this.cleanup();
        this.create();
    }

    public setLabel(label: string) {
        this.element.textContent = label;
        this.element.setAttribute('aria-label', label);
    }

    public setDisabled(disabled: boolean) {
        if (disabled) {
            this.element.setAttribute('aria-disabled', 'true');
            this.element.setAttribute('disabled', 'true');
            this.element.tabIndex = -1;
            this.element.style.cursor = 'not-allowed';
        } else {
            this.element.removeAttribute('aria-disabled');
            this.element.removeAttribute('disabled');
            this.element.tabIndex = 0;
            this.element.style.cursor = this.options.cursor ?? 'pointer';
        }
    }

    public setAriaHidden(hidden: boolean) {
        if (hidden) {
            this.setDisabled(true); // ensure it's not focusable
            this.element.setAttribute('aria-hidden', 'true');
            this.element.style.pointerEvents = 'none';
        } else {
            if(!this.prevState || this.prevState.hidden === false) {
                this.element.removeAttribute('aria-hidden');
                this.element.style.pointerEvents = 'auto';
            }
            this.setDisabled(this.prevState?.disabled === true);
        }
    }

    private handlePause = () => {
        if (this.prevState) return; // already paused
        this.prevState = { 
            disabled: this.element.hasAttribute('disabled') || this.options.disabled === true,
            hidden: this.element.getAttribute('aria-hidden') === 'true',
            hadFocus: (typeof document !== 'undefined' && document.activeElement === this.element),
        };
        this.setAriaHidden(true);
    }

    private handleResume = () => {
        if (!this.prevState) return; // not paused
        this.setAriaHidden(false);
        if (this.prevState.hadFocus) {
            try {
                this.element.focus({ preventScroll: true });
            } catch {}
        }
        this.prevState = null;
    }

    public focus() {
        if (this.element && typeof this.element.focus === 'function') {
            this.element.focus({ preventScroll: true });
        }
    }

    public cleanup() {
        this.cleanupHandlers.forEach((handler) => handler());
        this.cleanupHandlers = [];

        if (this.domElement && !this.domElement.scene) {
            this.domElement.destroy();
        }
        this.domElement = null;

        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
