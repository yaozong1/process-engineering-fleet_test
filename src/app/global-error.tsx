"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
          发生错误
        </h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>
          {process.env.NODE_ENV === "development"
            ? error?.message
            : "抱歉，服务器出现错误。"}
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "#2563eb",
            color: "#fff",
            padding: "12px 24px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          重试
        </button>
      </div>
    </div>
  );
}
