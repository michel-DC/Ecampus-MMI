export type TdGroupValue = 'A' | 'B';

/**
 * Maps a practical group name (A1/A2/B1/B2 or labels containing them)
 * to a TD group bucket used for SAE targeting.
 */
export function deriveTdGroupFromGroupName(
  groupName: string | null | undefined,
): TdGroupValue | null {
  if (!groupName) return null;

  const normalized = groupName.trim().toUpperCase();

  if (/\bA[12]\b/.test(normalized)) return 'A';
  if (/\bB[12]\b/.test(normalized)) return 'B';

  return null;
}
