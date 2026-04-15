import { jest } from '@jest/globals';
import type { Request, Response } from 'express';

export type MockResponse = Response & {
  status: ReturnType<typeof jest.fn>;
  json: ReturnType<typeof jest.fn>;
};

export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    ...overrides,
  } as Request;
}

export function createMockResponse(): MockResponse {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);

  return response;
}