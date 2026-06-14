/**
 * 36 pastel/muted colors for member avatars/badges.
 * Designed for maximum distinguishability at small sizes.
 * 3 lightness tiers × 12 hues (30° apart on the color wheel).
 * Pastel = high lightness, medium saturation — easy on the eyes,
 * with white initials text remaining legible.
 */
export const MEMBER_PALETTE = [
  // Tier 1: Muted/medium (HSL ~55% sat, ~45% lightness)
  "#c0392b", "#8e44ad", "#2980b9", "#16a085",
  "#27ae60", "#d35400", "#c2185b", "#1565c0",
  "#00897b", "#6d4c41", "#546e7a", "#f4511e",
  // Tier 2: Pastel (HSL ~50% sat, ~65% lightness)
  "#e57373", "#ba68c8", "#64b5f6", "#4db6ac",
  "#81c784", "#ffb74d", "#f06292", "#4fc3f7",
  "#80cbc4", "#a1887f", "#90a4ae", "#ff8a65",
  // Tier 3: Deep muted (HSL ~50% sat, ~35% lightness)
  "#922b21", "#6c3483", "#1a5276", "#0e6655",
  "#1e8449", "#a04000", "#880e4f", "#0d47a1",
  "#004d40", "#4e342e", "#37474f", "#bf360c",
];

/**
 * Pick a member color based on the number of existing members in the team.
 * First 12 members get maximally separated hues (tier 1).
 * Next 12 get pastel variants (tier 2), then deep muted (tier 3).
 * This ensures the first members added always look very different from each other.
 */
export function pickMemberColor(existingCount: number): string {
  return MEMBER_PALETTE[existingCount % MEMBER_PALETTE.length];
}
