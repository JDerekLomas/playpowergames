export class IslandStateManager {
    private static instance: IslandStateManager;
    private completedLevels: Map<string, Set<number>> = new Map();
    private lastCompletedLevel: { topic: string, level: number } | null = null;
    private failedAttempts: Map<string, Map<number, number>> = new Map();
    private diagnosticCompletedTopics: Set<string> = new Set();

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

    addFailedAttempt(topic: string, level: number): number {
        if (!this.failedAttempts.has(topic)) {
            this.failedAttempts.set(topic, new Map());
        }
        const topicMap = this.failedAttempts.get(topic)!;
        const current = topicMap.get(level) ?? 0;
        topicMap.set(level, current + 1);
        return current + 1;
    }

    getFailedAttempts(topic: string, level: number): number {
        return this.failedAttempts.get(topic)?.get(level) ?? 0;
    }

    clearFailedAttempts(topic: string, level: number): void {
        this.failedAttempts.get(topic)?.delete(level);
    }

    setDiagnosticCompleted(topic: string = 'campaign'): void {
        this.diagnosticCompletedTopics.add(topic);
    }

    isDiagnosticCompleted(topic: string = 'campaign'): boolean {
        return this.diagnosticCompletedTopics.has(topic);
    }
}

export const islandState = IslandStateManager.getInstance(); 