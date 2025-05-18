"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleAuthButton } from "@/components/ui/google-auth-button";

// Define form schema with validation
const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" }),
});

// Wrapper component that uses Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="FitCoachPro Logo"
            width={80}
            height={80}
            className="mb-2"
            priority
          />
          <h1 className="text-2xl font-bold font-heading text-center">FitCoachPro</h1>
        </div>
        <div className="text-center">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

// Main login form component
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Check for error parameter in URL (from callback)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setFormError(errorParam);
      // Show toast for error
      toast.error("Authentication Error", {
        description: errorParam,
        duration: 5000,
      });
    }
  }, [searchParams]);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle form submission
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setFormError(null);

    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setFormError(error.message);
        setIsLoading(false);
        return;
      }

      // Redirect to dashboard on successful login
      if (data?.user) {
        // Keep loading state until redirect completes
        router.push("/dashboard");
        // Don't set isLoading to false here to keep the loading state until redirect
        return; // Exit early to maintain loading state
      }
    } catch (error) {
      console.error("Error during login:", error);
      setFormError("An unexpected error occurred. Please try again.");
    }

    // Only set loading to false if there was an error or no user data
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="mb-2 flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="FitCoachPro Logo"
          width={80}
          height={80}
          className="mb-2"
          priority
        />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-h2 font-heading text-center">Log In Trainer Account</CardTitle>
          <CardDescription className="text-center">
            Welcome back! Log in to your trainer account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md mb-4 text-sm">
              {formError}
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="your.email@example.com"
                        type="email"
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <div className="flex justify-end">
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div> */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>
          </Form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Client-side only component */}
          <div className="mt-4">
            <GoogleAuthButton mode="signin" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
