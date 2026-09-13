import type { HonoLogLayerVariables } from "@loglayer/hono";
import type { RequestIdVariables } from "hono/request-id";

interface RuntimeBindings {
  clientIp?: string;
}

interface AppVariables extends HonoLogLayerVariables, RequestIdVariables {
  clientIp: string;
  requestStartedAt: number;
}

type AppEnv = {
  Bindings: RuntimeBindings;
  Variables: AppVariables;
};

export type { AppEnv, AppVariables, RuntimeBindings };
