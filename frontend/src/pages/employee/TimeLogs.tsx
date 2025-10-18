import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock } from 'lucide-react';
import { timeLogApi } from '@/lib/api';
import { format } from 'date-fns';

const TimeLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchMyLogs();
  }, []);

  const fetchMyLogs = async () => {
    try {
      const response = await timeLogApi.getMyLogs();
      setLogs(response.data.timeLogs || []);
    } catch (error) {
      console.error('Failed to fetch logs');
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/employee')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">My Time Logs</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Time Log History
            </CardTitle>
            <CardDescription>View your clock in/out records</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No time logs yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.clockIn), 'PP')}
                      </TableCell>
                      <TableCell>{format(new Date(log.clockIn), 'p')}</TableCell>
                      <TableCell>
                        {log.clockOut ? format(new Date(log.clockOut), 'p') : '-'}
                      </TableCell>
                      <TableCell>{calculateDuration(log.clockIn, log.clockOut)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.status === 'approved' ? 'default' : 
                          log.status === 'pending' ? 'secondary' : 
                          'outline'
                        }>
                          {log.status}
                        </Badge>
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

export default TimeLogs;
