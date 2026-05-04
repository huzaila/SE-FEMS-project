import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Package, XCircle, Loader2 } from "lucide-react";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { orderService } from "@/services/orderService";

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  item_total?: number;
}

interface Order {
  order_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  placed_at: string;
  scheduled_for: string;
  total_amount: number;
  status: string;
  payment_status: string;
  pickup_or_delivery: string;
  notes?: string;
  estimated_ready_at?: string;
  items?: OrderItem[];
}

const Orders = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (user?.vendor_id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user?.vendor_id) return;

    try {
      setLoading(true);
      const response = await orderService.getVendorOrders(user.vendor_id);
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

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    if (!user?.vendor_id) return;

    try {
      await orderService.updateOrderStatus(user.vendor_id, orderId, newStatus);

      // Update local state
      setOrders(orders.map(order =>
        order.order_id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Order Updated",
        description: `Order #${orderId} has been marked as ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getOrdersByStatus = (statusFilter: string) => {
    if (statusFilter === "active") {
      return orders.filter(order =>
        ["pending", "accepted", "preparing", "ready"].includes(order.status)
      );
    } else if (statusFilter === "completed") {
      return orders.filter(order =>
        ["completed", "cancelled", "rejected"].includes(order.status)
      );
    }
    return [];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <VendorSidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const activeOrders = getOrdersByStatus("active");
  const completedOrders = getOrdersByStatus("completed");

  return (
    <div className="flex min-h-screen w-full bg-background">
      <VendorSidebar />

      <main className="flex-1 p-6 md:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
            <p className="text-muted-foreground">Track and manage all your orders</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active Orders ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4 mt-6">
              {activeOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <p className="text-center text-muted-foreground">
                      No active orders
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeOrders.map(order => (
                  <OrderCard
                    key={order.order_id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    formatDate={formatDate}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-6">
              {completedOrders.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <p className="text-center text-muted-foreground">
                      No completed orders yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                completedOrders.map(order => (
                  <Card key={order.order_id}>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.toUpperCase()}
                              </Badge>
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Order #{order.order_id}</h3>
                            <p className="text-muted-foreground">Customer: {order.customer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Scheduled: {formatDate(order.scheduled_for)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">Rs. {order.total_amount}</p>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Order Items:</h4>
                            <div className="space-y-2">
                              {order.items.map((item, index) => (
                                <div key={index} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {item.quantity}x {item.name}
                                  </span>
                                  <span className="font-medium">Rs. {item.price * item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const OrderCard = ({
  order,
  onStatusChange,
  formatDate
}: {
  order: Order;
  onStatusChange: (orderId: number, newStatus: string) => void;
  formatDate: (date: string) => string;
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "accepted":
        return "bg-blue-400 text-white";
      case "preparing":
        return "bg-blue-500 text-white";
      case "ready":
        return "bg-green-500 text-white";
      default:
        return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "accepted":
      case "preparing":
        return <Package className="w-5 h-5" />;
      case "ready":
        return <CheckCircle2 className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={getStatusColor(order.status)}>
                  {order.status.toUpperCase()}
                </Badge>
                {getStatusIcon(order.status)}
              </div>
              <h3 className="text-xl font-bold text-foreground">Order #{order.order_id}</h3>
              <p className="text-muted-foreground">Customer: {order.customer_name}</p>
              {order.customer_phone && (
                <p className="text-sm text-muted-foreground">Phone: {order.customer_phone}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Scheduled: {formatDate(order.scheduled_for)}
              </p>
              <p className="text-xs text-muted-foreground">
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

          {order.items && order.items.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Order Items:</h4>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">Rs. {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {order.notes && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-1 text-sm">Notes:</h4>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Update Order Status:</h4>
            <div className="grid grid-cols-2 gap-2">
              {order.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onStatusChange(order.order_id, "accepted")}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onStatusChange(order.order_id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
              {order.status === "accepted" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(order.order_id, "preparing")}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 col-span-2"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Start Preparing
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(order.order_id, "ready")}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 col-span-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Ready
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onStatusChange(order.order_id, "completed")}
                  className="bg-green-600 hover:bg-green-700 col-span-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

export default Orders;
