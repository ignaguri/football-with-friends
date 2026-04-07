// @ts-nocheck - Tamagui type recursion workaround
import { Component, ReactNode } from "react";
import * as Sentry from "@sentry/react-native";
import { Container, Card, Text, YStack, Button } from "@repo/ui";
import { AlertTriangle } from "@tamagui/lucide-icons";
import i18next from "i18next";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: info.componentStack },
      },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      const t = (key: string) => i18next.t(key);

      return (
        <Container variant="padded">
          <YStack
            flex={1}
            justifyContent="center"
            alignItems="center"
            gap="$4"
          >
            <YStack
              width={64}
              height={64}
              borderRadius={32}
              backgroundColor="$red4"
              alignItems="center"
              justifyContent="center"
            >
              <AlertTriangle size={32} color="$red10" />
            </YStack>

            <YStack alignItems="center" gap="$2">
              <Text fontSize="$6" fontWeight="bold" textAlign="center">
                {t("shared.errorOccurred")}
              </Text>
              <Text
                fontSize="$4"
                color="$gray11"
                textAlign="center"
                maxWidth={300}
              >
                {t("shared.errorBoundaryMessage")}
              </Text>
            </YStack>

            <Button variant="primary" onPress={this.handleRetry}>
              {t("shared.tryAgain")}
            </Button>
          </YStack>
        </Container>
      );
    }

    return this.props.children;
  }
}
