import { scormService } from '../service/ScormService';

export class Lifecycle {
    private static instance: Lifecycle;
    private observer: MutationObserver | null = null;
    private gameContainer: HTMLElement | null = null;
    private isInitialized = false;

    private constructor() {}

    static getInstance(): Lifecycle {
        if (!Lifecycle.instance) {
            Lifecycle.instance = new Lifecycle();
        }
        return Lifecycle.instance;
    }

    initialize(gameContainerId: string): void {
        if (this.isInitialized) {
            return;
        }

        scormService.initialize();

        // Handle game termination when window closes
        window.addEventListener('beforeunload', () => {
            scormService.terminate();
        });

        // Handle game termination when game container is removed
        this.gameContainer = document.getElementById(gameContainerId);
        if (this.gameContainer) {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node === this.gameContainer) {
                            scormService.terminate();
                            this.destroy();
                        }
                    });
                });
            });

            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        this.isInitialized = true;
    }

    destroy(): void {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.gameContainer = null;
        this.isInitialized = false;
    }
}
