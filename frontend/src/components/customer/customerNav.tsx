import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Store, History, LogOut } from "lucide-react";
import femsLogo from "@/assets/fems-logo.png";
import { Badge } from "@/components/ui/badge";

const CustomerNav = ({ cartCount = 0 }: { cartCount?: number }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/customer/vendors" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={femsLogo} alt="FEMS" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-foreground text-lg">FEMS</span>
          </Link>

          {/* Nav Items */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/customer/vendors">
                <Store className="w-5 h-5 mr-2" />
                Vendors
              </Link>
            </Button>
            
            <Button variant="ghost" asChild>
              <Link to="/customer/orders">
                <History className="w-5 h-5 mr-2" />
                My Orders
              </Link>
            </Button>
            
            <Button variant="ghost" asChild className="relative">
              <Link to="/customer/cart">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary">
                    {cartCount}
                  </Badge>
                )}
              </Link>
            </Button>

            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default CustomerNav;
