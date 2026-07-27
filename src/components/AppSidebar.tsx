import { 
  Bot, 
  History, 
  LayoutDashboard, 
  Search, 
  LineChart, 
  Activity, 
  ArrowUpDown, 
  SplitSquareHorizontal,
  ArrowDownUp,
  Settings
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const tradingItems = [
    { title: "Auto-Bot", value: "auto-bot", icon: Bot, isPrimary: true },
    { title: "Live History", value: "history", icon: History, isPrimary: true },
  ];

  const analysisItems = [
    { title: "Insights Dashboard", value: "insights", icon: LayoutDashboard },
    { title: "Symbol Scanner", value: "scanner", icon: Search },
    { title: "Predictions", value: "predictions", icon: LineChart },
  ];

  const strategyItems = [
    { title: "Even/Odd", value: "even-odd", icon: Activity },
    { title: "Rise/Fall", value: "rise-fall", icon: ArrowUpDown },
    { title: "Matches/Differs", value: "matches-differs", icon: SplitSquareHorizontal },
    { title: "Over/Under", value: "over-under", icon: ArrowDownUp },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="py-4 px-2">
        <div className="flex items-center justify-center gap-2 font-bold text-xl tracking-tight uppercase text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 group-data-[collapsible=icon]:hidden">
          <Bot className="h-6 w-6 text-primary" />
          <span>Deriv Pro</span>
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
          <Bot className="h-6 w-6 text-primary" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-[10px]">Automated Trading</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tradingItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={activeView === item.value}
                    onClick={() => setActiveView(item.value)}
                    className={activeView === item.value ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" : ""}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="font-semibold tracking-wide">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarSeparator className="opacity-50" />

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-[10px]">Market Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysisItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={activeView === item.value}
                    onClick={() => setActiveView(item.value)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="opacity-50" />

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-[10px]">Manual Strategies</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {strategyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={activeView === item.value}
                    onClick={() => setActiveView(item.value)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarSeparator className="opacity-50" />
      <div className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              isActive={activeView === "settings"}
              onClick={() => setActiveView("settings")}
              tooltip="Account Settings"
              className={activeView === "settings" ? "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary" : ""}
            >
              <Settings className="h-4 w-4" />
              <span>Settings & Auth</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
