"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Edit, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MobileNav } from "@/components/ui/mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Define client type
type Client = {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  goals: string | null;
  medical_conditions: string | null;
  created_at: string;
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const clientId = unwrappedParams.id;

  const { userId } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      if (!userId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .eq("trainer_id", userId)
          .single();

        if (error) {
          console.error("Error fetching client:", error);
          setError("Client not found or you don't have permission to view this client");
          return;
        }

        if (!data) {
          setError("Client not found");
          return;
        }

        setClient(data);
      } catch (error) {
        console.error("Error fetching client:", error);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClient();
  }, [userId, clientId]);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);

    // Update URL without full page reload
    if (value === "progress") {
      router.push(`/dashboard/clients/${clientId}/progress`);
    } else if (value === "profile") {
      router.push(`/dashboard/clients/${clientId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between pr-1 md:px-6 z-10">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">
            Client Details
          </h1>
        </div>
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${clientId}/edit`}>
            <Edit className="h-5 w-5" />
            <span className="sr-only">Edit Client</span>
          </Link>
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-muted-foreground">Loading client data...</p>
          </div>
        ) : client ? (
          <div className="space-y-6">
            {/* Client Header Card */}
            <Card>
              <CardContent className="pt-2">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
                    <AvatarFallback className="text-xl">
                      {client.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{client.name}</h2>
                    <p className="text-sm text-muted-foreground">{client.email}</p>
                    <p className="text-sm text-muted-foreground">{client.phone || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Navigation */}
            <Tabs defaultValue="profile" value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Age</p>
                        <p>{client.age || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Gender</p>
                        <p>{client.gender || "-"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Goals</p>
                      <p className="whitespace-pre-wrap">{client.goals || "-"}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Medical Conditions</p>
                      <p className="whitespace-pre-wrap">{client.medical_conditions || "-"}</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button asChild>
                    <Link href={`/dashboard/clients/${clientId}/edit`} className="flex items-center gap-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit Profile
                    </Link>
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="progress" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">Track client&apos;s measurements and progress over time.</p>
                    <div className="mt-4">
                      <Button asChild className="bg-accent">
                        <Link href={`/dashboard/clients/${clientId}/progress`} className="flex items-center gap-1">
                          View Progress Details
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
