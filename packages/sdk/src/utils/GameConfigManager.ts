export interface ConfigMap {
    [key: string]: any;
}

/**
 * GameConfigManager handles loading and managing game configuration from config.json or URL parameters
 * 
 * @example
 * ```typescript
 *  Basic usage
 * const gameConfigManager = GameConfigManager.getInstance();
 * await gameConfigManager.loadConfigs(); // loads from config.json first, then query parameters
 * 
 * const topic = gameConfigManager.get('topic'); // get a specific parameter
 * const theme = gameConfigManager.get('theme');
 * 
 *  Check if specific parameters exist
 * if (gameConfigManager.has('difficulty')) {
 *   const difficulty = gameConfigManager.get('difficulty');
 * }
 * 
 *  Mark that game-specific params are being used (for tracking)
 * if (topic && isValidTopic(topic)) {
 *   gameConfigManager.markGameParamsAsUsed();
 * }
 * ```
 */
export class GameConfigManager {
    private static instance: GameConfigManager;
    private configs: ConfigMap = {};
    private isLoaded: boolean = false;
    private configSource: 'json' | 'query' | null = null;

    private constructor() {}

    public static getInstance(): GameConfigManager {
        if (!GameConfigManager.instance) {
            GameConfigManager.instance = new GameConfigManager();
        }
        return GameConfigManager.instance;
    }

    /**
     * Load configurations from config.json first, then fall back to URL search parameters
     */
    public async loadConfigs(): Promise<void> {
        // First try to load from config.json
        try {
            const response = await fetch('./config.json');
            if (response.ok) {
                const jsonConfig = await response.json();
                this.configs = { ...jsonConfig };
                this.configSource = 'json';
                console.log('Loaded configuration from config.json');
            } else {
                throw new Error('config.json not found');
            }
        } catch (error) {
            // Fall back to URL query parameters
            console.log('config.json not available, falling back to URL query parameters');
            this.loadFromQueryParams();
        }
        // Track if query params are being used - starts as false
        window.sessionStorage.setItem('isQueryParamsUsed', 'false');
        
        this.isLoaded = true;
    }

    /**
     * Load configurations from URL search parameters (fallback method)
     */
    private loadFromQueryParams(): void {
        const searchParams = new URLSearchParams(window.location.search);
        
        // Extract all query parameters
        searchParams.forEach((value, key) => {
            this.configs[key] = value;
        });

        this.configSource = 'query';
    }

    /**
     * Synchronous version for backward compatibility - will use cached data or load from query params
     */
    public loadConfigsSync(): void {
        if (!this.isLoaded) {
            // If not loaded yet, fall back to query params for immediate loading
            this.loadFromQueryParams();
            window.sessionStorage.setItem('isQueryParamsUsed', 'false');
            this.isLoaded = true;
        }
    }

    /**
     * Mark that game-specific parameters are being used
     * Call this after validating that actual game params (like topic) exist
     */
    public markGameParamsAsUsed(): void {
        window.sessionStorage.setItem('isQueryParamsUsed', 'true');
    }

    /**
     * Set a specific configuration value
     */
    public set(key: string, value: any): void {
        this.configs[key] = value;
    }

    /**
     * Get a specific configuration value
     */
    public get<T = string>(key: string): T | null {
        if (!this.isLoaded) {
            this.loadConfigsSync();
        }
        return (this.configs[key] as T) || null;
    }

    /**
     * Get all configurations
     */
    public getAll(): ConfigMap {
        if (!this.isLoaded) {
            this.loadConfigsSync();
        }
        return { ...this.configs };
    }

    /**
     * Delete a specific configuration
     */
    public delete(key: string): void {
        delete this.configs[key];
    }

    /**
     * Check if a specific key exists
     */
    public has(key: string): boolean {
        if (!this.isLoaded) {
            this.loadConfigsSync();
        }
        return key in this.configs;
    }

    /**
     * Get the source of the configuration
     */
    public getConfigSource(): 'json' | 'query' | null {
        return this.configSource;
    }

    /**
     * Clear all configurations
     */
    public clear(): void {
        this.configs = {};
        this.isLoaded = false;
        this.configSource = null;
    }
} 