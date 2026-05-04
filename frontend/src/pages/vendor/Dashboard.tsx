import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, ShoppingBag, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import VendorSidebar from "@/components/vendor/VendorSidebar";

const Dashboard = () => {
  // Mock data - In real app, this would come from API
  const stats = {
    totalOrders: 45,
    pendingOrders: 8,
    completedToday: 32,
    revenueToday: 12450,
  };

  const topItems = [
    { name: "Chicken Burger", count: 24, price: 250 },
    { name: "French Fries", count: 18, price: 120 },
    { name: "Cold Coffee", count: 15, price: 180 },
    { name: "Pizza Slice", count: 12, price: 200 },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      <VendorSidebar />
      
      <main className="flex-1 p-6 md:p-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back! Here's your overview</p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Orders Today"
              value={stats.totalOrders}
              icon={<ShoppingBag className="w-5 h-5" />}
              color="text-primary"
            />
            <StatCard
              title="Pending Orders"
              value={stats.pendingOrders}
              icon={<Clock className="w-5 h-5" />}
              color="text-warning"
            />
            <StatCard
              title="Completed Today"
              value={stats.completedToday}
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="text-success"
            />
            <StatCard
              title="Revenue Today"
              value={`Rs. ${stats.revenueToday}`}
              icon={<DollarSign className="w-5 h-5" />}
              color="text-accent"
            />
          </div>

          {/* Top Selling Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Rs. {item.price}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">{item.count}</p>
                      <p className="text-xs text-muted-foreground">sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string;
}) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={`p-3 bg-primary/10 rounded-full ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
