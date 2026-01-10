import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  Download, 
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentApi, companyApi, employeeApi } from '@/lib/api';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

const PayrollSummary = () => {
  const [summary, setSummary] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    const isInitial = isInitialMount.current;
    if (isInitial) {
      isInitialMount.current = false;
      setPageLoading(true);
    }
    fetchData().finally(() => {
      if (isInitial) {
        setPageLoading(false);
      }
    });
  }, [dateRange, customStartDate, customEndDate]);

  const fetchData = async () => {
    await Promise.all([
      fetchSummary(),
      fetchCompany(),
      fetchEmployees(),
      fetchRecentActivities()
    ]);
  };

  const fetchSummary = async () => {
    try {
      let params: any = {};
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      } else {
        const now = new Date();
        let startDate: Date;
        
        switch (dateRange) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'week':
            startDate = subWeeks(now, 1);
            break;
          case 'month':
            startDate = subMonths(now, 1);
            break;
          case 'quarter':
            startDate = subMonths(now, 3);
            break;
          case 'year':
            startDate = subMonths(now, 12);
            break;
          default:
            startDate = subMonths(now, 1);
        }
        
        params.startDate = startDate.toISOString();
        params.endDate = endOfDay(now).toISOString();
      }

      const response = await paymentApi.getSummary(params);
      setSummary(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch summary');
    }
  };

  const fetchCompany = async () => {
    try {
      const response = await companyApi.getMy();
      setCompany(response.data.company);
    } catch (error: any) {
      console.error('Failed to fetch company:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      setEmployees(response.data.employees || []);
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleExport = () => {
    if (!summary || !company) {
      toast.error('No data available to export');
      return;
    }

    try {
      // Prepare CSV data
      const csvRows = [];
      
      // Header
      csvRows.push('Payroll Summary Report');
      csvRows.push(`Company: ${company.name}`);
      csvRows.push(`Period: ${getDateRangeLabel()}`);
      csvRows.push(`Generated: ${format(new Date(), 'PPpp')}`);
      csvRows.push('');
      
      // Summary Statistics
      csvRows.push('Summary Statistics');
      csvRows.push('Metric,Value');
      csvRows.push(`Total Amount,${summary.totalAmount || 0}`);
      csvRows.push(`Pending Payments,${summary.pendingPayments || 0}`);
      csvRows.push(`Completed Payments,${summary.completedPayments || 0}`);
      csvRows.push(`Failed Payments,${summary.failedPayments || 0}`);
      csvRows.push(`Processing Payments,${summary.processingPayments || 0}`);
      csvRows.push(`Total Employees,${summary.totalEmployees || 0}`);
      csvRows.push('');
      
      // Employee Details
      if (employees.length > 0) {
        csvRows.push('Employee Details');
        csvRows.push('Name,Email,Job Role,Status');
        employees.forEach(emp => {
          const jobRole = emp.jobRoleId?.name || 'N/A';
          csvRows.push(`"${emp.name}","${emp.email}","${jobRole}","${emp.isActive ? 'Active' : 'Inactive'}"`);
        });
      }
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `payroll_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'quarter': return 'Last 3 Months';
      case 'year': return 'Last 12 Months';
      case 'custom': return 'Custom Range';
      default: return 'Last 30 Days';
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <BarChart3 className="w-4 h-4 text-gray-600" />;
  };

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const fetchRecentActivities = async () => {
    try {
      // For now, we'll create mock recent activities based on payments
      // In a real implementation, you'd have a dedicated activities endpoint
      const response = await paymentApi.list({ limit: 10 });
      const payments = response.data.payments || [];
      
      const activities = payments.map((payment: any) => ({
        id: payment._id,
        type: 'payment',
        action: payment.status === 'completed' ? 'completed' : payment.status === 'approved' ? 'approved' : 'created',
        description: `Payment ${payment.status === 'completed' ? 'completed' : payment.status === 'approved' ? 'approved' : 'created'} for ${payment.employeeId?.name || 'Employee'}`,
        amount: payment.amount,
        timestamp: payment.updatedAt || payment.createdAt,
        status: payment.status
      }));
      
      setRecentActivities(activities);
    } catch (error: any) {
      console.error('Failed to fetch recent activities:', error);
    }
  };

  if (pageLoading) {
    return (
      <DashboardLayout 
        title="Payroll Summary" 
        subtitle="Loading..."
        role="employer"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payroll summary...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Payroll Summary" 
      subtitle="View comprehensive payroll reports and analytics"
      role="employer"
    >
      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-40"
              />
              <span>to</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handleExport} className="border-black text-black hover:bg-gray-50">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary for period */}
      {company && summary && (
        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{company.name}</h2>
              <p className="text-gray-300">Payroll Summary for {getDateRangeLabel()}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalEmployeesPaid || 0}</p>
                  <p className="text-sm text-gray-300">Employees Paid</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalAmount?.toLocaleString() || 0} ETB</p>
                  <p className="text-sm text-gray-300">Total Paid</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalPayments || 0}</p>
                  <p className="text-sm text-gray-300">Payments</p>
                </div>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.avgPayment?.toLocaleString() || 0} ETB</p>
                  <p className="text-sm text-gray-300">Avg Payment</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white rounded-2xl border border-gray-200">
            <CardHeader>
              <CardTitle>Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-black mb-2">{summary.pendingPayments || 0}</p>
                <p className="text-sm text-gray-500">Awaiting approval</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-gray-200">
            <CardHeader>
              <CardTitle>Completed Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-black mb-2">{summary.completedPayments || 0}</p>
                <p className="text-sm text-gray-500">Successfully processed</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-2xl border border-gray-200">
            <CardHeader>
              <CardTitle>Failed Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-black mb-2">{summary.failedPayments || 0}</p>
                <p className="text-sm text-gray-500">Need attention</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        {/* Date Range Selector */}
        <Card className="bg-white rounded-2xl border border-gray-200 mb-6">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="dateRange">Period</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last 3 Months</SelectItem>
                    <SelectItem value="year">Last 12 Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateRange === 'custom' && (
                <>
                  <div className="flex-1">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                    <p className="text-3xl font-bold">{summary.totalPayments || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(summary.totalPayments || 0, summary.previousTotalPayments || 0)}
                      <span className="text-sm text-muted-foreground">
                        {getTrendPercentage(summary.totalPayments || 0, summary.previousTotalPayments || 0)}
                      </span>
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold">${(summary.totalAmount || 0).toFixed(2)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(summary.totalAmount || 0, summary.previousTotalAmount || 0)}
                      <span className="text-sm text-muted-foreground">
                        {getTrendPercentage(summary.totalAmount || 0, summary.previousTotalAmount || 0)}
                      </span>
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-3xl font-bold">{summary.pendingPayments || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-muted-foreground">Awaiting approval</span>
                    </div>
                  </div>
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-3xl font-bold">{summary.failedPayments || 0}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-muted-foreground">Need retry</span>
                    </div>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Statistics */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Payment Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Completed</span>
                    </div>
                    <span className="font-semibold">{summary.completedPayments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span>Pending</span>
                    </div>
                    <span className="font-semibold">{summary.pendingPayments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Processing</span>
                    </div>
                    <span className="font-semibold">{summary.processingPayments || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Failed</span>
                    </div>
                    <span className="font-semibold">{summary.failedPayments || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-2xl border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Employee Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Employees</span>
                    <span className="font-semibold">{employees.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Employees</span>
                    <span className="font-semibold">{employees.filter(emp => emp.isActive).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Payment</span>
                    <span className="font-semibold">
                      ${summary.totalAmount && summary.totalPayments 
                        ? (summary.totalAmount / summary.totalPayments).toFixed(2) 
                        : '0.00'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total Hours Logged</span>
                    <span className="font-semibold">{summary.totalHoursLogged?.toFixed(2) || '0.00'}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <Card className="bg-white rounded-2xl border border-gray-200 mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest payroll activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(activity.timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${activity.amount?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-muted-foreground capitalize">{activity.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
};

export default PayrollSummary;
