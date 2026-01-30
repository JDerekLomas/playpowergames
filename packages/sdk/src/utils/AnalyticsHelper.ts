type CreateTrialParams = {
    questionMaxPoints: number;
    achievedPoints: number;
    questionText: string;
    isCorrect: boolean;
    questionMechanic: string;
    gameLevelInfo: string;
    studentResponse: string;
    studentResponseAccuracyPercentage: string;
    optionsDisplay?: Array<{ option: string; isCorrect: boolean }>;
    createdAt?: number;
    currentMultiplier?: number;
};

/**
 * AnalyticsHelper - client-side helper to record game analytics
 *
 * Responsibilities:
 * - Create a parent (root) session on construction
 * - Create child level sessions
 * - Post per-question trials
 * - End child level sessions and the parent session
 *
 * The helper swallows network errors so the game never crashes if analytics fail.
 */
export class AnalyticsHelper {
    private apiBase: string = 'https://ybsik3qgzl.execute-api.us-east-1.amazonaws.com/dev/';
    private gameName: string;
    private topic: string;
    private static instance: AnalyticsHelper;
    private analyticsEnabled: boolean = false;
    private readonly configUrl: string = 'https://games.playpower.ai/analytics/config.json';


    // Identity and device
    private userId: string;
    private deviceInfo: string;
    private deviceType: string;
    private ipAddress: string | undefined;

    // Parent session
    private parentSessionId: string;
    private parentSessionStartTime: number;
    private parentClosed = false;

    // Active child session
    private activeSessionId: string | null = null;
    private activeSessionStartTime: number | null = null;

    // Level aggregates
    private levelMaxStreak = 0;
    private levelCurrentStreak = 0;
    private levelPointsAchieved = 0;
    private levelTotalResponses = 0;
    private playAgainCount = 0; // number of child sessions started under parent (excluding the first root session)

    // Ready promise to await initialisation
    public readonly ready: Promise<void>;

    constructor(gameName: string, topic: string, parentSessionId: string) {
        this.gameName = gameName;
        this.topic = topic;
        this.userId = AnalyticsHelper.getOrCreateFingerprint();
        this.deviceInfo = navigator.userAgent;
        this.deviceType = AnalyticsHelper.detectDeviceType();
        this.parentSessionId = parentSessionId;
        this.parentSessionStartTime = Date.now();

        // Fire-and-forget init with readiness promise
        this.ready = this.initializeParentSession();

        // Register lifecycle listeners to ensure parent session is closed
        this.registerShutdownListeners();
    }

    static createInstance(gameName: string, topic: string, options?: { isMultiverse?: boolean, isLauncher?: boolean }): AnalyticsHelper | null {
        if (!AnalyticsHelper.instance) {
            if (options && options.isMultiverse) {
                if (options.isLauncher) {
                    AnalyticsHelper.instance = new AnalyticsHelper(gameName, topic, AnalyticsHelper.createParentSession());
                } else {
                    const parentSessionId = AnalyticsHelper.getParentSessionId();
                    if (parentSessionId) {
                        AnalyticsHelper.instance = new AnalyticsHelper(gameName, topic, parentSessionId);
                    } else {
                        return null;
                    }
                }
            } else {
                AnalyticsHelper.instance = new AnalyticsHelper(gameName, topic, AnalyticsHelper.generateId());
            }
        }
        return AnalyticsHelper.instance;
    }

    static getInstance(): AnalyticsHelper | null {
        if (AnalyticsHelper.instance) {
            return AnalyticsHelper.instance;
        }
        return null;
    }

    private static createParentSession(): string {
        const parentId = AnalyticsHelper.generateId();
        try {
            localStorage.removeItem('parent_session');
            localStorage.setItem('parent_session', parentId);
        } catch (e) {
            console.error('Failed to create parent session in localStorage', e);
        }
        return parentId;
    }

    private static getParentSessionId(): string | null {
        try {
            const existingId = localStorage.getItem('parent_session');
            if (existingId) {
                return existingId;
            }
            
            return null;
        } catch (e) {
            console.error('Failed to get parent session from localStorage', e);
            return null;
        }
    }

    // ----- Public API -----

    public async createSession(gameLevelInfo: string, isPlayAgain: boolean = false): Promise<string | null> {
        try {
            await this.ready;
            const sessionId = AnalyticsHelper.generateId();
            const sessionStartTime = Date.now();

            const payload = {
                type: 'createSession',
                gameName: this.gameName,
                topic: this.topic,
                parentSessionId: this.parentSessionId,
                sessionId,
                sessionStartTime,
                gameLevelInfo,
                userId: this.userId,
                deviceInfo: this.deviceInfo,
                deviceType: this.deviceType,
                ipAddress: this.ipAddress,
                sessionStatus: 'OPEN',
            };

            await this.postIngest(payload);

            this.activeSessionId = sessionId;
            this.activeSessionStartTime = sessionStartTime;
            this.resetLevelCounters();
            if (isPlayAgain) this.playAgainCount += 1;
            return sessionId;
        } catch {
            return null;
        }
    }

    public async createTrial(params: CreateTrialParams): Promise<boolean> {
        try {
            if (!this.activeSessionId) return false;
            const createdAt = params.createdAt ?? Date.now();

            // Update in-memory aggregates for the level
            this.levelTotalResponses += 1;
            this.levelPointsAchieved += Number(params.achievedPoints || 0);
            if (params.isCorrect) {
                this.levelCurrentStreak += 1;
                if (this.levelCurrentStreak > this.levelMaxStreak) {
                    this.levelMaxStreak = this.levelCurrentStreak;
                }
            } else {
                this.levelCurrentStreak = 0;
            }

            const payload = {
                type: 'createTrial',
                items: [
                    {
                        sessionId: this.activeSessionId,
                        createdAt,
                        userId: this.userId,
                        questionText: params.questionText,
                        questionMechanic: params.questionMechanic,
                        gameLevelInfo: params.gameLevelInfo,
                        achievedPoints: params.achievedPoints,
                        questionMaxPoints: params.questionMaxPoints,
                        currentMultiplier: params.currentMultiplier || null,
                        currentStreak: this.levelCurrentStreak || null,
                        studentResponseAccuracyPercentage: params.studentResponseAccuracyPercentage || null,
                        studentResponse: params.studentResponse,
                        optionsDisplay: params.optionsDisplay || null,
                        isCorrect: params.isCorrect
                    }
                ]
            };

            await this.postIngest(payload);
            return true;
        } catch {
            return false;
        }
    }

    public async endLevelSession(isPlayAgain: boolean = false): Promise<boolean> {
        try {
            if (!this.activeSessionId || !this.activeSessionStartTime) return false;
            if (isPlayAgain) this.playAgainCount += 1;
            const sessionEndTime = Date.now();

            const payload = {
                type: 'updateSession',
                parentSessionId: this.parentSessionId,
                sessionId: this.activeSessionId,
                sessionStartTime: this.activeSessionStartTime,
                sessionStatus: 'CLOSED',
                sessionEndTime,
                maxStreak: this.levelMaxStreak,
                pointsAchieved: this.levelPointsAchieved,
                totalResponses: this.levelTotalResponses,
                playAgainCount: this.playAgainCount
            } as any;

            await this.postIngest(payload);

            // Clear active session
            this.activeSessionId = null;
            this.activeSessionStartTime = null;
            this.resetLevelCounters();
            return true;
        } catch {
            return false;
        }
    }

    public async endParentSession(): Promise<boolean> {
        try {
            if (this.parentClosed) return true;
            const sessionEndTime = Date.now();
            const payload = {
                type: 'updateSession',
                parentSessionId: this.parentSessionId,
                sessionId: this.parentSessionId,
                sessionStartTime: this.parentSessionStartTime,
                sessionStatus: 'CLOSED',
                sessionEndTime
            };
            await this.postIngest(payload);
            this.parentClosed = true;
            return true;
        } catch {
            return false;
        }
    }

    // ----- Internals -----

    private async initializeParentSession(): Promise<void> {
        try {
            // Load remote kill switch; if disabled, skip creating any sessions
            await this.loadAnalyticsConfig();
            if (!this.analyticsEnabled) {
                return;
            }
            // best-effort IP fetch
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                if (res.ok) {
                    const data = await res.json();
                    this.ipAddress = data?.ip;
                }
            } catch {
                // ignore
            }

            const payload = {
                type: 'createSession',
                gameName: this.gameName,
                topic: this.topic,
                parentSessionId: this.parentSessionId,
                sessionId: this.parentSessionId,
                sessionStartTime: this.parentSessionStartTime,
                userId: this.userId,
                deviceInfo: this.deviceInfo,
                deviceType: this.deviceType,
                ipAddress: this.ipAddress,
                sessionStatus: 'OPEN'
            };
            await this.postIngest(payload);
        } catch {
            // ignore errors
        }
    }

    private async postIngest(body: unknown): Promise<any | null> {
        try {
            if (!this.analyticsEnabled) return null;
            // TODO: Remove this after testing
            console.log('postIngest', body);
            const res = await fetch(`${this.apiBase}ingest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) return null;
            const data = await res.json().catch(() => null);
            return data;
        } catch {
            return null;
        }
    }

    private async loadAnalyticsConfig(): Promise<void> {
        try {
            const res = await fetch(this.configUrl, { cache: 'no-store' });
            if (!res.ok) return;
            const cfg = await res.json().catch(() => null);
            if (cfg && typeof cfg.enabled === 'boolean') {
                this.analyticsEnabled = cfg.enabled;
            }
        } catch {
            // ignore failures; default remains true
        }
    }

    private registerShutdownListeners(): void {
        const end = async () => { 
            try {
                await this.endLevelSession();
                await this.endParentSession();
            } catch {
                return null;
                
            }
        };
        
        // Page refresh and closing tab
        window.addEventListener('beforeunload', end);
        window.addEventListener('pagehide', end);
        
        // No internet connection
        window.addEventListener('offline', end);
    }

    private resetLevelCounters(): void {
        this.levelMaxStreak = 0;
        this.levelCurrentStreak = 0;
        this.levelPointsAchieved = 0;
        this.levelTotalResponses = 0;
    }

    private static generateId(): string {
        return (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }

    private static hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    private static generateEnhancedFingerprint(): string {
        const components = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            navigator.platform,
            navigator.cookieEnabled ? '1' : '0'
        ];
        
        return this.hashString(components.join('|'));
    }

    private static getOrCreateFingerprint(): string {
        try {
            const key = 'k8_fingerprint';
            const existing = localStorage.getItem(key);
            if (existing) return existing;
            const fp = this.generateEnhancedFingerprint();
            localStorage.setItem(key, fp);
            return fp;
        } catch {
            return this.generateId();
        }
    }

    private static detectDeviceType(): string {
        const ua = navigator.userAgent || '';
        const isIPad = /iPad|Macintosh/.test(ua) && 'ontouchend' in document;
        const isIPhone = /iPhone/.test(ua);
        const isAndroid = /Android/.test(ua);
        if (isIPad) return 'iPad';
        if (isIPhone || isAndroid) return 'Mobile';
        return 'Computer';
    }
}


