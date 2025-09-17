"use client";

import { Button } from "@/components/ui/button";
import { Truck, User, LogOut, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const handleCreateUser = () => {
    router.push('/user-create');
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Truck className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold">PE Fleet Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-600">
                Welcome {user.username} ({user.role})
              </span>
            )}
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCreateUser}
                className="flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </Button>
            )}
            <Button onClick={onLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
