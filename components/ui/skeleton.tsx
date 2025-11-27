import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "rounded" | "circular" | "text";
  pulse?: boolean;
  shimmer?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = "default", pulse = true, shimmer = false, ...props }, ref) => {
    const baseClasses = "bg-muted";

    const variantClasses = {
      default: "rounded-md",
      rounded: "rounded-lg",
      circular: "rounded-full",
      text: "rounded-sm h-4",
    };

    const animationClasses = cn(
      pulse && "animate-pulse",
      shimmer &&
        "relative overflow-hidden after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent"
    );

    return (
      <div
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], animationClasses, className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };

