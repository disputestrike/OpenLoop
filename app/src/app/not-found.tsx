import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "2rem", maxWidth: "32rem", margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Not found</h1>
      <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>This page doesn’t exist.</p>
      <Link href="/" style={{ color: "#38bdf8" }}>← Back to OpenLoop</Link>
    </main>
  );
}
