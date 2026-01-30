export class PortalStateManager {
    private static instance: PortalStateManager;
    private portals: Record<number, boolean> = {};
    private lastUnlockedPortalId: number | null = null;
    private portalOrder: number[] = [];
    private initialPortalId: number | null = null;

    private constructor() {}

    init(portalList: { id: number, isInitial: boolean }[]): void {
        this.portals = {};
        this.portalOrder = [];
        
        this.initialPortalId = portalList.find(p => p.isInitial)?.id ?? null;

        if (this.initialPortalId) {
            const initialIndex = portalList.findIndex(p => p.id === this.initialPortalId);
            // Start from next one, wrap around to the start
            const orderedList = [
                portalList[initialIndex],
                ...portalList.slice(initialIndex + 1),
                ...portalList.slice(0, initialIndex),
            ];
            this.portalOrder = orderedList.map(p => p.id);
        } else {
            this.portalOrder = portalList.map(p => p.id);
        }

        this.portalOrder.forEach(id => {
            this.portals[id] = false;
        });
    }

    static getInstance(): PortalStateManager {
        if (!PortalStateManager.instance) {
            PortalStateManager.instance = new PortalStateManager();
        }
        return PortalStateManager.instance;
    }
    
    unlockNextPortal(): number | null {
        if (this.portalOrder.length === 0) {
            this.lastUnlockedPortalId = null;
            return null;
        }
    
        const nextPortalId = this.portalOrder.shift() ?? null;
    
        if (nextPortalId !== null) {
            this.portals[nextPortalId] = true;
            this.lastUnlockedPortalId = nextPortalId;
        } else {
            this.lastUnlockedPortalId = null;
        }
    
        return nextPortalId;
    }

    getLastUnlockedPortalId(): number | null {
        return this.lastUnlockedPortalId;
    }

    isUnlocked(portalId: number): boolean {
        return this.portals[portalId] ?? false;
    }
}