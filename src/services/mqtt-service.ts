/**
 * Backend MQTT Service
 * 独立运行的MQTT客户端，持续接收数据并存储到Redis
 * 不依赖用户登录或前端页面状态
 */

import mqtt, { MqttClient } from "mqtt";

// 跨模块/热重载全局单例占位（避免多实例重复订阅与重复存储）
declare global {
  // eslint-disable-next-line no-var
  var __mqttServiceSingleton: any | undefined;
}

class MQTTService {
  private client: MqttClient | null = null;
  private isRunning = false;
  private hasStarted = false;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private retryInterval: NodeJS.Timeout | null = null;
  private recentStoredLog = new Map<string, number>();
  private recentLogs: string[] = [];

  // 防重复数据机制：记录每个设备最近的数据
  private lastDataMap = new Map<
    string,
    {
      soc: number;
      voltage: number;
      temperature: number;
      gpsLat?: number;
      gpsLng?: number;
      timestamp: number;
    }
  >();

  // MQTT配置（优先 MY_PUBLIC_*，回退 NEXT_PUBLIC_*，再回退通用 MQTT_*）
  private readonly MQTT_URL =
    process.env.MY_PUBLIC_MQTT_URL ||
    process.env.NEXT_PUBLIC_MQTT_URL ||
    process.env.MQTT_URL ||
    "mqtt://broker.emqx.io:1883";
  private readonly MQTT_USERNAME =
    process.env.MY_PUBLIC_MQTT_USERNAME ||
    process.env.NEXT_PUBLIC_MQTT_USERNAME ||
    process.env.MQTT_USERNAME ||
    "";
  private readonly MQTT_PASSWORD =
    process.env.MY_PUBLIC_MQTT_PASSWORD ||
    process.env.NEXT_PUBLIC_MQTT_PASSWORD ||
    process.env.MQTT_PASSWORD ||
    "";

  // 订阅主题
  private readonly BATTERY_TOPICS = ["fleet/+/battery"];
  private readonly STATUS_TOPICS = ["fleet/+/status"];
  private readonly CHARGENODE_TOPICS = ["fleet/chargenode/+"];

  constructor() {
    this.log("Initializing backend MQTT service...");
  }

  private getApiBaseUrl(): string {
    const envUrl =
      process.env.API_BASE_URL ||
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");
    const port = process.env.PORT || "3000";
    return `http://127.0.0.1:${port}`;
  }

  private log(message: string): void {
    const logEntry = `[${new Date().toISOString()}] ${message}`;
    console.log(`[MQTT Service] ${message}`);
    this.recentLogs.push(logEntry);
    if (this.recentLogs.length > 50) {
      this.recentLogs.shift(); // 保持最近50条日志
    }
  }

  public getRecentLogs(): string[] {
    return [...this.recentLogs];
  }

  /**
   * 检查数据是否为重复数据（防止相同数据连续写入）
   */
  private isDuplicateData(
    deviceId: string,
    soc: number,
    voltage: number,
    temperature: number,
    gpsLat?: number | null,
    gpsLng?: number | null
  ): boolean {
    const lastData = this.lastDataMap.get(deviceId);
    const now = Date.now();

    if (!lastData) {
      // 没有历史数据，不是重复
      this.lastDataMap.set(deviceId, {
        soc,
        voltage,
        temperature,
        gpsLat: gpsLat ?? undefined,
        gpsLng: gpsLng ?? undefined,
        timestamp: now,
      });
      return false;
    }

    // 30秒窗口内：若 SOC/Voltage/GPS 三者均“未发生有效变化”，视为重复
    const timeDiff = now - lastData.timestamp;
    // 变化阈值
    const socChanged =
      typeof soc === "number" && typeof lastData.soc === "number"
        ? Math.abs(lastData.soc - soc) >= 0.1
        : false;
    const voltageChanged =
      typeof voltage === "number" && typeof lastData.voltage === "number"
        ? Math.abs(lastData.voltage - voltage) >= 0.01
        : false;
    // GPS 相似阈值（约 ~11m）；若一有一无，视为发生变化
    const hasGps = gpsLat != null && gpsLng != null;
    const lastHasGps = lastData.gpsLat != null && lastData.gpsLng != null;
    const gpsChanged = hasGps && lastHasGps
      ? (Math.abs((lastData.gpsLat as number) - (gpsLat as number)) >= 0.0001 ||
         Math.abs((lastData.gpsLng as number) - (gpsLng as number)) >= 0.0001)
      : hasGps !== lastHasGps;

    const anyChanged = socChanged || voltageChanged || gpsChanged;

    if (!anyChanged && timeDiff < 30000) {
      // 30秒内 SOC/电压/GPS 均未发生有效变化，视为重复
      this.log(
        `🔄 检测到设备 ${deviceId} 的重复数据，跳过存储 (SOC: ${soc}%, 电压: ${voltage}V, GPS: ${hasGps ? `${gpsLat},${gpsLng}` : 'none'})`
      );
      // 不更新 lastDataMap，保持基准不变
      return true;
    }

    // 更新最新数据记录
    this.lastDataMap.set(deviceId, {
      soc,
      voltage,
      temperature,
      gpsLat: gpsLat ?? undefined,
      gpsLng: gpsLng ?? undefined,
      timestamp: now,
    });
    return false;
  }

  /**
   * 启动MQTT服务
   */
  public async start(): Promise<void> {
    if (this.hasStarted) {
      this.log("Service already started (guarded)");
      return;
    }
    this.hasStarted = true;

    if (this.isRunning) {
      this.log("Service already running");
      return;
    }

    if (!this.MQTT_URL) {
      this.log("MQTT_URL not configured, cannot start service");
      return;
    }

    this.log("Starting MQTT service...");
    // 打印更明确的配置（隐藏密码）
    const safeUrl = this.MQTT_URL;
    const safeUser = this.MQTT_USERNAME ? "configured" : "missing";
    this.log(`MQTT Config => url: ${safeUrl}, username: ${safeUser}`);

    await this.connect();

    // 启动定期重试失败数据的定时器 (每30秒)
    if (!this.retryInterval) {
      this.retryInterval = setInterval(() => {
        this.retryFailedData();
      }, 30000);
    }
  }

  /**
   * 停止MQTT服务
   */
  public async stop(): Promise<void> {
    console.log("[MQTT Service] Stopping MQTT service...");
    this.isRunning = false;

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    console.log("[MQTT Service] MQTT service stopped");
  }

  /**
   * 连接到MQTT Broker
   */
  private async connect(): Promise<void> {
    try {
      this.log(`Attempting to connect to: ${this.MQTT_URL}`);
      this.client = mqtt.connect(this.MQTT_URL, {
        clientId: `backend_service_${Math.random().toString(36).slice(2, 10)}`,
        username: this.MQTT_USERNAME || undefined,
        password: this.MQTT_PASSWORD || undefined,
        clean: true,
        reconnectPeriod: 5000,
        protocolVersion: 4,
        keepalive: 60,
      });

      this.client.on("connect", () => {
        const cid = this.client?.options?.clientId;
        const pid =
          typeof process !== "undefined" ? (process as any).pid : "N/A";
        this.log(`✅ Connected to MQTT broker (clientId=${cid}, pid=${pid})`);
        this.isRunning = true;
        this.subscribeToTopics();
      });

      this.client.on(
        "message",
        (topic: string, payload: Buffer, packet: any) => {
          if (packet?.dup) {
            this.log(
              `📨 DUP message detected on ${topic}, skipping duplicate processing`
            );
            return;
          }
          if (packet?.retain) {
            this.log(`📌 Retained message received on ${topic}`);
          }
          this.log(`📨 Received message on topic: ${topic}`);
          this.handleMessage(topic, payload);
        }
      );

      this.client.on("error", (error) => {
        console.error("[MQTT Service] ❌ MQTT connection error:", error);
        this.scheduleReconnect();
      });

      this.client.on("close", () => {
        console.log("[MQTT Service] 🔌 MQTT connection closed");
        if (this.isRunning) {
          this.scheduleReconnect();
        }
      });

      this.client.on("offline", () => {
        console.log("[MQTT Service] 📴 MQTT client offline");
      });

      this.client.on("reconnect", () => {
        console.log("[MQTT Service] 🔄 Attempting to reconnect to MQTT broker");
      });
    } catch (error) {
      console.error("[MQTT Service] Failed to create MQTT client:", error);
      this.scheduleReconnect();
    }
  }

  /**
   * 订阅相关主题
   */
  private subscribeToTopics(): void {
    if (!this.client) return;

    const shareGroup = process.env.MQTT_SHARED_GROUP;
    const baseTopics = [
      ...this.BATTERY_TOPICS,
      ...this.STATUS_TOPICS,
      ...this.CHARGENODE_TOPICS,
    ];
    const allTopics = shareGroup
      ? baseTopics.map((t) => `$share/${shareGroup}/${t}`)
      : baseTopics;

    allTopics.forEach((topic) => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          console.error(
            `[MQTT Service] ❌ Failed to subscribe to ${topic}:`,
            err
          );
        } else {
          console.log(`[MQTT Service] ✅ Subscribed to ${topic}`);
        }
      });
    });
  }

  /**
   * 处理接收到的MQTT消息
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const topicParts = topic.split("/");

      // 处理充电桩主题 fleet/chargenode/PN-001
      if (
        topicParts.length === 3 &&
        topicParts[0] === "fleet" &&
        topicParts[1] === "chargenode"
      ) {
        const stationId = topicParts[2]; // PN-001, PN-002, etc.
        console.log(
          `[MQTT Service] 🔌 Received charging station message: ${topic} from ${stationId}`
        );
        await this.handleChargeNodeMessage(stationId, payload);
        return;
      }

      // 处理设备主题 fleet/PE-001/battery
      if (topicParts.length !== 3 || topicParts[0] !== "fleet") {
        console.warn("[MQTT Service] Invalid topic format:", topic);
        return;
      }

      const deviceId = topicParts[1]; // PE-001, PE-002, etc.
      const messageType = topicParts[2]; // battery, status

      console.log(
        `[MQTT Service] 📨 Received message: ${topic} from ${deviceId}`
      );

      if (messageType === "battery") {
        await this.handleBatteryMessage(deviceId, payload);
      } else if (messageType === "status") {
        await this.handleStatusMessage(deviceId, payload);
      } else {
        console.warn("[MQTT Service] Unknown message type:", messageType);
      }
    } catch (error) {
      console.error("[MQTT Service] Error handling message:", error);
    }
  }

  /**
   * 处理电池数据消息
   */
  private async handleBatteryMessage(
    deviceId: string,
    payload: Buffer
  ): Promise<void> {
    try {
      const rawMessage = payload.toString();
      this.log(
        `📨 Raw message from ${deviceId}: ${rawMessage.substring(0, 100)}...`
      );

      let data;
      try {
        data = JSON.parse(rawMessage);
      } catch (jsonError) {
        this.log(`⚠️ JSON parse failed for ${deviceId}, attempting to fix...`);

        // 尝试修复常见的JSON问题
        let fixedMessage = rawMessage
          // 修复没有引号的字符串值
          .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*([,\]}])/g, ': "$1"$2')
          // 修复数组中没有引号的字符串 (单个元素)
          .replace(/\[\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*\]/g, '["$1"]')
          // 修复数组中没有引号的字符串 (多个元素)
          .replace(
            /\[\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_\s]*)\s*\]/g,
            '["$1", "$2"]'
          )
          // 修复像 [Low battery] 这样的数组元素
          .replace(/\[\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*\]/g, '["$1"]')
          // 修复数组中的多个无引号元素，如 [Low battery, High temp]
          .replace(
            /\[\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*,\s*([a-zA-Z][a-zA-Z0-9\s]*[a-zA-Z0-9])\s*\]/g,
            '["$1", "$2"]'
          );

        this.log(
          `🔧 Attempting to fix JSON: ${fixedMessage.substring(0, 100)}...`
        );

        try {
          data = JSON.parse(fixedMessage);
          this.log(`✅ JSON repair successful for ${deviceId}`);
        } catch (repairError) {
          this.log(`❌ JSON repair failed for ${deviceId}: ${repairError}`);
          this.log(`❌ Original message: ${rawMessage}`);
          this.log(`❌ Fixed attempt: ${fixedMessage}`);

          // 创建一个默认的数据结构，不在UI中显示错误
          data = {
            soc: null,
            voltage: null,
            temperature: null,
            health: null,
            cycleCount: null,
            estimatedRangeKm: null,
            chargingStatus: "unknown",
            alerts: [] as string[], // 明确指定类型为字符串数组
          };

          // 可选：只在开发环境显示错误，生产环境不显示
          if (process.env.NODE_ENV === "development") {
            (data as any).alerts = ["Message format error (dev)"];
          }
        }
      }

      this.log(`🔋 Battery data from ${deviceId}: SOC=${data.soc}%`);

      // 数据有效性检查
      const soc = typeof data.soc === "number" ? data.soc : null;
      const voltage = typeof data.voltage === "number" ? data.voltage : null;
      const temperature =
        typeof data.temperature === "number" ? data.temperature : null;

      // 预取 GPS（用于去重判定与透传）
      const num = (v: any) =>
        typeof v === "number"
          ? v
          : typeof v === "string"
          ? Number(v)
          : undefined;
      const rawGps = (data as any).gps;
      const g =
        rawGps && typeof rawGps === "object"
          ? Array.isArray(rawGps)
            ? rawGps[0]
            : rawGps
          : undefined;
      const gpsLat =
        g && typeof g === "object"
          ? num(g.lat ?? g.latitude)
          : num((data as any).lat ?? (data as any).latitude);
      const gpsLng =
        g && typeof g === "object"
          ? num(g.lng ?? g.lon ?? g.longitude)
          : num(
              (data as any).lng ?? (data as any).lon ?? (data as any).longitude
            );

      // 检查是否为重复数据：只要 SOC / 电压 / GPS 任一满足变化，即判为“有效数据”
      const hasComparable =
        soc !== null ||
        voltage !== null ||
        (gpsLat != null && gpsLng != null);
      if (hasComparable) {
        if (
          this.isDuplicateData(
            deviceId,
            soc as any,
            voltage as any,
            temperature as any,
            gpsLat,
            gpsLng
          )
        ) {
          this.log(`⏭️ 跳过设备 ${deviceId} 的重复数据存储`);
          return; // 跳过重复数据的存储
        }
      }

      // 准备存储到Redis的数据
      const telemetryData = {
        device: deviceId,
        ts: Date.now(),
        soc,
        voltage,
        temperature,
        health: typeof data.health === "number" ? data.health : null,
        cycleCount:
          typeof data.cycleCount === "number" ? data.cycleCount : null,
        estimatedRangeKm:
          typeof data.estimatedRangeKm === "number"
            ? data.estimatedRangeKm
            : null,
        chargingStatus:
          typeof data.chargingStatus === "string" ? data.chargingStatus : null,
        alerts: Array.isArray(data.alerts) ? data.alerts : [],
        gps: (() => {
          const speed = num(g?.speed ?? (data as any).speed);
          const heading = num(
            g?.heading ??
              (g as any)?.course ??
              (data as any).heading ??
              (data as any).course
          );
          const altitude = num((g as any)?.altitude);
          const accuracy = num((g as any)?.accuracy);
          if (gpsLat != null && gpsLng != null)
            return {
              lat: gpsLat,
              lng: gpsLng,
              speed,
              heading,
              altitude,
              accuracy,
            };
          return undefined;
        })(),
      };

      if (
        telemetryData.gps &&
        typeof telemetryData.gps.lat === "number" &&
        typeof telemetryData.gps.lng === "number"
      ) {
        this.log(
          `📍 GPS for ${deviceId}: lat=${telemetryData.gps.lat}, lng=${telemetryData.gps.lng}`
        );
      } else {
        this.log(`📍 GPS for ${deviceId}: none`);
      }

      // 带重试机制的API调用（仅在真正写入成功时打印“存储成功”）
      const storeResult = await this.storeDataWithRetry(telemetryData);
      if (storeResult === "stored") {
        const fpKey = `${deviceId}|${(soc ?? 0).toFixed(3)}|${(
          voltage ?? 0
        ).toFixed(3)}|${(temperature ?? 0).toFixed(3)}`;
        const lastTs = this.recentStoredLog.get(fpKey) || 0;
        if (Date.now() - lastTs >= 30000) {
          this.recentStoredLog.set(fpKey, Date.now());
          this.log(
            `✅ 存储设备 ${deviceId} 的新数据到Redis (SOC: ${soc}%, 电压: ${voltage}V, 温度: ${temperature}°C)`
          );
        }
      } // 跳过去重/失败的打印
    } catch (error) {
      this.log(
        `❌ Error processing battery message from ${deviceId}: ${error}`
      );
    }
  }

  /**
   * 处理充电桩数据消息
   */
  private async handleChargeNodeMessage(
    stationId: string,
    payload: Buffer
  ): Promise<void> {
    try {
      const rawMessage = payload.toString();
      this.log(
        `🔌 Raw charging station message from ${stationId}: ${rawMessage.substring(
          0,
          100
        )}...`
      );

      let data;
      try {
        data = JSON.parse(rawMessage);
      } catch (jsonError) {
        this.log(
          `⚠️ JSON parse failed for charging station ${stationId}: ${jsonError}`
        );
        return;
      }

      // 验证充电桩数据格式
      if (!data || typeof data !== "object") {
        this.log(`⚠️ Invalid charging station data format from ${stationId}`);
        return;
      }

      // 始终使用当前时间戳存储，确保数据是最新的
      const currentTime = Date.now();
      const originalTimestamp = data.ts;

      this.log(
        `⏰ 充电桩 ${stationId} 收到消息，原始时间戳: ${
          originalTimestamp
            ? new Date(originalTimestamp).toLocaleString()
            : "无"
        }，存储时间戳: ${new Date(currentTime).toLocaleString()}`
      );

      // 准备存储到Redis的充电桩数据
      const chargeNodeData = {
        stationId,
        ts: currentTime, // 始终使用当前时间戳
        status: data.status || "offline",
        voltage: typeof data.voltage === "number" ? data.voltage : null,
        current: typeof data.current === "number" ? data.current : null,
        power: typeof data.power === "number" ? data.power : null,
        energy: typeof data.energy === "number" ? data.energy : null,
        remainingTime:
          typeof data.remainingTime === "number" ? data.remainingTime : null,
        temperature:
          typeof data.temperature === "number" ? data.temperature : null,
        connectorType:
          typeof data.connectorType === "string" ? data.connectorType : null,
        maxPower: typeof data.maxPower === "number" ? data.maxPower : null,
        location: typeof data.location === "string" ? data.location : null,
        faultCode: typeof data.faultCode === "string" ? data.faultCode : null,
        faultMessage:
          typeof data.faultMessage === "string" ? data.faultMessage : null,
      };

      this.log(
        `🔌 Charging station ${stationId} data: status=${chargeNodeData.status}, power=${chargeNodeData.power}kW, voltage=${chargeNodeData.voltage}V, ts=current-time`
      );

      // 存储充电桩数据（使用专门的API端点）
      const storeResult = await this.storeChargeNodeDataWithRetry(
        chargeNodeData
      );
      if (storeResult === "stored") {
        this.log(
          `✅ 存储充电桩 ${stationId} 的数据到Redis (状态: ${chargeNodeData.status}, 功率: ${chargeNodeData.power}kW, 时间戳: current-time)`
        );
      }
    } catch (error) {
      this.log(
        `❌ Error processing charging station message from ${stationId}: ${error}`
      );
    }
  }

  /**
   * 带重试机制的充电桩数据存储
   */
  private async storeChargeNodeDataWithRetry(
    data: any,
    maxRetries: number = 5
  ): Promise<"stored" | "skipped"> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(
          `${this.getApiBaseUrl()}/api/mqtt-service/chargenode`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          return "stored"; // 成功写入
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          this.log(
            `❌ Failed to store charging station data after ${maxRetries} attempts: ${error}`
          );
          return "skipped";
        }
        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return "skipped";
  }

  /**
   * 带重试机制的数据存储
   */
  private async storeDataWithRetry(
    data: any,
    maxRetries: number = 5
  ): Promise<"stored" | "skipped"> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(`${this.getApiBaseUrl()}/api/telemetry`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          let result: any = null;
          try {
            result = await response.json();
          } catch {
            /* ignore */
          }
          if (result && (result.skipped === true || result.reason)) {
            return "skipped";
          }
          return "stored"; // 成功写入
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        if (i === maxRetries - 1) {
          this.log(
            `❌ Failed to store data after ${maxRetries} attempts: ${error}`
          );
          // 将失败的数据保存到内存缓存，稍后重试
          this.addToFailedQueue(data);
          return "skipped"; // 作为降级处理
        }
        // 指数退避延迟
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return "skipped";
  }

  private failedDataQueue: any[] = [];

  /**
   * 添加失败的数据到队列
   */
  private addToFailedQueue(data: any): void {
    this.failedDataQueue.push({
      ...data,
      retryCount: 0,
      lastAttempt: Date.now(),
    });

    // 限制队列大小
    if (this.failedDataQueue.length > 100) {
      this.failedDataQueue.shift();
    }
  }

  /**
   * 重试失败的数据
   */
  private async retryFailedData(): Promise<void> {
    if (this.failedDataQueue.length === 0) return;

    this.log(`🔄 Retrying ${this.failedDataQueue.length} failed data items...`);

    const itemsToRetry = [...this.failedDataQueue];
    this.failedDataQueue = [];

    for (const item of itemsToRetry) {
      if (item.retryCount < 3) {
        item.retryCount++;
        await this.storeDataWithRetry(item, 1); // 单次重试
      }
    }
  }

  /**
   * 处理状态消息
   */
  private async handleStatusMessage(
    deviceId: string,
    payload: Buffer
  ): Promise<void> {
    try {
      const status = payload.toString().trim().toLowerCase();
      console.log(`[MQTT Service] 📡 Status from ${deviceId}: ${status}`);

      // 这里可以根据需要处理状态信息，比如更新设备在线状态等
      // 目前只记录日志
    } catch (error) {
      console.error(
        `[MQTT Service] Error processing status message from ${deviceId}:`,
        error
      );
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectInterval) return;

    console.log("[MQTT Service] ⏰ Scheduling reconnection in 10 seconds...");
    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      if (this.isRunning) {
        console.log("[MQTT Service] 🔄 Attempting to reconnect...");
        this.connect();
      }
    }, 10000);
  }

  /**
   * 获取服务状态
   */
  public getStatus(): { running: boolean; connected: boolean } {
    return {
      running: this.isRunning,
      connected: this.client?.connected || false,
    };
  }
}

// 单例获取器（惰性创建，避免导入即产生副作用）
export function getMqttService(): MQTTService {
  if (!globalThis.__mqttServiceSingleton) {
    globalThis.__mqttServiceSingleton = new MQTTService();
  }
  return globalThis.__mqttServiceSingleton as MQTTService;
}
export default getMqttService;
