import amazonClient from './client.service.js';

/**
 * Amazon Listings Restrictions Service
 *
 * Wraps SP-API Listings Restrictions 2021-08-01:
 *   GET /listings/2021-08-01/restrictions
 *
 * Used to determine whether the seller is allowed to list (sell) a given
 * ASIN, or whether Amazon requires approval / blocks the listing entirely
 * for the seller's account.
 *
 * Response semantics:
 *  - `restrictions` array empty   → no restriction; can sell freely.
 *  - `reasonCode` = APPROVAL_REQUIRED → seller must request approval.
 *  - `reasonCode` = ASIN_NOT_FOUND / NOT_ELIGIBLE → cannot sell at all.
 */

export type ListingRestrictionReasonCode =
	| 'APPROVAL_REQUIRED'
	| 'ASIN_NOT_FOUND'
	| 'NOT_ELIGIBLE'
	| string;

export type ListingRestrictionLink = {
	resource: string;
	verb: string;
	title?: string;
	type?: string;
};

export type ListingRestrictionReason = {
	message: string;
	reasonCode: ListingRestrictionReasonCode;
	links: ListingRestrictionLink[];
};

export type ListingRestriction = {
	marketplaceId: string;
	conditionType?: string;
	reasons: ListingRestrictionReason[];
};

export type ListingRestrictionsResult = {
	asin: string;
	marketplaceId: string;
	sellerId: string;
	conditionType: string;
	/** True when the seller can list this ASIN with no approval needed. */
	canList: boolean;
	/** True when at least one reason is APPROVAL_REQUIRED. */
	requiresApproval: boolean;
	/** Raw normalized restrictions returned by Amazon. */
	restrictions: ListingRestriction[];
	/** True when SP-API failed; consumers should treat the result as unknown. */
	error?: string;
};

/**
 * SP-API allowed condition types. We default to `new_new` since that's
 * what an arbitrage / wholesale seller cares about.
 */
export type ListingConditionType =
	| 'new_new'
	| 'new_open_box'
	| 'new_oem'
	| 'refurbished_refurbished'
	| 'used_like_new'
	| 'used_very_good'
	| 'used_good'
	| 'used_acceptable'
	| 'collectible_like_new'
	| 'collectible_very_good'
	| 'collectible_good'
	| 'collectible_acceptable'
	| 'club_club';

class AmazonRestrictionsService {
	private readonly API_VERSION = '2021-08-01';

	private resolveMarketplaceId(marketplaceId?: string): string {
		return marketplaceId && marketplaceId.trim().length > 0
			? marketplaceId
			: amazonClient.getMarketplaceId();
	}

	/**
	 * Resolve the seller / merchant ID. Priority:
	 *   1. Explicit `sellerId` argument
	 *   2. `SP_API_SELLER_ID` environment variable
	 *
	 * Note: the SP-API `Sellers` endpoint does NOT return the merchant ID,
	 * so this can't be auto-discovered. Find your merchant token in
	 * Seller Central → Settings → Account Info → Your Merchant Token,
	 * then set `SP_API_SELLER_ID` in `.env`.
	 */
	private resolveSellerId(sellerId?: string): string {
		if (sellerId && sellerId.trim().length > 0) return sellerId;
		const fromEnv = process.env.SP_API_SELLER_ID;
		if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
		throw new Error(
			'Missing SP_API_SELLER_ID. Find your merchant token in Seller Central → Settings → Account Info, then add SP_API_SELLER_ID=<token> to .env.',
		);
	}

	/**
	 * Check listing restrictions for the given ASIN.
	 *
	 * On SP-API failure this never throws — it returns
	 * `{ canList: false, requiresApproval: false, restrictions: [], error }`
	 * so the caller can render the rest of the product detail page without
	 * blocking.
	 */
	async getRestrictions(
		asin: string,
		options: {
			sellerId?: string;
			marketplaceId?: string;
			conditionType?: ListingConditionType;
		} = {},
	): Promise<ListingRestrictionsResult> {
		const marketplaceId = this.resolveMarketplaceId(options.marketplaceId);
		const conditionType = options.conditionType ?? 'new_new';

		let sellerId: string;
		try {
			sellerId = this.resolveSellerId(options.sellerId);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				asin,
				marketplaceId,
				sellerId: '',
				conditionType,
				canList: false,
				requiresApproval: false,
				restrictions: [],
				error: message,
			};
		}

		try {
			const response = await amazonClient.get<{ restrictions?: unknown }>(
				`/listings/${this.API_VERSION}/restrictions`,
				{
					asin,
					sellerId,
					marketplaceIds: marketplaceId,
					conditionType,
				},
			);

			const restrictions = this.normalizeRestrictions(response?.restrictions);
			const reasonCodes = restrictions.flatMap((r) =>
				r.reasons.map((reason) => reason.reasonCode),
			);
			// Treat both APPROVAL_REQUIRED and NOT_ELIGIBLE as "approval
			// required" — NOT_ELIGIBLE means the seller is currently blocked
			// from listing this brand/ASIN at all (e.g. "You are not approved
			// to list this brand and we are currently not accepting
			// applications."), which the frontend should handle the same way.
			const requiresApproval =
				reasonCodes.includes('APPROVAL_REQUIRED') ||
				reasonCodes.includes('NOT_ELIGIBLE');
			const canList = restrictions.length === 0;

			return {
				asin,
				marketplaceId,
				sellerId,
				conditionType,
				canList,
				requiresApproval,
				restrictions,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				asin,
				marketplaceId,
				sellerId,
				conditionType,
				canList: false,
				requiresApproval: false,
				restrictions: [],
				error: message,
			};
		}
	}

	private normalizeRestrictions(raw: unknown): ListingRestriction[] {
		if (!Array.isArray(raw)) return [];
		return raw
			.map((entry): ListingRestriction | null => {
				if (!entry || typeof entry !== 'object') return null;
				const e = entry as Record<string, unknown>;
				const marketplaceId = typeof e.marketplaceId === 'string' ? e.marketplaceId : '';
				if (!marketplaceId) return null;
				const result: ListingRestriction = {
					marketplaceId,
					reasons: this.normalizeReasons(e.reasons),
				};
				if (typeof e.conditionType === 'string') {
					result.conditionType = e.conditionType;
				}
				return result;
			})
			.filter((entry): entry is ListingRestriction => entry !== null);
	}

	private normalizeReasons(raw: unknown): ListingRestrictionReason[] {
		if (!Array.isArray(raw)) return [];
		return raw
			.map((entry): ListingRestrictionReason | null => {
				if (!entry || typeof entry !== 'object') return null;
				const e = entry as Record<string, unknown>;
				const message = typeof e.message === 'string' ? e.message : '';
				const reasonCode = typeof e.reasonCode === 'string' ? e.reasonCode : '';
				if (!message && !reasonCode) return null;
				return {
					message,
					reasonCode,
					links: this.normalizeLinks(e.links),
				};
			})
			.filter((entry): entry is ListingRestrictionReason => entry !== null);
	}

	private normalizeLinks(raw: unknown): ListingRestrictionLink[] {
		if (!Array.isArray(raw)) return [];
		return raw
			.map((entry): ListingRestrictionLink | null => {
				if (!entry || typeof entry !== 'object') return null;
				const e = entry as Record<string, unknown>;
				const resource = typeof e.resource === 'string' ? e.resource : '';
				const verb = typeof e.verb === 'string' ? e.verb : '';
				if (!resource || !verb) return null;
				const link: ListingRestrictionLink = { resource, verb };
				if (typeof e.title === 'string') link.title = e.title;
				if (typeof e.type === 'string') link.type = e.type;
				return link;
			})
			.filter((entry): entry is ListingRestrictionLink => entry !== null);
	}
}

export default new AmazonRestrictionsService();
