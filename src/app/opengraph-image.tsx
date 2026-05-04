import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, #f8fafc 0%, #ecfdf5 42%, #0f172a 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
          padding: "72px",
          justifyContent: "space-between",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "68%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                display: "flex",
                height: 56,
                width: 56,
                borderRadius: 16,
                background: "#10b981",
                color: "white",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              T
            </div>
            TimeProof
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#047857" }}>
              Time-based invoicing for hourly freelancers
            </div>
            <div style={{ fontSize: 68, lineHeight: 1.05, fontWeight: 800 }}>
              Turn tracked time into invoices clients can understand.
            </div>
          </div>
          <div style={{ fontSize: 28, color: "#334155", maxWidth: 760 }}>
            Billing rules, clean invoice detail, and a calmer weekly invoicing workflow.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "26%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: "rgba(255,255,255,0.82)",
              padding: 28,
              borderRadius: 28,
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div style={{ fontSize: 22, color: "#64748b" }}>Workflow</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Track</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Bill</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>Invoice</div>
          </div>
          <div style={{ fontSize: 22, color: "white", opacity: 0.9 }}>
            timeproof.app
          </div>
        </div>
      </div>
    ),
    size,
  );
}
