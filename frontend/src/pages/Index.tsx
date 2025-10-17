import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, DollarSign, BarChart3, Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block">
            <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-xl">
              <Clock className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            SiraFlow
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Modern workforce management and payment automation platform built for the future of work
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/auth/register">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            {
              icon: Clock,
              title: 'Time Tracking',
              description: 'Accurate clock in/out with location verification and break management',
            },
            {
              icon: DollarSign,
              title: 'Auto Payments',
              description: 'Automated payment calculations and disbursements',
            },
            {
              icon: BarChart3,
              title: 'Analytics',
              description: 'Real-time insights into attendance and workforce metrics',
            },
            {
              icon: Shield,
              title: 'Secure',
              description: 'Enterprise-grade security for your sensitive data',
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-2xl gradient-card border border-border/50 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <p className="text-center text-sm text-muted-foreground">
          © 2025 SiraFlow. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
