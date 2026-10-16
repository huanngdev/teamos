import { createMiddleware } from "hono/factory";

import type { AppEnv } from "@/types.js";

const clientIp = createMiddleware<AppEnv>(async (context, next) => {
  context.set("clientIp", context.env?.clientIp ?? "unknown");
  await next();
});

/*
 * Behind a reverse proxy every socket address is the proxy itself, so IP rate
 * limits would collapse into one shared bucket. When the proxy is trusted, the
 * rightmost `X-Forwarded-For` entry is the address that proxy observed; entries
 * to its left come from the client and can be forged. Never enable this when the
 * API port is reachable without the proxy.
 */
function resolveClientIp(
  request: Request,
  socketAddress: string | undefined,
  trustProxy: boolean,
): string | undefined {
  if (!trustProxy) {
    return socketAddress;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const proxyObservedAddress = forwardedFor?.split(",").at(-1)?.trim();

  return proxyObservedAddress === undefined || proxyObservedAddress === ""
    ? socketAddress
    : proxyObservedAddress;
}

export { clientIp, resolveClientIp };
