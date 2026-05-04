import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Minus, ShoppingCart } from "lucide-react";
import CustomerNav from "@/components/customer/CustomerNav";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  available: boolean;
  preparation_time_minutes: number;
  image_url: string | null;
}

interface Vendor {
  id: number;
  vendor_name: string;
  location: string;
  pickup_available: boolean;
  delivery_available: boolean;
}

interface MenuData {
  vendor: Vendor;
  menu: {
    id: number;
    title: string;
    is_active: boolean;
    items: MenuItem[];
  } | null;
}

const VendorMenu = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendorId) {
      fetchVendorMenu();
    }
  }, [vendorId]);

  const fetchVendorMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/customer/vendors/${vendorId}/menu`);
      setMenuData(response.data);
    } catch (error: any) {
      console.error('Failed to fetch vendor menu:', error);
      setError(error.response?.data?.error || "Failed to load menu");
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load menu",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const menuItems = menuData?.menu?.items || [];
  const vendorName = menuData?.vendor?.vendor_name || "Vendor";

  const addToCart = (item: any) => {
    const existingItem = cart.find(i => i.id === item.id);
    if (existingItem) {
      setCart(cart.map(i => 
        i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    
    toast({
      title: "Added to Cart",
      description: `${item.name} has been added to your cart`,
    });
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerNav cartCount={0} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading menu...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerNav cartCount={0} />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive mb-4">{error || "Failed to load menu"}</p>
              <Button onClick={fetchVendorMenu}>Try Again</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav cartCount={cartCount} />

      <main className="container mx-auto px-4 py-8">
        {/* Vendor Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{vendorName}</h1>
          <p className="text-muted-foreground">{menuData.vendor.location || "Browse our delicious menu"}</p>
          <div className="flex items-center gap-2 mt-2">
            {menuData.vendor.pickup_available && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Pickup Available</Badge>
            )}
            {menuData.vendor.delivery_available && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Delivery Available</Badge>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2 space-y-8">
            {menuItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No menu items available yet</p>
                </CardContent>
              </Card>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">{menuData.menu?.title || "Menu"}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {menuItems.map(item => (
                      <Card key={item.id} className={!item.available ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {item.image_url ? (
                            <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to emoji if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  if (target.parentElement) {
                                    target.parentElement.innerHTML = '<div class="text-5xl flex items-center justify-center w-full h-full">🍽️</div>';
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center text-4xl">
                              🍽️
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-bold text-foreground">{item.name}</h3>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mb-1">{item.description}</p>
                                )}
                                <p className="text-lg font-bold text-primary">Rs. {item.price}</p>
                                <p className="text-xs text-muted-foreground">Prep time: {item.preparation_time_minutes} mins</p>
                              </div>
                            </div>

                            {item.available ? (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => addToCart(item)}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add to Cart
                              </Button>
                            ) : (
                              <Badge variant="destructive" className="w-full justify-center">
                                Out of Stock
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart Sidebar */}
          <div className="lg:sticky lg:top-20 h-fit">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Your Cart
                </h3>
                
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {cart.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Rs. {item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center font-medium">{item.quantity}</span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-6 w-6"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t pt-4 space-y-4">
                      <div className="flex items-center justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">Rs. {totalAmount}</span>
                      </div>
                      
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => navigate("/customer/checkout", {
                          state: {
                            cart,
                            vendorId: parseInt(vendorId!),
                            vendorName,
                            totalAmount
                          }
                        })}
                      >
                        Proceed to Checkout
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorMenu;
