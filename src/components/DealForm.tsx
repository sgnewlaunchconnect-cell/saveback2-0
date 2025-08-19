import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DealFormProps {
  initialData?: any;
  onSubmit: (data: any) => void;
}

export default function DealForm({ initialData, onSubmit }: DealFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    reward_mode: initialData?.reward_mode || 'CASHBACK',
    cashback_pct: initialData?.cashback_pct || 5,
    discount_pct: initialData?.discount_pct || 0,
    stock: initialData?.stock || '',
    is_active: initialData?.is_active ?? true,
    start_at: initialData?.start_at ? new Date(initialData.start_at).toISOString().slice(0, 16) : '',
    end_at: initialData?.end_at ? new Date(initialData.end_at).toISOString().slice(0, 16) : '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      stock: formData.stock ? parseInt(formData.stock) : null,
      start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
    };
    
    onSubmit(submitData);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Deal Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="e.g., Weekend Special"
            required
          />
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Describe your deal..."
          />
        </div>

        <div>
          <Label htmlFor="reward_mode">Reward Type</Label>
          <Select value={formData.reward_mode} onValueChange={(value) => updateField('reward_mode', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CASHBACK">Cashback</SelectItem>
              <SelectItem value="DISCOUNT">Discount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.reward_mode === 'CASHBACK' ? (
          <div>
            <Label htmlFor="cashback_pct">Cashback Percentage</Label>
            <Input
              id="cashback_pct"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.cashback_pct}
              onChange={(e) => updateField('cashback_pct', parseFloat(e.target.value))}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="discount_pct">Discount Percentage</Label>
            <Input
              id="discount_pct"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.discount_pct}
              onChange={(e) => updateField('discount_pct', parseFloat(e.target.value))}
            />
          </div>
        )}

        <div>
          <Label htmlFor="stock">Stock Limit (optional)</Label>
          <Input
            id="stock"
            type="number"
            min="0"
            value={formData.stock}
            onChange={(e) => updateField('stock', e.target.value)}
            placeholder="Leave empty for unlimited"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => updateField('is_active', checked)}
          />
          <Label htmlFor="is_active">Active Deal</Label>
        </div>

        <div>
          <Label htmlFor="start_at">Start Date (optional)</Label>
          <Input
            id="start_at"
            type="datetime-local"
            value={formData.start_at}
            onChange={(e) => updateField('start_at', e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="end_at">End Date (optional)</Label>
          <Input
            id="end_at"
            type="datetime-local"
            value={formData.end_at}
            onChange={(e) => updateField('end_at', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">
          {initialData ? 'Update Deal' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
}