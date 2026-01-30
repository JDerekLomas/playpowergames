export class GameCompletionManager {
    private static instance: GameCompletionManager;
    private completedGames: Record<string, boolean> = {};

    private constructor() {}

    static getInstance(): GameCompletionManager {
        if (!GameCompletionManager.instance) {
            GameCompletionManager.instance = new GameCompletionManager();
        }
        return GameCompletionManager.instance;
    }

    init(gameNames: string[]): void {
        // Initialize all games as not completed
        this.completedGames = {};
        gameNames.forEach(name => {
            this.completedGames[name] = false;
        });
    }

    markGameComplete(gameName: string): void {
        this.completedGames[gameName] = true;
    }

    isGameComplete(gameName: string): boolean {
        return this.completedGames[gameName] ?? false;
    }

    getCompletedGames(): string[] {
        return Object.keys(this.completedGames).filter(name => this.completedGames[name]);
    }
}

