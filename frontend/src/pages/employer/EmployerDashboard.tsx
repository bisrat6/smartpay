import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Clock, DollarSign, BarChart3, LogOut } from 'lucide-react';
import { removeToken, getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const handleLogout = () => {
    removeToken();
    toast.success('Logged out successfully');
    navigate('/auth/login');
  };

  const dashboardCards = [
    {
      title: 'Company',
      description: 'Manage your company profile',
      icon: Building2,
      link: '/employer/company',
      color: 'text-blue-600',
    },
    {
      title: 'Employees',
      description: 'View and manage employees',
      icon: Users,
      link: '/employer/employees',
      color: 'text-green-600',
    },
    {
      title: 'Time Logs',
      description: 'Review pending approvals',
      icon: Clock,
      link: '/employer/timelogs',
      color: 'text-purple-600',
    },
    {
      title: 'Payments',
      description: 'Process employee payments',
      icon: DollarSign,
      link: '/employer/payments',
      color: 'text-amber-600',
    },
    {
      title: 'Analytics',
      description: 'View attendance insights',
      icon: BarChart3,
      link: '/employer/analytics',
      color: 'text-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SiraFlow</h1>
              <p className="text-xs text-muted-foreground">Employer Portal</p>
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
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.name?.split(' ')[0]}</h2>
          <p className="text-muted-foreground">Manage your workforce and payments from one place</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => (
            <Link key={card.link} to={card.link}>
              <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 gradient-card border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center ${card.color}`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default EmployerDashboard;
