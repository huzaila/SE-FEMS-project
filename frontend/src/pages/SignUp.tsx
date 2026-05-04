import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import femsLogo from "@/assets/fems-logo.png";
import { Loader2, Store, User } from "lucide-react";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get("role") || "customer";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register, verifyEmail, completeProfile } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    phone: "",
    role: defaultRole,
    vendor_name: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (!formData.full_name || !formData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.role === "vendor" && !formData.vendor_name) {
      toast({
        title: "Error",
        description: "Please enter your vendor name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Register user
      const response = await register(formData.email, formData.password, {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        vendor_name: formData.vendor_name,
        location: formData.location,
      });

      // Step 2: Verify email automatically
      if (response.verification_code) {
        try {
          await verifyEmail(formData.email, response.verification_code);
        } catch (err) {
          console.log('Email verification step skipped');
        }
      }

      // Step 3: Complete profile
      await completeProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        vendor_name: formData.vendor_name,
        location: formData.location,
      });

      toast({
        title: "Account Created",
        description: "Welcome to FEMS!",
      });

      // Navigate based on role
      if (formData.role === "vendor") {
        navigate('/vendor/menu');
      } else {
        navigate('/customer/vendors');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to create account";
      toast({
        title: "Signup Failed",
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
            {formData.role === "vendor" ? "Vendor" : "Customer"} Sign Up
          </CardTitle>
          <CardDescription className="text-center">
            Fill in your details to get started as a {formData.role}
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
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            {formData.role === "vendor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    type="text"
                    placeholder="My Food Shop"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="Building A, Room 101"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link 
              to={`/login?role=${formData.role}`}
              className="text-primary font-medium hover:underline"
            >
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;