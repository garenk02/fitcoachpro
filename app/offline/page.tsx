'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { WifiOff, Home, Users, Calendar, Dumbbell, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated by looking for auth token in localStorage
    const hasAuthToken = typeof window !== 'undefined' &&
      (localStorage.getItem('supabase.auth.token') || localStorage.getItem('userId'));

    setIsAuthenticated(!!hasAuthToken);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <WifiOff className="mx-auto h-16 w-16 text-primary mb-6" />
        <h1 className="text-h1 font-heading mb-4">You&apos;re offline</h1>
        <p className="text-body text-muted-foreground mb-6">
          It looks like you&apos;re currently offline. Don&apos;t worry - you can still access many features of the app.
        </p>

        {isAuthenticated ? (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground mb-4">
              You can continue using the app with data that was previously loaded. Any changes you make will be synced when you&apos;re back online.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Link href="/dashboard">
                <Button variant="secondary" size="lg" className="w-full flex flex-col items-center py-6">
                  <Home className="h-6 w-6 mb-2" />
                  Dashboard
                </Button>
              </Link>

              <Link href="/dashboard/clients">
                <Button variant="secondary" size="lg" className="w-full flex flex-col items-center py-6">
                  <Users className="h-6 w-6 mb-2" />
                  Clients
                </Button>
              </Link>

              <Link href="/dashboard/schedule">
                <Button variant="secondary" size="lg" className="w-full flex flex-col items-center py-6">
                  <Calendar className="h-6 w-6 mb-2" />
                  Schedule
                </Button>
              </Link>

              <Link href="/dashboard/exercises">
                <Button variant="secondary" size="lg" className="w-full flex flex-col items-center py-6">
                  <Dumbbell className="h-6 w-6 mb-2" />
                  Exercises
                </Button>
              </Link>
            </div>

            <Link href="/settings">
              <Button variant="secondary" size="lg" className="w-full flex items-center justify-center">
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-6">
              You need to be online to log in. Please check your internet connection and try again.
            </p>
            <Link href="/">
              <Button size="lg" className="w-full">
                Try again
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
