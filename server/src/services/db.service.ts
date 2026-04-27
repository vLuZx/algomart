import pg from 'pg';

/**
 * Lazily-initialized shared Postgres pool.
 *
 * Connects via `DATABASE_URL` from the environment. Uses TLS with
 * `rejectUnauthorized: false` so it works against managed providers
 * like Supabase / Neon / Railway without bundling a CA cert.
 *
 * The mobile app NEVER connects to the database directly — only this
 * server does, and every route that talks to the DB is protected by
 * the `requireBearerToken` middleware.
 */

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
    if (pool) return pool;

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is not configured. Set it in .env.');
    }

    pool = new pg.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30_000,
    });

    pool.on('error', (err) => {
        // Don't crash the process — just log; pg will reconnect on next acquire.
        // eslint-disable-next-line no-console
        console.error('[db] idle client error:', err);
    });

    return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: ReadonlyArray<unknown>,
): Promise<pg.QueryResult<T>> {
    return getPool().query<T>(text, params as unknown[] | undefined);
}
