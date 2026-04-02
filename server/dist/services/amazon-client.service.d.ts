import { type AxiosRequestConfig } from 'axios';
/**
 * Amazon SP-API HTTP Client
 * Handles AWS SigV4 signing and authentication
 */
declare class AmazonClientService {
    private axiosInstance;
    private endpoint;
    private region;
    private marketplaceId;
    constructor();
    /**
     * Make a signed request to Amazon SP-API
     */
    request<T>(config: AxiosRequestConfig): Promise<T>;
    /**
     * GET request
     */
    get<T>(url: string, params?: any): Promise<T>;
    /**
     * POST request
     */
    post<T>(url: string, data?: any): Promise<T>;
    /**
     * Get the configured marketplace ID
     */
    getMarketplaceId(): string;
}
declare const _default: AmazonClientService;
export default _default;
//# sourceMappingURL=amazon-client.service.d.ts.map