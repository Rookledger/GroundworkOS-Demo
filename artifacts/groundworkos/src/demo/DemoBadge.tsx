import { resetDemo } from "./server";

/**
 * Small fixed badge telling visitors this is a demo with sample data, with
 * a button to put everything back to how it started.
 */
export function DemoBadge() {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 12,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px 8px 14px",
        borderRadius: 999,
        background: "#1d2d3d",
        color: "#fff",
        fontFamily: "var(--font-body, system-ui, sans-serif)",
        fontSize: 13,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        maxWidth: "calc(100vw - 24px)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          background: "#f0a11e",
          color: "#1d2d3d",
          fontWeight: 700,
          borderRadius: 999,
          padding: "2px 8px",
          letterSpacing: 0.5,
        }}
      >
        DEMO
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
        Sample data only - changes stay in this browser tab
      </span>
      <button
        type="button"
        onClick={resetDemo}
        style={{
          minHeight: 32,
          padding: "0 12px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "transparent",
          color: "#fff",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Reset
      </button>
    </div>
  );
}
