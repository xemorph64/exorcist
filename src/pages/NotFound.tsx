import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Empty, Panel } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <Panel>
      <Empty
        icon={<Compass />}
        title="This route does not exist"
        body="The page may have moved. Every EXORCIST surface is reachable from the sidebar or the search palette."
        action={
          <Link to="/dashboard">
            <Button variant="primary">Go to Command Center</Button>
          </Link>
        }
      />
    </Panel>
  );
}

export function RouteError() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <div className="max-w-sm text-center">
        <p className="text-sm font-medium">Something failed to render</p>
        <p className="mt-1 text-xs text-muted">Reload the page. If it persists, reset the simulation from Settings to restore the demo state.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => location.reload()}>Reload</Button>
          <Button
            variant="danger"
            onClick={() => {
              localStorage.removeItem("exorcist-demo-v1");
              location.href = "/dashboard";
            }}
          >
            Reset demo
          </Button>
        </div>
      </div>
    </div>
  );
}
