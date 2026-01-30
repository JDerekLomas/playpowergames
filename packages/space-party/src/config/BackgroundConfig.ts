class BackgroundConfig {
    static readonly BACKGROUND = {
        KEY: "bg",
        POSITION: {
            X: 640,
            Y: 384,
        },
    };

    static readonly SPACESHIP_COCKPIT = {
        KEY: "spaceship_cockpit",
        POSITION: {
            X: 644,
            Y: 388,
        },
    };

    static readonly PLANETS = [
        {
            KEY: "planet_1",
            POSITION: {
                X: 0,
                Y: 634,
            },
            ROTATION: 0.0008,
        },
        
        {
            KEY: "planet_2",
            POSITION: {
                X: 948,
                Y: 830,
            },
            ROTATION: 0.00025,
        },
    ]
    
}

export default BackgroundConfig;