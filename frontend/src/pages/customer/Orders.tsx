import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Package, XCircle, Loader2 } from "lucide-react";
import CustomerNav from "@/components/customer/CustomerNav";
import { useToast } from "@/hooks/use-toast";
import { orderService } from "@/services/orderService";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

interface Order {
  order_id: number;
  vendor_id: number;
  vendor_name: string;
  placed_at: string;
  scheduled_for: string;
  total_amount: number;
  status: string;
  payment_status: string;
  pickup_or_delivery: string;
  notes?: string;
  items: OrderItem[];
}

const Orders = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getCustomerOrders();
      setOrders(response.orders || []);
    } catch (error: any) {
      console.error("Failed to fetch orders:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await orderService.cancelOrder(orderId);

      // Update local state
      setOrders(orders.map(order =>
        order.order_id === orderId ? { ...order, status: "cancelled" } : order
      ));

      toast({
        title: "Order Cancelled",
        description: `Order #${orderId} has been cancelled`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "accepted":
        return <Clock className="w-5 h-5" />;
      case "preparing":
        return <Package className="w-5 h-5" />;
      case "ready":
      case "completed":
        return <CheckCircle2 className="w-5 h-5" />;
      case "cancelled":
      case "rejected":
        return <XCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "accepted":
        return "bg-blue-400 text-white";
      case "preparing":
        return "bg-blue-500 text-white";
      case "ready":
        return "bg-orange-500 text-white";
      case "completed":
        return "bg-green-500 text-white";
      case "cancelled":
      case "rejected":
        return "bg-red-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "PENDING";
      case "accepted":
        return "ACCEPTED";
      case "preparing":
        return "PREPARING";
      case "ready":
        return "READY FOR PICKUP";
      case "completed":
        return "DELIVERED";
      case "cancelled":
        return "CANCELLED";
      case "rejected":
        return "REJECTED";
      default:
        return status.toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <CustomerNav />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav />

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
            <p className="text-muted-foreground">Track all your orders here</p>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">You haven't placed any orders yet</p>
                </CardContent>
              </Card>
            ) : (
              orders.map(order => (
                <Card key={order.order_id}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            {getStatusIcon(order.status)}
                          </div>
                          <h3 className="text-xl font-bold text-foreground">Order #{order.order_id}</h3>
                          <p className="text-muted-foreground">{order.vendor_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Date: {formatDate(order.placed_at)}</span>
                            <span>Pickup: {formatTime(order.scheduled_for)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {order.pickup_or_delivery}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">Rs. {order.total_amount}</p>
                          <Badge variant="outline" className="mt-2">
                            {order.payment_status}
                          </Badge>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-2 text-sm text-muted-foreground">Order Items:</h4>
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-medium">Rs. {item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {order.notes && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-1 text-sm">Notes:</h4>
                          <p className="text-sm text-muted-foreground">{order.notes}</p>
                        </div>
                      )}

                      {(order.status === "pending" || order.status === "accepted" || order.status === "preparing") && (
                        <div className="border-t pt-4">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelOrder(order.order_id)}
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel Order
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Orders;
