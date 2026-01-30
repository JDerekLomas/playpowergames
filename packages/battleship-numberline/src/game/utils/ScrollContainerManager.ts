import { BaseScene } from '../scenes/BaseScene';

interface ScrollConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    maxScroll: number;
    scale?: number;
}

export class ScrollContainerManager {
    private scene: BaseScene;
    private container: Phaser.GameObjects.Container;
    private scrollArea: ScrollConfig;
    private isDragging: boolean = false;
    private lastY: number = 0;
    private velocity: number = 0;
    private readonly SCROLL_SPEED = 0.5;
    private readonly DECELERATION = 0.95;
    private readonly KEY_SCROLL_SPEED = 15;

    constructor(scene: BaseScene, config: ScrollConfig) {
        this.scene = scene;
        this.scrollArea = config;
        this.initialize();
    }

    private initialize(): void {
        // Create scroll container
        const extraScale = this.scrollArea.scale ?? 1;
        const scale = this.scene.display.scale * extraScale;
        this.container = this.scene.add.container(0, 0);
        this.container.setScale(scale);

        // Create mask for scroll container
        // const scrollAreaMask = this.scene.add
        //     .rectangle(this.scrollArea.x, this.scrollArea.y, this.scrollArea.width, this.scrollArea.height, 0, 0)
        //     .setOrigin(0);

        // this.container.setMask(scrollAreaMask.createGeometryMask());

        this.container.y = this.scrollArea.y;
        // Setup scroll handling
        this.setupScrolling();
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        // Add keyboard controls
        if (!this.scene.input.keyboard) return;

        const cursors = this.scene.input.keyboard.createCursorKeys();

        this.scene.events.on('update', () => {
            if (cursors.up.isDown) {
                this.velocity = this.KEY_SCROLL_SPEED;
                this.updateContainerPosition(this.container.y + this.velocity);
            } else if (cursors.down.isDown) {
                this.velocity = -this.KEY_SCROLL_SPEED;
                this.updateContainerPosition(this.container.y + this.velocity);
            }
        });
    }

    private setupScrolling(): void {
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.inScrollArea(pointer)) {
                this.isDragging = true;
                this.lastY = pointer.y;
                this.velocity = 0;
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && this.inScrollArea(pointer)) {
                const deltaY = pointer.y - this.lastY;
                this.velocity = deltaY * this.SCROLL_SPEED;
                this.updateContainerPosition(this.container.y + this.velocity);
                this.lastY = pointer.y;
            }
        });

        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });

        // Add mousewheel support
        this.scene.input.on(
            Phaser.Input.Events.POINTER_WHEEL,
            (
                pointer: Phaser.Input.Pointer,
                _gameObjects: Phaser.GameObjects.GameObject[],
                _deltaX: number,
                deltaY: number,
            ) => {
                if (this.inScrollArea(pointer)) {
                    // Normalize the delta to make it consistent across different browsers/devices
                    const unit = 20 * this.scene.display.scale;
                    const normalizedDelta = Phaser.Math.Clamp(deltaY, -unit, unit);
                    this.velocity = -normalizedDelta * this.SCROLL_SPEED;
                    this.updateContainerPosition(this.container.y + this.velocity);
                }
            },
        );

        // Add update loop for momentum
        this.scene.events.on('update', () => {
            if (!this.isDragging && Math.abs(this.velocity) > 0.1) {
                this.velocity *= this.DECELERATION;
                this.updateContainerPosition(this.container.y + this.velocity);
            }
        });
    }

    public updateContainerPosition(newY: number): void {
        const maxScroll = this.scrollArea.maxScroll;
        const clampedY = Phaser.Math.Clamp(newY, maxScroll, this.scrollArea.y);

        // If we hit the bounds, stop the momentum
        if (clampedY === maxScroll || clampedY === this.scrollArea.y) {
            this.velocity = 0;
        }

        this.container.y = clampedY;
    }

    public add(gameObject: Phaser.GameObjects.Container | Phaser.GameObjects.Container[]): void {
        this.container.add(gameObject);
    }

    private inScrollArea(pointer: Phaser.Input.Pointer): boolean {
        return pointer.y > this.scrollArea.y && pointer.y < this.scrollArea.y + this.scrollArea.height;
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    public destroy(): void {
        // Clean up event listeners
        this.scene.events.off('update');
        this.container.destroy();
    }
}


