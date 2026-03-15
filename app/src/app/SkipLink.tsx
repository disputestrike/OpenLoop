"use client";

import { useEffect, useState } from "react";

/**
 * Renders the "Skip to content" link only after mount to avoid hydration mismatch
 * (server might not emit the same DOM as client for the skip link in some builds).
 */
export default function SkipLink() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <a href="#main-content" className="skip-link">
      Skip to content
    </a>
  );
}
