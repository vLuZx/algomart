import axios, {} from 'axios';
import aws4 from 'aws4';
import amazonAuthService from './amazon-auth.service.js';
/**
 * Amazon SP-API HTTP Client
 * Handles AWS SigV4 signing and authentication
 */
class AmazonClientService {
    axiosInstance;
    endpoint;
    region;
    marketplaceId;
    constructor() {
        this.endpoint = process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com';
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.marketplaceId = process.env.SP_API_MARKETPLACE_ID || 'ATVPDKIKX0DER';
        this.axiosInstance = axios.create({
            baseURL: this.endpoint,
            timeout: 30000,
        });
    }
    /**
     * Make a signed request to Amazon SP-API
     */
    async request(config) {
        // Get access token
        const accessToken = await amazonAuthService.getAccessToken();
        // Prepare request for signing
        const url = new URL(config.url || '', this.endpoint);
        const path = url.pathname + url.search;
        const requestBody = config.data ? JSON.stringify(config.data) : '';
        const requestToSign = {
            host: url.host,
            path,
            method: config.method?.toUpperCase() || 'GET',
            headers: {
                'x-amz-access-token': accessToken,
                'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
                'Content-Type': 'application/json',
                ...(config.headers || {}),
            },
            body: requestBody,
            service: 'execute-api',
            region: this.region,
        };
        // Sign the request with AWS SigV4
        const credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        };
        const signedRequest = aws4.sign(requestToSign, credentials);
        // Make the request
        try {
            const response = await this.axiosInstance.request({
                ...config,
                headers: signedRequest.headers,
            });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                console.error('Amazon SP-API Error:', {
                    status: error.response.status,
                    data: error.response.data,
                    url: config.url,
                });
                throw new Error(error.response.data?.errors?.[0]?.message ||
                    error.response.data?.message ||
                    'Amazon SP-API request failed');
            }
            throw error;
        }
    }
    /**
     * GET request
     */
    async get(url, params) {
        return this.request({
            method: 'GET',
            url,
            params,
        });
    }
    /**
     * POST request
     */
    async post(url, data) {
        return this.request({
            method: 'POST',
            url,
            data,
        });
    }
    /**
     * Get the configured marketplace ID
     */
    getMarketplaceId() {
        return this.marketplaceId;
    }
}
export default new AmazonClientService();
//# sourceMappingURL=amazon-client.service.js.map