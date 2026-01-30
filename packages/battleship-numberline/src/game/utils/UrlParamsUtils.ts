// import { TopicName } from '../interfaces/gameplay';
// import { topics } from '../managers/GameplayManager';
import { ConfigMap } from '@k8-games/sdk';
import { topics } from '../../resources/topics.json';

// Get encryption settings from environment variables
const ENCODE_KEY = (import.meta.env.VITE_ENCODE_KEY as string) || 'fallback_key';
const USE_ENCRYPTION = import.meta.env.VITE_USE_ENCRYPTION === 'true';

export interface GameParams {
    topic: string;
}

const xorEncrypt = (text: string, key: string): string => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return result;
};

/**
 * Extracts and validates game parameters from URL search params
 * Handles both encrypted and plain query parameters based on USE_ENCRYPTION env variable
 */
export const extractGameParams = (searchParams: ConfigMap): GameParams | null => {
    try {
        if (USE_ENCRYPTION) {
            const encodedData = searchParams.data;
            if (!encodedData) return null;

            const decrypted = xorEncrypt(atob(encodedData), ENCODE_KEY);
            const params = JSON.parse(decrypted) as GameParams;
            return validateGameParams(params.topic);
        } else {
            const topic = searchParams.topic as string;
            return validateGameParams(topic);
        }
    } catch (e) {
        console.error('Error extracting game params:', e);
        return null;
    }
};

/**
 * Validates the game parameters
 */
export const validateGameParams = (topic: string | null): GameParams | null => {
    if (
        topic === null ||
        !topics.some((t) => t.name === topic)
    ) {
        return null;
    }

    return {
        topic: topic,
    };
};

/**
 * Generates a game URL with either encrypted or plain parameters
 */
export const generateGameUrl = (params: GameParams): string => {
    const baseUrl = window.location.origin + window.location.pathname;

    if (USE_ENCRYPTION) {
        const data = JSON.stringify(params);
        const encodedData = btoa(xorEncrypt(data, ENCODE_KEY));
        return `${baseUrl}?data=${encodedData}`;
    } else {
        return `${baseUrl}?topic=${params.topic}`;
    }
};

// Development helper
declare global {
    interface Window {
        generateGameUrl: (topic: string) => string;
    }
}

if (import.meta.env.DEV) {
    window.generateGameUrl = (topic: string) => generateGameUrl({ topic });
}

