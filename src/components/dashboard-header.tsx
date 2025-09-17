"use client";

import { Button } from "@/components/ui/button";
import { Truck, User, LogOut } from "lucide-react";

interface User {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  email?: string;
}

interface DashboardHeaderProps {
  user?: User | null;
  onLogout?: () => void;
}

export function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">PE Fleet Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && <span>Welcome {user.username}</span>}
            <Button onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
