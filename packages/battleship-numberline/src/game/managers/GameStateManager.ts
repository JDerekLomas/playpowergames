import { TopicName } from '../interfaces/gameplay';
import { throwDevError } from '../utils/throwDevError';
import { topics } from './GameplayManager';

export interface LevelProgress {
    unlocked: boolean;
    stars: number;
}

export interface GameState {
    currentTopic: TopicName;
    topicProgress: Record<TopicName, LevelProgress[]>;
    soundEnabled: boolean;
}

export class GameStateManager {
    private static instance: GameStateManager;
    private state: GameState;

    private constructor() {
        this.state = this.loadState();
    }

    public static initialize(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            throwDevError('GameStateManager not initialized');
        }
        return GameStateManager.instance;
    }

    private loadState(): GameState {
        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            const parsed = JSON.parse(savedState) as GameState;
            // Validate the parsed state has the correct shape
            if (this.isValidGameState(parsed)) {
                // Check for new topics and add them to the saved state
                const currentTopics = Object.keys(topics) as TopicName[];
                const savedTopics = Object.keys(parsed.topicProgress) as TopicName[];
                const newTopics = currentTopics.filter((topic) => !savedTopics.includes(topic));

                if (newTopics.length > 0) {
                    newTopics.forEach((topic) => {
                        parsed.topicProgress[topic] = Array(topics[topic].levels.length)
                            .fill(null)
                            .map((_, index) => ({
                                unlocked: index === 0,
                                stars: 0,
                            }));
                    });
                    localStorage.setItem('gameState', JSON.stringify(parsed));
                }

                return parsed;
            }
        }

        // Initialize default state
        return {
            currentTopic: 'fractions',
            topicProgress: this.initializeTopicProgress(),
            soundEnabled: true,
        };
    }

    private isValidGameState(state: unknown): state is GameState {
        if (!state || typeof state !== 'object') return false;

        const s = state as GameState;
        return (
            typeof s.currentTopic === 'string' &&
            typeof s.soundEnabled === 'boolean' &&
            s.topicProgress !== undefined &&
            typeof s.topicProgress === 'object'
        );
    }

    private initializeTopicProgress(): Record<TopicName, LevelProgress[]> {
        const progress: Record<TopicName, LevelProgress[]> = {} as Record<TopicName, LevelProgress[]>;

        Object.entries(topics).forEach(([topicName, topic]) => {
            progress[topicName as TopicName] = Array(topic.levels.length)
                .fill(null)
                .map((_, index) => ({
                    unlocked: index === 0, // Only first level is unlocked initially
                    stars: 0,
                }));
        });

        return progress;
    }

    private saveState(): void {
        localStorage.setItem('gameState', JSON.stringify(this.state));
    }

    public getCurrentTopic(): TopicName {
        return this.state.currentTopic;
    }

    public setCurrentTopic(topic: TopicName): void {
        this.state.currentTopic = topic;
        this.saveState();
    }

    public getLevelProgress(topic: TopicName): LevelProgress[] {
        return this.state.topicProgress[topic];
    }

    public updateLevelProgress(topic: TopicName, level: number, stars: number): void {
        const progress = this.state.topicProgress[topic];

        // Update current level stars
        progress[level].stars = Math.max(stars, progress[level].stars);
        progress[level].unlocked = true;

        // Unlock next level if stars were earned
        if (stars > 0 && level + 1 < progress.length) {
            progress[level + 1].unlocked = true;
        }

        this.saveState();
    }

    public isLevelUnlocked(topic: TopicName, level: number): boolean {
        return this.state.topicProgress[topic]?.[level]?.unlocked ?? false;
    }

    public getLevelStars(topic: TopicName, level: number): number {
        return this.state.topicProgress[topic]?.[level]?.stars ?? 0;
    }

    public toggleSound(): void {
        this.state.soundEnabled = !this.state.soundEnabled;
        this.saveState();
    }

    public isSoundEnabled(): boolean {
        return this.state.soundEnabled;
    }

    public resetProgress(): void {
        this.state.topicProgress = this.initializeTopicProgress();
        this.saveState();
    }
}

