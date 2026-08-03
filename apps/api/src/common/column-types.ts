/**
 * Column-type helpers — keep the schema PostgreSQL (Neon) ready while running
 * SQLite (better-sqlite3) in dev. Flip with DATABASE_TYPE=postgres.
 */
export const DB_IS_POSTGRES = process.env.DATABASE_TYPE === 'postgres';

/** timestamptz on PG, datetime on SQLite. */
export const DATE_TIME = DB_IS_POSTGRES ? 'timestamptz' : 'datetime';

/** jsonb on PG, simple-json (text) on SQLite. */
export const JSON_COL = DB_IS_POSTGRES ? 'jsonb' : 'simple-json';

/** date on PG, date on SQLite (stored as YYYY-MM-DD). */
export const DATE_COL = 'date';
