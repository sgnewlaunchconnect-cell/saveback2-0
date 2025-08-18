import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Store, 
  DollarSign, 
  Users, 
  TrendingUp, 
  QrCode, 
  Tag,
  Bell,
  Settings,
  Scan,
  Check,
  X,
  ArrowRight,
  Eye,
  Plus,
  BarChart3,
  Calendar,
  MapPin,
  Clock
} from "lucide-react";

interface DemoStats {
  active_deals: number;
  total_grabs: number;
  pending_validations: number;
  total_revenue: number;
  today_sales: number;
  conversion_rate: number;
}

interface DemoGrab {
  id: string;
  created_at: string;
  status: string;
  deal_title: string;
  user_name: string;
  amount: number;
  pin: string;
}

export default function MerchantDemo() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats] = useState<DemoStats>({
    active_deals: 8,
    total_grabs: 247,
    pending_validations: 5,
    total_revenue: 3420.75,
    today_sales: 280.50,
    conversion_rate: 24.5
  });

  const [recentGrabs] = useState<DemoGrab[]>([
    {
      id: "grab001",
      created_at: new Date().toISOString(),
      status: "LOCKED",
      deal_title: "Coffee + Pastry Combo",
      user_name: "Sarah Johnson",
      amount: 15.50,
      pin: "742816"
    },
    {
      id: "grab002", 
      created_at: new Date(Date.now() - 1800000).toISOString(),
      status: "LOCKED",
      deal_title: "Lunch Special 20% Off",
      user_name: "Mike Chen",
      amount: 22.40,
      pin: "593047"
    },
    {
      id: "grab003",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      status: "REDEEMED",
      deal_title: "Happy Hour Drink",
      user_name: "Emma Wilson",
      amount: 8.75,
      pin: "284915"
    }
  ]);

  const [pinInput, setPinInput] = useState("");
  const [validating, setValidating] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOCKED':
        return <Badge className="bg-amber-100 text-amber-800">Ready to Validate</Badge>;
      case 'REDEEMED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const validateDemoGrab = async () => {
    if (!pinInput.trim()) {
      toast({
        title: "PIN Required",
        description: "Please enter a customer PIN to validate",
        variant: "destructive",
      });
      return;
    }

    setValidating(true);
    
    // Simulate validation
    setTimeout(() => {
      const matchingGrab = recentGrabs.find(g => g.pin === pinInput && g.status === 'LOCKED');
      
      if (matchingGrab) {
        toast({
          title: "✅ Grab Validated Successfully!",
          description: `${matchingGrab.deal_title} for ${matchingGrab.user_name}`,
        });

        // Simulate credit issuance
        setTimeout(() => {
          toast({
            title: "🎉 Credits Issued!",
            description: `$${matchingGrab.amount.toFixed(2)} processed. Your Tower grew!`,
          });
        }, 1000);
      } else {
        toast({
          title: "❌ Invalid PIN",
          description: "No active grab found with this PIN",
          variant: "destructive",
        });
      }
      
      setPinInput("");
      setValidating(false);
    }, 1500);
  };

  const quickActions = [
    {
      title: "Create New Deal",
      description: "Set up a new promotional offer",
      icon: Plus,
      action: () => toast({ title: "Feature Demo", description: "Deal creation interface would open here" })
    },
    {
      title: "View Analytics",
      description: "Check performance metrics",
      icon: BarChart3,
      action: () => toast({ title: "Feature Demo", description: "Analytics dashboard would open here" })
    },
    {
      title: "Validate Customer",
      description: "Process customer redemptions",
      icon: QrCode,
      action: () => navigate('/merchant/validate')
    },
    {
      title: "Merchant Settings",
      description: "Configure your store profile",
      icon: Settings,
      action: () => toast({ title: "Feature Demo", description: "Settings panel would open here" })
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Live Demo Badge */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Brew & Bytes Café</h1>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Downtown Tech District
                  </span>
                  <Badge className="bg-green-100 text-green-800">Live Demo</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Alerts (3)
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                Active Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.active_deals}</p>
              <p className="text-xs text-muted-foreground">+2 this week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Total Grabs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total_grabs}</p>
              <p className="text-xs text-muted-foreground">+18 today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{stats.pending_validations}</p>
              <p className="text-xs text-muted-foreground">Need validation</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Today's Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">${stats.today_sales.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">+12% vs yesterday</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-600" />
                Conversion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.conversion_rate}%</p>
              <p className="text-xs text-muted-foreground">Grab to sale</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Demo Interface */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Quick Validation Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                Quick Validation
              </CardTitle>
              <CardDescription>Validate customer grabs instantly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quick-pin">Customer PIN</Label>
                <Input
                  id="quick-pin"
                  placeholder="Enter 6-digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  maxLength={6}
                  disabled={validating}
                />
                <p className="text-xs text-muted-foreground">
                  Try: 742816 or 593047
                </p>
              </div>
              <Button 
                onClick={validateDemoGrab}
                disabled={validating || pinInput.length !== 6}
                className="w-full"
              >
                {validating ? 'Validating...' : 'Validate Grab'}
              </Button>
              
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/merchant/validate')}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Full Validation Interface
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Grabs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Pending Customer Grabs
                </span>
                <Badge variant="secondary">{recentGrabs.filter(g => g.status === 'LOCKED').length} pending</Badge>
              </CardTitle>
              <CardDescription>Customers waiting for validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentGrabs.map((grab) => (
                  <div key={grab.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{grab.deal_title}</p>
                        <Badge variant="outline" className="text-xs">PIN: {grab.pin}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{grab.user_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(grab.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-lg">${grab.amount.toFixed(2)}</p>
                      {getStatusBadge(grab.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common merchant tasks and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="h-20 flex-col gap-2 hover:bg-primary/5"
                  onClick={action.action}
                >
                  <action.icon className="h-6 w-6 text-primary" />
                  <div className="text-center">
                    <p className="font-medium text-sm">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation to Full Features */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/merchant/dashboard')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Full Dashboard
                </span>
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Complete merchant dashboard with analytics, deal management, and detailed reports
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/merchant/validate')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Validation Center
                </span>
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
              <CardDescription>
                Advanced customer validation with QR scanning and PIN verification
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">🎮 Demo Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Try the Quick Validation:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Enter PIN: <code className="bg-blue-100 px-1 rounded">742816</code> or <code className="bg-blue-100 px-1 rounded">593047</code></li>
                  <li>• Watch the validation process</li>
                  <li>• See automatic credit issuance</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Explore Features:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Click Quick Actions to see demos</li>
                  <li>• Visit Full Dashboard for complete interface</li>
                  <li>• Check Validation Center for advanced tools</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}