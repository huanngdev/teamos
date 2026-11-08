import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";

import { ThemeProvider } from "@/shared/components/theme-provider";

interface RenderWithProvidersOptions {
  queryClient?: QueryClient;
  route?: string;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

/*
 * For tests that bring their own data router (RouterProvider). Wrapping those
 * in MemoryRouter would install a second, unused history.
 */
function renderWithAppProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  return {
    queryClient,
    ...render(
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ThemeProvider>,
    ),
  };
}

function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  return renderWithAppProviders(
    <MemoryRouter initialEntries={[options.route ?? "/"]}>{ui}</MemoryRouter>,
    options,
  );
}

export { createTestQueryClient, renderWithAppProviders, renderWithProviders };
