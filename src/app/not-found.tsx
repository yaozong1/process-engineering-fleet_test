export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>页面未找到</h1>
      <p style={{ color: "#64748b" }}>抱歉，您访问的页面不存在。</p>
    </div>
  );
}
