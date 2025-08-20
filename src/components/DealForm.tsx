import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";

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
    images: initialData?.images || [],
  });

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages(prev => [...prev, ...files]);
    
    // Create preview URLs for the form data
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...imageUrls]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
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

        {/* Image Upload Section */}
        <div className="col-span-2">
          <Label htmlFor="images">Deal Photos (optional)</Label>
          <Card className="mt-2">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Upload Button */}
                <div className="flex items-center justify-center border-2 border-dashed border-muted rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload images</span>
                    <span className="text-xs text-muted-foreground">PNG, JPG up to 5MB each</span>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                
                {/* Image Previews */}
                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.images.map((imageUrl: string, index: number) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Deal image ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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