import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CustomerNav from "@/components/customer/CustomerNav";
import { useToast } from "@/hooks/use-toast";
import { orderService } from "@/services/orderService";
import { Clock, Loader2 } from "lucide-react";

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { cart, vendorId, vendorName, totalAmount } = location.state || {
    cart: [],
    vendorId: null,
    vendorName: "",
    totalAmount: 0
  };

  const [pickupTime, setPickupTime] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (!pickupDate || !pickupTime) {
      toast({
        title: "Error",
        description: "Please select both pickup date and time",
        variant: "destructive",
      });
      return;
    }

    if (!vendorId || cart.length === 0) {
      toast({
        title: "Error",
        description: "Invalid cart data",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time into ISO format
      const pickupDateTime = `${pickupDate}T${pickupTime}:00`;

      // Prepare order data
      const orderData = {
        vendor_id: vendorId,
        pickup_time: pickupDateTime,
        pickup_or_delivery: "pickup",
        order_notes: orderNotes,
        items: cart.map((item: any) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: item.notes || ""
        }))
      };

      const response = await orderService.createOrder(orderData);

      toast({
        title: "Order Placed Successfully!",
        description: `Order #${response.order.order_id} - Ready by ${pickupTime}`,
      });

      navigate("/customer/orders");
    } catch (error: any) {
      console.error("Failed to place order:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Checkout</h1>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Vendor</p>
                <p className="font-medium">{vendorName}</p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Items</p>
                <div className="space-y-2">
                  {cart.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">Rs. {item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span className="text-primary">Rs. {totalAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Select Pickup Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickupDate">Pickup Date *</Label>
                <Input
                  id="pickupDate"
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupTime">Pickup Time *</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <p className="text-sm text-muted-foreground">
                  Select when you want to pick up your order
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderNotes">Order Notes (Optional)</Label>
                <Textarea
                  id="orderNotes"
                  placeholder="Any special instructions..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Place Order Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Finalize Cart and Place Order"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
