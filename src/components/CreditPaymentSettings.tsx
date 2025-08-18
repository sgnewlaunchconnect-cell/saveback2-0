import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Settings, Info, Target, Zap } from 'lucide-react';

interface CreditPaymentSettingsProps {
  localCredits: number;
  networkCredits: number;
  onSettingsChange?: (settings: CreditSettings) => void;
}

interface CreditSettings {
  autoApplyCredits: boolean;
  redemptionGoal: number | null;
  prioritizeLocal: boolean;
  notifications: boolean;
}

export default function CreditPaymentSettings({ 
  localCredits, 
  networkCredits, 
  onSettingsChange 
}: CreditPaymentSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CreditSettings>({
    autoApplyCredits: false,
    redemptionGoal: 2000, // $20.00
    prioritizeLocal: true,
    notifications: true,
  });

  const handleSettingChange = <K extends keyof CreditSettings>(
    key: K, 
    value: CreditSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const saveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your credit payment preferences have been updated.",
    });
  };

  const totalCredits = localCredits + networkCredits;
  const goalProgress = settings.redemptionGoal ? 
    Math.min((totalCredits / settings.redemptionGoal) * 100, 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Credit Payment Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto Apply Credits */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="auto-apply" className="text-base">
              Auto-apply credits at checkout
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically use your credits when making purchases
            </p>
          </div>
          <Switch
            id="auto-apply"
            checked={settings.autoApplyCredits}
            onCheckedChange={(checked) => handleSettingChange('autoApplyCredits', checked)}
          />
        </div>

        <Separator />

        {/* Payment Priority */}
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Credit Usage Priority
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</div>
              <span className="text-sm">Local Credits (merchant-specific)</span>
              <Badge variant="secondary">${(localCredits / 100).toFixed(2)}</Badge>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground text-sm flex items-center justify-center">2</div>
              <span className="text-sm">Network Credits (universal)</span>
              <Badge variant="outline">${(networkCredits / 100).toFixed(2)}</Badge>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              We use local credits first to maximize your merchant-specific rewards, then network credits for universal coverage.
            </p>
          </div>
        </div>

        <Separator />

        {/* Redemption Goal */}
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Credit Accumulation Goal
          </Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">${(totalCredits / 100).toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">
                / ${(settings.redemptionGoal || 0) / 100}.00 goal
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {settings.redemptionGoal && totalCredits >= settings.redemptionGoal ? 
                "🎉 Goal reached! Time to treat yourself!" :
                `Keep earning to reach your goal! ${Math.round(goalProgress)}% complete`
              }
            </p>
          </div>
        </div>

        <Separator />

        {/* Notifications */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-1">
            <Label htmlFor="notifications" className="text-base">
              Credit notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when you earn credits or reach milestones
            </p>
          </div>
          <Switch
            id="notifications"
            checked={settings.notifications}
            onCheckedChange={(checked) => handleSettingChange('notifications', checked)}
          />
        </div>

        {/* Save Button */}
        <Button onClick={saveSettings} className="w-full">
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}