import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { companyApi, jobRoleApi } from '@/lib/api';

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobRoleDialogOpen, setJobRoleDialogOpen] = useState(false);
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  
  // Company data
  const [company, setCompany] = useState<any>(null);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  
  // Company form
  const [companyName, setCompanyName] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [arifpayMerchantKey, setArifpayMerchantKey] = useState('');
  const [paymentCycle, setPaymentCycle] = useState('monthly');
  
  // Job role form
  const [roleName, setRoleName] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [roleBonus, setRoleBonus] = useState('');

  useEffect(() => {
    fetchCompanyData();
    fetchJobRoles();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const response = await companyApi.getMy();
      setCompany(response.data.company);
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        console.error('Failed to fetch company:', error);
      }
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await jobRoleApi.list();
      setJobRoles(response.data.jobRoles || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch job roles');
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
        paymentCycle: paymentCycle as 'daily' | 'weekly' | 'monthly'
      });
      setCompany(response.data.company);
      toast.success('Company created successfully!');
      setDialogOpen(false);
      setCompanyName('');
      setEmployerName('');
      setArifpayMerchantKey('');
      setPaymentCycle('monthly');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) {
      toast.error('Please create a company first');
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
      toast.success('Job role created successfully!');
      setJobRoleDialogOpen(false);
      setRoleName('');
      setBaseRate('');
      setOvertimeRate('');
      setRoleBonus('');
      fetchJobRoles();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create job role');
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
        paymentCycle: paymentCycle as 'daily' | 'weekly' | 'monthly'
      });
      toast.success('Company updated successfully!');
      setEditCompanyDialogOpen(false);
      await fetchCompanyData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJobRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this job role?')) return;
    
    try {
      await jobRoleApi.delete(roleId);
      toast.success('Job role deleted successfully!');
      fetchJobRoles();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete job role');
    }
  };

  const openEditCompanyDialog = () => {
    if (company) {
      setCompanyName(company.name);
      setEmployerName(company.employerName);
      setArifpayMerchantKey(company.arifpayMerchantKey || '');
      setPaymentCycle(company.paymentCycle);
      setEditCompanyDialogOpen(true);
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
            <h1 className="text-xl font-bold">Company Management</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Company</span>
                {company ? (
                  <Dialog open={editCompanyDialogOpen} onOpenChange={(open) => {
                    if (open) {
                      openEditCompanyDialog();
                    }
                    setEditCompanyDialogOpen(open);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleUpdateCompany}>
                        <DialogHeader>
                          <DialogTitle>Edit Company</DialogTitle>
                          <DialogDescription>
                            Update your company profile
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
                              placeholder="Your Arifpay merchant key"
                              value={arifpayMerchantKey}
                              onChange={(e) => setArifpayMerchantKey(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editPaymentCycle">Payment Cycle</Label>
                            <select
                              id="editPaymentCycle"
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                              value={paymentCycle}
                              onChange={(e) => setPaymentCycle(e.target.value)}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Company'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
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
                              placeholder="Your Arifpay merchant key"
                              value={arifpayMerchantKey}
                              onChange={(e) => setArifpayMerchantKey(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="paymentCycle">Payment Cycle</Label>
                            <select
                              id="paymentCycle"
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                              value={paymentCycle}
                              onChange={(e) => setPaymentCycle(e.target.value)}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Company'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
              <CardDescription>Manage your company profile</CardDescription>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-muted-foreground" />
                      <p className="font-medium">{company.name}</p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p><strong>Employer:</strong> {company.employerName}</p>
                      <p><strong>Payment Cycle:</strong> {company.paymentCycle}</p>
                      <p><strong>Bonus Rate:</strong> {company.bonusRateMultiplier}x</p>
                      <p><strong>Max Daily Hours:</strong> {company.maxDailyHours}</p>
                      {company.arifpayMerchantKey && (
                        <p><strong>Arifpay Key:</strong> {company.arifpayMerchantKey.substring(0, 8)}...</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No company created yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-elegant gradient-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Job Roles</span>
                <Dialog open={jobRoleDialogOpen} onOpenChange={setJobRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!company}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create
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
                          <Label htmlFor="overtimeRate">Overtime Rate (per hour)</Label>
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
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Creating...' : 'Create Role'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
              <CardDescription>Define roles and payment rates</CardDescription>
            </CardHeader>
            <CardContent>
              {!company ? (
                <p className="text-sm text-muted-foreground">Create a company first to add job roles</p>
              ) : jobRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No job roles created yet</p>
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
                        <TableCell className="font-medium">{role.name}</TableCell>
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
        </div>
      </main>
    </div>
  );
};

export default CompanyManagement;
