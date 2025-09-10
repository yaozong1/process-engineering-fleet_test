"use client"

import { Button } from "@/components/ui/button"
import { Truck, Settings } from "lucide-react"

interface DashboardHeaderProps {
  onLogout?: () => void
}

export function DashboardHeader({ onLogout }: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Process Engineering Fleet Manager
              </h1>
              <p className="text-sm text-gray-600">
                Comprehensive Fleet Management System
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
