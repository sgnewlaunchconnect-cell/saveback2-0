
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, QrCode, MapPin, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GrabData {
  id: string;
  pin: string;
  status: string;
  expires_at: string;
  created_at: string;
  deals: {
    id: string;
    title: string;
    description: string;
    discount_pct: number;
    cashback_pct: number;
    merchants: {
      name: string;
      address: string;
    };
  };
}

export default function Redeem() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [grabs, setGrabs] = useState<GrabData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrabs();
  }, []);

  const fetchGrabs = async () => {
    setLoading(true);
    try {
      // Get anonymous user ID
      const anonymousUserId = localStorage.getItem('anonymousUserId') || '';

      const { data, error } = await supabase.functions.invoke('getGrabs', {
        body: { anonymousUserId }
      });

      if (error) throw error;

      setGrabs(data.data || []);
    } catch (error) {
      console.error('Error fetching grabs:', error);
      toast({
        title: "Error",
        description: "Failed to load your grab passes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} days left`;
    if (hours > 0) return `${hours} hours left`;
    return 'Ending soon';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="h-8 bg-muted rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Grab Passes</h1>
          <Button variant="outline" size="icon" onClick={fetchGrabs}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {grabs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Grab Passes Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start grabbing deals to see your passes here!
              </p>
              <Button onClick={() => navigate('/deals')} className="w-full">
                Browse Deals
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {grabs.map((grab) => (
              <Card 
                key={grab.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/grab-pass/${grab.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm leading-tight mb-1">
                        {grab.deals.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        {grab.deals.merchants.name}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {grab.deals.discount_pct > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {grab.deals.discount_pct}% OFF
                        </Badge>
                      )}
                      {grab.deals.cashback_pct > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {grab.deals.cashback_pct}% back
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        PIN: {grab.pin}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {getTimeLeft(grab.expires_at)}
                    </div>
                  </div>

                  {grab.status === 'USED' && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✓ Used
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/deals')} 
            className="w-full"
          >
            Browse More Deals
          </Button>
        </div>
      </div>
    </div>
  );
}
