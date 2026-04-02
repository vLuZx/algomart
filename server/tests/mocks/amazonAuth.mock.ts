import type { LWAAccessTokenResponse } from '../../src/types/amazon.types.js';

export const mockAccessToken = 'Atza|IwEBIJK1234567890abcdefghijklmnopqrstuvwxyz';

export const mockLWAResponse: LWAAccessTokenResponse = {
  access_token: mockAccessToken,
  token_type: 'bearer',
  expires_in: 3600,
};

export class MockAmazonAuthService {
  async getAccessToken(): Promise<string> {
    return mockAccessToken;
  }

  clearTokenCache(): void {
    // Mock implementation
  }
}
