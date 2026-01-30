import { Question } from "@k8-games/sdk";

export interface QuestionData {
    startPoint: number | string;
    endPoint: number | string;
    questionPrompt: string;
    shipLocation: number;
    markersList: string[] | number[];
    visibleMarkers?: string[] | number[];
    csvQuestion?: Question;
    showFeedback?: boolean;
}

export interface Level {
    level: number;
    topicName?: string;
    mode?: 'typing' | 'clicking';
    bgKey?: string;
    hitThreshold?: number;
    nearMissThreshold?: number;
    label?: string;
    questions: QuestionData[];
}

export interface Topic {
    levels: Level[];
}

export type TopicName = 'fractions' | 'decimals' | 'mixed' | 'campaign';

