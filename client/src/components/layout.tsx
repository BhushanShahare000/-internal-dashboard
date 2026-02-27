import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LogOut, 
  Clock, 
  LayoutDashboard, 
  Settings,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";

function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Sidebar variant="sidebar" className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-primary">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">Content Beta</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={location === "/"}
                  className="rounded-xl transition-all duration-200 py-5"
                >
                  <Link href="/" className="flex items-center gap-3">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {user?.role === 'admin' && (
                <SidebarMenuItem className="mt-1">
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === "/admin"}
                    className="rounded-xl transition-all duration-200 py-5"
                  >
                    <Link href="/admin" className="flex items-center gap-3">
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Admin Area</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-foreground truncate">
              {user?.username}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            title="Log out"
            className="text-muted-foreground hover:text-foreground rounded-xl"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex min-h-screen w-full bg-background/50">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-16 flex items-center px-6 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-4 lg:hidden">
              <SidebarTrigger>
                <Menu className="w-5 h-5 text-foreground" />
              </SidebarTrigger>
            </div>
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground font-medium hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-both">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
