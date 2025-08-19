import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Phone, Star, Heart, Users, ShoppingCart, 
  Clock, TrendingUp, Eye, MessageCircle, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Merchant {
  id: string;
  name: string;
  address: string;
  phone: string;
  category: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

interface Deal {
  id: string;
  title: string;
  description: string;
  discount_pct: number;
  cashback_pct: number;
  reward_mode: string;
  start_at: string;
  end_at: string;
  stock: number;
  views: number;
  grabs: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  users: {
    display_name: string;
  };
}

interface GroupBuy {
  id: string;
  title: string;
  description: string;
  target_quantity: number;
  current_quantity: number;
  original_price: number;
  group_price: number;
  end_at: string;
  is_active: boolean;
}

export default function MerchantPage() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [groupBuys, setGroupBuys] = useState<GroupBuy[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      fetchMerchantData();
    }
  }, [merchantId]);

  const fetchMerchantData = async () => {
    setLoading(true);
    try {
      // Fetch merchant info
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .single();

      if (merchantError) throw merchantError;
      setMerchant(merchantData);

      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Fetch reviews (simplified for demo)
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;
      // Add mock user data for reviews
      const reviewsWithUsers = reviewsData?.map(review => ({
        ...review,
        users: { display_name: 'Demo User' }
      })) || [];
      setReviews(reviewsWithUsers);

      // Fetch group buys
      const { data: groupBuysData, error: groupBuysError } = await supabase
        .from('group_buys')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (groupBuysError) throw groupBuysError;
      setGroupBuys(groupBuysData || []);

    } catch (error) {
      console.error('Error fetching merchant data:', error);
      toast({
        title: "Error",
        description: "Failed to load merchant information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        // Unfollow logic would go here
        setIsFollowing(false);
        toast({
          title: "Unfollowed",
          description: "You will no longer receive updates from this merchant"
        });
      } else {
        // Follow logic would go here  
        setIsFollowing(true);
        toast({
          title: "Following!",
          description: "You'll get notified about new deals and updates"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive"
      });
    }
  };

  const handleGrabDeal = async (dealId: string) => {
    try {
      // Use createGrab edge function to ensure proper expiry and validation
      const { data, error } = await supabase.functions.invoke('createGrab', {
        body: { dealId }
      });

      if (error) throw error;

      toast({
        title: "Deal Grabbed! 🎉",
        description: "You can use this deal before it expires"
      });

      navigate(`/grab-pass/${data.grab.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to grab deal",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading merchant...</p>
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Merchant Not Found</h2>
          <p className="text-muted-foreground mb-4">The merchant you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/deals')}>Browse Deals</Button>
        </div>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{merchant.name}</h1>
              <div className="flex items-center gap-4 text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{merchant.address}</span>
                </div>
                {merchant.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{merchant.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{merchant.category}</Badge>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-medium">{averageRating}</span>
                  <span className="text-muted-foreground">({reviews.length} reviews)</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleFollow}
              variant={isFollowing ? "secondary" : "default"}
              className="flex items-center gap-2"
            >
              <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="deals" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            <TabsTrigger value="group-buys">Group Buys ({groupBuys.length})</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            <TabsTrigger value="info">Info</TabsTrigger>
          </TabsList>

          <TabsContent value="deals" className="space-y-4">
            {deals.length > 0 ? (
              deals.map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{deal.title}</h3>
                        <p className="text-muted-foreground mb-3">{deal.description}</p>
                        
                        <div className="flex items-center gap-4 mb-3">
                          {deal.discount_pct > 0 && (
                            <Badge variant="secondary">
                              {deal.discount_pct}% OFF
                            </Badge>
                          )}
                          {deal.cashback_pct > 0 && (
                            <Badge variant="outline">
                              {deal.cashback_pct}% Cashback
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{deal.views} views</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{deal.grabs} grabbed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Ends {new Date(deal.end_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleGrabDeal(deal.id)}
                        className="ml-4"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Grab Deal
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Deals</h3>
                  <p className="text-muted-foreground">This merchant doesn't have any active deals at the moment.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="group-buys" className="space-y-4">
            {groupBuys.length > 0 ? (
              groupBuys.map((groupBuy) => (
                <Card key={groupBuy.id}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{groupBuy.title}</h3>
                        <p className="text-muted-foreground mb-3">{groupBuy.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Group Price</p>
                            <p className="text-2xl font-bold text-green-600">${groupBuy.group_price}</p>
                            <p className="text-sm text-muted-foreground line-through">${groupBuy.original_price}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Progress</p>
                            <p className="text-lg font-semibold">
                              {groupBuy.current_quantity}/{groupBuy.target_quantity}
                            </p>
                            <div className="w-full bg-muted rounded-full h-2 mt-1">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(100, (groupBuy.current_quantity / groupBuy.target_quantity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          Ends {new Date(groupBuy.end_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <Button className="ml-4">
                        <Plus className="w-4 h-4 mr-2" />
                        Join Group Buy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Group Buys</h3>
                  <p className="text-muted-foreground">This merchant doesn't have any active group buys.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {review.users?.display_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium">{review.users?.display_name || 'User'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-current' : 'text-muted-foreground'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground">Be the first to leave a review for this merchant.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contact</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{merchant.address}</span>
                    </div>
                    {merchant.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{merchant.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Category</h4>
                  <Badge variant="secondary">{merchant.category}</Badge>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Stats</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Average Rating</p>
                      <p className="font-medium">{averageRating}/5</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Reviews</p>
                      <p className="font-medium">{reviews.length}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}