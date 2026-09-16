import { useState } from "react";
import { useNavigate } from "react-router";
import { slugify } from "@teamos/shared";

import { authClient } from "@/lib/auth-client";

const MAX_SLUG_ATTEMPTS = 5;
const FALLBACK_SLUG = "workspace";

function createSlugSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}

function useCreateWorkspace() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submitWorkspace = async (name: string): Promise<void> => {
    setErrorMessage(null);
    setIsPending(true);

    try {
      const baseSlug = slugify(name) || FALLBACK_SLUG;
      let slug = baseSlug;

      for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
        const availability = await authClient.organization.checkSlug({ slug });

        if (availability.error) {
          setErrorMessage(availability.error.message ?? "The workspace address is unavailable.");
          return;
        }

        if (availability.data?.status === true) {
          break;
        }

        slug = `${baseSlug}-${createSlugSuffix()}`;
      }

      const { data, error } = await authClient.organization.create({ name: name.trim(), slug });

      if (error || data === null) {
        setErrorMessage(error?.message ?? "The workspace could not be created.");
        return;
      }

      navigate(`/${data.slug}`, { replace: true });
    } catch {
      setErrorMessage("The workspace could not be created.");
    } finally {
      setIsPending(false);
    }
  };

  return { errorMessage, isPending, submitWorkspace };
}

export { useCreateWorkspace };
