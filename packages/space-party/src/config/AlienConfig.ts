class AlienConfig {
    static readonly ALIENS = [
        {
            RENDER_ORDER: ["body", "arms", "head"],
            HEAD: {
                DEFAULT: {
                    KEY: "alien_1_head_default",
                    X: 0,
                    Y: -235,
                },
                BLINK: [
                    {
                        KEY: "alien_1_head_blink_1",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_1_head_blink_2",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_1_head_blink_3",
                        X: 0,
                        Y: -235,
                    },
                ],
                HAPPY: {
                    KEY: "alien_1_head_happy",
                    X: 0,
                    Y: -235,
                },
                SAD: {
                    KEY: "alien_1_head_sad",
                    X: 0,
                    Y: -235,
                },
                FEED: {
                    KEY: "alien_1_head_feed",
                    X: 0,
                    Y: -235,
                }
                
            },
            BODY: {
                KEY: "alien_1_body",
                X: 0,
                Y: 0,
            },
            ARMS: {
                DEFAULT: {
                    KEY: "alien_1_arms_default",
                    X: 0,
                    Y: -48,
                },
                HOLD: {
                    KEY: "alien_1_arms_hold",
                    X: -1,
                    Y: -49,
                },
            }
        },
        {
            RENDER_ORDER: ["arms", "body", "head"],
            HEAD: {
                DEFAULT: {
                    KEY: "alien_2_head_default",
                    X: 0,
                    Y: -235,
                },
                BLINK: [
                    {
                        KEY: "alien_2_head_blink_1",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_2_head_blink_2",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_2_head_blink_3",
                        X: 0,
                        Y: -235,
                    },
                ],
                HAPPY: {
                    KEY: "alien_2_head_happy",
                    X: 0,
                    Y: -235,
                },
                SAD: {
                    KEY: "alien_2_head_sad",
                    X: 0,
                    Y: -235,
                },
            },
            BODY: {
                KEY: "alien_2_body",
                X: -7,
                Y: -75,
            },
            ARMS: {
                DEFAULT: {
                    KEY: "alien_2_arms_default",
                    X: -2,
                    Y: -112,
                },
                HOLD: {
                    KEY: "alien_2_arms_hold",
                    X: 0,
                    Y: 0,
                },
            }
        },
        {
            RENDER_ORDER: ["body", "arms", "head"],
            HEAD: {
                DEFAULT: {
                    KEY: "alien_3_head_default",
                    X: 0,
                    Y: -235,
                },
                BLINK: [
                    {
                        KEY: "alien_3_head_blink_1",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_3_head_blink_2",
                        X: 0,
                        Y: -235,
                    },
                    {
                        KEY: "alien_3_head_blink_3",
                        X: 0,
                        Y: -235,
                    },
                ],
                HAPPY: {
                    KEY: "alien_3_head_happy",
                    X: 0,
                    Y: -235,
                },
                SAD: {
                    KEY: "alien_3_head_sad",
                    X: 0,
                    Y: -235,
                },
            },
            BODY: {
                KEY: "alien_3_body",
                X: 0,
                Y: -20
            },
            ARMS: {
                DEFAULT: {
                    KEY: "alien_3_arms_default",
                    X: 0,
                    Y: -80,
                },
                HOLD: {
                    KEY: "alien_3_arms_hold",
                    X: 0,
                    Y: 0,
                },
            }
        },
    ]
}

export default AlienConfig;
