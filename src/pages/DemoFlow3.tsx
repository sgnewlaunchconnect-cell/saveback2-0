import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MerchantFlow3Panel } from '@/components/MerchantFlow3Panel';
import { CustomerFlow3Panel } from '@/components/CustomerFlow3Panel';
import { DemoFlow3Controls } from '@/components/DemoFlow3Controls';
import { useFlow3State } from '@/hooks/useFlow3State';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function DemoFlow3() {
  const {
    merchantState,
    customerState,
    demoState,
    actions
  } = useFlow3State();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/demo/qr">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Demo Payment Flow 3</h1>
                <p className="text-sm text-muted-foreground">
                  Queue-safe hybrid payment with 6-digit confirmation
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              SIMULATION MODE
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Merchant App Panel */}
          <Card className="min-h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Merchant App</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {demoState.activeMerchant?.name || 'Kaeden Coffee'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <MerchantFlow3Panel 
                state={merchantState}
                actions={actions.merchant}
                demoState={demoState}
              />
            </CardContent>
          </Card>

          {/* Customer App Panel */}
          <Card className="min-h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">Customer App</CardTitle>
                <Badge variant="outline" className="text-xs">
                  Demo User
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CustomerFlow3Panel 
                state={customerState}
                actions={actions.customer}
                demoState={demoState}
              />
            </CardContent>
          </Card>
        </div>

        {/* Demo Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Demo Simulation Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <DemoFlow3Controls 
              state={demoState}
              actions={actions.demo}
              merchantActions={actions.merchant}
              customerActions={actions.customer}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}