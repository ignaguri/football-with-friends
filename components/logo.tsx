"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Logo() {
  const { resolvedTheme } = useTheme();
  const [logoSrc, setLogoSrc] = useState("/logo.png");

  useEffect(() => {
    setLogoSrc(resolvedTheme === "light" ? "/logo_light.png" : "/logo.png");
  }, [resolvedTheme]);

  return (
    <img
      src={logoSrc}
      alt="Fútbol con los pibes Logo"
      width={44}
      height={44}
      className="size-11"
      style={{ width: 44, height: 44 }}
      loading="lazy"
    />
  );
}
