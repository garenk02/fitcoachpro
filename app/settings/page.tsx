"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { MobileNav } from "@/components/ui/mobile-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <h1 className="text-lg font-bold font-heading">Settings</h1>
        <div className="flex items-center gap-2">
          <Avatar className="bg-primary text-primary-foreground">
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase() || <User className="h-5 w-5" />}
            </AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <h2 className="text-h2 font-heading mb-6">Account Settings</h2>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-h3">Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
                <AvatarFallback className="text-xl">
                  {user?.email?.charAt(0).toUpperCase() || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">{user?.email?.split('@')[0] || 'Trainer'}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="font-medium">Password</h4>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
                <Button variant="default" size="sm">
                  Change
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-h3">Preferences</CardTitle>
            <CardDescription>Customize your application experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="font-medium">Notifications</h4>
                  <p className="text-sm text-muted-foreground">Manage email and app notifications</p>
                </div>
                <Button variant="default" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h4 className="font-medium">Appearance</h4>
                  <p className="text-sm text-muted-foreground">Customize theme and display options</p>
                </div>
                <Button variant="default" size="sm">
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-h3">Account Actions</CardTitle>
            <CardDescription>Manage your account status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-secondary/90">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isSigningOut ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing out...
                      </>
                    ) : (
                      "Sign out"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
