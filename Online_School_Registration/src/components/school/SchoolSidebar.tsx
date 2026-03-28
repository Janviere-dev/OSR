import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Building2,
  Sparkles,
  Landmark,
  MessageSquare
} from 'lucide-react';

interface SchoolSidebarProps {
  school: {
    id: string;
    name: string;
    logo_url: string | null;
    district: string;
    sector: string;
  };
}

export function SchoolSidebar({ school }: SchoolSidebarProps) {
  const { t } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { title: t('school.nav.dashboard'), icon: LayoutDashboard, path: '/school' },
    { title: t('school.nav.applications'), icon: FileText, path: '/school/applications' },
    { title: t('school.nav.students'), icon: Users, path: '/school/students' },
    { title: t('school.welcome.govPortal'), icon: Landmark, path: '/school/government' },
    { title: t('chat.inbox'), icon: MessageSquare, path: '/school/inbox' },
    { title: t('school.nav.settings'), icon: Settings, path: '/school/settings' },
  ];

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border [&_[data-sidebar=sidebar]]:bg-white [&_[data-sidebar=sidebar]]:relative"
    >
      {/* Decorative accent strip at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary to-accent z-20" />

      <SidebarHeader className="p-4 border-b border-border relative z-10">
        <div className="flex items-center gap-3">
          {/* School Logo with blue ring */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-primary/20 shadow-sm">
            {school.logo_url ? (
              <img 
                src={school.logo_url} 
                alt={school.name} 
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-7 h-7 text-primary" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm text-foreground truncate font-display">
                {school.name}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {school.district}, {school.sector}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 relative z-10">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider px-3 font-medium">
            {t('school.nav.menu')}
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="group"
                    >
                      <button
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                        {!collapsed && (
                          <span className="font-medium">{item.title}</span>
                        )}
                        {isActive && !collapsed && (
                          <Sparkles className="w-3 h-3 ml-auto text-primary-foreground/70" />
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border relative z-10">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg" />
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="flex-1 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('nav.signout')}
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
