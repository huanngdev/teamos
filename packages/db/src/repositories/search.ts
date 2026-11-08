import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/*
 * Literal, case-insensitive substring matching instead of `LIKE`. It needs no
 * wildcard escaping, so a search such as "50%" can never be reinterpreted as a
 * pattern that matches every row. Callers must still pass the term as a bound
 * parameter, which the template tag guarantees.
 */
function buildLiteralSearchCondition(
  columns: readonly PgColumn[],
  search: string | undefined,
): SQL | undefined {
  if (search === undefined || search.length === 0 || columns.length === 0) {
    return undefined;
  }

  const needle = search.toLowerCase();
  const matches = columns.map((column) => sql`position(${needle} in lower(${column})) > 0`);

  if (matches.length === 1) {
    return matches[0];
  }

  return sql`(${sql.join(matches, sql` or `)})`;
}

export { buildLiteralSearchCondition };
