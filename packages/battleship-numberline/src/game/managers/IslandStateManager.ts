export class IslandStateManager {
    private static instance: IslandStateManager;
    private completedLevels: Map<string, Set<number>> = new Map();
    private lastCompletedLevel: { topic: string, level: number } | null = null;

    private constructor() {}

    public static getInstance(): IslandStateManager {
        if (!IslandStateManager.instance) {
            IslandStateManager.instance = new IslandStateManager();
        }
        return IslandStateManager.instance;
    }

    addCompletedLevel(topic: string, level: number): void {
        if (!this.completedLevels.has(topic)) {
            this.completedLevels.set(topic, new Set());
        }
        this.completedLevels.get(topic)!.add(level);
        this.lastCompletedLevel = { topic, level };
    }

    getCompletedLevels(topic: string): number[] {
        const levels = this.completedLevels.get(topic);
        return levels ? Array.from(levels) : [];
    }

    getLastCompletedLevel(): { topic: string, level: number } | null {
        return this.lastCompletedLevel;
    }

    clearLastCompletedLevel(): void {
        this.lastCompletedLevel = null;
    }

    clearCompletedLevels(topic: string): void {
        this.completedLevels.delete(topic);
        this.lastCompletedLevel = null;
    }
}

export const islandState = IslandStateManager.getInstance(); 