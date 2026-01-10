import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Clock, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Download,
  Grid3x3,
  List,
  ArrowUpDown,
  Filter,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import { employeeApi, timeLogApi } from '@/lib/api';
import { format } from 'date-fns';
import DashboardLayout from '@/components/DashboardLayout';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<any>(null);
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalAttendance: 0,
    avgCheckIn: '--:--',
    avgCheckOut: '--:--',
    onTimePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    if (id) {
      setPageLoading(true);
      Promise.all([fetchEmployeeData(), fetchTimeLogs()]).finally(() => {
        setPageLoading(false);
      });
    }
  }, [id, statusFilter]);

  const fetchEmployeeData = async () => {
    try {
      const response = await employeeApi.get(id!);
      setEmployee(response.data.employee);
    } catch (error: any) {
      toast.error('Failed to fetch employee details');
      console.error(error);
    }
  };

  const fetchTimeLogs = async () => {
    setLoading(true);
    try {
      const params: any = { employeeId: id };
      if (statusFilter !== 'all') params.status = statusFilter;
      
      const response = await timeLogApi.getCompanyLogs(params);
      const logs = response.data.timeLogs || [];
      setTimeLogs(logs);
      calculateStats(logs);
    } catch (error: any) {
      console.error('Failed to fetch time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logs: any[]) => {
    const completedLogs = logs.filter(log => log.clockOut);
    
    if (completedLogs.length === 0) {
      return;
    }

    // Calculate average check-in time
    const avgCheckInMinutes = completedLogs.reduce((sum, log) => {
      const date = new Date(log.clockIn);
      return sum + (date.getHours() * 60 + date.getMinutes());
    }, 0) / completedLogs.length;
    
    const avgCheckInHours = Math.floor(avgCheckInMinutes / 60);
    const avgCheckInMins = Math.round(avgCheckInMinutes % 60);
    
    // Calculate average check-out time
    const avgCheckOutMinutes = completedLogs.reduce((sum, log) => {
      const date = new Date(log.clockOut);
      return sum + (date.getHours() * 60 + date.getMinutes());
    }, 0) / completedLogs.length;
    
    const avgCheckOutHours = Math.floor(avgCheckOutMinutes / 60);
    const avgCheckOutMins = Math.round(avgCheckOutMinutes % 60);
    
    // Calculate on-time percentage (before 9:00 AM)
    const onTimeCount = completedLogs.filter(log => {
      const checkIn = new Date(log.clockIn);
      const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
      return checkInMinutes <= 9 * 60; // 9:00 AM
    }).length;
    
    setStats({
      totalAttendance: logs.length,
      avgCheckIn: `${String(avgCheckInHours).padStart(2, '0')}:${String(avgCheckInMins).padStart(2, '0')}`,
      avgCheckOut: `${String(avgCheckOutHours).padStart(2, '0')}:${String(avgCheckOutMins).padStart(2, '0')}`,
      onTimePercentage: Math.round((onTimeCount / completedLogs.length) * 100)
    });
  };

  const getStatusBadge = (log: any) => {
    if (!log.clockOut) return <Badge variant="secondary">Active</Badge>;
    
    const checkIn = new Date(log.clockIn);
    const checkInMinutes = checkIn.getHours() * 60 + checkIn.getMinutes();
    
    if (checkInMinutes <= 9 * 60) {
      return <Badge className="bg-green-500 text-white">On Time</Badge>;
    } else if (checkInMinutes <= 9 * 60 + 15) {
      return <Badge className="bg-yellow-500 text-white">Late</Badge>;
    } else {
      return <Badge variant="destructive">Very Late</Badge>;
    }
  };

  const paginatedLogs = timeLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(timeLogs.length / itemsPerPage);

  if (pageLoading || !employee) {
    return (
      <DashboardLayout title="Employee Details" subtitle="Loading..." role="employer">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Employee Details" 
      subtitle="View detailed employee information and attendance history"
      role="employer"
    >
      <Button 
        variant="ghost" 
        onClick={() => navigate('/employer/employees')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Employees
      </Button>

      {/* Employee Profile Card */}
      <Card className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl mb-6">
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24 border-4 border-white/20">
                <AvatarFallback className="bg-white/10 text-white text-2xl font-bold">
                  {employee.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h2 className="text-3xl font-bold mb-2">{employee.name}</h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-4">
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Award className="w-4 h-4" />
                    <span>{employee.position || employee.jobRoleId?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Phone className="w-4 h-4" />
                    <span>{employee.telebirrMsisdn || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-300">
                    <Mail className="w-4 h-4" />
                    <span>{employee.email}</span>
                  </div>
                  {employee.address && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <MapPin className="w-4 h-4" />
                      <span>{employee.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Download className="w-4 h-4 mr-2" />
              Download Info
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalAttendance}</p>
                  <p className="text-sm text-gray-300">Total Attendance</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgCheckIn}</p>
                  <p className="text-sm text-gray-300">Avg Check In Time</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgCheckOut}</p>
                  <p className="text-sm text-gray-300">Avg Check Out Time</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.onTimePercentage}%</p>
                  <p className="text-sm text-gray-300">On Time Rate</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="bg-white rounded-2xl border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-black">Attendance History</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          ) : timeLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No attendance records found</p>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-3'}>
                {paginatedLogs.map((log) => (
                  <div
                    key={log._id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-black transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-black">
                          {format(new Date(log.clockIn), 'MMMM dd, yyyy')}
                        </span>
                      </div>
                      {getStatusBadge(log)}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check In Time</p>
                        <p className="font-semibold text-black">
                          {format(new Date(log.clockIn), 'HH:mm')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Check Out Time</p>
                        <p className="font-semibold text-black">
                          {log.clockOut ? format(new Date(log.clockOut), 'HH:mm') : '-'}
                        </p>
                      </div>
                    </div>

                    {log.duration > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">Total Hours</p>
                        <p className="font-semibold text-black">{log.duration.toFixed(2)}h</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-6">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EmployeeDetail;

