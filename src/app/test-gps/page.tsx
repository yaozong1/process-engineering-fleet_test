"use client";

import { GpsTrackingDashboard } from "@/components/gps-tracking-dashboard";

export default function TestGPSPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <GpsTrackingDashboard />
      </div>
    </div>
  );
}
