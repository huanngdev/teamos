import type { ComponentProps, CSSProperties } from "react";

import { useActiveTheme } from "@/hooks/use-active-theme";
import { cn } from "@/lib/utils";

type LogoVariant = "icon" | "wordmark";

interface LogoStyle extends CSSProperties {
  "--logo-size"?: string;
}

interface LogoProps extends Omit<ComponentProps<"span">, "children" | "style"> {
  alt?: string;
  size?: number | string;
  style?: LogoStyle;
  variant?: LogoVariant;
}

function Logo({
  alt = "TeamOS",
  className,
  size = "2.25rem",
  style,
  variant = "icon",
  ...props
}: LogoProps) {
  const activeTheme = useActiveTheme();
  const source = activeTheme === "dark" ? "/logo-dark.svg" : "/logo-light.svg";
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      className={cn(
        "inline-flex h-(--logo-size) shrink-0 items-center",
        variant === "icon" ? "w-(--logo-size)" : "gap-2",
        className,
      )}
      data-slot="logo"
      style={{ "--logo-size": dimension, ...style }}
      {...props}
    >
      <img
        alt={variant === "icon" ? alt : ""}
        aria-hidden={variant === "wordmark" ? true : undefined}
        className="aspect-square h-full shrink-0 rounded-full"
        data-slot="logo-icon"
        src={source}
      />
      {variant === "wordmark" ? (
        <span
          className="logo-wordmark font-heading leading-none font-semibold whitespace-nowrap"
          data-slot="logo-wordmark"
        >
          TeamOS
        </span>
      ) : null}
    </span>
  );
}

export { Logo, type LogoProps, type LogoVariant };
