import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, DollarSign } from 'lucide-react';
import { paymentApi } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Payments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchMyPayments();
  }, []);

  const fetchMyPayments = async () => {
    try {
      const response = await paymentApi.getMyPayments();
      setPayments(response.data.payments || []);
    } catch (error: any) {
      console.error('Failed to fetch payments');
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch payments');
    }
  };

  const totalEarnings = payments.reduce((sum, payment) => 
    payment.status === 'completed' ? sum + payment.amount : sum, 0
  );

  const pendingAmount = payments.reduce((sum, payment) => 
    payment.status !== 'completed' ? sum + payment.amount : sum, 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employee')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">My Payments</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Total Earnings</CardTitle>
              <CardDescription>Disbursed payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-3xl font-bold">${totalEarnings.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle className="text-lg">Pending Amount</CardTitle>
              <CardDescription>Awaiting disbursement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <span className="text-3xl font-bold">${pendingAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment History
            </CardTitle>
            <CardDescription>View all your payments</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No payments yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-medium">
                        {format(new Date(payment.period.startDate), 'PP')} - {format(new Date(payment.period.endDate), 'PP')}
                      </TableCell>
                      <TableCell>{(payment.regularHours + payment.bonusHours).toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${payment.amount}</TableCell>
                      <TableCell>
                        <Badge variant={
                          payment.status === 'completed' ? 'default' : 
                          payment.status === 'approved' ? 'secondary' : 
                          payment.status === 'processing' ? 'secondary' :
                          payment.status === 'failed' ? 'destructive' :
                          'outline'
                        }>
                          {payment.status}
                        </Badge>
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
      </main>
    </div>
  );
};

export default Payments;
