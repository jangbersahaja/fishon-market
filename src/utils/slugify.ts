/**
 * Generate a URL-friendly slug from text
 * Used across the application for creating slugs from names
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
