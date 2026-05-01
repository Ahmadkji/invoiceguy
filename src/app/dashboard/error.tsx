"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard-error]", error.message, error.digest);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "2rem", textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>&#x26A0;&#xFE0F;</div>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.375rem" }}>
        Dashboard Error
      </h2>
      <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.25rem", maxWidth: "24rem" }}>
        Something went wrong loading this section. Your data is safe.
      </p>
      <button
        onClick={() => unstable_retry()}
        style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", backgroundColor: "#059669", color: "white", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
      >
        Try again
      </button>
    </div>
  );
}
