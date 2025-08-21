import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AdminNavigation() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      setIsAdmin(userRoles && userRoles.length > 0);
    } catch (error) {
      console.error("Error checking admin access:", error);
      setIsAdmin(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Link
      to="/admin"
      className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
    >
      <Shield className="h-4 w-4" />
      Admin
    </Link>
  );
}