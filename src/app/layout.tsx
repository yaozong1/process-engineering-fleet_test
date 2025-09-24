import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
// 开发/自托管场景：服务端渲染时加载 server-init 以自动启动后台服务（构建阶段会被内部守卫跳过）
import "@/services/server-init";

// 确保生产模式下也能自动启动 MQTT（通过触发一次 runtime-init API）
if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
  // 延迟触发，避免在构建期执行
  setTimeout(async () => {
    try {
      const port = process.env.PORT || "3000";
      const response = await fetch(
        `http://127.0.0.1:${port}/api/runtime-init`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      console.log("[Layout] Production MQTT init triggered:", response.status);
    } catch (error) {
      console.log(
        "[Layout] Production MQTT init failed (will retry):",
        (error as Error)?.message || error
      );
    }
  }, 3000);
}
// Note: client-only providers are applied at page level to avoid
// invoking client hooks during special routes prerendering.
// 为避免构建期/预渲染阶段的副作用，这里不直接导入服务器初始化脚本。
// 如需在运行时启动后台服务，请在 server 入口或专用 API 路由中触发。

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 注意：暂不导出 metadata，排查构建期 head/viewport 上下文冲突。

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <ClientBody>{children}</ClientBody>
      </body>
    </html>
  );
}

export const dynamic = "force-dynamic";
