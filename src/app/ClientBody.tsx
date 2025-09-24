"use client";

import { useEffect } from "react";
import { DeviceDataProvider } from "@/contexts/DeviceDataContext";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  // Remove any extension-added classes during hydration
  useEffect(() => {
    // This runs only on the client after hydration
    document.body.className = "antialiased";

    // Inject third-party script after hydration to avoid SSR/head conflicts
    const id = "same-runtime-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "//unpkg.com/same-runtime/dist/index.global.js";
      s.crossOrigin = "anonymous";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  return (
    <DeviceDataProvider>
      <div className="antialiased">{children}</div>
    </DeviceDataProvider>
  );
}
