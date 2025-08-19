import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DealForm from "@/components/DealForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Deal {
  id: string;
  title: string;
  description: string;
  cashback_pct: number;
  discount_pct: number;
  reward_mode: string;
  is_active: boolean;
  stock: number;
  grabs: number;
  views: number;
  start_at: string;
  end_at: string;
  created_at: string;
}

interface DealManagementProps {
  merchantId: string;
}

export default function DealManagement({ merchantId }: DealManagementProps) {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadDeals();
  }, [merchantId]);

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('merchant-manage-deals', {
        body: {
          action: 'list',
          merchantId
        }
      });

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
      toast({
        title: "Error",
        description: "Failed to load deals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeal = async (dealData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('merchant-manage-deals', {
        body: {
          action: 'create',
          merchantId,
          dealData
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Deal created successfully"
      });
      
      setShowCreateDialog(false);
      loadDeals();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        title: "Error",
        description: "Failed to create deal",
        variant: "destructive"
      });
    }
  };

  const handleUpdateDeal = async (dealData: any) => {
    if (!editingDeal) return;

    try {
      const { data, error } = await supabase.functions.invoke('merchant-manage-deals', {
        body: {
          action: 'update',
          merchantId,
          dealId: editingDeal.id,
          dealData
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Deal updated successfully"
      });
      
      setEditingDeal(null);
      loadDeals();
    } catch (error) {
      console.error('Error updating deal:', error);
      toast({
        title: "Error",
        description: "Failed to update deal",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to delete this deal?')) return;

    try {
      const { error } = await supabase.functions.invoke('merchant-manage-deals', {
        body: {
          action: 'delete',
          merchantId,
          dealId
        }
      });

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Deal deleted successfully"
      });
      
      loadDeals();
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast({
        title: "Error",
        description: "Failed to delete deal",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deal Management</h2>
          <p className="text-muted-foreground">
            Create and manage your merchant deals
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Deal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Deal</DialogTitle>
            </DialogHeader>
            <DealForm onSubmit={handleCreateDeal} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Deals List */}
      {deals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deals yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first deal to start attracting customers
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Deal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map((deal) => (
            <Card key={deal.id}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {deal.title}
                      <Badge variant={deal.is_active ? "default" : "secondary"}>
                        {deal.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {deal.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingDeal(deal)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDeal(deal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium">Reward</p>
                    <p className="text-lg">
                      {deal.reward_mode === 'CASHBACK' 
                        ? `${deal.cashback_pct}% Cashback`
                        : `${deal.discount_pct}% Discount`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Stock</p>
                    <p className="text-lg">{deal.stock || 'Unlimited'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Grabs</p>
                    <p className="text-lg">{deal.grabs}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Views</p>
                    <p className="text-lg">{deal.views}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Deal Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={() => setEditingDeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          {editingDeal && (
            <DealForm 
              initialData={editingDeal}
              onSubmit={handleUpdateDeal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}