export function throwDevError(message?: string) {
    if (import.meta.env.DEV) {
        throw new Error(message);
    }
}

