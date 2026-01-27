import { Text, XStack, YStack } from "tamagui";

export interface StatItem {
  label: string;
  value: number | string;
  color?: string;
}

export interface StatsSummaryProps {
  stats: StatItem[];
}

export function StatsSummary({ stats }: StatsSummaryProps) {
  return (
    <XStack flexWrap="wrap" gap="$3" justifyContent="space-around">
      {stats.map((stat, index) => (
        <YStack
          key={index}
          alignItems="center"
          padding="$3"
          borderRadius="$3"
          backgroundColor="$gray3"
          minWidth={80}
          flex={1}
        >
          <Text
            fontSize="$7"
            fontWeight="700"
            color={stat.color || "$color"}
          >
            {stat.value}
          </Text>
          <Text fontSize="$2" color="$gray11" textAlign="center">
            {stat.label}
          </Text>
        </YStack>
      ))}
    </XStack>
  );
}
