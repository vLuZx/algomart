/**
 * Session types.
 *
 * A session is a named group of scanned products.
 */

export interface Session {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}
