/** Same rules as the desktop's "New Plugin" form. */
export function validateNewPlugin(name: string, description: string): { name?: string; description?: string } | null {
  if (!name) return { name: "Name is required" };
  if (name.length > 32) return { name: "Name must be less than 32 characters" };
  if (/[^a-zA-Z0-9_ -]/.test(name)) return { name: "Use only letters, numbers, spaces, - and _" };
  if (description.length > 100) return { description: "Description must be less than 100 characters" };
  return null;
}
