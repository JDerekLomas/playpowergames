import { BaseScene } from "@k8-games/sdk";
import { Slingshot } from "../Slingshot";

export class GameScene extends BaseScene {
    private slingshot: Slingshot;

    constructor() {
        super("GameScene");
        this.slingshot = new Slingshot(this, false);
    }

    static _preload(scene: BaseScene) {
        Slingshot._preload(scene);
    }

    init(data?: { reset?: boolean }) {
        this.slingshot.init(data);
    }

    create() {
        this.audioManager.initialize(this);
        this.slingshot.create();

        // Announce the initial question after a brief delay
        this.time.delayedCall(500, () => {
            this.slingshot.announceCurrentQuestion();
        });

        // Enable input events for the scene
        this.input.enabled = true;

        // Set up projectile event handling in GameScene
        this.setupProjectileEvents();

        this.events.on('resume', () => {
            this.audioManager.initialize(this);
            
            // Announce the question when resuming from instructions/pause
            this.time.delayedCall(500, () => {
                this.slingshot.announceCurrentQuestion();
            });
        });
    }

    private setupProjectileEvents(): void {
        
        // Set up global pointer down event
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            
            // Check if click is on projectile
            const projectile = this.slingshot.getProjectile();
            if (projectile && this.isPointerOverProjectile(pointer, projectile)) {
                this.slingshot.handlePointerDown(pointer);
            }
        });

        // Set up global pointer move event
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.slingshot.handlePointerMove(pointer);
        });

        // Set up global pointer up event
        this.input.on('pointerup', () => {
            this.slingshot.handlePointerUp();
        });
    }

    private isPointerOverProjectile(pointer: Phaser.Input.Pointer, projectile: Phaser.GameObjects.Image): boolean {
        const projectileX = projectile.x;
        const projectileY = projectile.y;
        const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, projectileX, projectileY);
        
        // Check if pointer is within 30 pixels of projectile center
        return distance <= 30;
    }
}