import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  RotateCcw, 
  Users, 
  Clock, 
  Settings,
  Zap,
  Wallet
} from 'lucide-react';

interface DemoFlow3ControlsProps {
  state: {
    demoCredits: { local: number; network: number };
    simulationMode: 'quiet' | 'busy' | 'custom';
  };
  actions: {
    simulateScenario: (scenario: 'quiet' | 'busy') => void;
    resetDemo: () => void;
    setDemoCredits: (credits: { local: number; network: number }) => void;
  };
  merchantActions: any;
  customerActions: any;
}

export function DemoFlow3Controls({ 
  state, 
  actions, 
  merchantActions, 
  customerActions 
}: DemoFlow3ControlsProps) {
  const [localCredits, setLocalCredits] = React.useState(state.demoCredits.local.toString());
  const [networkCredits, setNetworkCredits] = React.useState(state.demoCredits.network.toString());

  const updateCredits = () => {
    actions.setDemoCredits({
      local: parseFloat(localCredits) || 0,
      network: parseFloat(networkCredits) || 0,
    });
  };

  const quickScenarios = [
    {
      name: 'Quiet Stall',
      description: 'Single pending bill (auto-match)',
      action: () => actions.simulateScenario('quiet'),
      icon: Clock,
      color: 'bg-green-500/10 text-green-700',
    },
    {
      name: 'Busy Stall',
      description: 'Multiple bills (token required)',
      action: () => actions.simulateScenario('busy'),
      icon: Users,
      color: 'bg-orange-500/10 text-orange-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Quick Scenarios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Scenarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quickScenarios.map((scenario) => (
            <Button
              key={scenario.name}
              variant="outline"
              onClick={scenario.action}
              className="w-full justify-start p-4 h-auto"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${scenario.color}`}>
                  <scenario.icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">{scenario.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {scenario.description}
                  </div>
                </div>
              </div>
            </Button>
          ))}
          
          <Separator />
          
          <Button
            variant="destructive"
            onClick={actions.resetDemo}
            className="w-full"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Demo
          </Button>
        </CardContent>
      </Card>

      {/* Credit Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Demo Credits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label htmlFor="local-credits" className="text-sm">
                Local Credits ($)
              </Label>
              <Input
                id="local-credits"
                type="number"
                step="0.01"
                value={localCredits}
                onChange={(e) => setLocalCredits(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="network-credits" className="text-sm">
                Network Credits ($)
              </Label>
              <Input
                id="network-credits"
                type="number"
                step="0.01"
                value={networkCredits}
                onChange={(e) => setNetworkCredits(e.target.value)}
              />
            </div>
            
            <Button onClick={updateCredits} className="w-full">
              Update Credits
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Current Balance:</div>
            <div className="flex justify-between text-sm">
              <span>Local:</span>
              <span>${state.demoCredits.local.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Network:</span>
              <span>${state.demoCredits.network.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total:</span>
              <span>${(state.demoCredits.local + state.demoCredits.network).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Queue Mode:</span>
              <Badge variant="outline" className="text-xs">
                {state.simulationMode === 'quiet' ? 'Quiet' : 
                 state.simulationMode === 'busy' ? 'Busy' : 'Custom'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Demo Merchant:</span>
              <Badge variant="secondary" className="text-xs">
                Kaeden Coffee
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Terminals:</span>
              <Badge variant="outline" className="text-xs">
                3 Active
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Flow Features:
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>✓ Auto-match when queue is quiet</li>
              <li>✓ Lane tokens for busy queues</li>
              <li>✓ 50% credit cap enforcement</li>
              <li>✓ 6-digit confirmation codes</li>
              <li>✓ Real-time queue updates</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}