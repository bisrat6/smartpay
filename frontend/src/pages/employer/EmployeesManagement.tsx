import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { employeeApi, jobRoleApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';

const EmployeesManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [jobRoles, setJobRoles] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [jobRoleId, setJobRoleId] = useState('');
  const [telebirrMsisdn, setTelebirrMsisdn] = useState('');

  useEffect(() => {
    setPageLoading(true);
    Promise.all([fetchEmployees(), fetchJobRoles()]).finally(() => {
      setPageLoading(false);
    });
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      setEmployees(response.data.employees || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to fetch employees');
    } finally {
      setPageLoading(false);
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

  const resetForm = () => {
    setName('');
    setEmail('');
    setJobRoleId('');
    setTelebirrMsisdn('');
    setErrors({});
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const response = await employeeApi.add({
        name,
        email,
        jobRoleId,
        telebirrMsisdn,
      });
      
      // Check if a temporary password was generated
      if (response.data.temporaryPassword) {
        toast.success(
          `Employee added! Temporary password: ${response.data.temporaryPassword}`,
          { duration: 10000 }
        );
        // Also show an alert with the password
        alert(
          `Employee Added Successfully!\n\n` +
          `Email: ${email}\n` +
          `Temporary Password: ${response.data.temporaryPassword}\n\n` +
          `Please share this password with the employee. They can change it after logging in.`
        );
      } else {
        toast.success('Employee added successfully!');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        // Handle validation errors
        const validationErrors: any = {};
        error.response.data.errors.forEach((err: any) => {
          validationErrors[err.path] = err.msg;
        });
        setErrors(validationErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to add employee');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    setName(employee.name);
    setEmail(employee.email);
    // Handle jobRoleId being either a string (ID) or an object
    const roleId = typeof employee.jobRoleId === 'string' ? employee.jobRoleId : employee.jobRoleId?._id || '';
    setJobRoleId(roleId);
    setTelebirrMsisdn(employee.telebirrMsisdn || '');
    setEditDialogOpen(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    
    setLoading(true);
    setErrors({});

    try {
      await employeeApi.update(editingEmployee._id, {
        name,
        email,
        jobRoleId,
        telebirrMsisdn,
      });
      toast.success('Employee updated successfully!');
      setEditDialogOpen(false);
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error: any) {
      if (error?.response?.data?.errors) {
        const validationErrors: any = {};
        error.response.data.errors.forEach((err: any) => {
          validationErrors[err.path] = err.msg;
        });
        setErrors(validationErrors);
        toast.error('Please fix the validation errors');
      } else {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to update employee');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = (employee: any) => {
    setDeletingEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!deletingEmployee) return;
    
    setLoading(true);
    try {
      await employeeApi.delete(deletingEmployee._id);
      toast.success('Employee deleted successfully!');
      setDeleteDialogOpen(false);
      setDeletingEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <DashboardLayout 
        title="Employees" 
        subtitle="Loading..."
        role="employer"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employees...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Employees" 
      subtitle="Manage your workforce and employee information"
      role="employer"
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6" />
          <span className="text-lg font-semibold">{employees.length} Total Employees</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800 text-white">
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
                      className={errors.name ? 'border-red-500' : ''}
                      required
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobRole">Job Role</Label>
                    <Select value={jobRoleId} onValueChange={setJobRoleId}>
                      <SelectTrigger id="jobRole" className={errors.jobRoleId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a job role" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobRoles.map((role) => (
                          <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.jobRoleId && <p className="text-sm text-red-500">{errors.jobRoleId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telebirrMsisdn">Telebirr Number</Label>
                    <Input
                      id="telebirrMsisdn"
                      type="tel"
                      placeholder="251911234567"
                      value={telebirrMsisdn}
                      onChange={(e) => setTelebirrMsisdn(e.target.value)}
                      className={errors.telebirrMsisdn ? 'border-red-500' : ''}
                      required
                    />
                    {errors.telebirrMsisdn && <p className="text-sm text-red-500">{errors.telebirrMsisdn}</p>}
                  </div>
                  {/* Department/position removed; rates are derived from Job Role */}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Employee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Employee Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <form onSubmit={handleUpdateEmployee}>
                <DialogHeader>
                  <DialogTitle>Edit Employee</DialogTitle>
                  <DialogDescription>
                    Update employee information
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                      required
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-red-500' : ''}
                      required
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-jobRole">Job Role</Label>
                    <Select value={jobRoleId} onValueChange={setJobRoleId}>
                      <SelectTrigger id="edit-jobRole" className={errors.jobRoleId ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select a job role" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobRoles.map((role) => (
                          <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.jobRoleId && <p className="text-sm text-red-500">{errors.jobRoleId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-telebirrMsisdn">Telebirr Number</Label>
                    <Input
                      id="edit-telebirrMsisdn"
                      type="tel"
                      placeholder="251911234567"
                      value={telebirrMsisdn}
                      onChange={(e) => setTelebirrMsisdn(e.target.value)}
                      className={errors.telebirrMsisdn ? 'border-red-500' : ''}
                      required
                    />
                    {errors.telebirrMsisdn && <p className="text-sm text-red-500">{errors.telebirrMsisdn}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Employee'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Employee Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Employee</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete {deletingEmployee?.name}? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteEmployee} disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <Card className="bg-white rounded-2xl border border-gray-200">
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
                    <TableHead>Job Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => {
                    const jobRole = jobRoles.find(role => role._id === employee.jobRoleId);
                    return (
                      <TableRow key={employee._id}>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{jobRole?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                            {employee.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/employer/employees/${employee._id}`)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditEmployee(employee)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteEmployee(employee)}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
};

export default EmployeesManagement;
