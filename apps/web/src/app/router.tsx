import { createBrowserRouter } from "react-router";

import { routes } from "./routes";

function createAppRouter() {
  return createBrowserRouter(routes);
}

export { createAppRouter };
