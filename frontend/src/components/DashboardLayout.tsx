import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Clock,
  DollarSign,
  BarChart3,
  LogOut,
  PieChart,
  Calendar,
  User,
  Bell,
  Shield,
  CreditCard,
  MessageSquare,
  HelpCircle,
  Settings,
} from "lucide-react";
import { removeToken, getCurrentUser } from "@/lib/auth";
import { toast } from "sonner";
import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  role?: "employer" | "employee" | "super_admin";
}

const DashboardLayout = ({
  children,
  title,
  subtitle,
  role = "employer",
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    removeToken();
    toast.success("Logged out successfully");
    navigate("/auth/login");
  };

  const employerMenuItems = [
    { icon: Building2, label: "Dashboard", link: "/employer" },
    { icon: Users, label: "Employees", link: "/employer/employees" },
    { icon: Clock, label: "Time Logs", link: "/employer/timelogs" },
    { icon: DollarSign, label: "Payments", link: "/employer/payments" },
    { icon: PieChart, label: "Payroll", link: "/employer/payroll-summary" },
    { icon: BarChart3, label: "Analytics", link: "/employer/analytics" },
    { icon: Settings, label: "Company Settings", link: "/employer/company" },
    { icon: CreditCard, label: "Subscription", link: "/employer/subscription" },
    { icon: HelpCircle, label: "Support", link: "/employer/support" },
  ];

  const employeeMenuItems = [
    { icon: Clock, label: "Dashboard", link: "/employee" },
    { icon: Calendar, label: "Time Logs", link: "/employee/logs" },
    { icon: DollarSign, label: "Payments", link: "/employee/payments" },
    { icon: HelpCircle, label: "Support", link: "/employee/support" },
  ];

  const superAdminMenuItems = [
    { icon: Shield, label: "Dashboard", link: "/super-admin" },
    { icon: Building2, label: "Companies", link: "/super-admin/companies" },
    { icon: Users, label: "Users", link: "/super-admin/users" },
    {
      icon: CreditCard,
      label: "Subscriptions",
      link: "/super-admin/subscriptions",
    },
    { icon: MessageSquare, label: "Contacts", link: "/super-admin/contacts" },
    { icon: BarChart3, label: "Analytics", link: "/super-admin/analytics" },
  ];

  const menuItems =
    role === "super_admin"
      ? superAdminMenuItems
      : role === "employer"
      ? employerMenuItems
      : employeeMenuItems;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-24 bg-gradient-to-b from-white/70 to-gray-50/60 dark:from-[#071026] dark:to-[#041020] border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-6 space-y-6 fixed top-0 left-0 h-full z-50 shadow-elegant">
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-md">
          <Clock className="w-6 h-6 text-white" />
        </div>

        <nav className="flex-1 flex flex-col space-y-3 overflow-y-auto pr-2 no-scrollbar w-full items-center">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.link}
              className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-200 hover:text-black dark:hover:text-white group"
              title={item.label}
            >
              <item.icon className="w-5 h-5 group-hover:scale-105 transition-transform" />
            </Link>
          ))}
        </nav>

        <div className="flex flex-col space-y-3">
          <button
            onClick={() => navigate("/me")}
            className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-200"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </button>

          <button
            onClick={handleLogout}
            className="w-12 h-12 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 hover:text-red-600"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-24">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            {title && (
              <h1 className="text-2xl font-bold text-black">{title}</h1>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <Clock className="w-4 h-4 inline mr-1" />
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-10 h-10 rounded-full p-0"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <button
              onClick={() => navigate("/me")}
              className="flex items-center space-x-3 pl-4 border-l hover:opacity-80 transition-opacity"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-black">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {role === "super_admin" ? "Super Admin" : role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold cursor-pointer">
                {user?.name?.charAt(0)}
              </div>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8">
          {subtitle && (
            <div className="mb-6">
              <p className="text-gray-600">{subtitle}</p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
