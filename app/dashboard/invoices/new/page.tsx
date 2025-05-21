"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { format, addDays } from "date-fns"
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Receipt } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { useOffline } from "@/components/offline-provider"
import { OfflineStatus } from "@/components/offline-status"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ClientCombobox } from "@/components/ui/client-combobox"
import { PricingPackageCombobox } from "@/components/ui/pricing-package-combobox"
import { MobileNav } from "@/components/ui/mobile-nav"

// Define client type
type Client = {
  id: string;
  name: string;
}

// Define pricing package type
type PricingPackage = {
  id: string;
  name: string;
  price: number;
}

// Define form schema with validation
const formSchema = z.object({
  client_id: z.string({
    required_error: "Please select a client",
  }).min(1, { message: "Please select a client" }),
  pricing_package_id: z.string({
    required_error: "Please select a pricing package",
  }).min(1, { message: "Please select a pricing package" }),
  due_date: z.date({
    required_error: "Please select a due date",
  }),
});

export default function NewInvoicePage() {
  const { userId } = useAuth();
  const { isOnline } = useOffline();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      pricing_package_id: "",
      due_date: addDays(new Date(), 30), // Default due date is 30 days from now
    },
  });

  // Fetch clients and pricing packages
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // Fetch clients
        setIsLoadingClients(true);
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .eq("trainer_id", userId)
          .order("name");

        if (clientsError) throw clientsError;
        setClients(clientsData || []);
        setIsLoadingClients(false);

        // Fetch pricing packages
        setIsLoadingPackages(true);
        const { data: packagesData, error: packagesError } = await supabase
          .from("pricing_packages")
          .select("id, name, price")
          .eq("trainer_id", userId)
          .order("name");

        if (packagesError) throw packagesError;
        setPackages(packagesData || []);
        setIsLoadingPackages(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
        setIsLoadingClients(false);
        setIsLoadingPackages(false);
      }
    };

    fetchData();
  }, [userId]);

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) {
      setError("You must be logged in to generate an invoice");
      return;
    }

    if (!isOnline) {
      toast.error("Cannot generate invoices while offline");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Call the generate_invoice function via RPC
      const { error: rpcError } = await supabase.rpc('generate_invoice', {
        p_trainer_id: userId,
        p_client_id: values.client_id,
        p_pricing_package_id: values.pricing_package_id,
        p_due_date: values.due_date.toISOString(),
      });

      if (rpcError) {
        throw rpcError;
      }

      // Show success toast
      toast.success("Invoice generated!", {
        description: "The invoice has been successfully created.",
      });

      // Redirect to invoices page
      router.push("/dashboard/invoices");
    } catch (error) {
      console.error("Error generating invoice:", error);
      setError("Failed to generate invoice. Please try again.");
      toast.error("Failed to generate invoice");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Generate Invoice</h1>
        </div>

      </header>

      {/* Offline Status Bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 flex justify-end">
        <OfflineStatus />
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {!isOnline && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-3 rounded-md mb-6 text-sm">
            You are currently offline. Invoice generation requires an internet connection.
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Selection */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Client *</FormLabel>
                  <FormControl>
                    <ClientCombobox
                      clients={clients}
                      isLoading={isLoadingClients}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Trigger validation after selection
                        form.trigger("client_id");
                      }}
                      onAddClient={() => router.push("/dashboard/clients/new")}
                      className={cn(
                        form.formState.errors.client_id && "border-destructive"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing Package Selection */}
            <FormField
              control={form.control}
              name="pricing_package_id"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Pricing Package *</FormLabel>
                  <FormControl>
                    <PricingPackageCombobox
                      packages={packages}
                      isLoading={isLoadingPackages}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        // Trigger validation after selection
                        form.trigger("pricing_package_id");
                      }}
                      onAddPackage={() => router.push("/dashboard/pricing-packages")}
                      className={cn(
                        form.formState.errors.pricing_package_id && "border-destructive"
                      )}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Due Date Selection */}
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="secondary"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            <span>{format(field.value, "PPP")}</span>
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The due date for this invoice. Must be a future date.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                className="w-full bg-accent"
                disabled={isSubmitting || !isOnline}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Receipt className="mr-2 h-4 w-4" />
                    Generate Invoice
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
