import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Video, Eye, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

interface ReelsManagerProps {
  merchantId: string;
}

export default function ReelsManager({ merchantId }: ReelsManagerProps) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<Reel | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    is_active: true
  });

  useEffect(() => {
    loadReels();
  }, [merchantId]);

  const loadReels = async () => {
    try {
      const { data, error } = await supabase
        .from("merchant_reels")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReels(data || []);
    } catch (error) {
      console.error("Error loading reels:", error);
      toast({
        title: "Error",
        description: "Failed to load reels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      video_url: "",
      thumbnail_url: "",
      is_active: true
    });
    setEditingReel(null);
  };

  const validateVideoUrl = (url: string) => {
    const patterns = [
      /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/,
      /^https:\/\/(www\.)?vimeo\.com\//,
      /^https:\/\/.*\.(mp4|webm|ogg)$/i
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateVideoUrl(formData.video_url)) {
      toast({
        title: "Invalid Video URL",
        description: "Please provide a valid YouTube, Vimeo, or direct video file URL",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const reelData = {
        merchant_id: merchantId,
        title: formData.title,
        description: formData.description || null,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        is_active: formData.is_active
      };

      if (editingReel) {
        const { error } = await supabase
          .from("merchant_reels")
          .update(reelData)
          .eq("id", editingReel.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Reel updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("merchant_reels")
          .insert([reelData]);

        if (error) throw error;
        toast({
          title: "Success", 
          description: "Reel created successfully",
        });
      }

      loadReels();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving reel:", error);
      toast({
        title: "Error",
        description: "Failed to save reel",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (reel: Reel) => {
    setEditingReel(reel);
    setFormData({
      title: reel.title,
      description: reel.description || "",
      video_url: reel.video_url,
      thumbnail_url: reel.thumbnail_url || "",
      is_active: reel.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (reelId: string) => {
    if (!confirm("Are you sure you want to delete this reel?")) return;

    try {
      const { error } = await supabase
        .from("merchant_reels")
        .delete()
        .eq("id", reelId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Reel deleted successfully",
      });
      
      loadReels();
    } catch (error) {
      console.error("Error deleting reel:", error);
      toast({
        title: "Error",
        description: "Failed to delete reel",
        variant: "destructive",
      });
    }
  };

  const incrementViewCount = async (reelId: string) => {
    try {
      const { error } = await supabase
        .from("merchant_reels")
        .update({ view_count: reels.find(r => r.id === reelId)!.view_count + 1 })
        .eq("id", reelId);

      if (error) throw error;
      loadReels();
    } catch (error) {
      console.error("Error updating view count:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading reels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Video Reels</h3>
          <p className="text-sm text-muted-foreground">
            Showcase your business with video content
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingReel ? "Edit Reel" : "Add New Reel"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="YouTube, Vimeo, or direct video URL"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports YouTube, Vimeo, or direct video file links
                </p>
              </div>

              <div>
                <Label htmlFor="thumbnail_url">Thumbnail URL (optional)</Label>
                <Input
                  id="thumbnail_url"
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="Custom thumbnail image URL"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="active">Active and visible to customers</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingReel ? "Update Reel" : "Create Reel"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {reels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No reels found</p>
            <p className="text-sm text-muted-foreground">
              Add your first video reel to showcase your business
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reels.map((reel) => (
            <Card key={reel.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{reel.title}</h4>
                      <Badge variant={reel.is_active ? "default" : "secondary"}>
                        {reel.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    {reel.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {reel.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{reel.view_count} views</span>
                      </div>
                      <a
                        href={reel.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => incrementViewCount(reel.id)}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Watch Video</span>
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(reel)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDelete(reel.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}