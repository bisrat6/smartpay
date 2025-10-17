import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Building2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { companyApi, jobRoleApi } from '@/lib/api';

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jobRoleDialogOpen, setJobRoleDialogOpen] = useState(false);
  
  // Company form
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  
  // Job role form
  const [roleName, setRoleName] = useState('');
  const [baseRate, setBaseRate] = useState('');
  const [overtimeRate, setOvertimeRate] = useState('');
  const [roleBonus, setRoleBonus] = useState('');
  const [companyId, setCompanyId] = useState('');

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await companyApi.create({
        name: companyName,
        address: companyAddress,
      });
      setCompanyId(response.data._id);
      toast.success('Company created successfully!');
      setDialogOpen(false);
      setCompanyName('');
      setCompanyAddress('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJobRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
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
        companyId,
      });
      toast.success('Job role created successfully!');
      setJobRoleDialogOpen(false);
      setRoleName('');
      setBaseRate('');
      setOvertimeRate('');
      setRoleBonus('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create job role');
    } finally {
      setLoading(false);
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
                          <Label htmlFor="address">Address</Label>
                          <Input
                            id="address"
                            placeholder="123 Main St, City"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            required
                          />
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
              </CardTitle>
              <CardDescription>Manage your company profile</CardDescription>
            </CardHeader>
            <CardContent>
              {companyId ? (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <p className="font-medium">Company Created</p>
                  </div>
                  <p className="text-sm text-muted-foreground">ID: {companyId}</p>
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
                    <Button size="sm" disabled={!companyId}>
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
              {!companyId && (
                <p className="text-sm text-muted-foreground">Create a company first to add job roles</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CompanyManagement;
