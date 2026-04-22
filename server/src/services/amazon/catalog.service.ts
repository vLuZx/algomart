import amazonClient from './client.service.js';
import type {
	BarcodeType,
	CatalogSearchResponse,
} from '../../types/amazon.types.js';
import { inferBarcodeType,  isValidBarcode } from '../../utils/barcode.utils.js';

/**
 * Amazon Catalog Items API Service
 * Handles product lookup by UPC, EAN, or ASIN
 */
class AmazonCatalogService {
	private readonly API_VERSION = '2022-04-01';
	private readonly SEARCH_INCLUDED_DATA = 'identifiers,summaries,productTypes,salesRanks,dimensions,images,attributes';

	private createHttpError(message: string, statusCode: number, name = 'AmazonCatalogError'): Error {
		const error = new Error(message) as Error & { statusCode?: number };
		error.name = name;
		error.statusCode = statusCode;
		return error;
	}

	/**
	 * Search catalog items by barcode
	 */
	async searchCatalogItemsByBarcode(barcode: string): Promise<CatalogSearchResponse> {

		// Trim the barcode
		const cleanBarcode = barcode.trim();

		// Check is the barcode is considered valid
		if (!isValidBarcode(cleanBarcode)) {
			throw this.createHttpError('Invalid barcode input. Barcode must be 12 digits (UPC) or 13 digits (EAN).', 400, 'InvalidBarcodeError');
		}

		// Prepare to make request
		const resolvedIdentifierType: BarcodeType = inferBarcodeType(barcode)
		const marketplaceId = amazonClient.getMarketplaceId();

		// Attempt to make a request to the SP-API for the item with the barcode
		try {
			return await amazonClient.get<CatalogSearchResponse>(`/catalog/${this.API_VERSION}/items`, {
				identifiers: cleanBarcode,
				identifiersType: resolvedIdentifierType,
				marketplaceIds: marketplaceId,
				includedData: this.SEARCH_INCLUDED_DATA,
			});
		} 
		// Error Case: Bad response
		catch (error) {
			throw this.createHttpError(`
				Error: ${error}, 
				Message: Failed to search catalog for ${resolvedIdentifierType} ${cleanBarcode}`, 500, 'AmazonCatalogSearchError'
			);
		}
	}

	public getASIN(catalogSearchResponse: CatalogSearchResponse): string  {
		if (catalogSearchResponse.numberOfResults > 1) {
			throw this.createHttpError("Message: too many items mapped to same identifier.", 500, 'TooManyResultsInCatalogSearchResponse');
		}
		if (catalogSearchResponse.numberOfResults === 0 || !catalogSearchResponse.items[0]) {
			throw this.createHttpError("Message: no product found.", 500, 'NoResultInCatalogSearchResponse');
		}
		return catalogSearchResponse.items[0].asin;
	}

}

export default new AmazonCatalogService();
