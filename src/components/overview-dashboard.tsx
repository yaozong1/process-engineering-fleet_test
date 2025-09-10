"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Truck,
  Users,
  Fuel,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Battery
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  Legend
} from "recharts"

const fuelData = [
  { month: "Jan", consumption: 2400, cost: 1800 },
  { month: "Feb", consumption: 1398, cost: 2200 },
  { month: "Mar", consumption: 3800, cost: 1900 },
  { month: "Apr", consumption: 3908, cost: 2780 },
  { month: "May", consumption: 4800, cost: 1890 },
  { month: "Jun", consumption: 3800, cost: 2390 },
]

const maintenanceData = [
  { month: "Jan", scheduled: 5, completed: 4, overdue: 1 },
  { month: "Feb", scheduled: 3, completed: 3, overdue: 0 },
  { month: "Mar", scheduled: 7, completed: 6, overdue: 1 },
  { month: "Apr", scheduled: 4, completed: 4, overdue: 0 },
  { month: "May", scheduled: 6, completed: 5, overdue: 1 },
  { month: "Jun", scheduled: 8, completed: 7, overdue: 1 },
]

export function OverviewDashboard() {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">📈 4 Active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Drivers</p>
                <p className="text-2xl font-bold">4</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-blue-600">🕒 166 hours total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fuel Efficiency</p>
                <p className="text-2xl font-bold">91%</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Fuel className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">📈 +3% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                <p className="text-2xl font-bold">$12,450</p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-600">📈 -5% vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fuel Consumption & Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Consumption (L)"
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Cost ($)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                  <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle PE-001 completed delivery route</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle PE-002 maintenance due in 3 days</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">New route optimized for PE-004</p>
                <p className="text-xs text-gray-500">3 hours ago</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-3 bg-purple-50 rounded-lg">
              <Battery className="w-5 h-5 text-purple-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">Vehicle PE-003 battery level at 15% - charging recommended</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
