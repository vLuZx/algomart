export enum BarcodeType {
    UPC = "UPC",
    EAN = "EAN",
    GTIN = "GTIN",
    UNKNOWN = "UNKNOWN"
}

export type LWAAccessTokenResponse = {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
}

export type CachedToken = {
    accessToken: string;
    expiresAt: number;
}

export type ApiErrorResponse = {
    error: string;
    message: string;
    details: string;
    timestamp: string;
}

// @section Catalog Items

export type CatalogSearchResponse = {
	numberOfResults: number;
	items: CatalogItem[];
};

export type CatalogItem = {
	asin: string;
	identifiers: CatalogItemIdentifierGroup[];
	productTypes?: CatalogItemProductType[];
	summaries?: CatalogItemSummary[];
};

export type CatalogItemIdentifierGroup = {
	marketplaceId: string;
	identifiers: CatalogIdentifier[];
};

export type CatalogIdentifier = {
	identifierType: BarcodeType;
	identifier: string;
};

export type CatalogItemProductType = {
	marketplaceId: string;
	productType: string;
};

export type CatalogItemSummary = {
	marketplaceId: string;

	adultProduct?: boolean;
	autographed?: boolean;
	brand?: string;

	browseClassification?: {
		displayName: string;
		classificationId: string;
	};

	itemClassification?: string;
	itemName?: string;
	manufacturer?: string;
	memorabilia?: boolean;
	packageQuantity?: number;
	size?: string;
	tradeInEligible?: boolean;
	websiteDisplayGroup?: string;
	websiteDisplayGroupName?: string;
};
