import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getEnvVar } from "@/utils/envAccess";

export function SessionResetButton() {
  const { toast } = useToast();
  
  // Only show in development or when explicitly enabled
  const showResetButton = getEnvVar("VITE_SHOW_DEV_TOOLS") === "true" || import.meta.env.DEV;
  
  if (!showResetButton) {
    return null;
  }

  const handleResetSession = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.clear();
      
      // Reload the page to start fresh
      window.location.reload();
      
      toast({
        title: "Session reset",
        description: "Your session has been cleared successfully.",
      });
    } catch (error) {
      console.error("Error resetting session:", error);
      toast({
        title: "Reset failed",
        description: "Could not reset session. Try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResetSession}
      className="flex items-center gap-2"
    >
      <RotateCcw className="h-4 w-4" />
      Reset Session
    </Button>
  );
}