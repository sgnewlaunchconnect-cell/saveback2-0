import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { DollarSign, Coffee, Utensils, Gift } from "lucide-react";

interface DemoScenario {
  id: string;
  title: string;
  description: string;
  dealType: 'percentage' | 'fixed';
  discount: string;
  examplePrice: string;
  estimatedFinal: string;
  withCredits: string;
  icon: React.ReactNode;
  color: string;
}

export default function DemoScenarios() {
  const navigate = useNavigate();

  const scenarios: DemoScenario[] = [
    {
      id: "550e8400-e29b-41d4-a716-446655440107",
      title: "Coffee & Pastry Deal",
      description: "Perfect morning combo with 15% off",
      dealType: "percentage",
      discount: "15% off",
      examplePrice: "$12.99",
      estimatedFinal: "$11.04",
      withCredits: "$3.54 (with $7.50 credits)",
      icon: <Coffee className="h-5 w-5" />,
      color: "bg-amber-50 border-amber-200 text-amber-800"
    },
    {
      id: "high-value-550e8400-e29b-41d4-a716-446655440108",
      title: "Premium Dinner Experience", 
      description: "Fine dining with 20% off total bill",
      dealType: "percentage",
      discount: "20% off",
      examplePrice: "$89.99", 
      estimatedFinal: "$71.99",
      withCredits: "$64.49 (with $7.50 credits)",
      icon: <Utensils className="h-5 w-5" />,
      color: "bg-purple-50 border-purple-200 text-purple-800"
    },
    {
      id: "fixed-discount-550e8400-e29b-41d4-a716-446655440109",
      title: "Buy One Get $10 Off",
      description: "Fixed $10 discount on any purchase",
      dealType: "fixed", 
      discount: "$10 off",
      examplePrice: "$25.99",
      estimatedFinal: "$15.99",
      withCredits: "$8.49 (with $7.50 credits)",
      icon: <Gift className="h-5 w-5" />,
      color: "bg-green-50 border-green-200 text-green-800"
    },
    {
      id: "small-purchase-550e8400-e29b-41d4-a716-446655440110",
      title: "Quick Snack Deal",
      description: "25% off small items - great for credit usage",
      dealType: "percentage",
      discount: "25% off",
      examplePrice: "$6.99",
      estimatedFinal: "$5.24",
      withCredits: "FREE! (with $7.50 credits)",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-blue-50 border-blue-200 text-blue-800"
    }
  ];

  const startDemo = () => {
    navigate('/pay');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Payment Flow Demo</h1>
          <p className="text-muted-foreground">
            Try different pricing scenarios with and without credits
          </p>
          <div className="flex justify-center">
            <Badge variant="outline" className="px-4 py-2">
              Available Credits: $7.50 (Local: $4.50 + Network: $3.00)
            </Badge>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => (
            <Card key={scenario.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${scenario.color}`}>
                      {scenario.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{scenario.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">{scenario.discount}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing Examples */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Example Price:</span>
                    <span className="font-medium">{scenario.examplePrice}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">After Deal:</span>
                    <span className="font-medium text-green-600">{scenario.estimatedFinal}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">With Credits:</span>
                    <span className="font-bold text-blue-600">{scenario.withCredits}</span>
                  </div>
                </div>

                {/* Demo Button */}
                <Button 
                  onClick={startDemo}
                  className="w-full"
                  variant="default"
                >
                  Try Payment Flow →
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Flow Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How the New Flow Works</CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <h4 className="font-semibold text-primary mb-4">💳 Simple Payment Flow</h4>
                <ol className="text-sm space-y-2 list-decimal list-inside text-left max-w-md mx-auto">
                  <li><strong>User enters bill amount</strong> (e.g., $12)</li>
                  <li><strong>App shows breakdown:</strong> Bill, Credits available, Final payable</li>
                  <li><strong>User taps "Confirm & Pay"</strong></li>
                  <li><strong>Payment processed</strong> via PSP (Stripe/PayNow)</li>
                  <li><strong>Success screen</strong> with verification code</li>
                  <li><strong>Credits updated</strong> automatically</li>
                </ol>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  ✅ <strong>Merchant staff</strong> simply check the success screen on user's phone.<br/>
                  🔒 <strong>Security:</strong> Unique 6-digit verification code for fraud prevention.
                </p>
              </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}