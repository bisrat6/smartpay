import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, BarChart3, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { analyticsApi } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  const handleGenerate = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setLoading(true);
    try {
      const response = await analyticsApi.generateAttendance({
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      });
      setAnalyticsData(response.data);
      toast.success('Analytics generated!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to generate analytics');
    } finally {
      setLoading(false);
    }
  };

  const chartData = analyticsData?.employeeStats?.map((stat: any) => ({
    name: stat.employeeName,
    hours: stat.totalHours,
    days: stat.daysWorked,
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/employer')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">Analytics</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-elegant gradient-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Generate Analytics
            </CardTitle>
            <CardDescription>Select a time period to analyze attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-end">
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  {loading ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {analyticsData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg">Total Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="text-3xl font-bold">{analyticsData.totalHoursWorked?.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg">Employees</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold">{analyticsData.employeeStats?.length || 0}</span>
                </CardContent>
              </Card>

              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg">Avg Hours/Employee</CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-3xl font-bold">
                    {analyticsData.employeeStats?.length 
                      ? (analyticsData.totalHoursWorked / analyticsData.employeeStats.length).toFixed(2)
                      : '0'
                    }
                  </span>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Hours Worked by Employee</CardTitle>
                <CardDescription>Visual breakdown of employee attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" name="Total Hours" />
                    <Bar dataKey="days" fill="hsl(var(--accent))" name="Days Worked" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Analytics;
