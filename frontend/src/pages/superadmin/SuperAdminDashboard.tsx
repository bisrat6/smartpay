import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api, { superAdminApi } from "@/lib/api";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

interface DashboardStats {
  companies: {
    total: number;
    active: number;
    pending: number;
    verified: number;
  };
  users: {
    total: number;
    employers: number;
    employees: number;
  };
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    expired: number;
  };
  revenue: {
    monthly: number;
    currency: string;
  };
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      toast.error("Not authenticated");
      setLoading(false);
      return;
    }
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await superAdminApi.getDashboardStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error((error as any)?.message || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="super_admin">
        <div className="flex items-center justify-center h-96">
          <p>Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="super_admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Platform overview and management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Companies
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.companies.total}</div>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  {stats?.companies.verified} verified
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  {stats?.companies.pending} pending
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total}</div>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span>{stats?.users.employers} employers</span>
                <span>{stats?.users.employees} employees</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Subscriptions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.subscriptions.active}
              </div>
              <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                <span>{stats?.subscriptions.trial} on trial</span>
                <span className="text-red-500">
                  {stats?.subscriptions.expired} expired
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.revenue.currency}{" "}
                {stats?.revenue.monthly.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                From {stats?.subscriptions.active} active subscriptions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Companies Management</CardTitle>
                <CardDescription>
                  Manage and verify registered companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/super-admin/companies">View All Companies</a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Users Management</CardTitle>
                <CardDescription>
                  Manage platform users and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/super-admin/users">View All Users</a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions Management</CardTitle>
                <CardDescription>
                  Manage subscription plans and billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/super-admin/subscriptions">
                    View All Subscriptions
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>
                  View platform-wide analytics and reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href="/super-admin/analytics">View Analytics</a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
