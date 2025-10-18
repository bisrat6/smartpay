import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock,
  User,
  Calendar,
  CreditCard,
  AlertCircle,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { paymentApi, companyApi } from '@/lib/api';
import { format } from 'date-fns';

const PaymentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPaymentDetails();
      fetchCompany();
    }
  }, [id]);

  const fetchPaymentDetails = async () => {
    if (!id) return;
    
    try {
      const response = await paymentApi.get(id);
      setPayment(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch payment details');
      navigate('/employer/payments');
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

  const handleApprove = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      await paymentApi.approveSingle(payment._id);
      toast.success('Payment approved successfully!');
      await fetchPaymentDetails();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      const response = await paymentApi.approveSingle(payment._id);
      toast.success(response.data.message || 'Payment retry initiated!');
      await fetchPaymentDetails();
    } catch (error: any) {
      console.error('Retry payment error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to retry payment');
    } finally {
      setLoading(false);
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
    
    const icons: any = {
      'pending': Clock,
      'approved': CheckCircle2,
      'processing': RefreshCw,
      'completed': CheckCircle2,
      'failed': XCircle,
      'cancelled': XCircle
    };
    
    const Icon = icons[status] || AlertCircle;
    
    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  if (!payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-4" />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employer/payments')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Payments
            </Button>
            <h1 className="text-xl font-bold">Payment Details</h1>
          </div>
          <div className="flex gap-2">
            {payment.status === 'pending' && (
              <Button onClick={handleApprove} disabled={loading}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Payment
              </Button>
            )}
            {payment.status === 'failed' && (
              <Button variant="outline" onClick={handleRetry} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Payment
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment ID</p>
                    <p className="font-mono text-sm">{payment._id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-1">
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold">${payment.amount?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p>{format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Hours</p>
                    <p className="text-lg font-semibold">{payment.regularHours?.toFixed(2) || '0.00'}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bonus Hours</p>
                    <p className="text-lg font-semibold">{payment.bonusHours?.toFixed(2) || '0.00'}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="text-lg font-semibold">${payment.hourlyRate?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bonus Multiplier</p>
                    <p className="text-lg font-semibold">{payment.bonusRateMultiplier?.toFixed(1) || '1.0'}x</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Period</p>
                  <p className="text-lg">
                    {format(new Date(payment.period?.startDate || payment.periodStart), 'MMM dd, yyyy')} - {format(new Date(payment.period?.endDate || payment.periodEnd), 'MMM dd, yyyy')}
                  </p>
                </div>

                {payment.failureReason && (
                  <>
                    <Separator />
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertCircle className="w-4 h-4" />
                        <p className="font-semibold">Failure Reason</p>
                      </div>
                      <p className="text-red-700 mt-1">{payment.failureReason}</p>
                    </div>
                  </>
                )}

                {payment.arifpayTransactionId && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Transaction ID</p>
                      <p className="font-mono text-sm">{payment.arifpayTransactionId}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Employee Information */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Employee Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold">{payment.employeeId?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{payment.employeeId?.email || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-semibold">{payment.employeeId?.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="font-semibold">{payment.employeeId?.position || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Information */}
            {company && (
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Company
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
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

            {/* Payment Timeline */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-semibold">Payment Created</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {payment.approvedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-semibold">Approved</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.approvedAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {payment.paymentDate && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <div>
                        <p className="text-sm font-semibold">Payment Completed</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.paymentDate), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payment.status === 'pending' && (
                  <Button 
                    className="w-full" 
                    onClick={handleApprove} 
                    disabled={loading}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve Payment
                  </Button>
                )}
                
                {payment.status === 'failed' && (
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={handleRetry} 
                    disabled={loading}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Payment
                  </Button>
                )}
                
                <Button 
                  className="w-full" 
                  variant="outline" 
                  onClick={() => navigate('/employer/payments')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Payments
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentDetails;
