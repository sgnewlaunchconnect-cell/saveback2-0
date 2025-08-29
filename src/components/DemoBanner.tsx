import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';

export default function DemoBanner() {
  const { isDemoMode, exitDemo } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-700 mb-4">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <Play className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Demo Mode Active
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              - All actions are simulated, no real payments
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDemo}
            className="h-6 w-6 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-200 dark:hover:bg-purple-950/30"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}