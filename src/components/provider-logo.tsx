"use client";

const LOGO_DEV_TOKEN = "pk_GpeN_oVDRCiRDaxDuDMnMw";

function logoUrl(domain: string, theme: "light" | "dark") {
  return `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&format=png&theme=${theme}`;
}

interface ProviderLogoProps {
  domain?: string;
  fallbackIcon: string;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Renders a provider logo from logo.dev with automatic dark/light mode switching.
 * Falls back to a unicode icon when no `domain` is provided.
 */
export function ProviderLogo({
  domain,
  fallbackIcon,
  name,
  size = 16,
  className = "",
}: ProviderLogoProps) {
  if (!domain) {
    return <span className={className}>{fallbackIcon}</span>;
  }

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {/* Dark logo shown in light mode */}
      <img
        src={logoUrl(domain, "light")}
        alt={name}
        width={size}
        height={size}
        className="block dark:hidden"
      />
      {/* Light logo shown in dark mode */}
      <img
        src={logoUrl(domain, "dark")}
        alt={name}
        width={size}
        height={size}
        className="hidden dark:block"
      />
    </span>
  );
}
