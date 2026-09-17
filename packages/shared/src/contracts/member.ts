import { z } from "zod";

import { searchQuerySchema, searchTermSchema } from "../utilities/search.js";
import { organizationMemberSchema } from "./organization.js";

const MEMBER_LIST_DEFAULT_LIMIT = 25;
const MEMBER_LIST_MAX_LIMIT = 100;

const memberListQuerySchema = searchQuerySchema.extend({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MEMBER_LIST_MAX_LIMIT)
    .default(MEMBER_LIST_DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

const memberListResponseSchema = z.object({
  members: z.array(organizationMemberSchema),
  pagination: z.object({
    limit: z.number().int().min(1),
    offset: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"]),
});

type MemberListQuery = z.infer<typeof memberListQuerySchema>;
type MemberListResponse = z.infer<typeof memberListResponseSchema>;
type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleSchema>;

export {
  MEMBER_LIST_DEFAULT_LIMIT,
  MEMBER_LIST_MAX_LIMIT,
  memberListQuerySchema,
  memberListResponseSchema,
  organizationMemberSchema,
  searchTermSchema,
  updateMemberRoleSchema,
  type MemberListQuery,
  type MemberListResponse,
  type UpdateMemberRoleRequest,
};
