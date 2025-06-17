import { useEffect, useState } from "react";

export const Logo = () => {
  const [logoSrc, setLogoSrc] = useState("/logo.png");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLight = window.matchMedia(
        "(prefers-color-scheme: light)",
      ).matches;
      setLogoSrc(isLight ? "/logo_light.png" : "/logo.png");
    }
  }, []);

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
};
