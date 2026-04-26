/**
 * Buy Signal Service
 * ------------------
 * Synthesizes the data already gathered by `statistics.service` and the
 * profit math from `calculation.service` into a single 0-100 actionable
 * score with a tier classification.
 *
 * Algorithm (gating + scoring):
 *   1. Compute return-adjusted profit using a category-based return rate.
 *   2. Check hard disqualifiers — if any trigger, final score is capped
 *      at HARD_DISQUALIFIER_CAP regardless of component scores.
 *   3. Sum weighted component scores (profitability + velocity + competition).
 *   4. Subtract risk penalties.
 *   5. Optionally award alignment bonus for near-perfect setups
 *      (the only path to STRONG_BUY).
 *
 * The function is pure and synchronous — no I/O, no mutation. All inputs
 * come from already-computed values upstream so the algorithm is trivially
 * unit-testable.
 */

import type { CompetitionAggregate, SellerOffer } from './statistics.service.js';
import {
    ALIGNMENT_BONUS,
    CATEGORY_RETURN_RATES,
    COMPONENT_MAX,
    DEFAULT_RETURN_RATE,
    FBA_COMPETITION_BRACKETS,
    HARD_DISQUALIFIER_CAP,
    HARD_DISQUALIFIER_THRESHOLDS,
    MARGIN_BRACKETS,
    RISK_PENALTIES,
    ROI_BRACKETS,
    TIER_BOUNDARIES,
    VELOCITY_BRACKETS,
} from '../config/buy-signal.config.js';

export type BuySignalTier = 'AVOID' | 'LEAN_BUY' | 'BUY' | 'STRONG_BUY';

export type BuySignal = {
    score: number;
    tier: BuySignalTier;
    summary: string;
    breakdown: {
        profitability: { score: number; max: number; details: string };
        velocity: { score: number; max: number; details: string };
        competition: { score: number; max: number; details: string };
        riskPenalties: { score: number; details: string[] };
    };
    hardDisqualifiers: string[];
    primaryReasons: string[];
    wouldBecomeBuyIf: string[];
    returnAdjustment: {
        category: string;
        expectedReturnRate: number;
        rawProfit: number;
        adjustedProfit: number;
        rawROI: number;
        adjustedROI: number;
    };
};

export type BuySignalInput = {
    amazonPrice: number;
    costOfGoods: number | null;
    referralFee: number;
    fulfillmentFee: number;
    /** Raw per-unit profit BEFORE return adjustment. */
    netProfitPerUnit: number | null;
    /** Raw ROI BEFORE return adjustment. */
    roi: number | null;
    /** Raw margin BEFORE return adjustment. */
    marginPercentage: number | null;
    daysToSell: number | null;
    bsrCategory: string | null;
    competition: {
        aggregate: CompetitionAggregate;
        sellers: ReadonlyArray<SellerOffer>;
    };
    flags: { isHazmat: boolean };
    weightLb: number | null;
    estimatedBuyBoxSharePct: number;
    inboundEligible: boolean;
    /** Override for deterministic Q4 detection in tests. Defaults to runtime. */
    now?: Date;
};

// ──────────────────────────────────────────────────────────────────────
// Public entrypoint
// ──────────────────────────────────────────────────────────────────────

export function computeBuySignal(input: BuySignalInput): BuySignal {
    const returnAdjustment = computeReturnAdjustment(input);

    const hardDisqualifiers = detectHardDisqualifiers(input, returnAdjustment);

    const profitability = scoreProfitability(returnAdjustment);
    const velocity = scoreVelocity(input.daysToSell);
    const competition = scoreCompetition(input);
    const riskPenalties = computeRiskPenalties(input);

    let raw =
        profitability.score + velocity.score + competition.score - riskPenalties.score;

    // Alignment bonus: only awarded when EVERY component is at/near its
    // ceiling and zero risk penalties triggered. This is the sole path to
    // STRONG_BUY by design — see config comments.
    const nearMaxComponents =
        profitability.score >= COMPONENT_MAX.profitability &&
        velocity.score >= VELOCITY_BRACKETS[1]!.points && // 22 (7-14 day tier)
        competition.score >= COMPONENT_MAX.competition - 2 &&
        riskPenalties.score === 0;
    if (nearMaxComponents && hardDisqualifiers.length === 0) {
        raw += ALIGNMENT_BONUS;
    }

    let score = clamp(Math.round(raw), 0, 100);
    if (hardDisqualifiers.length > 0) {
        score = Math.min(score, HARD_DISQUALIFIER_CAP);
    }

    const tier = tierFor(score);
    const { primaryReasons, wouldBecomeBuyIf } = buildReasoning({
        tier,
        hardDisqualifiers,
        profitability,
        velocity,
        competition,
        riskPenalties,
        returnAdjustment,
        input,
    });

    return {
        score,
        tier,
        summary: buildSummary(tier, score, returnAdjustment),
        breakdown: { profitability, velocity, competition, riskPenalties },
        hardDisqualifiers,
        primaryReasons,
        wouldBecomeBuyIf,
        returnAdjustment,
    };
}

// ──────────────────────────────────────────────────────────────────────
// Return-rate adjustment
// ──────────────────────────────────────────────────────────────────────

type ReturnAdjustment = BuySignal['returnAdjustment'] & {
    /** Adjusted margin %, used internally for scoring. */
    adjustedMarginPercentage: number | null;
    /** Internal flag: profit math is unavailable (COGS missing). */
    profitAvailable: boolean;
};

function computeReturnAdjustment(input: BuySignalInput): ReturnAdjustment {
    const { rate, label } = lookupReturnRate(input.bsrCategory);
    const cogs = input.costOfGoods;
    const rawProfit = input.netProfitPerUnit ?? 0;
    const profitAvailable =
        typeof cogs === 'number' &&
        cogs > 0 &&
        input.netProfitPerUnit !== null &&
        input.amazonPrice > 0;

    if (!profitAvailable) {
        return {
            category: label,
            expectedReturnRate: rate,
            rawProfit,
            adjustedProfit: rawProfit,
            rawROI: input.roi ?? 0,
            adjustedROI: input.roi ?? 0,
            adjustedMarginPercentage: input.marginPercentage,
            profitAvailable: false,
        };
    }

    // Returned units waste COGS + the referral and fulfillment fees Amazon
    // already charged on the original sale (in practice Amazon refunds the
    // referral on returns minus a small admin fee, but the spec models the
    // full hit as a conservative approximation).
    const exposurePerUnit = (cogs as number) + input.referralFee + input.fulfillmentFee;
    const returnCostPerUnit = round2(exposurePerUnit * rate);
    const adjustedProfit = round2(rawProfit - returnCostPerUnit);
    const adjustedROI = round2((adjustedProfit / (cogs as number)) * 100);
    const adjustedMargin = round2((adjustedProfit / input.amazonPrice) * 100);

    return {
        category: label,
        expectedReturnRate: rate,
        rawProfit: round2(rawProfit),
        adjustedProfit,
        rawROI: round2(input.roi ?? 0),
        adjustedROI,
        adjustedMarginPercentage: adjustedMargin,
        profitAvailable: true,
    };
}

function lookupReturnRate(category: string | null): { rate: number; label: string } {
    if (!category) return { rate: DEFAULT_RETURN_RATE, label: 'Unknown' };
    const lowered = category.toLowerCase();
    for (const entry of CATEGORY_RETURN_RATES) {
        if (lowered.includes(entry.match)) return { rate: entry.rate, label: category };
    }
    return { rate: DEFAULT_RETURN_RATE, label: category };
}

// ──────────────────────────────────────────────────────────────────────
// Hard disqualifiers
// ──────────────────────────────────────────────────────────────────────

function detectHardDisqualifiers(
    input: BuySignalInput,
    adj: ReturnAdjustment
): string[] {
    const out: string[] = [];

    if (!adj.profitAvailable) {
        out.push('COGS_REQUIRED');
        return out; // No further profit-based gates make sense without COGS.
    }

    if (adj.adjustedProfit < 0) out.push('NEGATIVE_PROFIT');
    if (adj.adjustedROI < HARD_DISQUALIFIER_THRESHOLDS.minRoiPct) out.push('LOW_ROI');
    if (
        adj.adjustedMarginPercentage !== null &&
        adj.adjustedMarginPercentage < HARD_DISQUALIFIER_THRESHOLDS.minMarginPct
    ) {
        out.push('LOW_MARGIN');
    }

    // Amazon-Retail (1P) holding the Buy Box on NEW inventory crushes 3P
    // FBA margins outright — flat-out non-starter.
    const amazonRetailBuyBox = input.competition.sellers.some(
        (s) => s.isAmazon && s.isBuyBoxWinner && (s.condition ?? 'New') === 'New'
    );
    if (amazonRetailBuyBox) out.push('AMAZON_RETAIL_BUY_BOX');

    // AWD / Resale winning the Buy Box is a separate hard stop per spec.
    const awdBuyBox = input.competition.sellers.some(
        (s) =>
            s.isBuyBoxWinner &&
            (s.amazonSellerType === 'amazon-warehouse-deals' ||
                s.amazonSellerType === 'amazon-resale')
    );
    if (awdBuyBox) out.push('AMAZON_WAREHOUSE_DEALS_BUY_BOX');

    if (!input.inboundEligible) out.push('INBOUND_INELIGIBLE');
    if (input.flags.isHazmat) out.push('HAZMAT_RESTRICTED');

    return out;
}

// ──────────────────────────────────────────────────────────────────────
// Component scoring
// ──────────────────────────────────────────────────────────────────────

function scoreProfitability(
    adj: ReturnAdjustment
): { score: number; max: number; details: string } {
    if (!adj.profitAvailable) {
        return {
            score: 0,
            max: COMPONENT_MAX.profitability,
            details: 'Profit unavailable (COGS not supplied).',
        };
    }
    const roiPoints = bracketPoints(ROI_BRACKETS, adj.adjustedROI);
    const marginPoints = bracketPoints(
        MARGIN_BRACKETS,
        adj.adjustedMarginPercentage ?? 0
    );
    return {
        score: roiPoints + marginPoints,
        max: COMPONENT_MAX.profitability,
        details: `Adjusted ROI ${adj.adjustedROI.toFixed(1)}% (${roiPoints} pts) + adjusted margin ${(adj.adjustedMarginPercentage ?? 0).toFixed(1)}% (${marginPoints} pts).`,
    };
}

function scoreVelocity(
    daysToSell: number | null
): { score: number; max: number; details: string } {
    if (daysToSell === null || !Number.isFinite(daysToSell)) {
        return {
            score: 0,
            max: COMPONENT_MAX.velocity,
            details: 'Sales velocity unknown — no BSR signal.',
        };
    }
    const bracket = VELOCITY_BRACKETS.find((b) => daysToSell <= b.maxDays);
    const points = bracket?.points ?? 0;
    return {
        score: points,
        max: COMPONENT_MAX.velocity,
        details: `Estimated ${daysToSell} days to sell (${points} pts).`,
    };
}

function scoreCompetition(
    input: BuySignalInput
): { score: number; max: number; details: string } {
    const { aggregate } = input.competition;
    const reasons: string[] = [];
    let score = 0;

    if (!aggregate.amazonIsSelling) {
        score += 5;
        reasons.push('Amazon not selling (+5)');
    }

    const fbaBracket = FBA_COMPETITION_BRACKETS.find(
        (b) => aggregate.fbaSellerCount <= b.maxSellers
    );
    const fbaPoints = fbaBracket?.points ?? 0;
    score += fbaPoints;
    reasons.push(`${aggregate.fbaSellerCount} FBA sellers (+${fbaPoints})`);

    const share = input.estimatedBuyBoxSharePct;
    let sharePoints = 0;
    if (share > 40) sharePoints = 5;
    else if (share >= 20) sharePoints = 3;
    score += sharePoints;
    reasons.push(`~${share}% Buy Box share (+${sharePoints})`);

    return {
        score,
        max: COMPONENT_MAX.competition,
        details: reasons.join(', ') + '.',
    };
}

function computeRiskPenalties(
    input: BuySignalInput
): { score: number; details: string[] } {
    const details: string[] = [];
    let total = 0;

    // AWD present (but NOT winning Buy Box — that's a hard disqualifier).
    const awdPresent = input.competition.sellers.some(
        (s) =>
            !s.isBuyBoxWinner &&
            (s.amazonSellerType === 'amazon-warehouse-deals' ||
                s.amazonSellerType === 'amazon-resale')
    );
    if (awdPresent) {
        total += RISK_PENALTIES.awdWinningBuyBox;
        details.push(
            `Amazon Warehouse Deals/Resale present in offers (-${RISK_PENALTIES.awdWinningBuyBox})`
        );
    }

    const weight = input.weightLb ?? 0;
    if (weight > 5) {
        total += RISK_PENALTIES.weightOver5lb;
        details.push(`Heavy item, ${weight} lb (-${RISK_PENALTIES.weightOver5lb})`);
    } else if (weight > 3) {
        total += RISK_PENALTIES.weightOver3lb;
        details.push(`Moderately heavy, ${weight} lb (-${RISK_PENALTIES.weightOver3lb})`);
    }

    if ((input.competition.aggregate.priceSpread ?? 0) > 10) {
        total += RISK_PENALTIES.highPriceSpread;
        details.push(
            `High price spread $${input.competition.aggregate.priceSpread} (-${RISK_PENALTIES.highPriceSpread})`
        );
    }

    const avgFeedback = input.competition.aggregate.averageFeedbackRating;
    if (avgFeedback !== null && avgFeedback < 70) {
        total += RISK_PENALTIES.lowAverageFeedback;
        details.push(
            `Low average seller feedback ${avgFeedback}% (-${RISK_PENALTIES.lowAverageFeedback})`
        );
    }

    // Q4 approaching = Aug-Nov (months 7-10). Penalize slow movers because
    // Q4 storage rates spike and inventory may not clear in time.
    const month = (input.now ?? new Date()).getMonth();
    const q4Approaching = month >= 7 && month <= 10;
    if (q4Approaching && (input.daysToSell ?? 0) > 30) {
        total += RISK_PENALTIES.q4ApproachingSlowMover;
        details.push(
            `Q4 approaching with ${input.daysToSell}-day sell time (-${RISK_PENALTIES.q4ApproachingSlowMover})`
        );
    }

    return { score: total, details };
}

// ──────────────────────────────────────────────────────────────────────
// Reasoning + tiering
// ──────────────────────────────────────────────────────────────────────

function tierFor(score: number): BuySignalTier {
    if (score >= TIER_BOUNDARIES.STRONG_BUY) return 'STRONG_BUY';
    if (score >= TIER_BOUNDARIES.BUY) return 'BUY';
    if (score >= TIER_BOUNDARIES.LEAN_BUY) return 'LEAN_BUY';
    return 'AVOID';
}

function buildSummary(
    tier: BuySignalTier,
    score: number,
    adj: ReturnAdjustment
): string {
    const profitNote = adj.profitAvailable
        ? `adjusted ROI ${adj.adjustedROI.toFixed(0)}%, margin ${(adj.adjustedMarginPercentage ?? 0).toFixed(0)}%`
        : 'profit unknown (provide costOfGoods)';
    switch (tier) {
        case 'STRONG_BUY':
            return `STRONG BUY (${score}) — exceptional setup: ${profitNote}.`;
        case 'BUY':
            return `BUY (${score}) — solid opportunity: ${profitNote}.`;
        case 'LEAN_BUY':
            return `LEAN BUY (${score}) — marginal, proceed with caution: ${profitNote}.`;
        case 'AVOID':
        default:
            return `AVOID (${score}) — does not clear the bar: ${profitNote}.`;
    }
}

function buildReasoning(args: {
    tier: BuySignalTier;
    hardDisqualifiers: string[];
    profitability: { score: number; max: number; details: string };
    velocity: { score: number; max: number; details: string };
    competition: { score: number; max: number; details: string };
    riskPenalties: { score: number; details: string[] };
    returnAdjustment: ReturnAdjustment;
    input: BuySignalInput;
}): { primaryReasons: string[]; wouldBecomeBuyIf: string[] } {
    const primaryReasons: string[] = [];
    const wouldBecomeBuyIf: string[] = [];

    if (args.hardDisqualifiers.length > 0) {
        primaryReasons.push(
            `Hard disqualifier(s): ${args.hardDisqualifiers.join(', ')}`
        );
    }

    // Top contributing components
    const components = [
        { name: 'Profitability', s: args.profitability },
        { name: 'Sales velocity', s: args.velocity },
        { name: 'Competition', s: args.competition },
    ].sort((a, b) => b.s.score / b.s.max - a.s.score / a.s.max);

    for (const c of components.slice(0, 2)) {
        primaryReasons.push(`${c.name}: ${c.s.score}/${c.s.max} — ${c.s.details}`);
    }
    if (args.riskPenalties.score > 0) {
        primaryReasons.push(`Risk penalties: -${args.riskPenalties.score}`);
    }

    // What would push it into BUY?
    if (args.tier !== 'BUY' && args.tier !== 'STRONG_BUY') {
        if (!args.returnAdjustment.profitAvailable) {
            wouldBecomeBuyIf.push('Provide costOfGoods to enable profit math.');
        } else {
            if (args.returnAdjustment.adjustedROI < 25) {
                wouldBecomeBuyIf.push('Source at a lower COGS to push ROI above 25%.');
            }
            if ((args.returnAdjustment.adjustedMarginPercentage ?? 0) < 25) {
                wouldBecomeBuyIf.push('List at a higher price to push margin above 25%.');
            }
        }
        if ((args.input.daysToSell ?? Infinity) > 60) {
            wouldBecomeBuyIf.push('Wait for BSR to improve (faster sell-through).');
        }
        if (args.input.competition.aggregate.fbaSellerCount > 6) {
            wouldBecomeBuyIf.push('Wait for FBA seller count to drop below 7.');
        }
        for (const d of args.hardDisqualifiers) {
            wouldBecomeBuyIf.push(`Resolve disqualifier: ${d}.`);
        }
    }

    return { primaryReasons, wouldBecomeBuyIf };
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function bracketPoints(
    brackets: ReadonlyArray<{ minPct: number; points: number }>,
    pct: number
): number {
    for (const b of brackets) {
        if (pct >= b.minPct) return b.points;
    }
    return 0;
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
