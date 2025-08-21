import { 
  BarChart3, 
  Users, 
  Store, 
  CreditCard, 
  DollarSign, 
  Flag,
  Menu
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "merchants", label: "Merchants", icon: Store },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "settlements", label: "Settlements", icon: DollarSign },
  { id: "reviews", label: "Review Flags", icon: Flag },
];

export function AdminSidebar({ activeSection, onSectionChange }: AdminSidebarProps) {
  const { state } = useSidebar();

  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
      <div className="p-2">
        <SidebarTrigger />
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => (
                <SidebarMenuItem key={section.id}>
                  <SidebarMenuButton 
                    asChild
                    className={activeSection === section.id ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <button
                      onClick={() => onSectionChange(section.id)}
                      className="w-full flex items-center"
                    >
                      <section.icon className="mr-2 h-4 w-4" />
                      {state !== "collapsed" && <span>{section.label}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}