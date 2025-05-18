import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <WifiOff className="mx-auto h-16 w-16 text-primary mb-6" />
        <h1 className="text-h1 font-heading mb-4">You&apos;re offline</h1>
        <p className="text-body text-muted-foreground mb-8">
          It looks like you&apos;re currently offline. Please check your internet connection and try again.
        </p>
        <Link href="/">
          <Button size="lg" className="w-full sm:w-auto">
            Try again
          </Button>
        </Link>
      </div>
    </div>
  );
}
