import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Menu, 
  Home, 
  Tag, 
  User, 
  Store, 
  LogOut,
  CreditCard
} from "lucide-react";

interface UserRole {
  role: string;
}

export default function Navigation() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) loadUserRole(user.id);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || 'user');
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
      navigate('/auth');
    } catch (error: any) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/deals', label: 'Deals', icon: Tag },
    ...(user ? [{ path: '/profile', label: 'Profile', icon: User }] : []),
    ...(userRole === 'merchant' || userRole === 'admin' ? [
      { path: '/merchant/dashboard', label: 'Merchant', icon: Store }
    ] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Tag className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg">Grab</span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActivePath(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-3">
        {user ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium">{user.email}</p>
              {userRole && (
                <Badge variant="secondary" className="text-xs">
                  {userRole}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            <Link to="/auth" onClick={() => setIsOpen(false)}>
              <Button variant="default" size="sm" className="w-full">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Tag className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Grab</span>
          </Link>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:flex fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="w-full max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Tag className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Grab</span>
            </Link>

            <nav className="flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isActivePath(item.path)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.email}</p>
                    {userRole && (
                      <Badge variant="secondary" className="text-xs">
                        {userRole}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link to="/auth">
                  <Button size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed navigation */}
      <div className="h-16" />
    </>
  );
}