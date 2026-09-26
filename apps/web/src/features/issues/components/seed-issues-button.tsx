import { PlantIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { useSeedIssues } from "../hooks/use-seed-issues";

function SeedIssuesButton() {
  const seed = useSeedIssues();

  if (!seed.visible) {
    return null;
  }

  return (
    <Button disabled={seed.isPending} onClick={seed.onSeed} variant="outline">
      <PlantIcon data-icon="inline-start" />
      {seed.isPending ? "Seeding…" : "Seed issues"}
    </Button>
  );
}

export { SeedIssuesButton };
