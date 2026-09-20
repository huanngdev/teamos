/*
 * Uppercases the first character while leaving the rest of the string intact.
 * Domain values such as organization roles are stored lowercase, so this turns
 * `admin` into `Admin` for display without changing stored data.
 */
function capitalize(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export { capitalize };
