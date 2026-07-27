export const ACCESS_TOKEN_COOKIE = 'access_token';
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export const REFRESH_TOKEN_COOKIE = 'refresh_token';
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Must include the global 'api' prefix — cookie paths are raw URL paths. */
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Re-presenting a spent token this soon is treated as a client race, not theft. */
export const REFRESH_REUSE_GRACE_MS = 30 * 1000;
