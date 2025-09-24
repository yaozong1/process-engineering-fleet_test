"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LoginPage } from "@/components/login-page";
import { DashboardHeader } from "@/components/dashboard-header";
import {
  DashboardNavigation,
  type NavigationTab,
} from "@/components/dashboard-navigation";
import { OverviewDashboard } from "@/components/overview-dashboard";
import { GpsTrackingDashboard } from "@/components/gps-tracking-dashboard";
import { BatteryMonitorDashboard } from "@/components/battery-monitor-dashboard";
import ChargingStationDashboard from "@/components/charging-station-dashboard";
import type { ChargingStation } from "@/components/charging-station-dashboard";
import { useDeviceData } from "@/contexts/DeviceDataContext";

export default function FleetManagerPage() {
  const router = useRouter();
  const { updateChargingStationData } = useDeviceData();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<NavigationTab>("overview");
  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    username: string;
    role: "admin" | "user";
  } | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState(0);

  // 充电桩相关状态
  const [chargingStations, setChargingStations] = useState<ChargingStation[]>(
    []
  );
  const [selectedStation, setSelectedStation] =
    useState<ChargingStation | null>(null);
  const [chargingStationLoading, setChargingStationLoading] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout>();
  const warningShownRef = useRef<boolean>(false);
  const graceKey = "auth-grace-ts";
  const refreshGraceMs = 15 * 60 * 1000; // 15 minutes grace for page refresh

  // 登录后设置用户信息（模拟，实际应从API获取）
  const handleLogin = (user?: {
    userId: string;
    username: string;
    role: "admin" | "user";
  }) => {
    setIsAuthenticated(true);
    setCurrentUser(user || { userId: "1", username: "admin", role: "admin" });
    try {
      sessionStorage.setItem(graceKey, String(Date.now()));
    } catch {}
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActiveTab("overview");
    setShowTimeoutWarning(false);
    try {
      sessionStorage.removeItem(graceKey);
    } catch {}
  };

  // Initial auth check with refresh grace support
  useEffect(() => {
    const checkAuth = async () => {
      try {
        let usedGrace = false;
        try {
          const tsStr = sessionStorage.getItem(graceKey);
          if (tsStr) {
            const ts = parseInt(tsStr, 10);
            if (!Number.isNaN(ts) && Date.now() - ts <= refreshGraceMs) {
              // Optimistically treat as authenticated within grace
              setIsAuthenticated(true);
              usedGrace = true;
            }
          }
        } catch {}

        if (usedGrace) {
          // Background verify; if invalid then logout
          try {
            const res = await fetch("/api/auth/verify", { cache: "no-store" });
            if (!res.ok) {
              handleLogout();
            }
          } catch {
            handleLogout();
          } finally {
            setCheckingAuth(false);
          }
          return;
        }

        // No grace, do a normal verify to avoid flicker
        try {
          const res = await fetch("/api/auth/verify", { cache: "no-store" });
          setIsAuthenticated(res.ok);
        } catch {
          setIsAuthenticated(false);
        } finally {
          setCheckingAuth(false);
        }
      } catch {
        setIsAuthenticated(false);
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  // 更新活动时间
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    setShowTimeoutWarning(false);
    console.log("[INACTIVITY] 活动检测，重置计时器");
    try {
      sessionStorage.setItem(graceKey, String(Date.now()));
    } catch {}
  };

  // 执行注销
  const performLogout = async () => {
    console.log("[INACTIVITY] 执行自动注销");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("注销失败:", error);
    } finally {
      handleLogout();
      router.push("/");
    }
  };

  // 检查不活动状态
  const checkInactivity = () => {
    if (!isAuthenticated) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeoutMs = 15 * 60 * 1000; // 15分钟
    const warningMs = 10 * 60 * 1000; // 10分钟警告

    const secondsInactive = Math.floor(timeSinceLastActivity / 1000);
    const remainingMs = timeoutMs - timeSinceLastActivity;
    const remainingSeconds = Math.floor(remainingMs / 1000);

    console.log(
      `[INACTIVITY] 检查: 不活动${secondsInactive}秒, 剩余${remainingSeconds}秒`
    );

    // 超时注销
    if (timeSinceLastActivity >= timeoutMs) {
      console.log("[INACTIVITY] 超时注销!");
      performLogout();
      return;
    }

    // 显示警告
    if (remainingMs <= warningMs && !warningShownRef.current) {
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      console.log(`[INACTIVITY] 显示警告: ${remainingMinutes}分钟`);
      warningShownRef.current = true;
      setRemainingMinutes(remainingMinutes);
      setShowTimeoutWarning(true);
    }
  };

  // 监听用户活动
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledUpdate = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        updateActivity();
        throttleTimer = null;
      }, 1000);
    };

    events.forEach((event) => {
      document.addEventListener(event, throttledUpdate, true);
    });

    checkIntervalRef.current = setInterval(checkInactivity, 5000);
    updateActivity();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, throttledUpdate, true);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [isAuthenticated]);

  // 加载充电桩数据
  useEffect(() => {
    if (!isAuthenticated || activeTab !== "drivers") return;

    fetchChargingStations();

    // 设置定期刷新
    const interval = setInterval(fetchChargingStations, 10000); // 每10秒刷新

    return () => {
      clearInterval(interval);
    };
  }, [isAuthenticated, activeTab]);

  async function fetchChargingStations() {
    try {
      setChargingStationLoading(true);

      const response = await fetch("/api/chargenode");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 转换数据格式为ChargingStation格式
          // 新的API返回的数据结构与telemetry一致
          const stations: ChargingStation[] = result.data.map((data: any) => ({
            id: data.stationId,
            name: `Station ${data.stationId}`,
            status: data.status,
            voltage: data.voltage,
            current: data.current,
            power: data.power,
            energy: data.energy,
            remainingTime: data.remainingTime,
            temperature: data.temperature,
            lastUpdate: data.lastUpdate || new Date(data.ts).toLocaleString(),
            connectorType: data.connectorType,
            maxPower: data.maxPower,
            location: data.location,
            isTimeout: data.isTimeout,
          }));

          setChargingStations(stations);

          // 同时更新DeviceDataContext（可选，用于全局状态共享）
          stations.forEach((station) => {
            updateChargingStationData(station.id, {
              stationId: station.id,
              ts: Date.now(),
              status: station.status,
              voltage: station.voltage,
              current: station.current,
              power: station.power,
              energy: station.energy,
              remainingTime: station.remainingTime,
              temperature: station.temperature,
              connectorType: station.connectorType,
              maxPower: station.maxPower,
              location: station.location,
            });
          });
        }
      }
    } catch (error) {
      console.error("获取充电桩数据失败:", error);
    } finally {
      setChargingStationLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="p-6 text-gray-600">Loading...</div>;
  }

  if (!isAuthenticated) {
    // 这里假设LoginPage支持onLogin(user)参数，实际可根据你的实现调整
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderDashboard = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewDashboard />;
      case "gps-tracking":
        return <GpsTrackingDashboard />;
      case "battery-monitor":
        return <BatteryMonitorDashboard />;
      case "vehicles":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Vehicles Dashboard</h3>
            <p className="text-gray-600">
              Vehicle management features coming soon...
            </p>
          </div>
        );
      case "drivers":
        return (
          <div className="relative">
            {/* 状态栏 */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        chargingStationLoading
                          ? "bg-yellow-500"
                          : chargingStations.length > 0
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium">
                      Status: {chargingStationLoading ? "Loading" : "Connected"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Data Source: Backend API
                  </div>
                  <div className="text-sm text-gray-600">
                    Refresh Interval: 10s
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Total Stations: {chargingStations.length}
                </div>
              </div>
            </div>

            <ChargingStationDashboard
              stations={chargingStations}
              selectedStation={selectedStation}
              onStationSelect={setSelectedStation}
            />
          </div>
        );
      case "maintenance":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Maintenance Dashboard
            </h3>
            <p className="text-gray-600">
              Maintenance tracking features coming soon...
            </p>
          </div>
        );
      case "routes":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Routes Dashboard</h3>
            <p className="text-gray-600">
              Route optimization features coming soon...
            </p>
          </div>
        );
      case "fuel":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Fuel Dashboard</h3>
            <p className="text-gray-600">
              Fuel management features coming soon...
            </p>
          </div>
        );
      case "expenses":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Expenses Dashboard</h3>
            <p className="text-gray-600">
              Expense tracking features coming soon...
            </p>
          </div>
        );
      case "reports":
        return (
          <div className="p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">Reports Dashboard</h3>
            <p className="text-gray-600">Reporting features coming soon...</p>
          </div>
        );
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <DashboardHeader
        onLogout={handleLogout}
        user={currentUser || undefined}
      />
      <div className="flex flex-1">
        <DashboardNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 p-6 overflow-auto">{renderDashboard()}</main>
      </div>

      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-amber-100 rounded-full p-2 mr-3">
                <svg
                  className="w-6 h-6 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                会话即将过期
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              您的会话将在 {remainingMinutes}{" "}
              分钟后过期。请选择继续使用或立即注销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  console.log("[INACTIVITY] 延长会话");
                  setShowTimeoutWarning(false);
                  updateActivity();
                  try {
                    await fetch("/api/auth/extend", { method: "POST" });
                  } catch (error) {
                    console.error("延长会话失败:", error);
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                继续使用
              </button>
              <button
                onClick={() => {
                  console.log("[INACTIVITY] 立即注销");
                  performLogout();
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                立即注销
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
