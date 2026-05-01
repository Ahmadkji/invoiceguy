"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[root-error]", error.message, error.digest);
  }, [error]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "2rem", textAlign: "center" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem", maxWidth: "28rem" }}>
        We encountered an unexpected error on this page.
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
