export function debugLog(...messages: unknown[]) {
    if (import.meta.env.DEV) {
        console.trace(`[${new Date().toISOString()}]`, ...messages);
    }
}

