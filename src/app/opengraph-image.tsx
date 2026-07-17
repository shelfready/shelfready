import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "ShelfReady — make your store shoppable by AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #f8fafc 55%, #dcfce7)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 40 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#15803d",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ width: 44, height: 6, borderRadius: 3, background: "#fff" }} />
            <div style={{ width: 44, height: 6, borderRadius: 3, background: "#fff" }} />
            <div style={{ width: 44, height: 6, borderRadius: 3, background: "#fff" }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#0f172a" }}>ShelfReady</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#0f172a", lineHeight: 1.15 }}>
          AI assistants are recommending products.
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#15803d", lineHeight: 1.15 }}>
          Make sure yours are on the shelf.
        </div>
        <div style={{ marginTop: 36, fontSize: 28, color: "#475569" }}>
          Feeds · Audit · Enrichment · Monitoring — for stores that aren&apos;t on Shopify
        </div>
      </div>
    ),
    size,
  );
}
