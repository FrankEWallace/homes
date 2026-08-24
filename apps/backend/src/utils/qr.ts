import crypto from 'crypto';

/**
 * Generates a unique check-in code for tickets.
 * Format: TJ-XXXX-XXXX
 */
export function generateCheckInCode(): string {
    // Using crypto to generate a random hex string
    // 4 bytes = 8 hex chars
    const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TJ-${hex.slice(0, 4)}-${hex.slice(4)}`;
}
