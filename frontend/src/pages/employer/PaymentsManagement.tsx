import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, DollarSign, CheckCircle2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { paymentApi, employeeApi } from '@/lib/api';
import { format } from 'date-fns';

const PaymentsManagement = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [calculatedAmount, setCalculatedAmount] = useState<any>(null);

  useEffect(() => {
    fetchPendingPayments();
    fetchEmployees();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      const response = await paymentApi.getPending();
      setPayments(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch payments');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      setEmployees(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch employees');
    }
  };

  const handleCalculate = async () => {
    if (!selectedEmployee || !periodStart || !periodEnd) {
      toast.error('Please fill all fields');
      return;
    }
    
    setLoading(true);
    try {
      const response = await paymentApi.calculate({
        employeeId: selectedEmployee,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      });
      setCalculatedAmount(response.data);
      toast.success('Payment calculated!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to calculate payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async () => {
    if (!calculatedAmount) return;
    
    setLoading(true);
    try {
      await paymentApi.create({
        employeeId: selectedEmployee,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        totalHours: calculatedAmount.totalHours,
        amount: calculatedAmount.amount,
      });
      toast.success('Payment created!');
      setDialogOpen(false);
      setSelectedEmployee('');
      setPeriodStart('');
      setPeriodEnd('');
      setCalculatedAmount(null);
      fetchPendingPayments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    setLoading(true);
    try {
      await paymentApi.approve(paymentId);
      toast.success('Payment approved!');
      fetchPendingPayments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async (paymentId: string) => {
    setLoading(true);
    try {
      await paymentApi.disburse(paymentId);
      toast.success('Payment disbursed!');
      fetchPendingPayments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to disburse payment');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-xl font-bold">Payments</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <DollarSign className="w-4 h-4 mr-2" />
                Calculate Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calculate Payment</DialogTitle>
                <DialogDescription>
                  Calculate payment for an employee's work period
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee</Label>
                  <select
                    id="employee"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start">Period Start</Label>
                  <Input
                    id="start"
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Period End</Label>
                  <Input
                    id="end"
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                  />
                </div>
                
                {calculatedAmount && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Hours:</span>
                      <span className="font-semibold">{calculatedAmount.totalHours}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Amount:</span>
                      <span className="font-semibold text-lg">${calculatedAmount.amount}</span>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={handleCalculate} disabled={loading}>
                  Calculate
                </Button>
                <Button onClick={handleCreatePayment} disabled={!calculatedAmount || loading}>
                  Create Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment List
            </CardTitle>
            <CardDescription>Manage employee payments</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending payments</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">{payment.employeeId?.userId?.name}</TableCell>
                      <TableCell>
                        {format(new Date(payment.periodStart), 'PP')} - {format(new Date(payment.periodEnd), 'PP')}
                      </TableCell>
                      <TableCell>{payment.totalHours}</TableCell>
                      <TableCell className="font-semibold">${payment.amount}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.status === 'disbursed' ? 'default' : 
                          payment.status === 'approved' ? 'secondary' : 
                          'outline'
                        }>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payment.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(payment._id)}
                              disabled={loading}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          {payment.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleDisburse(payment._id)}
                              disabled={loading}
                            >
                              <Send className="w-4 h-4 mr-1" />
                              Disburse
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaymentsManagement;
