"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem", textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => unstable_retry()}
            style={{ padding: "0.625rem 1.25rem", borderRadius: "0.5rem", backgroundColor: "#059669", color: "white", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
