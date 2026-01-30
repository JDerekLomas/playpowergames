export class DisplayConfig {
    private static instance: DisplayConfig;
    private readonly dpr: number;
    private readonly baseWidth: number = 1280;
    private readonly baseHeight: number = 768;
    private readonly minMobileScale: number = 1;
    private readonly maxDesktopScale: number = this.getMaxScale();

    private constructor() {
        this.dpr = this.calculateOptimalDPR();
    }

    getMaxScale(): number {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) {
            canvas.remove();
            return 1;
        }
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        canvas.remove();
        return maxTextureSize / this.baseWidth;
    }

    private isTouchDevice(): boolean {
        return (
            'ontouchstart' in window ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
            (navigator as any).msMaxTouchPoints > 0
        );
    }

    private calculateOptimalDPR(): number {
        const deviceDPR = window.devicePixelRatio || 1;
        const userAgent = navigator.userAgent.toLowerCase();

        const isMobileUA = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
        const isTouch = this.isTouchDevice();

        const isMobileLike = isMobileUA || isTouch;

        if (isMobileLike) {
            const isLowEnd = !navigator.hardwareConcurrency || navigator.hardwareConcurrency <= 4;

            if (isLowEnd) {
                return this.minMobileScale;
            } else {
                return Math.min(deviceDPR, 1.5);
            }
        }

        return Math.min(deviceDPR, this.maxDesktopScale);
    }

    static getInstance(): DisplayConfig {
        if (!DisplayConfig.instance) {
            DisplayConfig.instance = new DisplayConfig();
        }
        return DisplayConfig.instance;
    }

    get width(): number {
        return this.baseWidth;
    }

    get height(): number {
        return this.baseHeight;
    }

    get canvasWidth(): number {
        return this.baseWidth * this.dpr;
    }

    get canvasHeight(): number {
        return this.baseHeight * this.dpr;
    }

    get scale(): number {
        return this.dpr;
    }

    get rendererType(): number {
        const isSafari = this.isSafari();
        const isTouch = this.isTouchDevice();
    
        // Force CANVAS on Safari when touch device (iOS/iPadOS Safari)
        if (isSafari && isTouch) {
            return Phaser.CANVAS;
        }
    
        return Phaser.AUTO;
    }

    private isSafari(): boolean {
        const ua = navigator.userAgent.toLowerCase();
    
        return ua.includes("safari") &&
            !ua.includes("chrome") &&
            !ua.includes("crios") && // Chrome iOS
            !ua.includes("fxios") && // Firefox iOS
            !ua.includes("android");
    }

    scaleValue(value: number): number {
        return value * this.dpr;
    }

    scalePosition(x: number, y: number): { x: number; y: number } {
        return {
            x: x * this.dpr,
            y: y * this.dpr,
        };
    }

    get canvasStyle(): string {
        return `width: ${this.baseWidth}px; height: ${this.baseHeight}px;`;
    }

    scaleGameObject(gameObject: Phaser.GameObjects.GameObject): void {
        const hasTransform = gameObject as unknown as {
            setScale?: (x: number, y?: number) => void;
        };
        if (hasTransform.setScale) {
            const originalSetScale = hasTransform.setScale.bind(gameObject);
            originalSetScale(this.dpr);
            hasTransform.setScale = (x?: number, y?: number) => {
                if (typeof x !== 'number') {
                    x = 1;
                }
                if (typeof y !== 'number') {
                    y = x;
                }
                originalSetScale(x * this.dpr, y * this.dpr);
                return gameObject;
            };
        }
    }
}
