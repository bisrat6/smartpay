import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Clock, DollarSign, BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { companyApi, paymentApi, timeLogApi } from "@/lib/api";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeTimeLogs: 0,
    pendingPayments: 0,
    totalPaid: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [companyResp, paymentsResp, logsResp] = await Promise.all([
        companyApi.getMyStats(),
        paymentApi.getSummary(),
        // Request up to 1000 logs to compute active logs (no dedicated endpoint)
        timeLogApi.getCompanyLogs({ limit: 1000 }),
      ]);

      const companyStats = companyResp.data.stats;
      const paymentsSummary = paymentsResp.data || {};
      const logs = logsResp.data.timeLogs || [];

      const activeLogsCount = logs.filter((l: any) => !l.clockOut).length;

      setStats({
        totalEmployees: companyStats.employeeCount || 0,
        activeTimeLogs: activeLogsCount,
        pendingPayments:
          paymentsSummary.pendingPayments ||
          companyStats.pendingTimeLogsCount ||
          0,
        totalPaid: paymentsSummary.totalAmount || 0,
      });
    } catch (error: any) {
      console.error("Failed to fetch employer dashboard stats:", error);
      toast.error(error?.message || "Failed to load dashboard stats");
    }
  };

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle={`Welcome back, ${
        user?.name?.split(" ")[0]
      } 👋 Here's what's happening with your workforce today`}
      role="employer"
    >
      <div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black mb-1">
              {stats.totalEmployees}
            </div>
            <div className="text-sm text-gray-500">Total Employees</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black mb-1">
              {stats.activeTimeLogs}
            </div>
            <div className="text-sm text-gray-500">Active Time Logs</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black mb-1">
              {stats.pendingPayments}
            </div>
            <div className="text-sm text-gray-500">Pending Payments</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-700" />
              </div>
            </div>
            <div className="text-3xl font-bold text-black mb-1">
              {stats.totalPaid.toLocaleString()} ETB
            </div>
            <div className="text-sm text-gray-500">Total Paid This Month</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-white mb-8">
          <h3 className="text-2xl font-bold mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/employer/employees">
              <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-4 text-left transition-all">
                <Users className="w-6 h-6 mb-3" />
                <div className="font-semibold mb-1">Manage Employees</div>
                <div className="text-sm text-gray-300">
                  Add or update employee information
                </div>
              </button>
            </Link>

            <Link to="/employer/timelogs">
              <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-4 text-left transition-all">
                <Clock className="w-6 h-6 mb-3" />
                <div className="font-semibold mb-1">Review Time Logs</div>
                <div className="text-sm text-gray-300">
                  Approve pending time entries
                </div>
              </button>
            </Link>

            <Link to="/employer/payments">
              <button className="w-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-xl p-4 text-left transition-all">
                <DollarSign className="w-6 h-6 mb-3" />
                <div className="font-semibold mb-1">Process Payroll</div>
                <div className="text-sm text-gray-300">
                  Initiate employee payments
                </div>
              </button>
            </Link>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-black mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">All systems operational</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Last sync: Just now</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-black mb-4">Support</h3>
            <p className="text-sm text-gray-600 mb-4">
              Need help managing your workforce?
            </p>
            <Button
              variant="outline"
              className="w-full border-black text-black hover:bg-gray-50"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EmployerDashboard;
