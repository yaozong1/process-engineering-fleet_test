"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Truck,
  Settings,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mail
} from "lucide-react"

interface LoginPageProps {
  onLogin: () => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    // For demo purposes, accept any email/password
    setIsLoading(false)
    onLogin()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 text-white mb-8">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-1">
                <Settings className="w-3 h-3 text-blue-600" />
                <Truck className="w-3 h-3 text-blue-600" />
                <BarChart3 className="w-3 h-3 text-blue-600" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">Process Engineering</h1>
              <p className="text-sm text-blue-100">FLEET SOLUTIONS</p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Fleet Manager
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Efficient, Intelligent, Scalable
              </p>
            </div>

            <div className="grid grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-blue-100">Vehicle Tracking</p>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-blue-100">Maintenance</p>
              </div>

              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-blue-100">Analytics</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-blue-100 text-sm">
          © 2024 Process Engineering. All rights reserved.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <div className="flex items-center space-x-1">
                <Settings className="w-3 h-3 text-white" />
                <Truck className="w-3 h-3 text-white" />
                <BarChart3 className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Process Engineering</h1>
              <p className="text-sm text-gray-600">FLEET SOLUTIONS</p>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to your fleet management dashboard</p>
          </div>

          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Username/Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember"
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Login"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
