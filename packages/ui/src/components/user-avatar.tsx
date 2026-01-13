import { Avatar, AvatarFallback, AvatarImage } from "tamagui";
import { Text, View } from "tamagui";

export interface UserAvatarProps {
  name?: string | null;
  username?: string | null;
  displayUsername?: string | null;
  image?: string | null;
  profilePicture?: string | null;
  size?: number;
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
}: UserAvatarProps) {
  // Priority: profilePicture > image (from OAuth)
  const avatarUrl = profilePicture || image;
  // Display name priority: displayUsername > username > name
  const displayName = displayUsername || username || name;
  const initials = getInitials(displayName);

  return (
    <Avatar circular size={size}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} />
      ) : (
        <AvatarFallback
          backgroundColor="$blue9"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="$white1" fontWeight="bold" fontSize={size / 2.5}>
            {initials}
          </Text>
        </AvatarFallback>
      )}
    </Avatar>
  );
}
