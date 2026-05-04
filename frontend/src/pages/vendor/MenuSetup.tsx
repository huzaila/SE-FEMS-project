import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const MenuSetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    quantity: "",
    imageUrl: "",
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem = {
      id: Date.now(),
      ...formData,
      price: parseFloat(formData.price),
      quantity: parseInt(formData.quantity),
    };
    
    setItems([...items, newItem]);
    setFormData({ name: "", price: "", quantity: "", imageUrl: "" });
    
    toast({
      title: "Item Added",
      description: `${newItem.name} has been added to your menu`,
    });
  };

  const handleComplete = () => {
    if (items.length === 0) {
      toast({
        title: "Add at least one item",
        description: "Please add menu items before continuing",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Menu Setup Complete",
      description: "Your menu has been created successfully!",
    });
    navigate("/vendor/dashboard");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Menu</h1>
          <p className="text-muted-foreground">Add items to get started with your vendor account</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Add Item Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Menu Item</CardTitle>
              <CardDescription>Fill in the details for a new item</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Chicken Burger"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Rs.)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Stock)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://..."
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Items Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Added Items ({items.length})</CardTitle>
              <CardDescription>Your menu items will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No items added yet</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="w-16 h-16 bg-background rounded-md overflow-hidden">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Rs. {item.price} • Stock: {item.quantity}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {items.length > 0 && (
                <Button onClick={handleComplete} className="w-full mt-4" size="lg">
                  Complete Setup
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MenuSetup;
