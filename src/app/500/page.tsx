export const dynamic = "force-dynamic";

export default function Error500() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>服务器错误 (500)</h1>
      <p style={{ marginTop: 8, color: "#64748b" }}>
        抱歉，服务器出现问题。请稍后再试。
      </p>
    </div>
  );
}
