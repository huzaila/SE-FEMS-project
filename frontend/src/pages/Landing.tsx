import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp, ShoppingBag } from "lucide-react";
import femsLogo from "@/assets/fems-logo.png";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Logo */}
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-xl">
            <img 
              src={femsLogo} 
              alt="FEMS Logo" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Tagline */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
              Skip the Line, Grab & Go!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Pre-order your favorite campus meals and enjoy hassle-free pickups
            </p>
          </div>

          {/* CTA Button */}
          <Link to="/role-select">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6 shadow-lg"
            >
              Login and Signup
            </Button>
          </Link>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-12 w-full max-w-5xl">
            <FeatureCard
              icon={<Clock className="w-10 h-10 text-primary" />}
              title="Pre-Order Food"
              description="Order before break time and your food will be ready when you arrive."
            />
            <FeatureCard
              icon={<TrendingUp className="w-10 h-10 text-accent" />}
              title="Live Order Tracking"
              description="Get real-time updates on your order status from preparing to ready."
            />
            <FeatureCard
              icon={<ShoppingBag className="w-10 h-10 text-info" />}
              title="Easy Pickup"
              description="No more waiting in queues. Just pick up and enjoy your meal!"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3 bg-primary/10 rounded-full">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default Landing;
