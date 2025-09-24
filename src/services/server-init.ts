/**
 * Server initialization script
 * 在Next.js服务器启动时自动启动后端服务
 */

import { getMqttService } from "@/services/mqtt-service";

// 延迟启动函数，等待服务器完全启动
const initializeServices = async () => {
  console.log("[Server Init] Initializing backend services...");

  try {
    // 等待一点时间确保服务器完全启动
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 启动MQTT服务
    console.log("[Server Init] Starting MQTT service...");
    await getMqttService().start();

    console.log(
      "[Server Init] ✅ All backend services initialized successfully"
    );
  } catch (error) {
    console.error(
      "[Server Init] ❌ Failed to initialize backend services:",
      error
    );

    // 如果启动失败，等待10秒后重试
    setTimeout(() => {
      console.log("[Server Init] Retrying service initialization...");
      initializeServices();
    }, 10000);
  }
};

// 只在服务器端执行，且跳过构建阶段
if (typeof window === "undefined") {
  const phase = process.env.NEXT_PHASE || "";
  const isBuild =
    phase.includes("phase-production-build") ||
    phase.includes("phase-development-build") ||
    process.env.BUILDING === "true";
  if (!isBuild) {
    // 使用 setTimeout 确保在服务器完全启动后执行
    setTimeout(initializeServices, 1000);
  } else {
    console.log("[Server Init] Skipping service init during build phase");
  }
}

export { initializeServices };
