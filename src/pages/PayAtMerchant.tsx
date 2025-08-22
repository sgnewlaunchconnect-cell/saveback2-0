import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserId } from "@/utils/userIdManager";
import QuickPaymentFlow from "@/components/QuickPaymentFlow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Play, Search, QrCode, Store } from "lucide-react";

export default function PayAtMerchant() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const grabId = searchParams.get("grabId");
  const staticQrId = searchParams.get("staticQrId");
  const merchantId = searchParams.get("merchantId");
  const isDemoMode = searchParams.get("demo") === "1";
  
  const [grabData, setGrabData] = useState<any>(null);
  const [merchantData, setMerchantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [merchantCode, setMerchantCode] = useState("");

  useEffect(() => {
    if (grabId) {
      fetchGrabData();
    } else if (staticQrId) {
      fetchMerchantFromQr();
    } else if (merchantId) {
      fetchMerchantById();
    } else {
      fetchMerchantsForSelection();
    }
  }, [grabId, staticQrId, merchantId]);

  const fetchGrabData = async () => {
    setLoading(true);
    try {
      const anonymousUserId = getUserId();

      const { data, error } = await supabase.functions.invoke('getGrab', {
        body: { grabId, anonymousUserId }
      });

      if (error) throw error;

      setGrabData(data.data);
      
      // Fetch merchant data for PSP capabilities
      if (data.data?.merchant_id) {
        console.log('Fetching merchant data for:', data.data.merchant_id);
        const { data: merchant, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('id', data.data.merchant_id)
          .maybeSingle();
          
        if (!merchantError && merchant) {
          console.log('Merchant PSP enabled:', merchant.psp_enabled);
          setMerchantData(merchant);
        } else {
          console.error('Error fetching merchant:', merchantError);
        }
      }
    } catch (error) {
      console.error('Error fetching grab data:', error);
      toast({
        title: "Error",
        description: "Failed to load deal information",
        variant: "destructive"
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantFromQr = async () => {
    setLoading(true);
    try {
      // Find merchant by static QR ID
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('static_qr_id', staticQrId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (merchantError || !merchant) {
        throw new Error('Merchant not found or inactive');
      }
      
      setMerchantData(merchant);
      // For static QR, we don't have grab data - user will create payment directly
      setGrabData(null);
    } catch (error) {
      console.error('Error fetching merchant from QR:', error);
      toast({
        title: "Error",
        description: "Invalid QR code or merchant not found",
        variant: "destructive"
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantById = async () => {
    setLoading(true);
    try {
      // Find merchant by ID
      const { data: merchant, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', merchantId)
        .eq('is_active', true)
        .maybeSingle();
        
      if (merchantError || !merchant) {
        throw new Error('Merchant not found or inactive');
      }
      
      setMerchantData(merchant);
      // For direct merchant payment, we don't have grab data - user will create payment directly
      setGrabData(null);
    } catch (error) {
      console.error('Error fetching merchant by ID:', error);
      toast({
        title: "Error",
        description: "Merchant not found or inactive",
        variant: "destructive"
      });
      navigate('/deals');
    } finally {
      setLoading(false);
    }
  };

  const fetchMerchantsForSelection = async () => {
    setLoading(true);
    try {
      const { data: merchantsList, error } = await supabase
        .from('merchants')
        .select('id, name, address, logo_url, category, static_qr_id')
        .eq('is_active', true)
        .order('name')
        .limit(20);
        
      if (error) throw error;
      
      setMerchants(merchantsList || []);
      
      // Load last used merchant from localStorage
      const lastMerchantId = localStorage.getItem('lastMerchantId');
      if (lastMerchantId && merchantsList) {
        const lastMerchant = merchantsList.find(m => m.id === lastMerchantId);
        if (lastMerchant) {
          // Move last merchant to top
          setMerchants([lastMerchant, ...merchantsList.filter(m => m.id !== lastMerchantId)]);
        }
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast({
        title: "Error",
        description: "Failed to load merchants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMerchantSelect = (merchant: any) => {
    // Remember this merchant
    localStorage.setItem('lastMerchantId', merchant.id);
    
    // Navigate with demo param if present
    const demoParam = isDemoMode ? '&demo=1' : '';
    navigate(`/pay-at-merchant?merchantId=${merchant.id}${demoParam}`);
  };

  const handleMerchantCodeSubmit = () => {
    if (!merchantCode.trim()) return;
    
    const demoParam = isDemoMode ? '&demo=1' : '';
    navigate(`/pay-at-merchant?staticQrId=${merchantCode.trim()}${demoParam}`);
  };

  const handleQRScan = () => {
    // TODO: Implement QR scanning
    toast({
      title: "QR Scanner",
      description: "QR scanning will be implemented soon",
      variant: "default"
    });
  };

  const handlePaymentComplete = async (paymentResult: any) => {
    // Payment code generated - merchant validation will handle the rest
    console.log('Payment code generated for validation:', paymentResult.paymentCode);
  };

  // Set document title when merchant data is available
  useEffect(() => {
    if (merchantData?.name) {
      document.title = `Pay at ${merchantData.name}`;
    } else {
      document.title = 'Pay at Merchant';
    }
  }, [merchantData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading deal information...</p>
        </div>
      </div>
    );
  }

  // Show merchant selection when no specific merchant/grab data
  if (!grabData && !merchantData) {
    const filteredMerchants = merchants.filter(merchant =>
      merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (merchant.address && merchant.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/deals')}
            >
              ← Back to Deals
            </Button>
          </div>

          {/* Demo Mode Banner */}
          {isDemoMode && (
            <Card className="mb-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Play className="h-4 w-4" />
                  <span className="text-sm font-medium">Demo Mode Active</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Select Merchant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search merchants */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* QR Scan button */}
              <Button
                variant="outline"
                onClick={handleQRScan}
                className="w-full"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Scan Merchant QR Code
              </Button>

              {/* Manual code entry */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter merchant code..."
                  value={merchantCode}
                  onChange={(e) => setMerchantCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleMerchantCodeSubmit()}
                />
                <Button 
                  onClick={handleMerchantCodeSubmit}
                  disabled={!merchantCode.trim()}
                  size="sm"
                >
                  Go
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Merchant list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading merchants...</p>
            </div>
          ) : filteredMerchants.length > 0 ? (
            <div className="space-y-3">
              {filteredMerchants.map((merchant, index) => (
                <Card 
                  key={merchant.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleMerchantSelect(merchant)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {merchant.logo_url && (
                        <img 
                          src={merchant.logo_url} 
                          alt={`${merchant.name} logo`}
                          className="w-10 h-10 rounded-lg object-cover bg-muted"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">
                            {merchant.name}
                          </h3>
                          {index === 0 && localStorage.getItem('lastMerchantId') === merchant.id && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                              Last used
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {merchant.address || merchant.category || 'Merchant'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No merchants found matching your search' : 'No active merchants available'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/deals')}
          >
            ← Back to Deals
          </Button>
        </div>
        
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <Card className="mb-4 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Demo Mode Active</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                This is a simulation for testing purposes
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Merchant Information */}
        {merchantData && (
          <Card className="mb-6 border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {merchantData.logo_url && (
                  <img 
                    src={merchantData.logo_url} 
                    alt={`${merchantData.name} logo`}
                    className="w-12 h-12 rounded-lg object-cover bg-muted"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {merchantData.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {merchantData.address || merchantData.category || 'Merchant'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <QuickPaymentFlow
          grabData={grabData}
          merchantData={merchantData}
          localCredits={850}    // TODO: Load real user credits
          networkCredits={725}  // TODO: Load real user credits
          onComplete={handlePaymentComplete}
          isStaticQr={!!(staticQrId || merchantId)}
        />
      </div>
    </div>
  );
}