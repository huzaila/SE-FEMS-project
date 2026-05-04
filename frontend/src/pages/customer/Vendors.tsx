import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MapPin, TrendingUp } from "lucide-react";
import CustomerNav from "@/components/customer/CustomerNav";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: number;
  vendor_name: string;
  location: string;
  pickup_available: boolean;
  delivery_available: boolean;
  created_at: string;
  owner_name: string;
  owner_email: string;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customer/vendors');
      setVendors(response.data.vendors || []);
    } catch (error: any) {
      console.error('Failed to fetch vendors:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Split vendors into popular (first 2) and all others
  const popularVendors = vendors.slice(0, 2);
  const allVendors = vendors.slice(2);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading vendors...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Most Popular Section */}
          {popularVendors.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Most Popular</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {popularVendors.map(vendor => (
                  <Link key={vendor.id} to={`/customer/menu/${vendor.id}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary/20">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="text-6xl">🍽️</div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-foreground mb-1">{vendor.vendor_name}</h3>
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                              <MapPin className="w-4 h-4" />
                              <span className="text-sm">{vendor.location || "On Campus"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {vendor.pickup_available && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Pickup</span>
                              )}
                              {vendor.delivery_available && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Delivery</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* All Vendors Section */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-6">All Vendors</h2>
            {vendors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No vendors available at the moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {vendors.map(vendor => (
                  <Link key={vendor.id} to={`/customer/menu/${vendor.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">🍴</div>
                          <div className="flex-1">
                            <h3 className="font-bold text-foreground">{vendor.vendor_name}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <MapPin className="w-3 h-3" />
                              <span>{vendor.location || "On Campus"}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              {vendor.pickup_available && (
                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Pickup</span>
                              )}
                              {vendor.delivery_available && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Delivery</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Vendors;
