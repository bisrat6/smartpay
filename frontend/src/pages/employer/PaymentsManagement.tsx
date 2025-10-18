import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Download, 
  Filter,
  Building2,
  Users,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentApi, employeeApi, companyApi } from '@/lib/api';
import { format } from 'date-fns';

const PaymentsManagement = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Bulk operations
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  
  const isInitialMount = useRef(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPayments = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (employeeFilter !== 'all') params.employeeId = employeeFilter;
      
      const response = await paymentApi.list(params);
      setPayments(response.data.payments || []);
    } catch (error: any) {
      console.error('Fetch payments error:', error);
      if (error?.response?.status !== 429) {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch payments');
      }
    }
  }, [statusFilter, employeeFilter]);

  useEffect(() => {
    fetchCompany();
    fetchEmployees();
    fetchSummary();
    fetchPayments();
  }, []);

  useEffect(() => {
    // Skip on initial mount since we already fetch in the first useEffect
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear any pending timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the API call by 500ms
    fetchTimeoutRef.current = setTimeout(() => {
      fetchPayments();
    }, 500);

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [statusFilter, employeeFilter, fetchPayments]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      setEmployees(response.data.employees || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch employees');
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

  const fetchSummary = async () => {
    try {
      const response = await paymentApi.getSummary();
      setSummary(response.data);
    } catch (error: any) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleProcessPayroll = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.processPayroll();
      const message = response.data.message || 'Payroll processed successfully!';
      const pendingCount = response.data.payments?.pending || 0;
      toast.success(`${message} (${pendingCount} pending payments created)`);
      await fetchPayments();
      await fetchSummary();
    } catch (error: any) {
      console.error('Process payroll error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to process payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSingle = async (paymentId: string) => {
    setLoading(true);
    try {
      await paymentApi.approveSingle(paymentId);
      toast.success('Payment approved successfully!');
      await fetchPayments();
      await fetchSummary();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    if (!bulkStartDate || !bulkEndDate) {
      toast.error('Please select start and end dates');
      return;
    }
    
    setLoading(true);
    try {
      const response = await paymentApi.approveBulk({
        startDate: bulkStartDate,
        endDate: bulkEndDate
      });
      
      const data = response.data;
      const approved = data.approved || 0;
      const successful = data.successful || 0;
      const failed = data.failed || 0;
      
      if (approved === 0) {
        toast.info('No pending payments found for the selected period');
      } else {
        toast.success(`Bulk approval completed: ${approved} approved, ${successful} processed successfully, ${failed} failed`);
      }
      
      setSelectedPayments([]);
      setBulkDialogOpen(false);
      setBulkStartDate('');
      setBulkEndDate('');
      await fetchPayments();
      await fetchSummary();
    } catch (error: any) {
      console.error('Bulk approve error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve payments');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setLoading(true);
    try {
      const response = await paymentApi.retryFailed();
      const results = response.data.results || [];
      
      if (results.length === 0) {
        toast.info('No failed payments to retry');
      } else {
        const successful = results.filter((r: any) => r.success).length;
        const failed = results.length - successful;
        
        if (successful > 0 && failed === 0) {
          toast.success(`All ${successful} failed payments successfully retried!`);
        } else if (successful > 0) {
          toast.success(`Retry completed: ${successful} successful, ${failed} still failed`);
        } else {
          toast.error(`All retry attempts failed (${failed} payments)`);
        }
      }
      
      await fetchPayments();
      await fetchSummary();
    } catch (error: any) {
      console.error('Retry failed payments error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to retry payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPayment = (paymentId: string) => {
    setSelectedPayments(prev => 
      prev.includes(paymentId) 
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(payments.map(p => p._id));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      'pending': 'outline',
      'approved': 'secondary',
      'processing': 'secondary',
      'completed': 'default',
      'failed': 'destructive',
      'cancelled': 'outline'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const filteredPayments = payments.filter(payment => {
    if (dateFilter === 'today') {
      const today = new Date();
      const paymentDate = new Date(payment.createdAt);
      return paymentDate.toDateString() === today.toDateString();
    }
    if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(payment.createdAt) >= weekAgo;
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return new Date(payment.createdAt) >= monthAgo;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employer')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Payment Management</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleProcessPayroll} disabled={loading}>
              <DollarSign className="w-4 h-4 mr-2" />
              Process Payroll
            </Button>
            <Button variant="outline" onClick={handleRetryFailed} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Failed
            </Button>
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bulk Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Approve Payments</DialogTitle>
                  <DialogDescription>
                    Approve all payments for a specific period
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkStart">Start Date</Label>
                    <Input
                      id="bulkStart"
                      type="date"
                      value={bulkStartDate}
                      onChange={(e) => setBulkStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkEnd">End Date</Label>
                    <Input
                      id="bulkEnd"
                      type="date"
                      value={bulkEndDate}
                      onChange={(e) => setBulkEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleBulkApprove} disabled={loading}>
                    {loading ? 'Approving...' : 'Approve All'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-semibold">{company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Cycle</p>
                  <p className="font-semibold capitalize">{company.paymentCycle}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Rate</p>
                  <p className="font-semibold">{company.bonusRateMultiplier}x</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="shadow-elegant gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="text-2xl font-bold">${summary.totalAmountPaid?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-elegant gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{summary.pendingPayments || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-elegant gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Employees</p>
                    <p className="text-2xl font-bold">{summary.employeeCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-elegant gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold">{summary.failedPayments || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payments">All Payments</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      All Payments
                    </CardTitle>
                    <CardDescription>Manage all employee payments</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp._id} value={emp._id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No payments found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={selectedPayments.length === filteredPayments.length}
                            onChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedPayments.includes(payment._id)}
                              onChange={() => handleSelectPayment(payment._id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.employeeId?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.period?.startDate || payment.periodStart), 'MMM dd')} - {format(new Date(payment.period?.endDate || payment.periodEnd), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {(payment.regularHours + (payment.bonusHours || 0)).toFixed(2)}h
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${payment.amount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {payment.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveSingle(payment._id)}
                                  disabled={loading}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/employer/payments/${payment._id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
                <CardDescription>Payments awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPayments.filter(p => p.status === 'pending').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                    <p className="text-muted-foreground">No pending payments</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.filter(p => p.status === 'pending').map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">
                            {payment.employeeId?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${payment.amount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.period?.startDate || payment.periodStart), 'MMM dd')} - {format(new Date(payment.period?.endDate || payment.periodEnd), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleApproveSingle(payment._id)}
                              disabled={loading}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Completed Payments</CardTitle>
                <CardDescription>Successfully processed payments</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPayments.filter(p => p.status === 'completed').length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No completed payments</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Transaction ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.filter(p => p.status === 'completed').map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">
                            {payment.employeeId?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${payment.amount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.period?.startDate || payment.periodStart), 'MMM dd')} - {format(new Date(payment.period?.endDate || payment.periodEnd), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.paymentDate || payment.updatedAt), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {payment.arifpayTransactionId || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="failed">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Failed Payments</CardTitle>
                <CardDescription>Payments that failed to process</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredPayments.filter(p => p.status === 'failed').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-2" />
                    <p className="text-muted-foreground">No failed payments</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.filter(p => p.status === 'failed').map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">
                            {payment.employeeId?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${payment.amount?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.period?.startDate || payment.periodStart), 'MMM dd')} - {format(new Date(payment.period?.endDate || payment.periodEnd), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {payment.failureReason || 'Unknown error'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveSingle(payment._id)}
                              disabled={loading}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Retry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default PaymentsManagement;