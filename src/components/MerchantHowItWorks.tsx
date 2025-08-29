import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Store, 
  Gift, 
  CreditCard, 
  ShieldCheck, 
  HelpCircle, 
  ChevronDown,
  ArrowRight,
  Play,
  Users,
  Coins,
  Zap
} from "lucide-react";

interface MerchantHowItWorksProps {
  merchantId: string;
}

export default function MerchantHowItWorks({ merchantId }: MerchantHowItWorksProps) {
  const [activeTab, setActiveTab] = useState("deals");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const demoSteps = [
    {
      step: 1,
      title: "Create a Deal",
      description: "Set up cashback or discount offers",
      action: "deals"
    },
    {
      step: 2,
      title: "Customer Grabs Deal",
      description: "Users discover and grab your deals",
      action: "grabs"
    },
    {
      step: 3,
      title: "Validate Payment",
      description: "Quick one-tap validation process",
      action: "validation"
    }
  ];

  const faqs = [
    {
      id: "credits-split",
      question: "How is the 70/30 credit split calculated?",
      answer: "When customers earn cashback, 70% goes to local credits (usable only at your business) and 30% goes to network credits (usable anywhere). This encourages repeat visits while giving customers flexibility."
    },
    {
      id: "validation-process",
      question: "What's the validation process for payments?",
      answer: "Customers show a 6-digit payment code. You enter it in the validation tab, confirm the amount, and tap 'Complete'. Credits are automatically awarded and the transaction is recorded."
    },
    {
      id: "deal-types",
      question: "What's the difference between cashback and discount deals?",
      answer: "Cashback deals give customers credits after purchase (great for loyalty). Discount deals reduce the purchase price immediately (great for attracting new customers)."
    },
    {
      id: "grab-expiry",
      question: "When do grabbed deals expire?",
      answer: "Grabbed deals expire 3 hours after being grabbed. Customers need to visit and make a purchase within this window to redeem the deal."
    },
    {
      id: "analytics",
      question: "What analytics can I track?",
      answer: "View deal performance, customer visits, revenue trends, popular times, and customer retention metrics in the Analytics tab."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">How Your Business Works on Save&Shop</h2>
        <p className="text-muted-foreground">
          A complete guide to managing deals, credits, and customer interactions
        </p>
      </div>

      {/* Quick Demo Flow */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Quick Demo Flow
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            See how the complete customer journey works
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {demoSteps.map((step, index) => (
              <div key={step.step} className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < demoSteps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                )}
              </div>
            ))}
          </div>
          <Button 
            className="w-full mt-4" 
            onClick={() => window.open(`/merchant/${merchantId}/terminal`, '_blank')}
          >
            Try Staff Terminal Demo
          </Button>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Deals
          </TabsTrigger>
          <TabsTrigger value="grabs" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Grabs
          </TabsTrigger>
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Credits
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Validation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Creating Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Choose Reward Type</h4>
                      <p className="text-sm text-muted-foreground">Cashback (loyalty) or Discount (attraction)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Set Percentage</h4>
                      <p className="text-sm text-muted-foreground">5-20% is typical for most businesses</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <h4 className="font-medium">Set Visibility</h4>
                      <p className="text-sm text-muted-foreground">Public, Local, or Private deals</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deal Types Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Cashback Deals</h4>
                      <Badge variant="secondary">Loyalty</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customers pay full price, earn credits after purchase. Great for building repeat customers.
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Discount Deals</h4>
                      <Badge variant="secondary">Attraction</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Immediate price reduction. Perfect for attracting new customers and clearing inventory.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grabs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  How Grabs Work
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Gift className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Customer Discovers Deal</h4>
                      <p className="text-sm text-muted-foreground">Through app browse or location search</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Grabs Deal (3hr window)</h4>
                      <p className="text-sm text-muted-foreground">Gets unique PIN, must visit within 3 hours</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">Visits & Validates</h4>
                      <p className="text-sm text-muted-foreground">Shows payment code, you validate transaction</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grab Statuses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">ACTIVE</span>
                    <Badge className="bg-green-100 text-green-800">Ready to use</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">LOCKED</span>
                    <Badge variant="secondary">Payment initiated</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">USED</span>
                    <Badge variant="outline">Successfully redeemed</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">EXPIRED</span>
                    <Badge variant="destructive">3hr window passed</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  Credit System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium mb-2">70/30 Split Rule</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Local Credits (your business)</span>
                      <Badge variant="default">70%</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Network Credits (anywhere)</span>
                      <Badge variant="secondary">30%</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This split encourages customer loyalty while providing network flexibility
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Local credits expire after 90 days</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-sm">Network credits never expire</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm">Credits awarded instantly after validation</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">$50 purchase with 10% cashback</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total cashback:</span>
                        <span className="font-medium">$5.00</span>
                      </div>
                      <div className="flex justify-between text-blue-600">
                        <span>Local credits (70%):</span>
                        <span className="font-medium">$3.50</span>
                      </div>
                      <div className="flex justify-between text-purple-600">
                        <span>Network credits (30%):</span>
                        <span className="font-medium">$1.50</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Customer can use $3.50 at your business and $1.50 anywhere on the platform
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Validation Process
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <h4 className="font-medium">Customer Shows Code</h4>
                      <p className="text-sm text-muted-foreground">6-digit payment code on their phone</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <h4 className="font-medium">Enter Code</h4>
                      <p className="text-sm text-muted-foreground">Type code in validation tab</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <h4 className="font-medium">One-Tap Complete</h4>
                      <p className="text-sm text-muted-foreground">Confirm amount and complete transaction</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What Happens After Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Credits automatically awarded to customer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Transaction recorded in analytics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Deal marked as used (if applicable)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Customer gains tier points</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {faqs.map((faq) => (
            <Collapsible
              key={faq.id}
              open={openFaq === faq.id}
              onOpenChange={(open) => setOpenFaq(open ? faq.id : null)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto text-left"
                >
                  <span className="font-medium">{faq.question}</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}