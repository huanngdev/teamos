import { motion, useReducedMotion } from "framer-motion";

function CreatedIssueHighlight({ active }: { active: boolean }) {
  const reduce = useReducedMotion();

  if (!active) {
    return null;
  }

  if (reduce === true) {
    return (
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl bg-accent/70"
      />
    );
  }

  return (
    <motion.span
      animate={{ opacity: 0 }}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-xl bg-accent/70"
      initial={{ opacity: 1 }}
      transition={{ duration: 1.6, ease: "easeOut" }}
    />
  );
}

export { CreatedIssueHighlight };
