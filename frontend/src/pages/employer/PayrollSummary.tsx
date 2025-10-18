import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  DollarSign, 
  Download, 
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Building2,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentApi, companyApi, employeeApi } from '@/lib/api';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

const PayrollSummary = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchData = async () => {
    await Promise.all([
      fetchSummary(),
      fetchCompany(),
      fetchEmployees()
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
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employer')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Payroll Summary</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Company Info */}
        {company && (
          <Card className="shadow-elegant gradient-card mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {company.name}
              </CardTitle>
              <CardDescription>Payroll Summary for {getDateRangeLabel()}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment Cycle</p>
                  <p className="font-semibold capitalize">{company.paymentCycle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Rate</p>
                  <p className="font-semibold">{company.bonusRateMultiplier}x</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Daily Hours</p>
                  <p className="font-semibold">{company.maxDailyHours}h</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                  <p className="font-semibold">{employees.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Range Selector */}
        <Card className="shadow-elegant mb-6">
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
            <Card className="shadow-elegant gradient-card">
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

            <Card className="shadow-elegant gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-3xl font-bold">${summary.totalAmountPaid?.toFixed(2) || '0.00'}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(summary.totalAmountPaid || 0, summary.previousTotalAmountPaid || 0)}
                      <span className="text-sm text-muted-foreground">
                        {getTrendPercentage(summary.totalAmountPaid || 0, summary.previousTotalAmountPaid || 0)}
                      </span>
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-elegant gradient-card">
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

            <Card className="shadow-elegant gradient-card">
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
            <Card className="shadow-elegant">
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

            <Card className="shadow-elegant">
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
                      ${summary.totalAmountPaid && summary.totalPayments 
                        ? (summary.totalAmountPaid / summary.totalPayments).toFixed(2) 
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
        <Card className="shadow-elegant mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest payroll activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Recent activity will appear here</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PayrollSummary;
