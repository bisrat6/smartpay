import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { timeLogApi, paymentApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";

const TimeLogsManagement = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [approvedUnpaidLogs, setApprovedUnpaidLogs] = useState<any[]>([]);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const isInitial = isInitialMount.current;
    if (isInitial) {
      isInitialMount.current = false;
      setPageLoading(true);
    }
    Promise.all([fetchLogs(), fetchApprovedUnpaidLogs()]).finally(() => {
      if (isInitial) {
        setPageLoading(false);
      }
    });
  }, [statusFilter]);

  const fetchLogs = async () => {
    try {
      const response = await timeLogApi.getCompanyLogs({
        status: statusFilter,
      });
      setLogs(response.data.timeLogs || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch logs"
      );
    }
  };

  const fetchApprovedUnpaidLogs = async () => {
    try {
      // Get approved time logs
      const logsResponse = await timeLogApi.getCompanyLogs({
        status: "approved",
      });
      const approvedLogs = logsResponse.data.timeLogs || [];
      console.log("Approved logs:", approvedLogs.length);

      // Get all payments to check which logs have been paid
      const paymentsResponse = await paymentApi.list();
      const payments = paymentsResponse.data.payments || [];
      console.log("All payments:", payments.length);
      console.log(
        "Payment statuses:",
        payments.map((p) => ({
          status: p.status,
          timeLogCount: p.timeLogIds?.length,
        }))
      );

      // Filter logs that don't have any payments (pending, processing, or completed)
      const unpaidLogs = approvedLogs.filter((log: any) => {
        // Check if this log is part of any payment (regardless of status)
        const hasPayment = payments.some((payment: any) => {
          // Check if payment includes this time log
          return payment.timeLogIds?.some((id: string) => id === log._id);
        });

        if (hasPayment) {
          console.log(`Log ${log._id} has payment, filtering out`);
        }

        return !hasPayment; // Show only logs without any payment
      });

      console.log("Unpaid logs after filtering:", unpaidLogs.length);
      setApprovedUnpaidLogs(unpaidLogs);
    } catch (error: any) {
      console.error("Failed to fetch approved unpaid logs:", error);
    }
  };

  const handleApprove = async (logId: string) => {
    setLoading(true);
    try {
      await timeLogApi.approve(logId, { status: "approved" });
      toast.success("Time log approved!");
      fetchLogs();
      fetchApprovedUnpaidLogs();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to approve log"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (logId: string) => {
    setLoading(true);
    try {
      await timeLogApi.approve(logId, {
        status: "rejected",
        notes: "Rejected by employer",
      });
      toast.success("Time log rejected");
      fetchLogs();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to reject log"
      );
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (clockIn: string, clockOut?: string) => {
    if (!clockOut) return "Active";
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    return `${hours} hrs`;
  };

  const stats = {
    pending: logs.filter((l) => l.status === "pending").length,
    approved: logs.filter((l) => l.status === "approved").length,
    paid: logs.filter((l) => l.status === "paid").length,
    total: logs.length,
  };

  if (pageLoading) {
    return (
      <DashboardLayout
        title="Time Logs Management"
        subtitle="Loading..."
        role="employer"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading time logs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Time Logs Management"
      subtitle="Review and approve employee time entries"
      role="employer"
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-white rounded-2xl border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Logs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black">
                  {stats.approved}
                </p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white rounded-2xl border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-black">{stats.paid}</p>
                <p className="text-sm text-gray-500">Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Time Logs Table */}
        <Card className="bg-white rounded-2xl border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Log Approvals
                </CardTitle>
                <CardDescription>
                  Review and approve employee time entries
                </CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">
                  No time logs found for this filter
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    {statusFilter === "pending" && (
                      <TableHead>Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell className="font-medium">
                        {log.employeeId?.name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.clockIn), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.clockIn), "HH:mm")}
                      </TableCell>
                      <TableCell>
                        {log.clockOut
                          ? format(new Date(log.clockOut), "HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {calculateDuration(log.clockIn, log.clockOut)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "approved"
                              ? "default"
                              : log.status === "pending"
                              ? "secondary"
                              : log.status === "paid"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      {statusFilter === "pending" && (
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(log._id)}
                              disabled={loading}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(log._id)}
                              disabled={loading}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approved Unpaid Alert */}
        {approvedUnpaidLogs.length > 0 && (
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">
                      Unpaid Approved Time Logs
                    </h3>
                    <p className="text-sm opacity-90">
                      {approvedUnpaidLogs.length} time logs are approved but not
                      yet paid. Process payroll to continue.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/employer/payments")}
                  className="bg-white hover:bg-gray-100 text-orange-600"
                >
                  Process Payroll
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TimeLogsManagement;
