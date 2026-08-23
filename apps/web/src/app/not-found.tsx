import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6 space-y-4">
      <h2 className="text-2xl font-bold font-mono text-foreground">404 - Page Not Found</h2>
      <p className="text-xs text-muted-foreground max-w-sm font-mono">
        The requested observability route or telemetry resource could not be found.
      </p>
      <Link href="/">
        <Button size="sm" variant="default">
          Back to Overview
        </Button>
      </Link>
    </div>
  );
}
