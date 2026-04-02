/**
 * Amazon LWA (Login with Amazon) Authentication Service
 * Handles OAuth token retrieval and caching for SP-API
 */
declare class AmazonAuthService {
    private tokenCache;
    private readonly LWA_ENDPOINT;
    /**
     * Get a valid access token, refreshing if necessary
     */
    getAccessToken(): Promise<string>;
    /**
     * Request a new access token from LWA
     */
    private refreshAccessToken;
    /**
     * Clear the cached token (useful for testing or forcing refresh)
     */
    clearTokenCache(): void;
}
declare const _default: AmazonAuthService;
export default _default;
//# sourceMappingURL=amazon-auth.service.d.ts.map