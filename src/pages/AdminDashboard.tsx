import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminContent } from "@/components/admin/AdminContent";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeSection, setActiveSection] = useState("overview");
  const navigate = useNavigate();
  const { toast } = useToast();

  const authBypass = import.meta.env.VITE_AUTH_BYPASS === 'true';

  useEffect(() => {
    if (authBypass) {
      setIsAdmin(true);
      return;
    }
    checkAdminAccess();
  }, [authBypass]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!userRoles || userRoles.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    }
  };

  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {authBypass && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center py-2 text-sm font-medium">
            ⚠️ DEVELOPMENT MODE: Authentication bypassed
          </div>
        )}
        <div className={authBypass ? "mt-10" : ""}>
          <AdminSidebar 
            activeSection={activeSection} 
            onSectionChange={setActiveSection} 
          />
        </div>
        <div className={authBypass ? "mt-10" : ""}>
          <AdminContent activeSection={activeSection} />
        </div>
      </div>
    </SidebarProvider>
  );
}