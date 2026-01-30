/* Centralized constants & tunables for Digit Dash. */

// Layout / UI dimensions (logical, before scaling)
export const UI_TOP_BAR_HEIGHT = 96;
export const UI_BOTTOM_BAR_HEIGHT = 88;
export const SIDE_PADDING_DEFAULT = 96; // horizontal gutter target
export const PLAYFIELD_CORNER_RADIUS = 24;

// Player / Enemy sizing & speed
export const PLAYER_SIZE = 34; // logical player radius proxy
export const PLAYER_BASE_SPEED = 200; // units per second (logical pre-scaling)
export const ENEMY_SIZE_MULTIPLIER = 1.18; // enemy size = PLAYER_SIZE * multiplier
export const DEFAULT_MONSTER_SPEED_L1 = 95; // tutorial / very easy speed

// Breathing / idle animation for rocks
export const ROCK_SCALE_BOOST = 1.18;
export const ROCK_BREATH_MIN_MS = 820;
export const ROCK_BREATH_MAX_MS = 1080;
export const ROCK_BREATH_DELAY_MAX_MS = 900;
export const ROCK_BREATH_SCALE_AMP_MIN = 1.05;
export const ROCK_BREATH_SCALE_AMP_EXTRA = 0.02; // random 0..extra

// D-Pad (mobile) controls
export const DPAD_BASE_OFFSET = 150; // distance from bottom-right corner
export const DPAD_ARROW_OFFSET = 48;
export const DPAD_ARROW_SCALE = 0.7;

// Hearts / lives
export const INITIAL_LIVES = 3;
export const MAX_LIVES = INITIAL_LIVES; // if design ever increases lives this helps loop logic
export const HEART_SPACING = 40;
export const HEARTS_TO_PAUSE_GAP = 24; // gap between hearts container and pause button anchor
export const OVERLAY_HEART_SPACING = 64; // spacing used on end overlay

// Spawn / safety algorithm
export const SAFE_SPAWN_MAX_RADIUS_FACTOR = 0.4; // fraction of smaller playfield dimension
export const SAFE_SPAWN_STEP_THETA = Math.PI / 12;
export const SAFE_SPAWN_MIN_STEP_R = 8; // fallback minimum radial increment
export const COLLISION_FUDGE_DEFAULT = 6; // fudge radius for obstacle collision checks

// UI timing / animation
export const SHOW_LEVEL_MS = 1100;
export const FADE_MS = 380;
export const NUMBER_COLLECT_TWEEN_MS = 230;
export const HERO_NEGATIVE_ANIM_BUFFER_MS = 200; // extra safety delay before completing when anim missing
// Rock collect / feedback tweens
export const ROCK_CORRECT_FIRST_POP_MS = 170;
export const ROCK_CORRECT_LABEL_SHRINK_MS = 140;
export const ROCK_CORRECT_ROCK_SHRINK_MS = 180;
export const ROCK_CORRECT_FALLBACK_SHRINK_MS = 220;
export const ROCK_INCORRECT_SHAKE_MS = 60;
export const PLAYER_HIT_BUMP_MS = 80;
export const PLAYER_HIT_SHAKE_MS = 60;
export const PLAYER_HIT_SHAKE_OFFSET_X = 6; // horizontal shake distance
export const PLAYER_HIT_BUMP_OFFSET_Y = 8; // vertical bump distance (down/up)
export const PLAYER_LOSE_HEART_BUMP_OFFSET_Y = -6; // upward bump when heart lost

// Score / combo (placeholders for future extraction)
export const QUESTIONS_PER_LEVEL_FALLBACK = 4;

// Colors (tint / fill)
export const DPAD_COLOR_DEFAULT = 0x101010; // match in‑game pad base color
export const DPAD_COLOR_ACTIVE = 0xffffff; // highlight color in current implementation

// Tutorial specific (mirrors game constants but explicit for clarity)
export const TUTORIAL_MONSTER_SPEED = 95;
export const TUTORIAL_OBSTACLE_SIZE = 40;
export const TUTORIAL_NUMBER_SIZE = 30;
export const TUTORIAL_TOP_PAD = 120;
export const TUTORIAL_BOTTOM_PAD = 80;

// Shared game number / rock sizing (non‑tutorial scenes)
export const NUMBER_ROCK_SIZE = 30;

// Misc gameplay collision & interaction
export const ENEMY_CATCH_PADDING = 8; // reduction so collision feels fair

// Enemy patrol corner look (diamond path) timings (ms)
export const ENEMY_TURN_LOOK_INITIAL_DELAY_MS = 140;
export const ENEMY_TURN_LOOK_STEP_MS = 160; // time between each flip
export const ENEMY_TURN_LOOK_FINAL_HOLD_MS = 100; // idle before moving again

// End overlay layout
export const END_OVERLAY_TITLE_OFFSET_Y = 190; // title above center
export const END_OVERLAY_BASE_OFFSET_Y = 10; // button stack offset below center
export const END_OVERLAY_EXTRA_OFFSET_ON_FAIL = 40; // pushes buttons down to make room for hearts text
export const END_OVERLAY_BUTTON_GAP = 100; // vertical distance between primary & secondary buttons

// Pause overlay layout
export const PAUSE_OVERLAY_TITLE_OFFSET_Y = 150;
export const PAUSE_OVERLAY_BASE_OFFSET_Y = 10;
export const PAUSE_OVERLAY_BUTTON_GAP = 130;

// Overlay hearts use existing OVERLAY_HEART_SPACING; no new constant needed for that here

// Additional collision fudge (logical units) for hero vs tree separation when backing out of overlap
export const OBSTACLE_SEPARATION_FUDGE = 8;

// Export grouped object for convenience (optional)
export const TIMING = { SHOW_LEVEL_MS, FADE_MS, NUMBER_COLLECT_TWEEN_MS };
