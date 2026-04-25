import { afterEach, jest } from '@jest/globals';

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});