// A curated palette of accessible, high-contrast colors suitable for
// collaborator cursors and avatars against both light and dark backgrounds.
const COLLABORATION_PALETTE = [
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#f59e0b', // Amber 500
  '#84cc16', // Lime 500
  '#10b981', // Emerald 500
  '#06b6d4', // Cyan 500
  '#3b82f6', // Blue 500
  '#6366f1', // Indigo 500
  '#8b5cf6', // Violet 500
  '#d946ef', // Fuchsia 500
  '#ec4899', // Pink 500
  '#f43f5e', // Rose 500
];

/**
 * Deterministically generates a stable color from a user's ID or name.
 * Uses a simple DJB2 hash algorithm.
 */
export function stringToColor(str: string): string {
  if (!str) return COLLABORATION_PALETTE[0];
  
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
  }
  
  // Convert to a positive index
  const index = Math.abs(hash) % COLLABORATION_PALETTE.length;
  return COLLABORATION_PALETTE[index];
}
