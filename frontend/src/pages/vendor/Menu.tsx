import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Star, Loader2 } from "lucide-react";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { vendorService } from "@/services/vendorServic";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  description?: string;
  available: boolean;
  preparation_time_minutes?: number;
  image_url?: string;
}

interface Menu {
  id: number;
  title: string;
  is_active: boolean;
  items: MenuItem[];
}

const Menu = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    preparation_time_minutes: "15",
    image_url: "",
  });

  // Fetch vendor menu and items on mount
  useEffect(() => {
    if (user?.vendor_id) {
      fetchMenuData();
    }
  }, [user]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getVendor(user!.vendor_id!);

      if (data.vendor?.menu) {
        setMenu(data.vendor.menu);
        setMenuItems(data.vendor.menu.items || []);
      }
    } catch (error: any) {
      console.error("Failed to fetch menu:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to load menu data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ensureMenuExists = async () => {
    if (!menu && user?.vendor_id) {
      try {
        const response = await vendorService.createMenu(user.vendor_id, "Main Menu");
        setMenu(response.menu);
        return response.menu.id;
      } catch (error: any) {
        throw new Error(error.response?.data?.error || "Failed to create menu");
      }
    }
    return menu!.id;
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!user?.vendor_id || !menu) return;

    try {
      await vendorService.updateMenuItem(
        user.vendor_id,
        menu.id,
        item.id,
        { available: !item.available }
      );

      setMenuItems(menuItems.map(i =>
        i.id === item.id ? { ...i, available: !i.available } : i
      ));

      toast({
        title: "Item Updated",
        description: `${item.name} is now ${!item.available ? "in stock" : "out of stock"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user?.vendor_id) {
      toast({
        title: "Error",
        description: "Vendor ID not found",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const menuId = await ensureMenuExists();

      const itemData = {
        name: newItem.name,
        price: parseFloat(newItem.price),
        description: newItem.description,
        preparation_time_minutes: parseInt(newItem.preparation_time_minutes) || 15,
        image_url: newItem.image_url || null,
        available: true,
      };

      const response = await vendorService.addMenuItems(user.vendor_id, menuId, [itemData]);

      if (response.items && response.items.length > 0) {
        setMenuItems([...menuItems, response.items[0]]);
        setNewItem({ name: "", price: "", description: "", category: "", preparation_time_minutes: "15", image_url: "" });
        setIsDialogOpen(false);

        toast({
          title: "Item Added",
          description: `${response.items[0].name} has been added to your menu`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (item: MenuItem) => {
    if (!user?.vendor_id || !menu) return;

    try {
      await vendorService.deleteMenuItem(user.vendor_id, menu.id, item.id);
      setMenuItems(menuItems.filter(i => i.id !== item.id));

      toast({
        title: "Item Removed",
        description: `${item.name} has been removed from your menu`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const groupedItems = menuItems.reduce((acc, item) => {
    // Extract category from description or use a default
    const category = newItem.category || "Menu Items";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen w-full bg-background">
        <VendorSidebar />
        <main className="flex-1 p-6 md:p-8">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading menu...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <VendorSidebar />

      <main className="flex-1 p-6 md:p-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Menu Management</h1>
              <p className="text-muted-foreground">Manage your food items and availability</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Menu Item</DialogTitle>
                  <DialogDescription>
                    Fill in the details for your new menu item
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Chicken Burger"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (Rs.) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="0.00"
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Describe your item"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prep_time">Preparation Time (minutes)</Label>
                    <Input
                      id="prep_time"
                      type="number"
                      placeholder="15"
                      value={newItem.preparation_time_minutes}
                      onChange={(e) => setNewItem({ ...newItem, preparation_time_minutes: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Image URL</Label>
                    <Input
                      id="imageUrl"
                      placeholder="https://..."
                      value={newItem.image_url}
                      onChange={(e) => setNewItem({ ...newItem, image_url: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <Button onClick={handleAddItem} className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Item"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Menu Items */}
          {menuItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No menu items yet. Click "Add Item" to get started!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category}>
                  <h2 className="text-2xl font-bold text-foreground mb-4">{category}</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-bold text-foreground mb-1">{item.name}</h3>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                                )}
                                <p className="text-xl font-bold text-primary">Rs. {item.price}</p>
                                {item.preparation_time_minutes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Prep time: {item.preparation_time_minutes} min
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button size="icon" variant="ghost" onClick={() => handleRemoveItem(item)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t">
                              <Label htmlFor={`switch-${item.id}`} className="text-sm">
                                {item.available ? "In Stock" : "Out of Stock"}
                              </Label>
                              <Switch
                                id={`switch-${item.id}`}
                                checked={item.available}
                                onCheckedChange={() => toggleAvailability(item)}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Menu;
