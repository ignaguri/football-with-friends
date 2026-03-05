// For styled JSX rendering (two <Text> elements)
export function getPlayerDisplayParts(player: {
  name: string;
  username?: string | null;
  displayUsername?: string | null;
}): { primary: string; secondary?: string } {
  const rawNickname = player.displayUsername || player.username || null;
  const nickname = rawNickname && !rawNickname.includes("@") ? rawNickname : null;
  if (nickname && nickname !== player.name) return { primary: nickname, secondary: player.name };
  return { primary: player.name };
}

// For string-only contexts (Select dropdowns): "nickname (Full Name)"
export function getPlayerDisplayLabel(player: {
  name: string;
  username?: string | null;
  displayUsername?: string | null;
}): string {
  const { primary, secondary } = getPlayerDisplayParts(player);
  return secondary ? `${primary} (${secondary})` : primary;
}
