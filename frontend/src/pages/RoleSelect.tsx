import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Store, User } from "lucide-react";
import femsLogo from "@/assets/fems-logo.png";

const RoleSelect = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden shadow-lg">
            <img src={femsLogo} alt="FEMS" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to FEMS</h1>
          <p className="text-muted-foreground">Please select your role to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <RoleCard
            icon={<User className="w-12 h-12" />}
            title="Customer"
            description="Order food from campus vendors"
            to="/signup?role=customer"
            gradient="bg-[#f0b75d]"
          />
          <RoleCard
            icon={<Store className="w-12 h-12" />}
            title="Vendor"
            description="Manage your menu and orders"
            to="/signup?role=vendor"
            gradient="bg-[#f0b75d]"
          />
        </div>
      </div>
    </div>
  );
};

const RoleCard = ({ 
  icon, 
  title, 
  description, 
  to, 
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  to: string;
  gradient: string;
}) => {
  return (
    <Link to={to} className="block">
      <div className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 hover:shadow-lg transition-all cursor-pointer group">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={`p-4 ${gradient} rounded-full text-white group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Button className="mt-4 w-full">
            Continue as {title}
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default RoleSelect;
