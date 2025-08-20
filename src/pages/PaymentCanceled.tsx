import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";

export default function PaymentCanceled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-orange-600 dark:text-orange-400">Payment Canceled</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground">
                Your payment was canceled. You can try again or use a payment code instead.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Alternative Options</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Generate a payment code for merchant validation</li>
                <li>• Try a different payment method</li>
                <li>• Contact support if you need assistance</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => navigate(-1)} 
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Payment Again
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}