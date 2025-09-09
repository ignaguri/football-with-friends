"use client";

import { toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";
import * as React from "react";

import type {
  ToggleGroupSingleProps,
  ToggleGroupMultipleProps,
  ToggleGroupItemProps as RadixToggleGroupItemProps,
} from "@radix-ui/react-toggle-group";

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
  size: "default",
  variant: "default",
});

export type ToggleGroupProps =
  | (ToggleGroupSingleProps &
      VariantProps<typeof toggleVariants> & { children?: React.ReactNode })
  | (ToggleGroupMultipleProps &
      VariantProps<typeof toggleVariants> & { children?: React.ReactNode });

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  ToggleGroupProps & React.HTMLAttributes<HTMLDivElement>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

export interface ToggleGroupItemProps
  extends RadixToggleGroupItemProps,
    VariantProps<typeof toggleVariants> {
  children?: React.ReactNode;
}

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  ToggleGroupItemProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, variant, size, ...props }, ref) => {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
