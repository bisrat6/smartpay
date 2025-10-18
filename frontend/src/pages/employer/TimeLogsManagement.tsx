import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { timeLogApi } from '@/lib/api';
import { format } from 'date-fns';

const TimeLogsManagement = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPendingLogs();
  }, []);

  const fetchPendingLogs = async () => {
    try {
      const response = await timeLogApi.getCompanyLogs({ status: 'pending' });
      setLogs(response.data.timeLogs || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch logs');
    }
  };

  const handleApprove = async (logId: string) => {
    setLoading(true);
    try {
      await timeLogApi.approve(logId, { status: 'approved' });
      toast.success('Time log approved!');
      fetchPendingLogs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve log');
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (clockIn: string, clockOut?: string) => {
    if (!clockOut) return 'Active';
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    return `${hours} hrs`;
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
            <h1 className="text-xl font-bold">Time Logs</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Review and approve employee time logs</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No pending logs</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-medium">{log.employeeId?.userId?.name}</TableCell>
                      <TableCell>{format(new Date(log.clockIn), 'PPp')}</TableCell>
                      <TableCell>
                        {log.clockOut ? format(new Date(log.clockOut), 'PPp') : '-'}
                      </TableCell>
                      <TableCell>{calculateDuration(log.clockIn, log.clockOut)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'approved' ? 'default' : 'secondary'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(log._id)}
                          disabled={loading || log.status === 'approved'}
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
      </main>
    </div>
  );
};

export default TimeLogsManagement;
