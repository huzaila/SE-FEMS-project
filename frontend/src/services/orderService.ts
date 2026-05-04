import api from './api';

export const orderService = {
  // Customer - Place an order
  createOrder: async (orderData: any) => {
    const response = await api.post('/customer/orders', orderData);
    return response.data;
  },

  // Customer - Get all customer orders
  getCustomerOrders: async () => {
    const response = await api.get('/customer/orders');
    return response.data;
  },

  // Customer - Get single order details
  getCustomerOrder: async (orderId: number) => {
    const response = await api.get(`/customer/orders/${orderId}`);
    return response.data;
  },

  // Customer - Cancel an order
  cancelOrder: async (orderId: number) => {
    const response = await api.put(`/customer/orders/${orderId}/cancel`);
    return response.data;
  },

  // Vendor - Get all vendor orders (with optional filters)
  getVendorOrders: async (vendorId: number, params?: { status?: string; limit?: number }) => {
    const response = await api.get(`/vendors/${vendorId}/orders`, { params });
    return response.data;
  },

  // Vendor - Get single order details
  getVendorOrder: async (vendorId: number, orderId: number) => {
    const response = await api.get(`/vendors/${vendorId}/orders/${orderId}`);
    return response.data;
  },

  // Vendor - Update order status
  updateOrderStatus: async (vendorId: number, orderId: number, status: string, estimatedReadyAt?: string) => {
    const response = await api.put(`/vendors/${vendorId}/orders/${orderId}/status`, {
      status,
      estimated_ready_at: estimatedReadyAt
    });
    return response.data;
  },
};
