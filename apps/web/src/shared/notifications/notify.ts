import { toast } from "sonner";

/*
 * Thin wrapper over the sonner client so every feature reports results through
 * the same channel and tone. Feature hooks keep ownership of the copy; this
 * module only standardizes how it is presented.
 */
const notify = {
  error(message: string): void {
    toast.error(message);
  },
  success(message: string): void {
    toast.success(message);
  },
};

export { notify };
