import { query } from './db.service.js';

/**
 * Sessions Service
 * ----------------
 * Persistence layer for scanning sessions and the products scanned into
 * them. Every operation is scoped by `apiToken` — the bearer token used
 * by the caller — which acts as the user identifier until proper auth
 * is added.
 *
 * The server is the ONLY thing that talks to the database, so we trust
 * the `apiToken` value passed in (the auth middleware has already
 * validated it matches `process.env.API_TOKEN`).
 */

export type SessionRow = {
    id: string;
    apiToken: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    productCount: number;
};

export type SessionProductInput = {
    asin: string;
    barcode: string;
    barcodeType: string;
    title: string;
    image: string;
    rating: number;
    reviewCount: number;
    category: string;
    price: number;
    foundPrice: number;
    sellerPopularity: string;
    sellerPopularityScore: number;
    estimatedShipping: number;
    amazonFees: number;
    profitMargin: number;
    requiresApproval: boolean;
    competitionLevel: string;
    bsr: number;
    dimensions: string;
    weight: string;
    restrictions: string[];
    monthlySalesEstimate: number;
    estimatedQuantity: number;
};

export type SessionProductRow = SessionProductInput & {
    id: string;
    sessionId: string;
    createdAt: string;
};

// ── Session CRUD ─────────────────────────────────────────────────────

export async function listSessions(apiToken: string): Promise<SessionRow[]> {
    const { rows } = await query<{
        id: string;
        api_token: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        product_count: string;
    }>(
        `select s.id, s.api_token, s.title, s.created_at, s.updated_at,
                coalesce(count(p.id), 0) as product_count
         from sessions s
         left join session_products p on p.session_id = s.id
         where s.api_token = $1
         group by s.id
         order by s.updated_at desc`,
        [apiToken],
    );
    return rows.map(mapSession);
}

export async function getSession(
    apiToken: string,
    sessionId: string,
): Promise<SessionRow | null> {
    const { rows } = await query<{
        id: string;
        api_token: string;
        title: string;
        created_at: Date;
        updated_at: Date;
        product_count: string;
    }>(
        `select s.id, s.api_token, s.title, s.created_at, s.updated_at,
                coalesce(count(p.id), 0) as product_count
         from sessions s
         left join session_products p on p.session_id = s.id
         where s.api_token = $1 and s.id = $2
         group by s.id`,
        [apiToken, sessionId],
    );
    const row = rows[0];
    return row ? mapSession(row) : null;
}

export async function createSession(
    apiToken: string,
    title: string,
): Promise<SessionRow> {
    const { rows } = await query<{
        id: string;
        api_token: string;
        title: string;
        created_at: Date;
        updated_at: Date;
    }>(
        `insert into sessions (api_token, title)
         values ($1, $2)
         returning id, api_token, title, created_at, updated_at`,
        [apiToken, title],
    );
    const row = rows[0]!;
    return mapSession({ ...row, product_count: '0' });
}

export async function renameSession(
    apiToken: string,
    sessionId: string,
    title: string,
): Promise<SessionRow | null> {
    const { rows } = await query<{
        id: string;
        api_token: string;
        title: string;
        created_at: Date;
        updated_at: Date;
    }>(
        `update sessions
         set title = $3, updated_at = now()
         where api_token = $1 and id = $2
         returning id, api_token, title, created_at, updated_at`,
        [apiToken, sessionId, title],
    );
    const row = rows[0];
    return row ? mapSession({ ...row, product_count: '0' }) : null;
}

export async function deleteSession(
    apiToken: string,
    sessionId: string,
): Promise<boolean> {
    const { rowCount } = await query(
        `delete from sessions where api_token = $1 and id = $2`,
        [apiToken, sessionId],
    );
    return (rowCount ?? 0) > 0;
}

// ── Session Product CRUD ─────────────────────────────────────────────

export async function listProducts(
    apiToken: string,
    sessionId: string,
): Promise<SessionProductRow[]> {
    const { rows } = await query<ProductDbRow>(
        `select p.* from session_products p
         join sessions s on s.id = p.session_id
         where s.api_token = $1 and p.session_id = $2
         order by p.created_at desc`,
        [apiToken, sessionId],
    );
    return rows.map(mapProduct);
}

export async function getProduct(
    apiToken: string,
    sessionId: string,
    productId: string,
): Promise<SessionProductRow | null> {
    const { rows } = await query<ProductDbRow>(
        `select p.* from session_products p
         join sessions s on s.id = p.session_id
         where s.api_token = $1 and p.session_id = $2 and p.id = $3`,
        [apiToken, sessionId, productId],
    );
    const row = rows[0];
    return row ? mapProduct(row) : null;
}

export async function addProduct(
    apiToken: string,
    sessionId: string,
    input: SessionProductInput,
): Promise<SessionProductRow | null> {
    // Scope check: ensure the session belongs to this api_token before insert.
    const session = await getSession(apiToken, sessionId);
    if (!session) return null;

    const { rows } = await query<ProductDbRow>(
        `insert into session_products (
            session_id, asin, barcode, barcode_type, title, image, rating,
            review_count, category, price, found_price, seller_popularity,
            seller_popularity_score, estimated_shipping, amazon_fees,
            profit_margin, requires_approval, competition_level, bsr,
            dimensions, weight, restrictions, monthly_sales_estimate,
            estimated_quantity
         ) values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $16, $17, $18, $19, $20, $21, $22::jsonb, $23, $24
         )
         returning *`,
        [
            sessionId,
            input.asin,
            input.barcode,
            input.barcodeType,
            input.title,
            input.image,
            input.rating,
            input.reviewCount,
            input.category,
            input.price,
            input.foundPrice,
            input.sellerPopularity,
            input.sellerPopularityScore,
            input.estimatedShipping,
            input.amazonFees,
            input.profitMargin,
            input.requiresApproval,
            input.competitionLevel,
            input.bsr,
            input.dimensions,
            input.weight,
            JSON.stringify(input.restrictions ?? []),
            input.monthlySalesEstimate,
            input.estimatedQuantity,
        ],
    );

    // Bump session updated_at so the list re-sorts.
    await query(`update sessions set updated_at = now() where id = $1`, [
        sessionId,
    ]);

    const row = rows[0]!;
    return mapProduct(row);
}

export async function updateProductFoundPrice(
    apiToken: string,
    sessionId: string,
    productId: string,
    foundPrice: number,
    profitMargin: number,
): Promise<SessionProductRow | null> {
    const { rows } = await query<ProductDbRow>(
        `update session_products p
         set found_price = $4, profit_margin = $5
         from sessions s
         where p.session_id = s.id
           and s.api_token = $1
           and p.session_id = $2
           and p.id = $3
         returning p.*`,
        [apiToken, sessionId, productId, foundPrice, profitMargin],
    );
    const row = rows[0];
    if (!row) return null;
    await query(`update sessions set updated_at = now() where id = $1`, [
        sessionId,
    ]);
    return mapProduct(row);
}

export async function deleteProduct(
    apiToken: string,
    sessionId: string,
    productId: string,
): Promise<boolean> {
    const { rowCount } = await query(
        `delete from session_products p
         using sessions s
         where p.session_id = s.id
           and s.api_token = $1
           and p.session_id = $2
           and p.id = $3`,
        [apiToken, sessionId, productId],
    );
    if ((rowCount ?? 0) > 0) {
        await query(`update sessions set updated_at = now() where id = $1`, [
            sessionId,
        ]);
        return true;
    }
    return false;
}

// ── Mappers ──────────────────────────────────────────────────────────

function mapSession(row: {
    id: string;
    api_token: string;
    title: string;
    created_at: Date;
    updated_at: Date;
    product_count: string | number;
}): SessionRow {
    return {
        id: row.id,
        apiToken: row.api_token,
        title: row.title,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        productCount: Number(row.product_count) || 0,
    };
}

type ProductDbRow = {
    id: string;
    session_id: string;
    asin: string;
    barcode: string;
    barcode_type: string;
    title: string;
    image: string;
    rating: string | number;
    review_count: number;
    category: string;
    price: string | number;
    found_price: string | number;
    seller_popularity: string;
    seller_popularity_score: number;
    estimated_shipping: string | number;
    amazon_fees: string | number;
    profit_margin: string | number;
    requires_approval: boolean;
    competition_level: string;
    bsr: number;
    dimensions: string;
    weight: string;
    restrictions: unknown;
    monthly_sales_estimate: number;
    estimated_quantity: number;
    created_at: Date;
};

function mapProduct(row: ProductDbRow): SessionProductRow {
    return {
        id: row.id,
        sessionId: row.session_id,
        asin: row.asin,
        barcode: row.barcode,
        barcodeType: row.barcode_type,
        title: row.title,
        image: row.image,
        rating: Number(row.rating) || 0,
        reviewCount: row.review_count,
        category: row.category,
        price: Number(row.price) || 0,
        foundPrice: Number(row.found_price) || 0,
        sellerPopularity: row.seller_popularity,
        sellerPopularityScore: row.seller_popularity_score,
        estimatedShipping: Number(row.estimated_shipping) || 0,
        amazonFees: Number(row.amazon_fees) || 0,
        profitMargin: Number(row.profit_margin) || 0,
        requiresApproval: row.requires_approval,
        competitionLevel: row.competition_level,
        bsr: row.bsr,
        dimensions: row.dimensions,
        weight: row.weight,
        restrictions: Array.isArray(row.restrictions)
            ? (row.restrictions as string[])
            : [],
        monthlySalesEstimate: row.monthly_sales_estimate,
        estimatedQuantity: row.estimated_quantity,
        createdAt: row.created_at.toISOString(),
    };
}
