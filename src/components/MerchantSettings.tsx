import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MerchantInfo {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  default_cashback_pct: number;
  default_discount_pct?: number;
  default_reward_mode: string;
  payout_method?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  cover_url?: string;
  allow_pin_fallback?: boolean;
}

interface MerchantSettingsProps {
  merchantInfo: MerchantInfo;
  onUpdate: (updatedInfo: MerchantInfo) => void;
}

export default function MerchantSettings({ merchantInfo, onUpdate }: MerchantSettingsProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: merchantInfo.name,
    category: merchantInfo.category,
    is_active: merchantInfo.is_active,
    default_cashback_pct: merchantInfo.default_cashback_pct,
    default_discount_pct: merchantInfo.default_discount_pct || 0,
    default_reward_mode: merchantInfo.default_reward_mode,
    payout_method: merchantInfo.payout_method || 'manual',
    address: merchantInfo.address || '',
    phone: merchantInfo.phone || '',
    logo_url: merchantInfo.logo_url || '',
    cover_url: merchantInfo.cover_url || '',
    allow_pin_fallback: merchantInfo.allow_pin_fallback || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('merchants')
        .update({
          name: formData.name,
          category: formData.category as any,
          is_active: formData.is_active,
          default_cashback_pct: formData.default_cashback_pct,
          default_discount_pct: formData.default_discount_pct,
          default_reward_mode: formData.default_reward_mode as any,
          payout_method: formData.payout_method,
          address: formData.address,
          phone: formData.phone,
          logo_url: formData.logo_url,
          cover_url: formData.cover_url,
          allow_pin_fallback: formData.allow_pin_fallback,
        })
        .eq('id', merchantInfo.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      toast({
        title: "Success",
        description: "Merchant settings updated successfully"
      });
    } catch (error) {
      console.error('Error updating merchant:', error);
      toast({
        title: "Error",
        description: "Failed to update merchant settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Merchant Settings</h2>
        <p className="text-muted-foreground">
          Manage your merchant profile and default settings
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Merchant Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Enter merchant name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Enter business address"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => updateField('is_active', checked)}
              />
              <Label htmlFor="is_active">Active Merchant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Default Deal Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Default Deal Settings</CardTitle>
            <p className="text-sm text-muted-foreground">
              These settings will be used as defaults when creating new deals
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default_reward_mode">Default Reward Type</Label>
                <Select value={formData.default_reward_mode} onValueChange={(value) => updateField('default_reward_mode', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASHBACK">Cashback</SelectItem>
                    <SelectItem value="DISCOUNT">Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payout_method">Payment Processing</Label>
                <Select value={formData.payout_method} onValueChange={(value) => updateField('payout_method', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">PIN Only (Manual)</SelectItem>
                    <SelectItem value="stripe">In-app (Stripe)</SelectItem>
                    <SelectItem value="paypal">In-app (PayPal)</SelectItem>
                    <SelectItem value="other_psp">In-app (Other PSP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="default_cashback_pct">Default Cashback %</Label>
                <Input
                  id="default_cashback_pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.default_cashback_pct}
                  onChange={(e) => updateField('default_cashback_pct', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="default_discount_pct">Default Discount %</Label>
                <Input
                  id="default_discount_pct"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.default_discount_pct}
                  onChange={(e) => updateField('default_discount_pct', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="allow_pin_fallback"
                checked={formData.allow_pin_fallback}
                onCheckedChange={(checked) => updateField('allow_pin_fallback', checked)}
              />
              <div>
                <Label htmlFor="allow_pin_fallback">Allow PIN Fallback</Label>
                <p className="text-xs text-muted-foreground">
                  Enable deal PIN entry as backup when QR scanning isn't available (disabled by default)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => updateField('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <Label htmlFor="cover_url">Cover Image URL</Label>
              <Input
                id="cover_url"
                value={formData.cover_url}
                onChange={(e) => updateField('cover_url', e.target.value)}
                placeholder="https://example.com/cover.png"
              />
            </div>
          </CardContent>
        </Card>

        {/* QR Code Management */}
        <Card>
          <CardHeader>
            <CardTitle>Static QR Code</CardTitle>
            <p className="text-sm text-muted-foreground">
              Generate a QR code for customers to scan and pay at your stall
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Universal Pay & Earn QR</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Place this QR code at your stall. Customers can scan to pay and earn credits on any purchase.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const qrUrl = `${window.location.origin}/pay-at-merchant?merchantId=${merchantInfo.id}`;
                  const printContent = `
                    <div style="text-align: center; padding: 20px;">
                      <h1>${merchantInfo.name}</h1>
                      <div style="margin: 20px 0;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}" alt="QR Code" />
                      </div>
                      <p><strong>Scan to Pay & Earn Credits!</strong></p>
                      <p>Save money on every purchase</p>
                    </div>
                  `;
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(printContent);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                🖨️ Print Stall QR Code
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}