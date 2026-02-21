import { Link, useNavigate } from 'react-router-dom';
import { Map, Shield, Camera, Bell, ChartBar, Users, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Camera,
    title: 'Live Capture Verification',
    description: 'Only live camera photos accepted - no gallery uploads. Ensures authentic, timestamped evidence.',
    link: '/raise-complaint',
  },
  {
    icon: Map,
    title: 'Real-Time Map Tracking',
    description: 'All complaints visible on interactive map with color-coded status markers.',
    link: '/map',
  },
  {
    icon: Shield,
    title: 'AI-Powered Verification',
    description: 'Before-and-after comparison validates actual work completion.',
    link: '/worker',
  },
  {
    icon: Bell,
    title: '7-Day SLA Enforcement',
    description: 'Automatic escalation when complaints exceed deadline.',
    link: '/officer',
  },
  {
    icon: ChartBar,
    title: 'Public Transparency',
    description: 'All data publicly accessible. No hidden complaints or status.',
    link: '/reports',
  },
  {
    icon: Users,
    title: 'Dual Confirmation',
    description: 'Both officer and citizen must verify before issue is marked resolved.',
    link: '/dashboard',
  },
];

const stats = [
  { value: '10,000+', label: 'Issues Resolved' },
  { value: '85%', label: 'On-Time Resolution' },
  { value: '50+', label: 'City Wards' },
  { value: '99%', label: 'Citizen Satisfaction' },
];

export const Landing = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center neon-glow">
              <Map className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">SmartCity</span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/map">View Map</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px]" />
        </div>
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm mb-8">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>AI-Verified Public Works Accountability</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Smart City</span>
              <br />
              Public Works System
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Report civic issues, track resolutions in real-time, and hold authorities accountable 
              through AI-verified proof and public transparency.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-lg px-8 neon-glow" asChild>
                <Link to="/register">
                  Report an Issue
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link to="/map">View Public Map</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border bg-card/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for <span className="gradient-text">Transparency</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to ensure genuine resolution and prevent false reporting.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div 
                key={feature.title}
                className="glass-card-hover p-6 cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => navigate(feature.link)}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
                <div className="mt-4 flex items-center text-primary text-sm font-medium">
                  Explore <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="container mx-auto px-6 relative">
          <div className="glass-card p-12 text-center max-w-3xl mx-auto gradient-border">
            <h2 className="text-3xl font-bold mb-4">Ready to Make Your City Better?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of citizens making their neighborhoods safer and cleaner.
            </p>
            <Button size="lg" className="neon-glow" asChild>
              <Link to="/register">
                Start Reporting
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Map className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">SmartCity Public Works</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Smart City Initiative. Building transparent governance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
