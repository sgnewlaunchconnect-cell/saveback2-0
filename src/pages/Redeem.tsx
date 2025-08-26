import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, QrCode, MapPin, RefreshCw, CheckCircle, XCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUserId } from "@/utils/userIdManager";
import { DealBadge } from "@/components/DealBadge";

interface GrabData {
  id: string;
  pin: string;
  status: string;
  expires_at: string;
  created_at: string;
  used_at?: string;
  deals: {
    id: string;
    title: string;
    description: string;
    discount_pct: number;
    cashback_pct: number;
    merchants: {
      id: string;
      name: string;
      address: string;
    };
  };
}

export default function Redeem() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [activeGrabs, setActiveGrabs] = useState<GrabData[]>([]);
  const [historyGrabs, setHistoryGrabs] = useState<GrabData[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedGrabId, setHighlightedGrabId] = useState<string | null>(null);

  useEffect(() => {
    const targetGrabId = searchParams.get('grabId');
    if (targetGrabId) {
      fetchGrabsWithPolling(targetGrabId);
    } else {
      fetchGrabs();
    }
    
    // Set up realtime updates for grabs
    const anonymousUserId = getUserId();
    const channel = supabase
      .channel('grab-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'grabs',
          filter: `anon_user_id=eq.${anonymousUserId}`
        },
        (payload) => {
          console.debug('New grab created:', payload);
          // Add new grab to active list if not expired
          const newGrab = payload.new;
          if (new Date(newGrab.expires_at) > new Date()) {
            fetchGrabs(); // Refresh to get full data with joins
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'grabs',
          filter: `anon_user_id=eq.${anonymousUserId}`
        },
        (payload) => {
          console.debug('Grab updated:', payload);
          fetchGrabs(); // Refresh on updates
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchParams]);

  const fetchGrabs = async () => {
    setLoading(true);
    try {
      const anonymousUserId = getUserId();
      console.debug('Fetching grabs for anonymous user:', anonymousUserId);

      // Fetch active grabs
      const { data: activeData, error: activeError } = await supabase.functions.invoke('getGrabs', {
        body: { anonymousUserId, includeHistory: false }
      });

      if (activeError) throw activeError;

      // Fetch history grabs
      const { data: historyData, error: historyError } = await supabase.functions.invoke('getGrabs', {
        body: { anonymousUserId, includeHistory: true }
      });

      if (historyError) throw historyError;

      if (activeData?.success) {
        setActiveGrabs(activeData.data || []);
      }

      if (historyData?.success) {
        const allGrabs = historyData.data || [];
        const expiredOrUsed = allGrabs.filter((grab: GrabData) => 
          grab.status === 'USED' || new Date(grab.expires_at) <= new Date()
        );
        setHistoryGrabs(expiredOrUsed);
      }

      console.debug('Successfully fetched grabs');
    } catch (error) {
      console.error('Error fetching grabs:', error);
      toast({
        title: "Error",
        description: "Failed to load your grab passes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGrabsWithPolling = async (targetGrabId: string) => {
    setLoading(true);
    setPolling(true);
    
    let attempts = 0;
    const maxAttempts = 6; // 3 seconds total
    
    const pollForGrab = async (): Promise<boolean> => {
      try {
        const anonymousUserId = getUserId();
        
        const { data: activeData, error } = await supabase.functions.invoke('getGrabs', {
          body: { anonymousUserId, includeHistory: false }
        });

        if (error) throw error;

        if (activeData?.success) {
          const grabs = activeData.data || [];
          setActiveGrabs(grabs);
          
          // Check if target grab is found
          const foundGrab = grabs.find((grab: GrabData) => grab.id === targetGrabId);
          if (foundGrab) {
            setHighlightedGrabId(targetGrabId);
            // Clear highlight after 3 seconds
            setTimeout(() => setHighlightedGrabId(null), 3000);
            return true;
          }
        }
        
        return false;
      } catch (error) {
        console.error('Error polling for grab:', error);
        return false;
      }
    };

    // Try to find the grab immediately
    const found = await pollForGrab();
    if (found) {
      setLoading(false);
      setPolling(false);
      await fetchGrabs(); // Also fetch history
      return;
    }

    // Poll for up to 3 seconds
    const pollInterval = setInterval(async () => {
      attempts++;
      
      const found = await pollForGrab();
      if (found || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        setLoading(false);
        setPolling(false);
        if (!found) {
          // Still fetch all grabs even if target not found
          await fetchGrabs();
        }
      }
    }, 500);
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

  const filterGrabs = (grabs: GrabData[]) => {
    if (!searchTerm.trim()) return grabs;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    return grabs.filter(grab => 
      grab.deals.title.toLowerCase().includes(lowercaseSearch) ||
      grab.deals.merchants.name.toLowerCase().includes(lowercaseSearch) ||
      grab.deals.description?.toLowerCase().includes(lowercaseSearch) ||
      grab.pin.includes(searchTerm)
    );
  };

  const handleUseNow = (grabId: string, e: React.MouseEvent) => {
    console.debug('Button clicked for grab:', grabId);
    e.stopPropagation();
    e.preventDefault();
    navigate(`/pay-at-merchant?grabId=${grabId}`);
  };

  const renderGrabCard = (grab: GrabData, showUseButton = false) => {
    const isExpired = new Date(grab.expires_at) <= new Date();
    const isUsed = grab.status === 'USED';
    const isHighlighted = highlightedGrabId === grab.id;
    
    return (
      <Card 
        key={grab.id} 
        className={`hover:shadow-md transition-all duration-300 border-l-4 ${
          isHighlighted 
            ? 'border-l-primary bg-primary/5 shadow-lg' 
            : 'border-l-primary/20'
        }`}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm leading-tight mb-2">
                {grab.deals.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <MapPin className="h-3 w-3" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/merchants/${grab.deals.merchants.id}`);
                  }}
                  className="text-muted-foreground hover:text-primary transition-colors cursor-pointer underline"
                  style={{ cursor: 'pointer' }}
                >
                  {grab.deals.merchants.name}
                </button>
              </div>
              <DealBadge 
                discountPct={grab.deals.discount_pct}
                cashbackPct={grab.deals.cashback_pct}
              />
            </div>
            <div className="ml-4">
              {isUsed ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Used</span>
                </div>
              ) : isExpired ? (
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Expired</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Active</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
              PIN: {grab.pin}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {isUsed && grab.used_at ? (
                `Used ${new Date(grab.used_at).toLocaleDateString()}`
              ) : (
                getTimeLeft(grab.expires_at)
              )}
            </div>
          </div>

          {showUseButton && !isUsed && !isExpired && (
            <Button 
              onClick={(e) => {
                console.debug('Direct button click triggered');
                handleUseNow(grab.id, e);
              }}
              variant="cta"
              className="w-full relative z-10 pointer-events-auto cursor-pointer"
              size="sm"
              type="button"
              style={{ pointerEvents: 'auto', position: 'relative', zIndex: 10, cursor: 'pointer' }}
            >
              {grab.deals.discount_pct > 0 && grab.deals.cashback_pct === 0 
                ? "View Instructions" 
                : "Use Now & Pay"
              }
            </Button>
          )}
        </CardContent>
      </Card>
    );
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

        {polling && (
          <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm text-primary font-medium">Syncing your pass...</p>
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deals, merchants, or PIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active" className="relative">
              Active
              {filterGrabs(activeGrabs).length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 text-xs">
                  {filterGrabs(activeGrabs).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="relative">
              History
              {filterGrabs(historyGrabs).length > 0 && (
                <Badge variant="outline" className="ml-2 h-5 text-xs">
                  {filterGrabs(historyGrabs).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {(() => {
              const filteredActiveGrabs = filterGrabs(activeGrabs);
              
              if (activeGrabs.length === 0) {
                return (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Active Grab Passes</h3>
                      <p className="text-muted-foreground mb-4">
                        Start grabbing deals to see your active passes here!
                      </p>
                      <Button onClick={() => navigate('/deals')} className="w-full">
                        Browse Deals
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              
              if (filteredActiveGrabs.length === 0 && searchTerm) {
                return (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                      <p className="text-muted-foreground mb-4">
                        No active grab passes match "{searchTerm}"
                      </p>
                      <Button variant="outline" onClick={() => setSearchTerm("")}>
                        Clear Search
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <div className="space-y-4">
                  {filteredActiveGrabs.map((grab) => renderGrabCard(grab, true))}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {(() => {
              const filteredHistoryGrabs = filterGrabs(historyGrabs);
              
              if (historyGrabs.length === 0) {
                return (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No History Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Your used and expired grab passes will appear here.
                      </p>
                    </CardContent>
                  </Card>
                );
              }
              
              if (filteredHistoryGrabs.length === 0 && searchTerm) {
                return (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                      <p className="text-muted-foreground mb-4">
                        No history grab passes match "{searchTerm}"
                      </p>
                      <Button variant="outline" onClick={() => setSearchTerm("")}>
                        Clear Search
                      </Button>
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <div className="space-y-4">
                  {filteredHistoryGrabs.map((grab) => renderGrabCard(grab, false))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

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