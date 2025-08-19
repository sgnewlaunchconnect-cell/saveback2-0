import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  Home, 
  Tag, 
  User, 
  Store,
  Wallet,
  Gift
} from "lucide-react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Deals', icon: Tag },
    { path: '/redeem', label: 'Redeem', icon: Gift },
    { path: '/wallet', label: 'Wallet', icon: Wallet },
    { path: '/merchant/demo', label: 'Merchant Demo', icon: Store },
    { path: '/merchant/dashboard', label: 'Merchant Dashboard', icon: Store },
    { path: '/hawker/validate', label: 'Validate (Hawker)', icon: Tag },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Tag className="h-4 w-4 text-primary-foreground" />
        </div>
            <span className="font-bold text-lg">Save&Shop</span>
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

    </div>
  );

  return (
    <>
      {/* Mobile Navigation - Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex flex-col items-center justify-center p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Tag className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Save&Shop</span>
          </Link>
          <span className="text-xs text-muted-foreground mt-1">Discover amazing deals and save money</span>
        </div>
      </div>

      {/* Mobile Navigation - Bottom Tab Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
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
              <div className="flex flex-col">
                <span className="font-bold text-lg">Save&Shop</span>
                <span className="text-xs text-muted-foreground hidden md:block">Discover amazing deals and save money</span>
              </div>
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

          </div>
        </div>
      </div>

      {/* Spacers for fixed navigation */}
      <div className="h-16 lg:h-16" />
      <div className="lg:hidden h-16" />
    </>
  );
}