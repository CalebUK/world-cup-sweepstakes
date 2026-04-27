/**
 * Validates a league invite code / UUID before using it as a Firestore document ID.
 * Accepts alphanumeric characters, hyphens, and underscores, 8–64 chars.
 */
export const isValidLeagueCode = (code) => /^[a-zA-Z0-9_-]{8,64}$/.test(code);
