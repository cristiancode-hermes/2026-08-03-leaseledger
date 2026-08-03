/**
 * Money transformer — Postgres `numeric` returns strings; convert to number
 * on read and back on write. Applies to every money column.
 */
export const moneyTransformer = {
  to: (v: number): number => v,
  from: (v: string | number): number =>
    typeof v === 'string' ? parseFloat(v) : Number(v),
};
