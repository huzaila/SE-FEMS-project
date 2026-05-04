import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import femsLogo from "@/assets/fems-logo.png";
import { Loader2, User, Store } from "lucide-react";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { completeProfile, verifyEmail } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    role: "customer",
    vendor_name: "",
    location: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // First verify email automatically (backend requirement)
      const user = JSON.parse(localStorage.getItem('pending_user') || '{}');
      if (user.email && user.verification_code) {
        try {
          await verifyEmail(user.email, user.verification_code);
        } catch (err) {
          console.log('Email verification step skipped or already verified');
        }
      }

      await completeProfile(formData);

      toast({
        title: "Profile Completed",
        description: "Welcome to FEMS!",
      });

      // Clear temporary data
      localStorage.removeItem('pending_user');

      // Navigate based on role
      if (formData.role === "vendor") {
        navigate('/vendor/menu');
      } else {
        navigate('/customer/vendors');
      }
    } catch (error: any) {
      console.error('Complete profile error:', error);
      const errorMessage = error.response?.data?.error || error.message || "Failed to complete profile";
      toast({
        title: "Error",
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
            Complete Your Profile
          </CardTitle>
          <CardDescription className="text-center">
            Tell us a bit more about yourself
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="customer" id="customer" />
                  <Label htmlFor="customer" className="flex items-center cursor-pointer flex-1">
                    <User className="w-4 h-4 mr-2" />
                    Customer
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="vendor" id="vendor" />
                  <Label htmlFor="vendor" className="flex items-center cursor-pointer flex-1">
                    <Store className="w-4 h-4 mr-2" />
                    Vendor
                  </Label>
                </div>
              </RadioGroup>
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
              {loading ? "Completing Profile..." : "Complete Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
