import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Save&Shop</h1>
          <p className="text-muted-foreground">Discover deals and save money</p>
        </div>
        
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Flow Demo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Pay at any merchant with automatic credit application
              </p>
              <Button 
                className="w-full mb-3" 
                onClick={() => navigate('/pay')}
              >
                Pay at Merchant
              </Button>
              <Button 
                variant="outline"
                className="w-full mb-3" 
                onClick={() => navigate('/demo-scenarios')}
              >
                Try Demo Scenarios
              </Button>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => navigate('/deals')}
              >
                Browse All Deals
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Merchant Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Process customer payments and manage your business
              </p>
              <Button 
                variant="outline"
                className="w-full" 
                onClick={() => navigate('/merchant/validate')}
              >
                Merchant Terminal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
