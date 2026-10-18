import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { NotFound, RouteError } from "./pages/NotFound";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const Activity = lazy(() => import("./pages/Activity"));
const Drift = lazy(() => import("./pages/Drift"));
const ThreatGraph = lazy(() => import("./pages/ThreatGraph"));
const Incidents = lazy(() => import("./pages/Incidents"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail"));
const GhostReplay = lazy(() => import("./pages/GhostReplay"));
const Credentials = lazy(() => import("./pages/Credentials"));
const Decoys = lazy(() => import("./pages/Decoys"));
const Contracts = lazy(() => import("./pages/Contracts"));
const DataFlowPage = lazy(() => import("./pages/DataFlow"));
const Containment = lazy(() => import("./pages/Containment"));
const Changes = lazy(() => import("./pages/Changes"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Lab = lazy(() => import("./pages/Lab"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Settings = lazy(() => import("./pages/Settings"));
const Showcase = lazy(() => import("./pages/Showcase"));

const router = createBrowserRouter([
  {
    path: "/showcase",
    element: (
      <Suspense fallback={null}>
        <Showcase />
      </Suspense>
    ),
  },
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "agents", element: <Agents /> },
      { path: "agents/:id", element: <AgentDetail /> },
      { path: "activity", element: <Activity /> },
      { path: "drift", element: <Drift /> },
      { path: "threat-graph", element: <ThreatGraph /> },
      { path: "incidents", element: <Incidents /> },
      { path: "incidents/:id", element: <IncidentDetail /> },
      { path: "ghost-replay", element: <GhostReplay /> },
      { path: "credentials", element: <Credentials /> },
      { path: "decoys", element: <Decoys /> },
      { path: "contracts", element: <Contracts /> },
      { path: "data-flow", element: <DataFlowPage /> },
      { path: "containment", element: <Containment /> },
      { path: "changes", element: <Changes /> },
      { path: "analytics", element: <Analytics /> },
      { path: "reports", element: <Reports /> },
      { path: "lab", element: <Lab /> },
      { path: "integrations", element: <Integrations /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
