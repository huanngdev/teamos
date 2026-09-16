import { useQuery } from "@tanstack/react-query";
import type { SocialProvider } from "@teamos/shared";

import { getSocialProviders } from "@/lib/authentication-api";

const SOCIAL_PROVIDERS_QUERY_KEY = ["authentication", "providers"] as const;

function useSocialProviders() {
  const query = useQuery({
    queryFn: getSocialProviders,
    queryKey: SOCIAL_PROVIDERS_QUERY_KEY,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const providers: SocialProvider[] = (query.data ?? []).filter((provider) => provider.enabled);

  return {
    errorMessage: query.isError ? "Sign-in options could not be loaded." : null,
    isPending: query.isPending,
    providers,
    retry: () => {
      void query.refetch();
    },
  };
}

export { useSocialProviders };
