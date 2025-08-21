import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Reply, Edit2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  users?: {
    display_name: string;
    email: string;
  };
  reply?: {
    id: string;
    message: string;
    created_at: string;
    updated_at: string;
  };
}

interface MerchantReviewsProps {
  merchantId: string;
}

export default function MerchantReviews({ merchantId }: MerchantReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const [editingReply, setEditingReply] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [merchantId]);

  const fetchReviews = async () => {
    try {
      // Get reviews only for now - we'll add replies later when types are updated
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      // Add demo user data for now
      const reviewsWithUsers = reviewsData?.map(review => ({
        ...review,
        users: { display_name: 'Demo User', email: 'demo@example.com' }
      })) || [];

      setReviews(reviewsWithUsers);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId: string) => {
    const message = replyText[reviewId]?.trim();
    if (!message) return;

    setIsSubmitting(true);
    try {
      // For now, just show a toast - we'll implement the actual reply system when types are updated
      toast({
        title: "Reply Feature Coming Soon",
        description: "Reply functionality will be available once the database types are updated."
      });

      // Clear the reply text
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        title: "Error",
        description: "Failed to submit reply",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Reviews & Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-6 h-6 text-yellow-500 fill-current" />
                <span className="text-3xl font-bold">{averageRating}</span>
              </div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{reviews.length}</div>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                {/* Review Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                      {review.users?.display_name?.charAt(0)?.toUpperCase() || 
                       review.users?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">
                        {review.users?.display_name || review.users?.email || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                        {review.updated_at !== review.created_at && ' (edited)'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < review.rating 
                            ? 'text-yellow-500 fill-current' 
                            : 'text-muted-foreground'
                        }`} 
                      />
                    ))}
                    <Badge variant="outline" className="ml-2">
                      {review.rating}/5
                    </Badge>
                  </div>
                </div>

                {/* Review Comment */}
                {review.comment && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-foreground">{review.comment}</p>
                  </div>
                )}

                {/* Reply Form */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Reply to this review</span>
                  </div>
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyText[review.id] || ""}
                    onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm"
                      onClick={() => handleReply(review.id)}
                      disabled={isSubmitting || !replyText[review.id]?.trim()}
                    >
                      {isSubmitting ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground">
                Customer reviews will appear here once they start leaving feedback.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}