import { Container, Card, Text, YStack, XStack, H2, List } from "@repo/ui";
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

              <List ordered bulletColor="$blue10">
                {Array.isArray(generalRules) &&
                  generalRules.map((rule, index) => (
                    <List.Item key={index}>{rule}</List.Item>
                  ))}
              </List>
            </YStack>
          </Card>

          {/* Match Rules */}
          <Card variant="elevated">
            <YStack padding="$4" gap="$4">
              <H2 fontSize="$6" fontWeight="bold">
                {t("rules.matchTitle")}
              </H2>

              <List ordered bulletColor="$green10">
                {Array.isArray(matchRules) &&
                  matchRules.map((rule, index) => (
                    <List.Item key={index}>{rule}</List.Item>
                  ))}
              </List>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </Container>
  );
}
