import type { HonoLogLayerVariables } from "@loglayer/hono";
import type { RequestIdVariables } from "hono/request-id";

import type { AuthSession } from "@/auth/models.js";

interface RuntimeBindings {
  clientIp?: string;
}

interface AppVariables extends HonoLogLayerVariables, RequestIdVariables {
  authSession: AuthSession | null;
  clientIp: string;
  requestStartedAt: number;
}

type AppEnv = {
  Bindings: RuntimeBindings;
  Variables: AppVariables;
};

export type { AppEnv, AppVariables, RuntimeBindings };
