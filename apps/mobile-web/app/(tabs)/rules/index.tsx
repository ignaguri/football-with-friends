import { Container, Card, Text, YStack, XStack, H2 } from "@repo/ui";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";

export default function RulesScreen() {
  const { t } = useTranslation();

  // Get the rules arrays from translations
  const generalRules = t("rules.general", { returnObjects: true }) as string[];
  const matchRules = t("rules.match", { returnObjects: true }) as string[];

  return (
    <Container variant="padded">
      <ScrollView style={{ flex: 1 }}>
        <YStack gap="$6" paddingBottom="$6">
          {/* General Rules */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$4">
              <H2 fontSize="$6" fontWeight="bold">
                {t("rules.generalTitle")}
              </H2>

              <YStack gap="$3">
                {Array.isArray(generalRules) &&
                  generalRules.map((rule, index) => (
                    <XStack key={index} gap="$3" alignItems="flex-start">
                      <Text
                        fontSize="$5"
                        fontWeight="bold"
                        color="$blue10"
                        width={24}
                      >
                        {index + 1}.
                      </Text>
                      <Text flex={1} fontSize="$4" lineHeight="$5">
                        {rule}
                      </Text>
                    </XStack>
                  ))}
              </YStack>
            </YStack>
          </Card>

          {/* Match Rules */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$4">
              <H2 fontSize="$6" fontWeight="bold">
                {t("rules.matchTitle")}
              </H2>

              <YStack gap="$3">
                {Array.isArray(matchRules) &&
                  matchRules.map((rule, index) => (
                    <XStack key={index} gap="$3" alignItems="flex-start">
                      <Text
                        fontSize="$5"
                        fontWeight="bold"
                        color="$green10"
                        width={24}
                      >
                        {index + 1}.
                      </Text>
                      <Text flex={1} fontSize="$4" lineHeight="$5">
                        {rule}
                      </Text>
                    </XStack>
                  ))}
              </YStack>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </Container>
  );
}
