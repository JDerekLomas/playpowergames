export class LevelStateManager {
    private static instance: LevelStateManager;
    private completedLevels: Map<string, Set<number>>;

    private constructor() {
        this.completedLevels = new Map();
    }

    public static getInstance(): LevelStateManager {
        if (!LevelStateManager.instance) {
            LevelStateManager.instance = new LevelStateManager();
        }
        return LevelStateManager.instance;
    }

    public isLevelCompleted(topicName: string, level: number): boolean {
        return this.completedLevels.get(topicName)?.has(level) ?? false;
    }

    public setLevelCompleted(topicName: string, level: number, completed: boolean): void {
        if (!this.completedLevels.has(topicName)) {
            this.completedLevels.set(topicName, new Set());
        }
        const topicLevels = this.completedLevels.get(topicName)!;
        if (completed) {
            topicLevels.add(level);
        } else {
            topicLevels.delete(level);
        }
    }
}

