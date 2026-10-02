import { openSeedContext } from "./context.js";
import { seedIssues } from "./issues.js";

const seeds = [seedIssues];

const context = await openSeedContext();

try {
  for (const seed of seeds) {
    await seed(context);
  }
} finally {
  await context.close();
}
