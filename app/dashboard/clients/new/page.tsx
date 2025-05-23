"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select-advanced";


// Define form schema with validation
const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phone: z.string()
    .min(9, { message: "Phone number is too short" })
    .max(15, { message: "Phone number is too long" })
    .regex(/^(\+62|62|0)[\d]{8,12}$/, {
      message: "Must be a valid Indonesian phone number (e.g., +628123456789, 08123456789)"
    }),
  email: z.string()
    .refine(val => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Invalid email address format"
    })
    .optional(),
  age: z.coerce.number().min(1).max(120).optional(),
  gender: z.string().optional(),
  goals: z.string().optional(),
  medical_conditions: z.string().optional(),
});

export default function NewClientPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      age: undefined,
      gender: "",
      goals: "",
      medical_conditions: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!userId) {
      setError("You must be logged in to add a client");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Insert new client into Supabase
      const { error } = await supabase.from("clients").insert([
        {
          trainer_id: userId,
          name: values.name,
          phone: values.phone,
          email: values.email || null,
          age: values.age || null,
          gender: values.gender || null,
          goals: values.goals || null,
          medical_conditions: values.medical_conditions || null,
        },
      ]).select();

      if (error) {
        console.error("Error adding client:", error);
        setError(error.message);
        setIsSubmitting(false);
        return;
      }

      // Show success toast
      toast.success("Client added successfully", {
        description: `${values.name} has been added to your client list.`,
        duration: 3000,
      });

      // Redirect to clients list - don't set isSubmitting to false to maintain loading state
      router.push("/dashboard/clients");
      // No setIsSubmitting(false) here to keep button in loading state during redirect
      return; // Exit early to maintain loading state
    } catch (error) {
      console.error("Error adding client:", error);
      setError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-14 flex items-center justify-between px-1 md:px-6 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-lg font-bold font-heading">Add New Client</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {error && (
          <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone*</FormLabel>
                    <FormControl>
                      <Input placeholder="+62-811-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : parseInt(value, 10));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="goals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fitness Goals</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Weight loss, muscle gain, improved endurance, etc."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what the client wants to achieve through training.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medical_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any injuries, conditions, or limitations that might affect training."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    List any medical conditions or injuries that might affect training.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save Client
                </>
              )}
            </Button>
          </form>
        </Form>
      </main>
    </div>
  );
}
