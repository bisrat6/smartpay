import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { employeeApi, jobRoleApi } from '@/lib/api';

const EmployeesManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedJobRole, setSelectedJobRole] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchJobRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      setEmployees(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch employees');
    }
  };

  const fetchJobRoles = async () => {
    try {
      const response = await jobRoleApi.list();
      setJobRoles(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch job roles');
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await employeeApi.add({
        name,
        email,
        phone,
        jobRoleId: selectedJobRole,
      });
      toast.success('Employee added successfully!');
      setDialogOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setSelectedJobRole('');
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to add employee');
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
            <h1 className="text-xl font-bold">Employees</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddEmployee}>
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>
                    Add a new employee to your workforce
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+251911234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobRole">Job Role</Label>
                    <select
                      id="jobRole"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={selectedJobRole}
                      onChange={(e) => setSelectedJobRole(e.target.value)}
                      required
                    >
                      <option value="">Select a role</option>
                      {jobRoles.map((role) => (
                        <option key={role._id} value={role._id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Employee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employee List
            </CardTitle>
            <CardDescription>Manage your workforce</CardDescription>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No employees yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Job Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee._id}>
                      <TableCell className="font-medium">{employee.userId?.name}</TableCell>
                      <TableCell>{employee.userId?.email}</TableCell>
                      <TableCell>{employee.userId?.phone}</TableCell>
                      <TableCell>{employee.jobRoleId?.name || 'N/A'}</TableCell>
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

export default EmployeesManagement;
