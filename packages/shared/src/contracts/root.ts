import { z } from "zod";

const rootResponseSchema = z.object({
  name: z.literal("TeamOS API"),
  status: z.literal("ok"),
});

type RootResponse = z.infer<typeof rootResponseSchema>;

export { rootResponseSchema, type RootResponse };
