import { XStack, YStack, Text, type YStackProps } from "tamagui";

export interface ListItemProps {
  children: React.ReactNode;
}

export interface ListProps extends YStackProps {
  children: React.ReactNode;
  ordered?: boolean;
  start?: number;
  bulletColor?: string;
  fontSize?: string | number;
  gap?: string | number;
}

function ListItem({ children }: ListItemProps) {
  return <>{children}</>;
}

export function List({
  children,
  ordered = false,
  start = 1,
  bulletColor,
  fontSize = "$4",
  gap = "$3",
  ...props
}: ListProps) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <YStack gap={gap} {...props}>
      {items.map((item, index) => {
        if (!item) return null;

        const content = typeof item === "object" && "props" in item ? item.props.children : item;

        return (
          <XStack key={index} gap="$3" alignItems="flex-start">
            {ordered ? (
              <Text
                fontSize={fontSize}
                fontWeight="bold"
                color={bulletColor}
                width={24}
                flexShrink={0}
              >
                {start + index}.
              </Text>
            ) : (
              <Text
                fontSize={fontSize}
                color={bulletColor || "$gray11"}
                width={16}
                flexShrink={0}
                lineHeight={fontSize}
              >
                •
              </Text>
            )}
            <Text flex={1} fontSize={fontSize} lineHeight="$5">
              {content}
            </Text>
          </XStack>
        );
      })}
    </YStack>
  );
}

List.Item = ListItem;

export { ListItem };
