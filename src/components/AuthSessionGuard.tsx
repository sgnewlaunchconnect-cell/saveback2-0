import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthSessionGuardProps {
  children: React.ReactNode;
}

export function AuthSessionGuard({ children }: AuthSessionGuardProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn("Session error detected:", error.message);
        
        // If it's a JWT error, clear the session
        if (error.message.includes("invalid_jwt") || error.message.includes("bad_jwt")) {
          await supabase.auth.signOut();
          toast({
            title: "Session expired",
            description: "Your session has been reset. Please sign in again if needed.",
            variant: "default"
          });
        }
      }
    } catch (error) {
      console.warn("Auth session check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}