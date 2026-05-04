import api from './api';

export const vendorService = {
  getAll: async () => {
    const response = await api.get('/vendors');
    return response.data;
  },

  getVendor: async (vendorId: number) => {
    const response = await api.get(`/vendors/${vendorId}`);
    return response.data;
  },

  createMenu: async (vendorId: number, title: string) => {
    const response = await api.post(`/vendors/${vendorId}/menu`, { title });
    return response.data;
  },

  addMenuItems: async (vendorId: number, menuId: number, items: any[]) => {
    const response = await api.post(
      `/vendors/${vendorId}/menu/${menuId}/items`,
      items
    );
    return response.data;
  },

  updateMenuItem: async (vendorId: number, menuId: number, itemId: number, data: any) => {
    const response = await api.put(
      `/vendors/${vendorId}/menu/${menuId}/items/${itemId}`,
      data
    );
    return response.data;
  },

  deleteMenuItem: async (vendorId: number, menuId: number, itemId: number) => {
    const response = await api.delete(
      `/vendors/${vendorId}/menu/${menuId}/items/${itemId}`
    );
    return response.data;
  },
};
