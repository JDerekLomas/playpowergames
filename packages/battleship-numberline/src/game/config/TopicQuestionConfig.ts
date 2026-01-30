import { QuestionData } from '../interfaces/gameplay';

export interface TopicQuestionMapping {
    [topic: string]: QuestionData | TopicLevelQuestionMapping;
}

export interface TopicLevelQuestionMapping {
    [level: number]: QuestionData;
}

export const TOPIC_QUESTION_CONFIG: TopicQuestionMapping = {
    'fractions_as_numbers': {
        1: {
            "questionPrompt": "1/2",
            "markersList": ["0", "1/2", "1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 1/2,
            "csvQuestion": {
                "operand1": "1/2",
                "operand2": "",
                "answer": "1/2",
                "markersList": "0,1/2,1"
            }
        },
        2: {
            "questionPrompt": "1/2",
            "markersList": ["0", "1/2", "1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 1/2,
            "csvQuestion": {
                "operand1": "1/2",
                "operand2": "",
                "answer": "1/2",
                "markersList": "0,1/2,1"
            }
        },
        3: {
            "questionPrompt": "1/2",
            "markersList": ["0","1/4","2/4","3/4","1"],
            "visibleMarkers": ["0","1/4","2/4","3/4","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 2/4,
            "csvQuestion": {
                "operand1": "1/2",
                "operand2": "",
                "answer": "2/4",
                "markersList": "0,1/4,2/4,3/4,1"
            }
        },
    },
    'explore_numbers_to_1000': {
        1: {
            "questionPrompt": "6",
            "markersList": ["0","2","4","6","8","10","12","14","16","18","20"],
            "startPoint": 0,
            "endPoint": 20,
            "shipLocation": 6,
            "csvQuestion": {
                "operand1": "6",
                "operand2": "",
                "answer": "6",
                "markersList": "0,2,4,6,8,10,12,14,16,18,20"
            }
        },
        2: {
            "questionPrompt": "24",
            "markersList": ["0","10","20","30","40","50","60","70","80","90","100"],
            "startPoint": 0,
            "endPoint": 100,
            "shipLocation": 24,
            "csvQuestion": {
                "operand1": "24",
                "operand2": "",
                "answer": "24",
                "markersList": "0,10,20,30,40,50,60,70,80,90,100"
            }
        },
        3: {
            "questionPrompt": "140",
            "markersList": ["0","100","200","300","400","500","600","700","800","900","1000"],
            "visibleMarkers": ["0","100","200","300","400","500","600","700","800","900","1000"],
            "startPoint": 0,
            "endPoint": 1000,
            "shipLocation": 140,
            "csvQuestion": {
                "operand1": "140",
                "operand2": "",
                "answer": "140",
                "markersList": "0,100,200,300,400,500,600,700,800,900,1000"
            }
        },
    },
    'add_and_subtract_within_100': {
        1: {
            "questionPrompt": "2 + 2",
            "markersList": ["0","1","2","3","4","5","6","7","8","9","10"],
            "startPoint": 0,
            "endPoint": 10,
            "shipLocation": 4,
            "csvQuestion": {
                "operand1": "2",
                "operand2": "2",
                "operator": "+",
                "answer": "4",
                "markersList": "0,1,2,3,4,5,6,7,8,9,10"
            }
        },
        2: {
            "questionPrompt": "11 + 2",
            "markersList": ["10","11","12","13","14","15","16","17","18","19","20"],
            "startPoint": 10,
            "endPoint": 20,
            "shipLocation": 13,
            "csvQuestion": {
                "operand1": "11",
                "operand2": "2",
                "operator": "+",
                "answer": "13",
                "markersList": "10,11,12,13,14,15,16,17,18,19,20"
            }
        },
        3: {
            "questionPrompt": "30 + 10",
            "markersList": ["10","15","20","25","30","35","40","45","50","55","60"],
            "startPoint": 10,
            "endPoint": 60,
            "shipLocation": 40,
            "csvQuestion": {
                "operand1": "30",
                "operand2": "10",
                "operator": "+",
                "answer": "40",
                "markersList": "10,15,20,25,30,35,40,45,50,55,60"
            }
        },
        4: {
            "questionPrompt": "25 + 20",
            "markersList": ["20","25","30","35","40","45","50","55","60","65","70"],
            "startPoint": 20,
            "endPoint": 70,
            "shipLocation": 45,
            "csvQuestion": {
                "operand1": "25",
                "operand2": "20",
                "operator": "+",
                "answer": "45",
                "markersList": "20,25,30,35,40,45,50,55,60,65,70"
            }
        }
    },
    'add_and_subtract_decimals': {
        1: {
            "questionPrompt": "",
            "markersList": ["1","2","3","4","5","6","7","8","9","10"],
            "visibleMarkers": ["1","2","3","4","5","6","7","8","9","10"],
            "startPoint": 1,
            "endPoint": 10,
            "shipLocation": 4,
            "csvQuestion": {
                "operand1": "3.6",
                "operand2": "",
                "operator": "",
                "answer": "4",
                "markersList": "1,2,3,4,5,6,7,8,9,10",
                "questionEN": "Round 3.6 to the nearest whole number.",
                "questionES": "Redondea 3.6 al número entero más cercano."
            }
        },
        2: {
            "questionPrompt": "0.1 + 0.2",
            "markersList": ["0","0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1"],
            "startPoint": "0.0",
            "endPoint": "1.0",
            "shipLocation": 0.3,
            "csvQuestion": {
                "operand1": "0.1",
                "operand2": "0.2",
                "operator": "+",
                "answer": "0.3",
                "markersList": "0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1"
            }
        },
        3: {
            "questionPrompt": "0.8 − 0.3",
            "markersList": ["0","0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1"],
            "startPoint": "0.0",
            "endPoint": "1.0",
            "shipLocation": 0.5,
            "csvQuestion": {
                "operand1": "0.8",
                "operand2": "0.3",
                "operator": "−",
                "answer": "0.5",
                "markersList": "0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1"
            }
        }
    },
    'subtract_within_1000': {
        1: {
            "questionPrompt": "7 − 3",
            "markersList": ["1","2","3","4","5","6","7","8"],
            "startPoint": 1,
            "endPoint": 8,
            "shipLocation": 4,
            "csvQuestion": {
                "operand1": "7",
                "operand2": "3",
                "operator": "−",
                "answer": "4",
                "markersList": "1,2,3,4,5,6,7,8"
            }
        },
        2: {
            "questionPrompt": "150 − 10",
            "markersList": ["100","110","120","130","140","150","160","170","180","190","200"],
            "startPoint": 100,
            "endPoint": 200,
            "shipLocation": 140,
            "csvQuestion": {
                "operand1": "150",
                "operand2": "10",
                "operator": "−",
                "answer": "140",
                "markersList": "100,110,120,130,140,150,160,170,180,190,200"
            }
        },
        3: {
            "questionPrompt": "140 − 40",
            "markersList": ["100","110","120","130","140","150","160","170","180","190","200"],
            "startPoint": 100,
            "endPoint": 200,
            "shipLocation": 100,
            "csvQuestion": {
                "operand1": "140",
                "operand2": "40",
                "operator": "−",
                "answer": "100",
                "markersList": "100,110,120,130,140,150,160,170,180,190,200"
            }
        },
        4: {
            "questionPrompt": "500 − 100",
            "markersList": ["0", "100","200","300","400","500","600","700","800","900","1000"],
            "startPoint": 0,
            "endPoint": 1000,
            "shipLocation": 400,
            "csvQuestion": {
                "operand1": "500",
                "operand2": "100",
                "operator": "−",
                "answer": "400",
                "markersList": "0,100,200,300,400,500,600,700,800,900,1000"
            }
        }
    },
    'add_and_subtract_fractions': {
        1: {
            "questionPrompt": "2/4",
            "markersList": ["0", "1/2", "1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 1/2,
            "csvQuestion": {
                "operand1": "2/4",
                "operand2": "",
                "answer": "1/2",
                "markersList": "0,1/2,1"
            }
        },
        2: {
            "questionPrompt": "1/2 + 1/4",
            "markersList": ["0","1/4","1/2","3/4","1"],
            "visibleMarkers": ["0","1/4","1/2","3/4","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 3/4,
            "csvQuestion": {
                "operand1": "1/2",
                "operand2": "1/4",
                "operator": "+",
                "answer": "3/4",
                "markersList": "0,1/4,1/2,3/4,1"
            }
        },
        3: {
            "questionPrompt": "1/3 − 1/6",
            "markersList": ["0","1/6","1/3","3/6","4/6","5/6","1"],
            "visibleMarkers": ["0","1/6","1/3","3/6","4/6","5/6","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 1/6,
            "csvQuestion": {
                "operand1": "1/3",
                "operand2": "1/6",
                "operator": "−",
                "answer": "1/6",
                "markersList": "0,1/6,1/3,3/6,4/6,5/6,1",
                "visibleMarkers": "0,1/6,1/3,3/6,4/6,5/6,1"
            }
        },
        4: {
            "questionPrompt": "1/2 + 3/4",
            "markersList": ["0","1/4","1/2","3/4","1","5/4","6/4","7/4","2"],
            "visibleMarkers": ["0","1/4","1/2","3/4","1","5/4","6/4","7/4","2"],
            "startPoint": 0,
            "endPoint": 2,
            "shipLocation": 5/4,
            "csvQuestion": {
                "operand1": "1/2",
                "operand2": "3/4",
                "operator": "+",
                "answer": "5/4",
                "markersList": "0,1/4,1/2,3/4,1,5/4,6/4,7/4,2",
                "visibleMarkers": "0,1/4,1/2,3/4,1,5/4,6/4,7/4,2"
            }
        }
    },
    'addition_and_subtraction_of_fractions_mixed_numbers': {
        1: {
            "questionPrompt": "1/10 + 2/10",
            "markersList": ["0","1/10","2/10","3/10","4/10","5/10","6/10","7/10","8/10","9/10","1"],
            "visibleMarkers": ["0","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 3/10,
            "csvQuestion": {
                "operand1": "1/10",
                "operand2": "2/10",
                "operator": "+",
                "answer": "3/10",
                "markersList": "0,1/10,2/10,3/10,4/10,5/10,6/10,7/10,8/10,9/10,1"
            }
        },
        2: {
            "questionPrompt": "5/10 – 2/10",
            "markersList": ["0","1/10","2/10","3/10","4/10","5/10","6/10","7/10","8/10","9/10","1"],
            "visibleMarkers": ["0","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 3/10,
            "csvQuestion": {
                "operand1": "5/10",
                "operand2": "2/10",
                "operator": "–",
                "answer": "3/10",
                "markersList": "0,1/10,2/10,3/10,4/10,5/10,6/10,7/10,8/10,9/10,1"
            }
        },
        3: {
            "questionPrompt": "4/4 + 1/4",
            "markersList": ["0","1/4","2/4","3/4","4/4","5/4","6/4","7/4","8/4"],
            "startPoint": 0,
            "endPoint": 8/4,
            "shipLocation": 5/4,
            "csvQuestion": {
                "operand1": "4/4",
                "operand2": "1/4",
                "operator": "+",
                "answer": "5/4",
                "markersList": "0,1/4,2/4,3/4,4/4,5/4,6/4,7/4,8/4"
            }
        },
    },
    'understand_and_compare_decimals': {
        1: {
            "questionPrompt": "0.2",
            "markersList": ["0","0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 0.2,
            "csvQuestion": {
                "operand1": "0.2",
                "operand2": "",
                "answer": "0.2",
                "markersList": "0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1"
            }
        },
        2: {
            "questionPrompt": "0.2",
            "markersList": ["0","1/10","2/10","3/10","4/10","5/10","6/10","7/10","8/10","9/10","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 0.2,
            "csvQuestion": {
                "operand1": "0.2",
                "operand2": "",
                "answer": "0.2",
                "markersList": "0,1/10,2/10,3/10,4/10,5/10,6/10,7/10,8/10,9/10,1"
            }
        },
        3: {
            "questionPrompt": "4/10",
            "markersList": ["0","0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1"],
            "startPoint": 0,
            "endPoint": 1,
            "shipLocation": 4/10,
            "csvQuestion": {
                "operand1": "4/10",
                "operand2": "",
                "answer": "4/10",
                "markersList": "0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1"
            }
        }
    },
    'rational_numbers': {
        1: {
            "questionPrompt": "(−5) + 3",
            "markersList": ["-5","-4","-3","-2","-1","0","1","2","3","4","5"],
            "startPoint": -5,
            "endPoint": 5,
            "shipLocation": -2,
            "csvQuestion": {
                "operand1": "-5",
                "operand2": "3",
                "operator": "+",
                "answer": "-2",
                "markersList": "-5,-4,-3,-2,-1,0,1,2,3,4,5"
            }
        },
        2: {
            "questionPrompt": "3 − 2",
            "markersList": ["-4","-3","-2","-1","0","1","2","3","4"],
            "startPoint": -4,
            "endPoint": 4,
            "shipLocation": 1,
            "csvQuestion": {
                "operand1": "3",
                "operand2": "2",
                "operator": "−",
                "answer": "1",
                "markersList": "-4,-3,-2,-1,0,1,2,3,4"
            }
        },
        3: {
            "questionPrompt": "−1/2 × 6",
            "markersList": ["-4", "-7/2", "-3", "-5/2", "-2", "-3/2", "-1", "-1/2", "0", "1/2", "1", "3/2", "2"],
            "startPoint": -4,
            "endPoint": 2,
            "shipLocation": -3,
            "csvQuestion": {
                "operand1": "-1/2",
                "operand2": "6",
                "operator": "×",
                "answer": "-3",
                "markersList": "-4,-7/2,-3,-5/2,-2,-3/2,-1,-1/2,0,1/2,1,3/2,2"
            }
        },
        4: {
            "questionPrompt": "4 ÷ (−2)",
            "markersList": ["-4","-3","-2","-1","0","1","2","3","4"],
            "startPoint": -4,
            "endPoint": 4,
            "shipLocation": -2,
            "csvQuestion": {
                "operand1": "4",
                "operand2": "-2",
                "operator": "÷",
                "answer": "-2",
                "markersList": "-4,-3,-2,-1,0,1,2,3,4"
            }
        }
    },
    'percents': {
        1: {
            "questionPrompt": "",
            "markersList": ["0", "25", "50", "75", "100"],
            "visibleMarkers": ["0", "50", "75", "100"],
            "startPoint": 0,
            "endPoint": 100,
            "shipLocation": 25,
            "csvQuestion": {
                "operand1": "",
                "operand2": "",
                "answer": "25",
                "markersList": "0,25,50,75,100"
            }
        },
        2: {
            "questionPrompt": "",
            "markersList": ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
            "visibleMarkers": ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7", "0.8", "0.9", "1.0"],
            "startPoint": "0.0",
            "endPoint": "1.0",
            "shipLocation": 0.6,
            "csvQuestion": {
                "operand1": "60%",
                "operand2": "",
                "answer": "0.6",
                "markersList": "0.0,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0"
            }
        },
        3: {
            "questionPrompt": "",
            "markersList": ["0", "1/10", "2/10", "3/10", "4/10", "5/10", "6/10", "7/10", "8/10", "9/10", "1"],
            "visibleMarkers": ["0", "1/10", "2/10", "3/10", "4/10", "5/10", "6/10", "7/10", "8/10", "9/10", "1"],
            "startPoint": "0",
            "endPoint": "1",
            "shipLocation": 3/10,
            "csvQuestion": {
                "operand1": "30%",
                "operand2": "",
                "answer": "3/10",
                "markersList": "0,1/10,2/10,3/10,4/10,5/10,6/10,7/10,8/10,9/10,1"
            }
        },
        4: {
            "questionPrompt": "",
            "markersList": ["0", "1/4", "1/2", "3/4", "1", "1 1/4", "1 1/2", "1 3/4", "2"],
            "visibleMarkers": ["0", "1/4", "1/2", "3/4", "1", "1 1/4", "1 1/2", "1 3/4", "2"],
            "startPoint": "0",
            "endPoint": "2",
            "shipLocation": 1 + 1/4,
            "csvQuestion": {
                "operand1": "125%",
                "operand2": "",
                "answer": "1 1/4",
                "markersList": "0,1/4,1/2,3/4,1,1 1/4,1 1/2,1 3/4,2"
            }
        },
        5: {
            "questionPrompt": "",
            "markersList": ["0", "25", "50", "75", "100"],
            "visibleMarkers": ["0", "25", "50", "75", "100"],
            "startPoint": 0,
            "endPoint": 100,
            "shipLocation": 50,
            "csvQuestion": {
                "operand1": "50%",
                "operand2": "100",
                "answer": "50",
                "markersList": "0,25,50,75,100"
            }
        },
    },
    'multiply_fractions': {
    1: {
        "questionPrompt": "2 × 1/8",
        "markersList": ["0","1/8","2/8","3/8","4/8","5/8","6/8","7/8","1"],
        "startPoint": 0,
        "endPoint": 1,
        "shipLocation": 2/8,
        "csvQuestion": {
            "operand1": "2",
            "operand2": "1/8",
            "answer": "2/8",
            "markersList": "0,1/8,2/8,3/8,4/8,5/8,6/8,7/8,1"
        }
    }
    },
    // Add more topic-specific questions as needed
    // 'add_and_subtract_within_100': {
    //     // Will use first question from gameplay manager
    // },
    // 'add_and_subtract_decimals': {
    //     // Will use first question from gameplay manager
    // },
    // 'subtract_within_1000': {
    //     // Will use first question from gameplay manager
    // },
};

/**
 * Get the question for a specific topic
 * @param topic - The topic name
 * @param fallbackQuestion - The fallback question from gameplay manager
 * @returns The topic-specific question or fallback question
 */
export function getTopicQuestion(topic: string, fallbackQuestion: QuestionData, level?: number): QuestionData {
    // return TOPIC_QUESTION_CONFIG[topic] || fallbackQuestion;
    const topicConfig = TOPIC_QUESTION_CONFIG[topic];
    
    if (!topicConfig) {
        return fallbackQuestion;
    }

    // Check if the topic config is level-based
    if (level !== undefined && typeof topicConfig === 'object' && !('questionPrompt' in topicConfig)) {
        const levelConfig = topicConfig as TopicLevelQuestionMapping;
        const levelQuestion = levelConfig[level];
        
        if (levelQuestion) {
            return levelQuestion;
        }
    }
    
    // If it's a direct question (not level-based) or level not provided
    if (typeof topicConfig === 'object' && 'questionPrompt' in topicConfig) {
        return topicConfig as QuestionData;
    }
    
    return fallbackQuestion;
} 