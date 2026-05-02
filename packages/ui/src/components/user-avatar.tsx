import { Avatar, AvatarFallback, AvatarImage } from "tamagui";
import { Text, View } from "tamagui";
import { getCountryFlag } from "../utils/country-flags";

export interface UserAvatarProps {
  name?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  profilePicture?: string | null;
  size?: number;
  /** ISO 3166-1 alpha-2 country code — renders a flag badge on the avatar */
  countryCode?: string | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({
  name,
  username,
  displayUsername,
  image,
  profilePicture,
  size = 48,
  countryCode,
}: UserAvatarProps) {
  // Priority: profilePicture > image (from OAuth)
  const avatarUrl = profilePicture || image;
  // Display name priority: displayUsername > username > name
  const displayName = displayUsername || username || name;
  const initials = getInitials(displayName);
  const flag = countryCode ? getCountryFlag(countryCode) : null;
  const badgeSize = Math.max(size * 0.4, 16);

  return (
    <View position="relative" width={size} height={size}>
      <Avatar circular size={size}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} />
        ) : (
          <AvatarFallback backgroundColor="$blue9" alignItems="center" justifyContent="center">
            <Text color="white" fontWeight="bold" fontSize={size / 2.5}>
              {initials}
            </Text>
          </AvatarFallback>
        )}
      </Avatar>
      {flag ? (
        <View
          position="absolute"
          bottom={-2}
          right={-2}
          width={badgeSize}
          height={badgeSize}
          borderRadius={badgeSize / 2}
          backgroundColor="$background"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={badgeSize * 0.7} lineHeight={badgeSize}>
            {flag}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
