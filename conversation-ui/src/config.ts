/**
 * Client build-time configuration.
 *
 * These are Vite env vars — set them in `web/.env` (NOT the repo-root `.env`,
 * which is the server's). Vite only exposes vars prefixed with `VITE_`.
 */

/**
 * Whether the voice assistant (mic + TTS) is available at all. Set
 * `VITE_VOICE_ENABLED=false` in `web/.env` to hard-disable it: the default is
 * off, and the TopBar toggle, composer mic, and landing orb are all hidden so it
 * can't be turned on. Any other value (or unset) leaves voice available.
 */
export const VOICE_ENABLED = import.meta.env.VITE_VOICE_ENABLED !== "false";
