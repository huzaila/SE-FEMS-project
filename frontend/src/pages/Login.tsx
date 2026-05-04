import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import femsLogo from "@/assets/fems-logo.png";
import { Loader2 } from "lucide-react";

const Login = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "customer";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      // Navigate based on user's actual role from the backend
      const userRole = response.user.role;
      console.log('User logged in with role:', userRole);

      toast({
        title: "Login Successful",
        description: `Welcome back${response.user.full_name ? ', ' + response.user.full_name : ''}!`,
      });

      if (userRole === "vendor") {
        navigate("/vendor/menu");
      } else {
        navigate("/customer/vendors");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || "Invalid email or password";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden">
            <img src={femsLogo} alt="FEMS" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl text-center">
            {role === "vendor" ? "Vendor" : "Customer"} Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link 
              to={`/signup?role=${role}`}
              className="text-primary font-medium hover:underline"
            >
              Sign up!
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;