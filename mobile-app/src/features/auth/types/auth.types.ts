/**
 * Auth Types
 */

export interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  token: string | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  userId: string;
}
