import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, TestTube } from 'lucide-react';
import { getPaymentFlowVersion, setPaymentFlowVersion, getPaymentFlowDisplayName } from '@/utils/paymentFlowVersion';

export default function PaymentFlowToggle() {
  const [currentFlow, setCurrentFlow] = React.useState(getPaymentFlowVersion());

  const handleFlowChange = (version: '1' | '2') => {
    setPaymentFlowVersion(version);
    setCurrentFlow(version);
    // Reload page to apply changes
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings className="w-4 h-4" />
          Payment Flow Settings
          <Badge variant="outline" className="text-xs">
            {getPaymentFlowDisplayName(currentFlow)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="flow-1" className="text-sm font-medium">
                Payment Flow 1 (Current)
              </Label>
              <p className="text-xs text-muted-foreground">
                Customer enters bill amount, gets QR code
              </p>
            </div>
            <Switch
              id="flow-1"
              checked={currentFlow === '1'}
              onCheckedChange={(checked) => {
                if (checked) handleFlowChange('1');
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="flow-2" className="text-sm font-medium">
                Payment Flow 2 (Merchant-keyed)
              </Label>
              <p className="text-xs text-muted-foreground">
                Customer gets QR code, merchant keys in amount
              </p>
            </div>
            <Switch
              id="flow-2"
              checked={currentFlow === '2'}
              onCheckedChange={(checked) => {
                if (checked) handleFlowChange('2');
              }}
            />
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
            <TestTube className="w-4 h-4" />
            <span className="text-sm font-medium">Quick Test</span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            You can also use URL parameter: ?flow=1 or ?flow=2 for quick testing
          </p>
        </div>
      </CardContent>
    </Card>
  );
}