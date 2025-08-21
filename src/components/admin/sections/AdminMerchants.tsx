import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye } from "lucide-react";

interface Merchant {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  psp_enabled: boolean;
  psp_fee_pct: number;
  psp_fee_fixed_cents: number;
  created_at: string;
  owner?: {
    email: string;
    display_name: string;
  } | null;
}

export function AdminMerchants() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from("merchants")
        .select(`
          *,
          owner:users!merchants_owner_id_fkey(email, display_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMerchants(data as any || []);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch merchants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMerchantStatus = async (merchantId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("merchants")
        .update({ is_active: isActive })
        .eq("id", merchantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Merchant ${isActive ? "activated" : "deactivated"} successfully`,
      });

      fetchMerchants();
    } catch (error) {
      console.error("Error updating merchant status:", error);
      toast({
        title: "Error",
        description: "Failed to update merchant status",
        variant: "destructive",
      });
    }
  };

  const togglePSP = async (merchantId: string, pspEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from("merchants")
        .update({ psp_enabled: pspEnabled })
        .eq("id", merchantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `PSP ${pspEnabled ? "enabled" : "disabled"} successfully`,
      });

      fetchMerchants();
    } catch (error) {
      console.error("Error updating PSP status:", error);
      toast({
        title: "Error",
        description: "Failed to update PSP status",
        variant: "destructive",
      });
    }
  };

  const filteredMerchants = merchants.filter(merchant =>
    merchant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Merchants Management</h2>
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Merchants Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Merchant Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant name or owner email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Merchants ({filteredMerchants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>PSP</TableHead>
                <TableHead>Fee %</TableHead>
                <TableHead>Fixed Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMerchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell className="font-medium">{merchant.name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{merchant.owner?.display_name || "-"}</div>
                      <div className="text-muted-foreground">{merchant.owner?.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{merchant.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={merchant.is_active}
                        onCheckedChange={(checked) => toggleMerchantStatus(merchant.id, checked)}
                      />
                      <span className="text-sm">
                        {merchant.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={merchant.psp_enabled}
                        onCheckedChange={(checked) => togglePSP(merchant.id, checked)}
                      />
                      <span className="text-sm">
                        {merchant.psp_enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{merchant.psp_fee_pct}%</TableCell>
                  <TableCell>${(merchant.psp_fee_fixed_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}