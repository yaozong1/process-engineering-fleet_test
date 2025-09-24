import { NextResponse } from "next/server";

// 懒加载以避免模块顶层副作用
export async function POST() {
  if (process.env.NEXT_PHASE?.includes("build")) {
    return NextResponse.json({ skipped: true, reason: "build phase" });
  }
  const { initializeServices } = await import("@/services/server-init");
  initializeServices();
  return NextResponse.json({ ok: true });
}
