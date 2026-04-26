export declare enum BarcodeType {
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
};
export type CachedToken = {
    accessToken: string;
    expiresAt: number;
};
export type ApiErrorResponse = {
    error: string;
    message: string;
    details: string;
    timestamp: string;
};
export type AmazonCatalogResponse = {
    items: AmazonItem[];
};
export type AmazonItem = {
    asin: string;
    attributes?: AmazonAttributes;
    dimensions?: AmazonDimension[];
    identifiers?: AmazonIdentifierGroup[];
    images?: AmazonImageGroup[];
    productTypes?: {
        marketplaceId: string;
        productType: string;
    }[];
    salesRanks?: AmazonSalesRank[];
    summaries?: AmazonSummary[];
};
export type AmazonAttributes = {
    brand?: {
        value: string;
    }[];
    item_name?: {
        value: string;
    }[];
    list_price?: {
        currency: string;
        value: number;
    }[];
    externally_assigned_product_identifier?: {
        value: string;
        type: string;
    }[];
    bullet_point?: {
        value: string;
    }[];
    item_weight?: {
        unit: string;
        value: number;
    }[];
    item_dimensions?: {
        length: {
            unit: string;
            value: number;
        };
        width: {
            unit: string;
            value: number;
        };
        height: {
            unit: string;
            value: number;
        };
    }[];
    [key: string]: any;
};
export type AmazonDimension = {
    marketplaceId: string;
    item?: AmazonPhysicalDimensions;
    package?: AmazonPhysicalDimensions;
};
type AmazonPhysicalDimensions = {
    height?: {
        unit: string;
        value: number;
    };
    length?: {
        unit: string;
        value: number;
    };
    width?: {
        unit: string;
        value: number;
    };
    weight?: {
        unit: string;
        value: number;
    };
};
export type AmazonIdentifierGroup = {
    marketplaceId: string;
    identifiers: {
        identifierType: string;
        identifier: string;
    }[];
};
export type AmazonImageGroup = {
    marketplaceId: string;
    images: {
        variant: string;
        link: string;
        height: number;
        width: number;
    }[];
};
export type AmazonSalesRank = {
    marketplaceId: string;
    classificationRanks?: {
        classificationId: string;
        title: string;
        link: string;
        rank: number;
    }[];
    displayGroupRanks?: {
        websiteDisplayGroup: string;
        title: string;
        link: string;
        rank: number;
    }[];
};
export type AmazonSummary = {
    marketplaceId: string;
    itemName?: string;
    brand?: string;
    manufacturer?: string;
    browseClassification?: {
        displayName: string;
        classificationId: string;
    };
    itemClassification?: string;
    packageQuantity?: number;
    size?: string;
    style?: string;
    releaseDate?: string;
};
export {};
//# sourceMappingURL=amazon.types.d.ts.map