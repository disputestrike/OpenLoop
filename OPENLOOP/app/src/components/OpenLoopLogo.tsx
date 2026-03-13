"use client";

/**
 * OpenLoop logo: loop icon + wordmark.
 * Use for nav, favicon, and any branded surface. Replace with final asset when you have a designer version.
 */
export function OpenLoopLogo({
  variant = "full",
  size = 32,
  className = "",
}: {
  variant?: "icon" | "full";
  size?: number;
  className?: string;
}) {
  const icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Loop: two arcs forming an open circle with arrow head = "open loop" */}
      <defs>
        <linearGradient id="openloop-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0052FF" />
          <stop offset="100%" stopColor="#00FF88" />
        </linearGradient>
      </defs>
      <path
        d="M8 24 A12 12 0 0 1 24 8"
        stroke="url(#openloop-logo-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 8 A12 12 0 0 1 8 24"
        stroke="url(#openloop-logo-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 4"
        fill="none"
      />
      {/* Arrow head on the "open" end */}
      <path
        d="M22 10 L26 16 L22 22"
        stroke="#00FF88"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (variant === "icon") {
    return <span className={className} style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>;
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        fontWeight: 800,
        fontSize: "1.25rem",
        letterSpacing: "-0.02em",
        color: "var(--openloop-primary)",
      }}
    >
      {icon}
      <span>OpenLoop</span>
    </span>
  );
}
