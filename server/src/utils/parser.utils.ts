import type { Money } from "../services/statistics.service.js";
import type { Request } from 'express';

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

export function parseFoundPrice(req: Request): Money | undefined {
    const amount = parseNumber(req.query.foundPrice ?? req.query.foundPriceAmount);
    if (amount === undefined) return undefined;
    const currency =
        parseSingleValue(req.query.foundPriceCurrency) ??
        parseSingleValue(req.query.currency) ??
        'USD';
    return { amount, currency };
}