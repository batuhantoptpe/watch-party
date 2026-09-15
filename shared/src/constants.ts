export const HEARTBEAT_INTERVAL_MS = 4000;
// How far apart two peers' playback positions can drift before a heartbeat
// silently seeks one to match the other. Kept fairly loose on purpose: a
// sub-2s gap is imperceptible while actually watching something together,
// but every correction is a visible little jump — and on real streaming
// sites (ad-supported CDNs, CAM-quality mirrors) a seek often triggers a
// rebuffer, which can cause the *next* heartbeat to drift again and
// re-trigger, looping. Correcting less aggressively breaks that loop.
export const DRIFT_THRESHOLD_S = 2.0;
export const SEEK_EPSILON_S = 0.35;
export const GUARD_SUPPRESS_WINDOW_MS = 400;
export const ROOM_CODE_LENGTH = 6;
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
