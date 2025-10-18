import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Coffee, LogOut, DollarSign, Calendar } from 'lucide-react';
import { removeToken, getCurrentUser } from '@/lib/auth';
import { timeLogApi } from '@/lib/api';
import { toast } from 'sonner';

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [activeLog, setActiveLog] = useState<any>(null);
  const [onBreak, setOnBreak] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkClockStatus();
  }, []);

  const checkClockStatus = async () => {
    try {
      const response = await timeLogApi.getMyStatus();
      if (response.data.isClockedIn) {
        setActiveLog(response.data.currentLog);
      }
    } catch (error) {
      console.error('Failed to check clock status:', error);
    }
  };

  const handleLogout = () => {
    removeToken();
    toast.success('Logged out successfully');
    navigate('/auth/login');
  };

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const response = await timeLogApi.clockIn();
      setActiveLog(response.data.timeLog);
      toast.success('Clocked in successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      await timeLogApi.clockOut();
      setActiveLog(null);
      setOnBreak(false);
      toast.success('Clocked out successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      await timeLogApi.startBreak({ type: 'lunch' });
      setOnBreak(true);
      toast.success('Break started');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (!activeLog) return;
    setLoading(true);
    try {
      await timeLogApi.endBreak();
      setOnBreak(false);
      toast.success('Break ended');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SiraFlow</h1>
              <p className="text-xs text-muted-foreground">Employee Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome, {user?.name?.split(' ')[0]}</h2>
          <p className="text-muted-foreground">Track your time and manage your schedule</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle>Time Clock</CardTitle>
              <CardDescription>Clock in and out of your shifts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeLog ? (
                <Button 
                  onClick={handleClockIn} 
                  disabled={loading}
                  className="w-full h-24 text-lg"
                  size="lg"
                >
                  <Clock className="w-6 h-6 mr-2" />
                  Clock In
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Currently clocked in</p>
                    <p className="text-lg font-semibold">
                      {new Date(activeLog.clockIn).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {!onBreak ? (
                      <>
                        <Button 
                          onClick={handleStartBreak} 
                          disabled={loading}
                          variant="outline"
                        >
                          <Coffee className="w-4 h-4 mr-2" />
                          Start Break
                        </Button>
                        <Button 
                          onClick={handleClockOut} 
                          disabled={loading}
                          variant="destructive"
                        >
                          Clock Out
                        </Button>
                      </>
                    ) : (
                      <Button 
                        onClick={handleEndBreak} 
                        disabled={loading}
                        className="col-span-2"
                      >
                        End Break
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Access your information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/employee/logs')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Time Logs
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate('/employee/payments')}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payment History
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
