import amazonClient from './client.service.js';

/**
 * Amazon FBA Inbound Eligibility Service
 *
 * Wraps SP-API FBA Inbound Eligibility v1:
 *   GET /fba/inbound/v1/eligibility/itemPreview
 *
 * Used to test whether an ASIN is eligible to be sent into Amazon's
 * fulfillment network (program = INBOUND) and translate any returned
 * `FBA_INB_*` reason codes into human-readable messages for the UI.
 */

export type InboundEligibilityProgram = 'INBOUND' | 'COMMINGLING';

export type IneligibilityReason = {
	/** Raw code from Amazon, e.g. "FBA_INB_0010". */
	code: string;
	/** Translated message; falls back to a generic string for unknown codes. */
	message: string;
};

export type InboundEligibilityResult = {
	asin: string;
	marketplaceId: string;
	program: InboundEligibilityProgram;
	isEligible: boolean;
	reasons: IneligibilityReason[];
	/** True when the SP-API call failed; consumers should treat as "unknown". */
	error?: string;
};

/**
 * Static translation table for FBA inbound ineligibility codes.
 * Source: Amazon SP-API "FBA Inbound Eligibility" reference.
 *
 * Anything not in this table falls back to a generic message + the raw code,
 * so callers always get something safe to render.
 */
const REASON_MESSAGES: Record<string, string> = {
	FBA_INB_0004:
		'Missing package dimensions. Provide measurements from the original manufacturer packaging.',
	FBA_INB_0006: 'The SKU for this product is unknown or cannot be found.',
	FBA_INB_0007:
		'Product is not eligible to be sent to Amazon (see FBA Product Restrictions).',
	FBA_INB_0008:
		'ASIN requires Amazon approval. Submit an application via the "Add a Product" workflow.',
	FBA_INB_0009: 'ASIN is on the FBA prohibited products list.',
	FBA_INB_0010:
		'Identified as glass or fragile. Must be sent in the manufacturer\'s original packaging.',
	FBA_INB_0011: 'Identified as a marketing sample and is not eligible for FBA.',
	FBA_INB_0012: 'An expiration date must be printed on this product.',
	FBA_INB_0013: 'Regulated as a dangerous good (hazmat).',
	FBA_INB_0014: 'Product is missing a dangerous goods (hazmat) review.',
	FBA_INB_0015: 'Dangerous good (hazmat) that Amazon does not accept in fulfillment centers.',
	FBA_INB_0016: 'Cannot be stickerless commingled — a new offer must be created.',
	FBA_INB_0017: 'Product does not exist in the destination marketplace catalog.',
	FBA_INB_0018: 'Product is missing a condition.',
	FBA_INB_0019: 'Product is missing category information.',
	FBA_INB_0034: 'Needs additional information for FBA inbound eligibility evaluation.',
	FBA_INB_0035: 'On a special FBA inventory list and not currently eligible.',
	FBA_INB_0036: 'Cannot be processed for inbound at this time.',
	FBA_INB_0037: 'ASIN is not eligible for FBA.',
	FBA_INB_0038: 'Brand is not eligible for FBA.',
	FBA_INB_0050: 'Internal Amazon error during eligibility check.',
	FBA_INB_0051: 'Product is missing a brand.',
	FBA_INB_0053: 'Product packaging type not supported.',
	FBA_INB_0055: 'Restricted brand for FBA.',
	FBA_INB_0056: 'Product packaging is not supported.',
	FBA_INB_0059: 'SKU has been blocked for FBA inbound.',
	FBA_INB_0065: 'Item is restricted for the shipping country.',
	FBA_INB_0066: 'Special handling required.',
	FBA_INB_0067: 'Not eligible — open ASIN issue.',
	FBA_INB_0068: 'Not eligible due to compliance issues.',
	FBA_INB_0099: 'Unknown ineligibility reason reported by Amazon.',
	FBA_INB_0100: 'Product is missing GTIN / EAN / UPC information.',
	FBA_INB_0103: 'Listing has been blocked from FBA selling.',
	FBA_INB_0104: 'Item details are missing.',
};

function translateReason(code: string): IneligibilityReason {
	const message =
		REASON_MESSAGES[code] ??
		`Not eligible for FBA inbound (Amazon code ${code}). See Seller Central for details.`;
	return { code, message };
}

class AmazonEligibilityService {
	private readonly API_VERSION = 'v1';

	private resolveMarketplaceId(marketplaceId?: string): string {
		return marketplaceId && marketplaceId.trim().length > 0
			? marketplaceId
			: amazonClient.getMarketplaceId();
	}

	/**
	 * Check whether an ASIN is eligible for the FBA INBOUND program in the
	 * given marketplace. Returns a normalized result with translated reasons.
	 *
	 * On SP-API failure this never throws — instead it returns
	 * `{ isEligible: false, reasons: [], error }` so the caller can render
	 * the rest of the product card without blocking.
	 */
	async getInboundEligibility(
		asin: string,
		marketplaceId?: string,
		program: InboundEligibilityProgram = 'INBOUND'
	): Promise<InboundEligibilityResult> {
		const resolvedMarketplaceId = this.resolveMarketplaceId(marketplaceId);

		try {
			const response = await amazonClient.get<any>(
				`/fba/inbound/${this.API_VERSION}/eligibility/itemPreview`,
				{
					asin,
					program,
					marketplaceIds: resolvedMarketplaceId,
				}
			);

			const payload = response?.payload ?? response;
			const isEligible = payload?.isEligibleForProgram === true;
			const rawReasons: unknown = payload?.ineligibilityReasonList;
			const reasons: IneligibilityReason[] = Array.isArray(rawReasons)
				? rawReasons
						.filter((c): c is string => typeof c === 'string' && c.length > 0)
						.map(translateReason)
				: [];

			return {
				asin,
				marketplaceId: resolvedMarketplaceId,
				program,
				isEligible,
				reasons,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				asin,
				marketplaceId: resolvedMarketplaceId,
				program,
				isEligible: false,
				reasons: [],
				error: message,
			};
		}
	}
}

export default new AmazonEligibilityService();
