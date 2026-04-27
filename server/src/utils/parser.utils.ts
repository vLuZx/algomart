export function parseSingleValue(value: unknown): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    return trimmed || undefined;
}

export function parseNumber(value: unknown): number | undefined {
    const raw = parseSingleValue(value);
    if (raw === undefined) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
}
