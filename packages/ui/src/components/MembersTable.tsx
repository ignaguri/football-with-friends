import { YStack, Text, XStack } from "tamagui";
import {
  RosterRow,
  RosterRowActions,
  RosterSection,
  renderWithSeparators,
  type RosterAction,
} from "./roster";

export type MemberRole = "owner" | "organizer" | "member";

export interface MemberRow {
  id: string; // row id (group_members.id)
  userId: string;
  role: MemberRole; // "owner" is synthetic: derive from groups.ownerUserId before constructing rows
  name: string | null;
  email: string | null;
  phoneNumber: string | null;
  username?: string | null;
  displayUsername?: string | null;
  isCurrentUser?: boolean;
  actions?: RosterAction[]; // icon-only action buttons (kick, promote, demote, transfer)
  testID?: string;
}

export interface MembersTableProps {
  members: MemberRow[];
  emptyMessage?: string;
  // i18n'd labels for the three role badges.
  roleLabels?: Record<MemberRole, string>;
  // Optional section headers. Omit a key to render that section without a header.
  sectionLabels?: Partial<Record<MemberRole, string>>;
  // Optional "(You)" suffix in i18n. Rendered after the primary name when `isCurrentUser`.
  youLabel?: string;
}

// Strip the internal `phone_<number>@football.local` synthetic email (created
// by the phone-auth sign-up flow) — showing it would be worse than showing
// nothing, since the underlying phone is already the row's secondary.
function displayEmail(email: string | null): string | null {
  if (!email) return null;
  if (email.startsWith("phone_") && email.endsWith("@football.local")) return null;
  return email;
}

function displayNameOf(member: MemberRow): string {
  return member.displayUsername || member.username || member.name || member.userId;
}

function secondaryOf(member: MemberRow): string | null {
  if (member.phoneNumber) return member.phoneNumber;
  const email = displayEmail(member.email);
  if (email) return email;
  return null;
}

function compareByDisplayName(a: MemberRow, b: MemberRow): number {
  return displayNameOf(a).localeCompare(displayNameOf(b));
}

function MemberRoleBadge({ role, label }: { role: MemberRole; label: string }) {
  const tone =
    role === "owner"
      ? { bg: "$yellow3", fg: "$yellow11" }
      : role === "organizer"
        ? { bg: "$blue3", fg: "$blue11" }
        : { bg: "$gray3", fg: "$gray11" };
  return (
    <XStack paddingHorizontal="$2" paddingVertical="$1" borderRadius="$4" backgroundColor={tone.bg}>
      <Text fontSize="$1" fontWeight="600" color={tone.fg}>
        {label}
      </Text>
    </XStack>
  );
}

export function MembersTable({
  members,
  emptyMessage = "No members yet",
  roleLabels = { owner: "Owner", organizer: "Organizer", member: "Member" },
  sectionLabels,
  youLabel = "You",
}: MembersTableProps) {
  if (members.length === 0) {
    return (
      <Text color="$gray11" textAlign="center" padding="$4">
        {emptyMessage}
      </Text>
    );
  }

  // Split by role. Owner is first (only one), then organizers, then members —
  // alphabetical within each group so the list is scannable.
  const owner = members.find((m) => m.role === "owner");
  const organizers = members
    .filter((m) => m.role === "organizer")
    .slice()
    .sort(compareByDisplayName);
  const regularMembers = members
    .filter((m) => m.role === "member")
    .slice()
    .sort(compareByDisplayName);

  const renderMemberRow = (member: MemberRow) => {
    const primaryName = displayNameOf(member);
    const secondary = secondaryOf(member);
    const actions = member.actions && member.actions.length > 0 ? member.actions : undefined;

    return (
      <RosterRow
        key={member.id}
        testID={member.testID}
        primary={
          <Text fontWeight={member.isCurrentUser ? "600" : "500"}>
            {primaryName}
            {member.isCurrentUser ? (
              <Text fontSize="$2" color="$gray10" fontWeight="400">
                {"  "}• {youLabel}
              </Text>
            ) : null}
          </Text>
        }
        secondary={
          secondary ? (
            <Text fontSize="$2" color="$gray10">
              {secondary}
            </Text>
          ) : undefined
        }
        trailing={
          <>
            <MemberRoleBadge role={member.role} label={roleLabels[member.role]} />
            {actions ? (
              <>
                <YStack height={4} />
                <RosterRowActions actions={actions} />
              </>
            ) : null}
          </>
        }
        highlighted={member.isCurrentUser}
      />
    );
  };

  return (
    <YStack>
      {owner && (
        <RosterSection label={sectionLabels?.owner}>{renderMemberRow(owner)}</RosterSection>
      )}
      {organizers.length > 0 && (
        <RosterSection label={sectionLabels?.organizer} showSeparatorBefore={!!owner}>
          {renderWithSeparators(organizers, renderMemberRow)}
        </RosterSection>
      )}
      {regularMembers.length > 0 && (
        <RosterSection
          label={sectionLabels?.member}
          showSeparatorBefore={!!owner || organizers.length > 0}
        >
          {renderWithSeparators(regularMembers, renderMemberRow)}
        </RosterSection>
      )}
    </YStack>
  );
}
