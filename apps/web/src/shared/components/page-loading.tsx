import { motion } from "framer-motion";

import { Spinner } from "@/components/ui/spinner";

interface PageLoadingProps {
  label?: string;
}

function PageLoading({ label = "Loading" }: PageLoadingProps) {
  return (
    <motion.main
      animate={{ opacity: 1 }}
      className="flex min-h-svh items-center justify-center bg-background p-6"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Spinner aria-label={label} className="size-5" />
    </motion.main>
  );
}

export { PageLoading };
