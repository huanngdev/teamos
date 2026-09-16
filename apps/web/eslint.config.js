import pluginQuery from "@tanstack/eslint-plugin-query";
import { web } from "@teamos/eslint-config";

export default [...web, ...pluginQuery.configs["flat/recommended"]];
