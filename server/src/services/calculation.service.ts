import type {
    SingleProductStatistics,
    BestSellerRank,
} from "./statistics.service.js";
import { computeBuySignal } from "./buy-signal.service.js";

type Dimensions = {
  l: number;
  w: number;
  h: number;
};

type Zone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

type BoxOption = {
  name: string;
  dimensions: Dimensions;
};

type BoxSelection = {
  box: BoxOption;
  actualUnitsFit: number;
  packingEfficiency: number;
};

type ShippingInput = {
  product: Dimensions;
  productWeightLbs: number;
  targetUnits: number;
  zone: Zone;
  packingEfficiency?: number;
};

type ShippingEstimate = {
  selectedBox: BoxOption;
  unitsInBox: number;
  totalWeightLbs: number;
  billableWeight: number;
  usedDimWeight: boolean;
  shippingCost: number;
  costPerUnit: number;
};

export type CalculationOptions = {
    /**
     * Per-unit cost of goods sold. REQUIRED for profit math \u2014 omitting it
     * causes the profit block to come back populated with an explicit
     * `COGS_REQUIRED` error rather than a misleading $0 default.
     */
    costOfGoods?: number;
};

export function calculateProductStatistics(
    input: SingleProductStatistics,
    options: CalculationOptions = {}
): any {
    // Short-circuit: if Amazon requires approval to list this ASIN, there's
    // no point running the full profit/buy-signal pipeline. The frontend
    // uses this flag to discard the product immediately.
    if (input.listingRestrictions.requiresApproval) {
        return { approvalRequired: true };
    }

    const quantity = Math.max(1, input.estimatedQuantity || 1);

    const shippingEstimate = estimateUSPSShippingCost({
        product: {
            l: input.dimensions.lengthIn || 0,
            w: input.dimensions.widthIn || 0,
            h: input.dimensions.heightIn || 0,
        },
        productWeightLbs: input.dimensions.weightLb || 0,
        targetUnits: quantity,
        zone: 1,
    });
    const shippingToAmazonPerUnit = round2(shippingEstimate.shippingCost / quantity);

    // Resolve fees up-front so profit math has clean inputs.
    const referralFee = input.categoryFee.amount ?? 0;
    const fulfillmentFee = input.fulfillmentFee.amount ?? 0; // 0 only if SP-API didn't return
    const storageFeeMonthly = input.storageFee.monthlyFee ?? 0;

    const amazonPrice = getAmazonPrice({
        buyBoxPrice: input.buyBoxPrice?.amount || 0,
        lowestPrice: input.lowestPrice?.amount || 0,
    });

    // Profit — requires COGS. If caller didn't supply it, surface an
    // explicit error rather than silently treating cost as $0.
    const profit = computeProfit({
        amazonPrice,
        costOfGoods: options.costOfGoods,
        referralFee,
        fulfillmentFee,
        shippingToAmazonPerUnit,
        quantity,
    });

    // BSR → sales velocity → days-to-sell-quantity
    const salesEstimate = estimateMonthlySalesFromBsr(input.bsr);
    const daysToSellQuantity =
        salesEstimate.unitsPerMonth && salesEstimate.unitsPerMonth > 0
            ? Math.round((quantity / salesEstimate.unitsPerMonth) * 30)
            : null;

    // Naive Buy Box share estimate for the buy-signal model: if Amazon owns
    // the box we capture 0; otherwise a new FBA entrant typically gets
    // 1/(competitors + 1) of the share.
    const aggregate = input.competition.aggregate;
    const estimatedBuyBoxSharePct = aggregate.amazonIsBuyBoxWinner
        ? 0
        : Math.round((1 / (Math.max(1, aggregate.fbaSellerCount) + 1)) * 100);

    const fullBuySignal = computeBuySignal({
        amazonPrice,
        costOfGoods: typeof options.costOfGoods === 'number' ? options.costOfGoods : null,
        referralFee,
        fulfillmentFee,
        netProfitPerUnit: profit.netProfitPerUnit,
        roi: profit.roi,
        marginPercentage: profit.marginPercentage,
        daysToSell: daysToSellQuantity,
        bsrCategory: input.bsr?.category ?? null,
        competition: input.competition,
        flags: { isHazmat: input.flags.isHazmat },
        weightLb: input.dimensions.weightLb,
        estimatedBuyBoxSharePct,
        inboundEligible: input.inboundEligibility.isEligible,
    });

    // Public response surface: drop internal-only fields the UI doesn't
    // consume (tier/summary/disqualifiers/reasoning/return-adjustment).
    // Those remain available on the buy-signal service for tests/internal use.
    const {
        tier: _tier,
        summary: _summary,
        hardDisqualifiers: _hardDisqualifiers,
        primaryReasons: _primaryReasons,
        wouldBecomeBuyIf: _wouldBecomeBuyIf,
        returnAdjustment: _returnAdjustment,
        ...buySignal
    } = fullBuySignal;

    return {
        metadata: {
            asin: input.asin,
            title: input.title || 'Unknown Product',
            category: input.bsr?.category || 'Unknown',
            image: input.image || '',
        },
        computed: {
            amazonPrice,
            costOfGoodsPerUnit:
                typeof options.costOfGoods === 'number' ? options.costOfGoods : null,
            referralFee: round2(referralFee),
            fbaFee: round2(fulfillmentFee),
            shippingFee: shippingToAmazonPerUnit,
            monthlyStorageFee: round2(storageFeeMonthly),
            profit: {
                netProfitPerUnit: profit.netProfitPerUnit,
                netProfitTotal: profit.netProfitTotal,
                roi: profit.roi,
                marginPercentage: profit.marginPercentage,
                totalFeesPerUnit: profit.totalFeesPerUnit,
                ...(profit.error ? { error: profit.error, message: profit.message } : {}),
            },
        },
        buySignal,
        fetched: {
            sellerPopularity: input.seller.popularity || 0,
            bsr: input.bsr?.rank || 0,
            dimensions: {
                weight: input.dimensions.weightLb || 0,
                length: input.dimensions.lengthIn || 0,
                width: input.dimensions.widthIn || 0,
                height: input.dimensions.heightIn || 0,
            },
            inboundEligibility: {
                isEligible: input.inboundEligibility.isEligible,
                reasons: input.inboundEligibility.reasons,
            },
            listingRestrictions: {
                canList: input.listingRestrictions.canList,
                requiresApproval: input.listingRestrictions.requiresApproval,
                conditionType: input.listingRestrictions.conditionType,
                restrictions: input.listingRestrictions.restrictions,
                ...(input.listingRestrictions.error
                    ? { error: input.listingRestrictions.error }
                    : {}),
            },
            competition: {
                totalSellerCount: aggregate.totalSellerCount,
                fbaSellerCount: aggregate.fbaSellerCount,
                fbmSellerCount: aggregate.fbmSellerCount,
            },
            salesEstimate: {
                unitsPerMonth: salesEstimate.unitsPerMonth,
                confidence: salesEstimate.confidence,
                daysToSellQuantity,
            },
        },
    };
}

/**
 * Computes profit, ROI, and margin for the given inputs. Returns an object
 * with `error: 'COGS_REQUIRED'` when the caller didn't pass a per-unit COGS,
 * because silently defaulting cost to 0 was the source of long-running
 * profit-overstatement bugs (and the reason this function exists).
 */
function computeProfit(input: {
    amazonPrice: number;
    costOfGoods: number | undefined;
    referralFee: number;
    fulfillmentFee: number;
    shippingToAmazonPerUnit: number;
    quantity: number;
}): {
    error: string | null;
    message: string | null;
    netProfitPerUnit: number | null;
    netProfitTotal: number | null;
    roi: number | null;
    marginPercentage: number | null;
    totalFeesPerUnit: number | null;
} {
    const totalFeesPerUnit = round2(
        input.referralFee +
            input.fulfillmentFee +
            input.shippingToAmazonPerUnit
    );

    if (typeof input.costOfGoods !== 'number' || !Number.isFinite(input.costOfGoods) || input.costOfGoods < 0) {
        return {
            error: 'COGS_REQUIRED',
            message:
                'costOfGoods (per-unit, USD) is required for profit calculation. Pass ?costOfGoods=N on the request.',
            netProfitPerUnit: null,
            netProfitTotal: null,
            roi: null,
            marginPercentage: null,
            totalFeesPerUnit,
        };
    }

    const cogs = input.costOfGoods;
    const netProfitPerUnit = round2(input.amazonPrice - totalFeesPerUnit - cogs);
    const netProfitTotal = round2(netProfitPerUnit * input.quantity);
    const roi = cogs > 0 ? round2((netProfitPerUnit / cogs) * 100) : null;
    const marginPercentage =
        input.amazonPrice > 0 ? round2((netProfitPerUnit / input.amazonPrice) * 100) : null;

    return {
        error: null,
        message: null,
        netProfitPerUnit,
        netProfitTotal,
        roi,
        marginPercentage,
        totalFeesPerUnit,
    };
}

function getAmazonPrice(input: {
    buyBoxPrice: number;
    lowestPrice: number;
}): number {
    const { buyBoxPrice, lowestPrice } = input;

    if (buyBoxPrice !== 0 && lowestPrice !== 0) {
        return round2(buyBoxPrice * 0.85 + lowestPrice * 0.15);
    } else if (buyBoxPrice !== 0) {
        return buyBoxPrice;
    } else if (lowestPrice !== 0) {
        return lowestPrice;
    }

    return -1;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// --------------------------------------------------------------------------------------------------
// @section:bsr-sales-estimate
// --------------------------------------------------------------------------------------------------

/**
 * Rough monthly-sales anchor points by category. Indexed by BSR; values are
 * estimated units-sold per month at that rank in the US marketplace.
 *
 * These numbers are coarse industry averages (Helium 10 / Jungle Scout style
 * estimates). They're meant for relative ranking and "ballpark days-to-sell"
 * decisions, not exact forecasting. Refine over time with our own data.
 */
const BSR_SALES_TABLES: Record<string, Array<[number, number]>> = {
    'Beauty & Personal Care': [
        [1, 25000], [100, 3000], [1000, 600], [10000, 150], [100000, 30], [1000000, 3],
    ],
    'Home & Kitchen': [
        [1, 30000], [100, 3500], [1000, 700], [10000, 180], [100000, 35], [1000000, 4],
    ],
    'Toys & Games': [
        [1, 35000], [100, 4500], [1000, 900], [10000, 220], [100000, 45], [1000000, 5],
    ],
    'Health & Household': [
        [1, 25000], [100, 3000], [1000, 600], [10000, 150], [100000, 30], [1000000, 3],
    ],
    'Grocery & Gourmet Food': [
        [1, 30000], [100, 4000], [1000, 800], [10000, 200], [100000, 40], [1000000, 4],
    ],
    'Office Products': [
        [1, 20000], [100, 2500], [1000, 500], [10000, 120], [100000, 25], [1000000, 2],
    ],
    Default: [
        [1, 25000], [100, 3000], [1000, 600], [10000, 150], [100000, 30], [1000000, 3],
    ],
};

function pickSalesTable(category: string | undefined | null): Array<[number, number]> {
    if (!category) return BSR_SALES_TABLES.Default!;
    const lowered = category.toLowerCase();
    for (const key of Object.keys(BSR_SALES_TABLES)) {
        if (key === 'Default') continue;
        if (lowered.includes(key.toLowerCase())) return BSR_SALES_TABLES[key]!;
    }
    return BSR_SALES_TABLES.Default!;
}

/**
 * Log-log linear interpolation between the two anchor points that bracket
 * the input rank. BSR \u2194 sales is famously power-law shaped, so log-log is
 * a much better fit than plain linear interpolation.
 */
function estimateMonthlySalesFromBsr(bsr: BestSellerRank | null): {
    unitsPerMonth: number | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    table: string;
} {
    if (!bsr || !bsr.rank || bsr.rank <= 0) {
        return { unitsPerMonth: null, confidence: 'none', table: 'unknown' };
    }

    const rank = bsr.rank;
    const table = pickSalesTable(bsr.category);
    const tableName = bsr.category && pickSalesTable(bsr.category) !== BSR_SALES_TABLES.Default
        ? bsr.category
        : 'Default';

    // Find bracketing anchors
    let lower = table[0]!;
    let upper = table[table.length - 1]!;
    for (let i = 0; i < table.length - 1; i++) {
        const a = table[i]!;
        const b = table[i + 1]!;
        if (rank >= a[0] && rank <= b[0]) {
            lower = a;
            upper = b;
            break;
        }
    }

    let unitsPerMonth: number;
    if (rank <= lower[0]) {
        unitsPerMonth = lower[1];
    } else if (rank >= upper[0]) {
        unitsPerMonth = upper[1];
    } else {
        const logRank = Math.log10(rank);
        const logLowerR = Math.log10(lower[0]);
        const logUpperR = Math.log10(upper[0]);
        const logLowerS = Math.log10(lower[1]);
        const logUpperS = Math.log10(upper[1]);
        const t = (logRank - logLowerR) / (logUpperR - logLowerR);
        unitsPerMonth = Math.round(Math.pow(10, logLowerS + t * (logUpperS - logLowerS)));
    }

    // Coarse confidence buckets \u2014 BSR is a noisy signal at the extremes.
    let confidence: 'high' | 'medium' | 'low';
    if (rank <= 1000) confidence = 'high';
    else if (rank <= 50000) confidence = 'medium';
    else confidence = 'low';

    return { unitsPerMonth, confidence, table: tableName };
}

// --------------------------------------------------------------------------------------------------
// @section:shipping
// --------------------------------------------------------------------------------------------------

/**
 * Standard box catalog used for box selection.
 * Override by passing a custom list to selectSmallestBox().
 * The 12x12x12 box is intentionally included — it's the USPS DIM weight cliff.
 */
const STANDARD_BOXES: BoxOption[] = [
  { name: 'Small',         dimensions: { l: 6,  w: 6,  h: 6  } },
  { name: 'Medium-Small',  dimensions: { l: 8,  w: 8,  h: 8  } },
  { name: 'Medium',        dimensions: { l: 10, w: 10, h: 10 } },
  { name: 'Cubic-Foot',    dimensions: { l: 12, w: 12, h: 12 } },
  { name: 'Large',         dimensions: { l: 14, w: 14, h: 14 } },
  { name: 'XL',            dimensions: { l: 16, w: 16, h: 16 } },
  { name: 'XXL',           dimensions: { l: 18, w: 18, h: 18 } },
  { name: 'Jumbo',         dimensions: { l: 20, w: 20, h: 20 } },
];

const USPS_MAX_WEIGHT_LBS = 70;
const USPS_MAX_LENGTH_PLUS_GIRTH = 130;

/**
 * USPS Ground Advantage Commercial Rates — effective Jan 18, 2026.
 * Source: USPS Notice 123. Update annually.
 * 
 * Indexed by: rate[weightLbs][zone] = price in USD
 * Weights 1-70 lbs, Zones 1-9.
 */
const USPS_GROUND_ADVANTAGE_RATES: Record<number, Record<Zone, number>> = {
  1:  { 1: 7.05,  2: 7.30,  3: 7.50,  4: 7.80,  5: 8.10,  6: 8.40,  7: 8.70,  8: 9.00,  9: 9.30  },
  2:  { 1: 7.40,  2: 7.95,  3: 8.45,  4: 9.00,  5: 9.75,  6: 10.50, 7: 11.25, 8: 12.00, 9: 12.75 },
  3:  { 1: 7.75,  2: 8.30,  3: 8.75,  4: 9.50,  5: 10.35, 6: 11.20, 7: 12.05, 8: 12.90, 9: 13.75 },
  4:  { 1: 8.40,  2: 8.85,  3: 9.50,  4: 10.30, 5: 11.40, 6: 12.50, 7: 13.55, 8: 14.65, 9: 15.75 },
  5:  { 1: 8.36,  2: 9.40,  3: 10.10, 4: 11.00, 5: 12.30, 6: 13.55, 7: 14.85, 8: 16.10, 9: 17.40 },
  6:  { 1: 9.35,  2: 9.65,  3: 10.30, 4: 11.40, 5: 12.80, 6: 14.20, 7: 15.65, 8: 17.05, 9: 18.50 },
  7:  { 1: 9.70,  2: 10.00, 3: 10.70, 4: 11.90, 5: 13.50, 6: 15.05, 7: 16.65, 8: 18.20, 9: 19.80 },
  8:  { 1: 10.10, 2: 10.30, 3: 11.00, 4: 12.25, 5: 14.20, 6: 15.85, 7: 17.55, 8: 19.20, 9: 20.90 },
  9:  { 1: 10.50, 2: 10.70, 3: 11.30, 4: 12.70, 5: 14.85, 6: 16.65, 7: 18.40, 8: 20.20, 9: 22.00 },
  10: { 1: 11.22, 2: 11.30, 3: 11.95, 4: 13.45, 5: 15.85, 6: 17.85, 7: 19.80, 8: 21.75, 9: 23.75 },
  11: { 1: 11.65, 2: 12.00, 3: 12.60, 4: 14.20, 5: 16.80, 6: 18.95, 7: 21.05, 8: 23.15, 9: 25.30 },
  12: { 1: 12.10, 2: 12.40, 3: 12.95, 4: 14.80, 5: 17.65, 6: 19.95, 7: 22.20, 8: 24.45, 9: 26.75 },
  13: { 1: 12.65, 2: 12.85, 3: 13.30, 4: 15.10, 5: 18.45, 6: 20.85, 7: 23.20, 8: 25.60, 9: 28.05 },
  14: { 1: 12.95, 2: 13.25, 3: 13.80, 4: 15.85, 5: 19.30, 6: 21.85, 7: 24.35, 8: 26.85, 9: 29.45 },
  15: { 1: 13.10, 2: 13.95, 3: 14.65, 4: 16.95, 5: 20.65, 6: 23.40, 7: 26.05, 8: 28.75, 9: 31.50 },
  16: { 1: 13.20, 2: 14.30, 3: 15.45, 4: 17.95, 5: 22.05, 6: 25.05, 7: 27.95, 8: 30.85, 9: 33.85 },
  17: { 1: 13.25, 2: 14.65, 3: 16.10, 4: 18.85, 5: 23.40, 6: 26.65, 7: 29.80, 8: 32.95, 9: 36.20 },
  18: { 1: 13.30, 2: 14.85, 3: 16.55, 4: 19.50, 5: 24.45, 6: 27.95, 7: 31.40, 8: 34.80, 9: 38.30 },
  19: { 1: 13.35, 2: 15.05, 3: 16.95, 4: 20.20, 5: 25.55, 6: 29.30, 7: 33.05, 8: 36.75, 9: 40.55 },
  20: { 1: 13.40, 2: 15.25, 3: 17.30, 4: 20.85, 5: 26.65, 6: 30.65, 7: 34.65, 8: 38.65, 9: 42.75 },
  21: { 1: 14.10, 2: 16.00, 3: 18.20, 4: 21.95, 5: 28.10, 6: 32.35, 7: 36.60, 8: 40.85, 9: 45.20 },
  22: { 1: 14.80, 2: 16.75, 3: 19.10, 4: 23.05, 5: 29.55, 6: 34.05, 7: 38.55, 8: 43.05, 9: 47.65 },
  23: { 1: 15.50, 2: 17.50, 3: 20.00, 4: 24.15, 5: 31.00, 6: 35.75, 7: 40.50, 8: 45.25, 9: 50.10 },
  24: { 1: 16.20, 2: 18.25, 3: 20.90, 4: 25.25, 5: 32.45, 6: 37.45, 7: 42.45, 8: 47.45, 9: 52.55 },
  25: { 1: 16.90, 2: 19.00, 3: 21.80, 4: 26.35, 5: 33.90, 6: 39.15, 7: 44.40, 8: 49.65, 9: 55.00 },
  26: { 1: 17.60, 2: 19.75, 3: 22.70, 4: 27.45, 5: 35.35, 6: 40.85, 7: 46.35, 8: 51.85, 9: 57.45 },
  27: { 1: 18.30, 2: 20.50, 3: 23.60, 4: 28.55, 5: 36.80, 6: 42.55, 7: 48.30, 8: 54.05, 9: 59.90 },
  28: { 1: 19.00, 2: 21.25, 3: 24.50, 4: 29.65, 5: 38.25, 6: 44.25, 7: 50.25, 8: 56.25, 9: 62.35 },
  29: { 1: 19.70, 2: 22.00, 3: 25.40, 4: 30.75, 5: 39.70, 6: 45.95, 7: 52.20, 8: 58.45, 9: 64.80 },
  30: { 1: 20.40, 2: 22.75, 3: 26.30, 4: 31.85, 5: 41.15, 6: 47.65, 7: 54.15, 8: 60.65, 9: 67.25 },
  31: { 1: 21.10, 2: 23.50, 3: 27.20, 4: 32.95, 5: 42.60, 6: 49.35, 7: 56.10, 8: 62.85, 9: 69.70 },
  32: { 1: 21.80, 2: 24.25, 3: 28.10, 4: 34.05, 5: 44.05, 6: 51.05, 7: 58.05, 8: 65.05, 9: 72.15 },
  33: { 1: 22.50, 2: 25.00, 3: 29.00, 4: 35.15, 5: 45.50, 6: 52.75, 7: 60.00, 8: 67.25, 9: 74.60 },
  34: { 1: 23.20, 2: 25.75, 3: 29.90, 4: 36.25, 5: 46.95, 6: 54.45, 7: 61.95, 8: 69.45, 9: 77.05 },
  35: { 1: 23.90, 2: 26.50, 3: 30.80, 4: 37.35, 5: 48.40, 6: 56.15, 7: 63.90, 8: 71.65, 9: 79.50 },
  40: { 1: 27.40, 2: 30.25, 3: 35.30, 4: 42.85, 5: 55.65, 6: 64.65, 7: 73.65, 8: 82.65, 9: 91.75 },
  45: { 1: 30.90, 2: 34.00, 3: 39.80, 4: 48.35, 5: 62.90, 6: 73.15, 7: 83.40, 8: 93.65, 9: 104.00 },
  50: { 1: 34.40, 2: 37.75, 3: 44.30, 4: 53.85, 5: 70.15, 6: 81.65, 7: 93.15, 8: 104.65, 9: 116.25 },
  55: { 1: 37.90, 2: 41.50, 3: 48.80, 4: 59.35, 5: 77.40, 6: 90.15, 7: 102.90, 8: 115.65, 9: 128.50 },
  60: { 1: 41.40, 2: 45.25, 3: 53.30, 4: 64.85, 5: 84.65, 6: 98.65, 7: 112.65, 8: 126.65, 9: 140.75 },
  65: { 1: 44.90, 2: 49.00, 3: 57.80, 4: 70.35, 5: 91.90, 6: 107.15, 7: 122.40, 8: 137.65, 9: 153.00 },
  70: { 1: 56.22, 2: 56.80, 3: 62.30, 4: 75.85, 5: 99.15, 6: 115.65, 7: 132.15, 8: 148.65, 9: 165.25 },
};

/**
 * Looks up a USPS Ground Advantage rate from the static table.
 * Rounds up to the next available weight tier if the exact weight isn't listed
 * (the table thins out above 35 lbs).
 * 
 * @throws if weight exceeds USPS 70 lb maximum or zone is invalid
 */
function getUSPSRate(weightLbs: number, zone: Zone): number {
  if (weightLbs < 1 || weightLbs > USPS_MAX_WEIGHT_LBS) {
    throw new Error(`Weight ${weightLbs} lbs is outside USPS Ground Advantage range (1-70 lbs)`);
  }
  
  // Find the next available weight tier in the table
  const availableWeights = Object.keys(USPS_GROUND_ADVANTAGE_RATES)
    .map(Number)
    .sort((a, b) => a - b);
  
  const tier = availableWeights.find(w => w >= weightLbs);
  if (tier === undefined) {
    throw new Error(`No rate tier found for weight ${weightLbs} lbs`);
  }
  
  const rate = USPS_GROUND_ADVANTAGE_RATES[tier]?.[zone];
  if (rate === undefined) {
    throw new Error(`No rate found for ${tier} lbs to Zone ${zone}`);
  }
  
  return rate;
}

/**
 * Finds the smallest box from the catalog that can hold the target number of
 * product units while staying within USPS Ground Advantage limits.
 * 
 * @throws if no standard box can fit the target units within USPS limits
 */
function selectSmallestBox(
  product: Dimensions,
  targetUnits: number,
  productWeightLbs: number,
  packingEfficiency = 0.85,
  boxes: BoxOption[] = STANDARD_BOXES
): BoxSelection {
  const productVolume = product.l * product.w * product.h;
  const productLongest = Math.max(product.l, product.w, product.h);
  
  // Sort boxes by volume ascending so we find the smallest fit first
  const sortedBoxes = [...boxes].sort((a, b) => {
    const volA = a.dimensions.l * a.dimensions.w * a.dimensions.h;
    const volB = b.dimensions.l * b.dimensions.w * b.dimensions.h;
    return volA - volB;
  });
  
  for (const box of sortedBoxes) {
    const { l, w, h } = box.dimensions;
    const boxVolume = l * w * h;
    
    // Skip if a single product literally won't fit in this box
    const boxLongest = Math.max(l, w, h);
    if (productLongest > boxLongest) continue;
    
    const unitsFit = Math.floor((boxVolume * packingEfficiency) / productVolume);
    const totalWeight = unitsFit * productWeightLbs;
    
    // Check USPS size limit (length + girth)
    const longest = Math.max(l, w, h);
    const girth = 2 * (l + w + h - longest);
    const withinSizeLimit = (longest + girth) <= USPS_MAX_LENGTH_PLUS_GIRTH;
    
    if (unitsFit >= targetUnits && totalWeight <= USPS_MAX_WEIGHT_LBS && withinSizeLimit) {
      return {
        box,
        actualUnitsFit: unitsFit,
        packingEfficiency,
      };
    }
  }
  
  throw new Error(
    `No standard box can hold ${targetUnits} units of this product within USPS limits. ` +
    `Consider splitting into multiple shipments.`
  );
}

/**
 * Estimates USPS Ground Advantage shipping cost for a target number of product
 * units. Selects the smallest valid box, computes billable weight (with DIM
 * rules), and looks up the rate from the static table.
 * 
 * Note: Uses static 2026 commercial rates. Swap getUSPSRate() with a live API
 * call (Shippo, EasyPost) for real-time accuracy.
 */
function estimateUSPSShippingCost(input: ShippingInput): ShippingEstimate {
  const { product, productWeightLbs, targetUnits, zone, packingEfficiency = 0.85 } = input;
  
  // 1. Find the smallest box that fits the target units
  const selection = selectSmallestBox(product, targetUnits, productWeightLbs, packingEfficiency);
  const box = selection.box.dimensions;
  
  // 2. Calculate total package weight for the actual units shipped
  const totalWeightLbs = targetUnits * productWeightLbs;
  
  // 3. Apply USPS DIM weight rules (only if box exceeds 1 cubic foot)
  const boxVolume = box.l * box.w * box.h;
  const dimWeight = boxVolume / 166;
  const usedDimWeight = boxVolume > 1728 && dimWeight > totalWeightLbs;
  const billableWeight = usedDimWeight ? dimWeight : totalWeightLbs;
  
  // 4. USPS rounds up to next whole pound for anything over 15.999 oz
  const roundedWeight = Math.ceil(billableWeight);
  
  // 5. Look up the rate from the static table
  const shippingCost = getUSPSRate(roundedWeight, zone);
  
  return {
    selectedBox: selection.box,
    unitsInBox: targetUnits,
    totalWeightLbs,
    billableWeight,
    usedDimWeight,
    shippingCost,
    costPerUnit: shippingCost / targetUnits,
  };
}