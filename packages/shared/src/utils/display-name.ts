// For styled JSX rendering (two <Text> elements)
export function getPlayerDisplayParts(player: {
  name: string;
  username?: string | null;
  displayUsername?: string | null;
}): { primary: string; secondary?: string } {
  const nickname = player.displayUsername || player.username || null;
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
