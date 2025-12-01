import * as React from "react";

import { cn } from "@/lib/utils";

interface RadioGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        role="radiogroup"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child;
          if (
            (child.type as any)?.displayName !== "RadioGroupItem"
          ) {
            return child;
          }
          const childValue = (child.props as any).value;
          return React.cloneElement(child, {
            checked: value === childValue,
            onChange: () => onValueChange?.(childValue),
          });
        })}
      </div>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

interface RadioGroupItemProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<
  HTMLInputElement,
  RadioGroupItemProps
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="radio"
    className={cn(
      "aspect-square h-4 w-4 rounded-full border border-primary text-primary " +
        "ring-offset-background focus:outline-none focus-visible:ring-2 " +
        "focus-visible:ring-ring focus-visible:ring-offset-2 " +
        "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };



