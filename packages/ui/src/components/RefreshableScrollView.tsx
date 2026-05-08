import { forwardRef, useCallback, useState } from "react";
import type { ScrollView as RNScrollView, ScrollViewProps } from "react-native";
import { RefreshControl, ScrollView } from "react-native";

export type RefreshableScrollViewProps = ScrollViewProps & {
  onRefresh?: () => Promise<unknown> | unknown;
  refreshing?: boolean;
};

export const RefreshableScrollView = forwardRef<RNScrollView, RefreshableScrollViewProps>(
  function RefreshableScrollView(
    { onRefresh, refreshing, children, ...rest }: RefreshableScrollViewProps,
    ref,
  ) {
    const [internalRefreshing, setInternalRefreshing] = useState(false);
    const isControlled = refreshing !== undefined;
    const isRefreshing = isControlled ? refreshing : internalRefreshing;

    const handleRefresh = useCallback(async () => {
      if (!onRefresh) return;
      if (!isControlled) setInternalRefreshing(true);
      try {
        await onRefresh();
      } finally {
        if (!isControlled) setInternalRefreshing(false);
      }
    }, [onRefresh, isControlled]);

    return (
      <ScrollView
        ref={ref}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          ) : undefined
        }
        {...rest}
      >
        {children}
      </ScrollView>
    );
  },
);
