"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>出错了</h2>
      <p style={{ color: "#64748b", marginTop: 8 }}>
        {process.env.NODE_ENV === "development"
          ? error?.message
          : "抱歉，页面渲染发生错误。"}
      </p>
      <button
        onClick={() => reset()}
        style={{
          marginTop: 12,
          background: "#2563eb",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 6,
        }}
      >
        重试
      </button>
    </div>
  );
}
