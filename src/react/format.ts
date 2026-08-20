const ONE_DECIMAL = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const TWO_DECIMALS = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

/**
 * Formats a number with at most one decimal, dropping a trailing zero.
 *
 * @param value - Raw number.
 * @returns A short, locale-aware string.
 */
export function short(value: number): string {
    return ONE_DECIMAL.format(value);
}

/**
 * Formats a number with at most two decimals.
 *
 * @param value - Raw number.
 * @returns A precise, locale-aware string.
 */
export function precise(value: number): string {
    return TWO_DECIMALS.format(value);
}

/**
 * Formats a signed delta, keeping the plus sign for gains.
 *
 * @param value - Difference between two stats.
 * @returns The signed string, or an empty string when there is no change.
 */
export function delta(value: number): string {
    if (Math.abs(value) < 0.001) return '';

    return `${value > 0 ? '+' : ''}${short(value)}`;
}

/**
 * Formats a multiplier as a percentage change.
 *
 * @param multiplier - Factor applied to a stat, where 1 means unchanged.
 * @returns The signed percentage string.
 */
export function percentDelta(multiplier: number): string {
    return delta((multiplier - 1) * 100);
}

/** The ratio the matchup service refuses to go past, in either direction. */
const EFFICIENCY_CEILING = 30;

/**
 * Formats a trade efficiency ratio.
 *
 * Above ten the decimals stop carrying information and only make the column harder to scan, and at
 * the ceiling the number itself stops meaning anything beyond "this one does not lose".
 *
 * @param value - Ratio where one means an even trade.
 * @returns The ratio with its multiplier sign.
 */
export function efficiency(value: number): string {
    if (value >= EFFICIENCY_CEILING) return `${String(EFFICIENCY_CEILING)}x+`;
    if (value <= 1 / EFFICIENCY_CEILING) return `1/${String(EFFICIENCY_CEILING)}x`;

    return `${value >= 10 ? Math.round(value) : precise(value)}x`;
}

/**
 * Address of a shipped file, honouring the deployment base path.
 *
 * The result is absolute on purpose. The base path is relative so the site can be served from any
 * folder, and a relative address inside a stylesheet — a custom property holding a url(), say — is
 * resolved against the stylesheet rather than the page, which lands somewhere else entirely once
 * the bundle is written to its own folder.
 *
 * @param relativePath - Path inside the public folder, such as "brand.svg".
 * @returns A URL the browser can request from anywhere.
 */
export function assetUrl(relativePath: string): string {
    return new URL(`${import.meta.env.BASE_URL}${relativePath}`, document.baseURI).href;
}

/**
 * Path to a shipped icon, honouring the deployment base path.
 *
 * @param relativePath - Path inside the icon folder, such as "Unit/17.png".
 * @returns A URL the browser can request.
 */
export function iconUrl(relativePath: string): string {
    return assetUrl(`img/${relativePath}`);
}
