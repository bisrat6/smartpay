import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, Briefcase, CreditCard, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { companyApi, jobRoleApi } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobRoleDialogOpen, setJobRoleDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);

  // Company data
  const [company, setCompany] = useState<any>(null);
  const [jobRoles, setJobRoles] = useState<any[]>([]);

  // Company form
  const [companyName, setCompanyName] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [arifpayMerchantKey, setArifpayMerchantKey] = useState("");
  const [paymentCycle, setPaymentCycle] = useState("monthly");

  // Job role form
  const [roleName, setRoleName] = useState("");
  const [baseRate, setBaseRate] = useState("");
  const [overtimeRate, setOvertimeRate] = useState("");
  const [roleBonus, setRoleBonus] = useState("");

  useEffect(() => {
    setPageLoading(true);
    Promise.all([fetchCompanyData(), fetchJobRoles()]).finally(() => {
      setPageLoading(false);
    });
  }, []);

  const fetchCompanyData = async () => {
    try {
      const response = await companyApi.getMy();
      setCompany(response.data.company);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error("Failed to fetch company:", error);
      }
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await jobRoleApi.list();
      setJobRoles(response.data.jobRoles || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to fetch job roles"
      );
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await companyApi.create({
        name: companyName,
        employerName,
        arifpayMerchantKey,
        paymentCycle: paymentCycle as "daily" | "weekly" | "monthly",
      });
      setCompany(response.data.company);
      toast.success("Company created successfully!");
      setDialogOpen(false);
      setCompanyName("");
      setEmployerName("");
      setArifpayMerchantKey("");
      setPaymentCycle("monthly");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create company"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      toast.error("Please create a company first");
      return;
    }

    setLoading(true);

    try {
      await jobRoleApi.create({
        name: roleName,
        defaultRates: {
          base: Number(baseRate),
          overtime: Number(overtimeRate),
          roleBonus: Number(roleBonus),
        },
      });
      toast.success("Job role created successfully!");
      setJobRoleDialogOpen(false);
      setRoleName("");
      setBaseRate("");
      setOvertimeRate("");
      setRoleBonus("");
      fetchJobRoles();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create job role"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await companyApi.updateMy({
        name: companyName,
        employerName,
        arifpayMerchantKey,
        paymentCycle: paymentCycle as "daily" | "weekly" | "monthly",
      });
      toast.success("Company updated successfully!");
      setEditCompanyDialogOpen(false);
      await fetchCompanyData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update company"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJobRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this job role?")) return;

    try {
      await jobRoleApi.delete(roleId);
      toast.success("Job role deleted successfully!");
      fetchJobRoles();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete job role"
      );
    }
  };

  const openEditCompanyDialog = () => {
    if (company) {
      setCompanyName(company.name);
      setEmployerName(company.employerName);
      // Do not prefill merchant key for security reasons; leave blank so user can enter a new key if desired
      setArifpayMerchantKey("");
      setPaymentCycle(company.paymentCycle);
      setEditCompanyDialogOpen(true);
    }
  };

  if (pageLoading) {
    return (
      <DashboardLayout 
        title="Company Settings" 
        subtitle="Loading..."
        role="employer"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading company data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Company Settings" 
      subtitle="Manage your company profile and job roles"
      role="employer"
    >
      {/* Company Info Card */}
      {company && (
        <div className="bg-gradient-to-br from-gray-900 to-black text-white rounded-2xl p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-4">{company.name}</h2>
              <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                <div className="flex items-center space-x-3">
                  <Briefcase className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Employer</p>
                    <p className="font-medium">{company.employerName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Payment Cycle</p>
                    <p className="font-medium capitalize">{company.paymentCycle}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Bonus Multiplier</p>
                    <p className="font-medium">{company.bonusRateMultiplier}x</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Max Daily Hours</p>
                    <p className="font-medium">{company.maxDailyHours}h</p>
                  </div>
                </div>
              </div>
            </div>
            <Dialog
              open={editCompanyDialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  openEditCompanyDialog();
                }
                setEditCompanyDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-white hover:bg-gray-100 text-black">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleUpdateCompany}>
                  <DialogHeader>
                    <DialogTitle>Edit Company</DialogTitle>
                    <DialogDescription>
                      Update your company profile and settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="editCompanyName">Company Name</Label>
                      <Input
                        id="editCompanyName"
                        placeholder="Acme Corp"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editEmployerName">Employer Name</Label>
                      <Input
                        id="editEmployerName"
                        placeholder="John Doe"
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editArifpayKey">Arifpay Merchant Key</Label>
                      <Input
                        id="editArifpayKey"
                        type="password"
                        placeholder="Your Arifpay merchant key"
                        value={arifpayMerchantKey}
                        onChange={(e) => setArifpayMerchantKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editPaymentCycle">Payment Cycle</Label>
                      <Select value={paymentCycle} onValueChange={setPaymentCycle}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={loading} className="bg-black hover:bg-gray-800 text-white">
                      {loading ? "Updating..." : "Update Company"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Create Company Prompt */}
      {!company && (
        <Card className="bg-white rounded-2xl border border-gray-200 mb-6">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>Create your company profile to begin</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-black hover:bg-gray-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Company
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <form onSubmit={handleCreateCompany}>
                    <DialogHeader>
                      <DialogTitle>Create Company</DialogTitle>
                      <DialogDescription>
                        Set up your company profile
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Company Name</Label>
                        <Input
                          id="companyName"
                          placeholder="Acme Corp"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employerName">Employer Name</Label>
                        <Input
                          id="employerName"
                          placeholder="John Doe"
                          value={employerName}
                          onChange={(e) => setEmployerName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arifpayKey">Arifpay Merchant Key</Label>
                        <Input
                          id="arifpayKey"
                          type="password"
                          placeholder="Your Arifpay merchant key"
                          value={arifpayMerchantKey}
                          onChange={(e) => setArifpayMerchantKey(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentCycle">Payment Cycle</Label>
                        <Select value={paymentCycle} onValueChange={setPaymentCycle}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={loading} className="bg-black hover:bg-gray-800 text-white">
                        {loading ? "Creating..." : "Create Company"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">Create your company profile to get started</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job Roles Card */}
      <Card className="bg-white rounded-2xl border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Roles & Payment Rates</CardTitle>
              <CardDescription>Define roles and payment structures for your workforce</CardDescription>
            </div>
            <Dialog
              open={jobRoleDialogOpen}
              onOpenChange={setJobRoleDialogOpen}
            >
              <DialogTrigger asChild>
                <Button disabled={!company} className="bg-black hover:bg-gray-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Job Role
                </Button>
              </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleCreateJobRole}>
                      <DialogHeader>
                        <DialogTitle>Create Job Role</DialogTitle>
                        <DialogDescription>
                          Define a new job role with payment rates
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="roleName">Role Name</Label>
                          <Input
                            id="roleName"
                            placeholder="Manager"
                            value={roleName}
                            onChange={(e) => setRoleName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="baseRate">Base Rate (per hour)</Label>
                          <Input
                            id="baseRate"
                            type="number"
                            placeholder="70"
                            value={baseRate}
                            onChange={(e) => setBaseRate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="overtimeRate">
                            Overtime Rate (per hour)
                          </Label>
                          <Input
                            id="overtimeRate"
                            type="number"
                            placeholder="95"
                            value={overtimeRate}
                            onChange={(e) => setOvertimeRate(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="roleBonus">Role Bonus</Label>
                          <Input
                            id="roleBonus"
                            type="number"
                            placeholder="0"
                            value={roleBonus}
                            onChange={(e) => setRoleBonus(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                        <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-black hover:bg-gray-800 text-white">
                          {loading ? "Creating..." : "Create Role"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
        <CardContent>
              {!company ? (
                <p className="text-sm text-muted-foreground">
                  Create a company first to add job roles
                </p>
              ) : jobRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job roles created yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Overtime Rate</TableHead>
                      <TableHead>Role Bonus</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobRoles.map((role) => (
                      <TableRow key={role._id}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell>ETB {role.defaultRates.base}</TableCell>
                        <TableCell>ETB {role.defaultRates.overtime}</TableCell>
                        <TableCell>ETB {role.defaultRates.roleBonus}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteJobRole(role._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CompanyManagement;
