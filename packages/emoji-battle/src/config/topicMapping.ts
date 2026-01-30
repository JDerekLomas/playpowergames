import { topicToTagsMapping, withinFilter, parseMathFact, type MathFactTagKey, type FactMasteryItem, getBonusMultiverseTagsByMode, g5_g6Filter } from '@k8-games/sdk/multiverse';

export interface TopicConfig {
    tagKeys: MathFactTagKey[];
    filter?: (fm: FactMasteryItem) => boolean;
}

// Topic mapping with tag keys and filter for questions
export const topicMapping: Record<string, TopicConfig> = {
    'grade3_topic2': {
        tagKeys: topicToTagsMapping['grade3_topic2'],
        filter: (fm: FactMasteryItem) => {
            const parsed = parseMathFact(fm.mathFact["question text"]);
            if (!parsed) return false;

            const allowedOperands = [0, 1, 2, 5, 10];
            return allowedOperands.includes(parsed.operand1) && allowedOperands.includes(parsed.operand2);
        }
    },
    'grade3_topic3': {
        tagKeys: topicToTagsMapping['grade3_topic3'],
    },
    'grade3_topic4': {
        tagKeys: topicToTagsMapping['grade3_topic4'],
    },
    'grade2_topic1': {
        tagKeys: topicToTagsMapping['grade2_topic1'],
        filter: (fm: FactMasteryItem) => withinFilter(fm, 20, 10)
    },
    'grade2_topic3': {
        tagKeys: topicToTagsMapping['grade2_topic3'],
        filter: (fm: FactMasteryItem) => withinFilter(fm, 100)
    },
    'grade2_topic4': {
        tagKeys: topicToTagsMapping['grade2_topic4'],
        filter: (fm: FactMasteryItem) => withinFilter(fm, 100)
    },
    'grade4_topic2': {
        tagKeys: topicToTagsMapping['grade4_topic2'],
    },
    'grade5_topic3': {
        tagKeys: topicToTagsMapping['grade5_topic3'],
    },
    'grade6_topic1': {
        tagKeys: topicToTagsMapping['grade6_topic1'],
    }
};

export function getTagKeysForTopic(topic: string, mode?: string): MathFactTagKey[] {
    // For bonus multiverse topics, use mode filtering if provided
    if ((topic === 'g5_g6' || topic === 'g7_g8') && mode) {
        return getBonusMultiverseTagsByMode(topic, mode);
    }
    return topicMapping[topic]?.tagKeys || topicMapping['grade3_topic2'].tagKeys;
}

export function getFilterForTopic(topic: string): ((fm: FactMasteryItem) => boolean) | undefined {
    if (topic === 'g5_g6') {
        return (fm: FactMasteryItem) => g5_g6Filter(fm);
    }
    return topicMapping[topic]?.filter;
}

export function getTopicConfig(topic: string): TopicConfig {
    return topicMapping[topic] || topicMapping['grade3_topic2'];
}