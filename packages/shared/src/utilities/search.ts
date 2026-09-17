import { z } from "zod";

const SEARCH_TERM_MAX_LENGTH = 100;

/*
 * One shared shape for every search box. It is trimmed and length-bounded so an
 * unbounded pattern never reaches a database query, and the value is always
 * parameterized rather than interpolated into SQL.
 */
const searchTermSchema = z.string().trim().max(SEARCH_TERM_MAX_LENGTH);

const searchQuerySchema = z.object({
  search: searchTermSchema.optional(),
});

export { SEARCH_TERM_MAX_LENGTH, searchQuerySchema, searchTermSchema };
