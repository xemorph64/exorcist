import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  FileBarChart,
  FileSignature,
  FlaskConical,
  Ghost,
  GitCompareArrows,
  GitPullRequestArrow,
  KeyRound,
  LayoutDashboard,
  Network,
  Plug,
  Settings,
  ShieldAlert,
  ShieldBan,
  Waypoints,
  Radar,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Monitor",
    items: [
      { to: "/dashboard", label: "Command Center", icon: LayoutDashboard },
      { to: "/agents", label: "Agent Fleet", icon: Bot },
      { to: "/activity", label: "Live Activity", icon: Activity },
      { to: "/analytics", label: "Behavioral Analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Investigate",
    items: [
      { to: "/incidents", label: "Incident Center", icon: ShieldAlert },
      { to: "/drift", label: "Identity Drift", icon: GitCompareArrows },
      { to: "/threat-graph", label: "Provenance Graph", icon: Network },
      { to: "/ghost-replay", label: "Ghost Replay", icon: Ghost },
    ],
  },
  {
    group: "Defend",
    items: [
      { to: "/containment", label: "Containment", icon: ShieldBan },
      { to: "/credentials", label: "Credential Integrity", icon: KeyRound },
      { to: "/decoys", label: "D3COY Mesh", icon: Radar },
      { to: "/data-flow", label: "Data Flow Guard", icon: Waypoints },
    ],
  },
  {
    group: "Govern",
    items: [
      { to: "/contracts", label: "Role Contracts", icon: FileSignature },
      { to: "/changes", label: "Change Registry", icon: GitPullRequestArrow },
      { to: "/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    group: "Workspace",
    items: [
      { to: "/lab", label: "Possession Lab", icon: FlaskConical },
      { to: "/showcase", label: "System Preview", icon: Presentation },
      { to: "/integrations", label: "Integrations", icon: Plug },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const ALL_NAV = NAV.flatMap((g) => g.items);
export const BrandIcon = Boxes;
