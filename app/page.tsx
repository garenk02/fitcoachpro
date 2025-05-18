"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calendar,
  Users,
  CheckCircle,
  BarChart,
  ArrowRight,
  ArrowUp
} from "lucide-react";

export default function Home() {
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Function to scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // Show button when page is scrolled down
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up the event listener
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between px-4 md:px-6 z-10">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="FitCoachPro Logo"
            width={40}
            height={40}
            className="mr-2"
          />
          <h1 className="text-lg font-bold font-heading">FitCoachPro</h1>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="py-12 px-4 md:py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-h1 font-heading mb-4 md:text-4xl">
              Manage Your Personal Training Business with Ease
            </h1>
            <p className="text-body text-muted-foreground mb-8 max-w-xl mx-auto">
              The all-in-one platform for personal trainers to schedule sessions, track client progress, and grow your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Signup Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="destructive" size="lg" className="w-full sm:w-auto">
                  Log in
                </Button>
              </Link>
            </div>
            <div className="relative mt-8 mb-12">
              <div className="rounded-lg overflow-hidden max-w-2xl mx-auto shadow-lg">
                <Image
                  src="/images/image-01.jpg"
                  alt="FitCoachPro App - Image 01"
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 px-4 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-h2 font-heading text-center mb-8">Everything You Need to Manage Your Training Business</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-background rounded-lg p-6 shadow-sm border border-border">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-h3 font-medium mb-2">Smart Scheduling</h3>
                <p className="text-muted-foreground">
                  Easily manage your training sessions with conflict detection, recurring appointments, and client notifications.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-background rounded-lg p-6 shadow-sm border border-border">
                <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="text-h3 font-medium mb-2">Client Management</h3>
                <p className="text-muted-foreground">
                  Keep all your client information organized in one place with detailed profiles and progress tracking.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-background rounded-lg p-6 shadow-sm border border-border">
                <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <BarChart className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-h3 font-medium mb-2">Progress Tracking</h3>
                <p className="text-muted-foreground">
                  Track client achievements with customizable metrics and visual progress charts to keep them motivated.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-h2 font-heading text-center mb-2">How It Works</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Get started in minutes and transform how you manage your training business
            </p>

            <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold mb-4">
                  1
                </div>
                <h3 className="text-h3 font-medium mb-2">Sign Up</h3>
                <p className="text-muted-foreground">
                  Create your account in seconds and set up your trainer profile.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold mb-4">
                  2
                </div>
                <h3 className="text-h3 font-medium mb-2">Add Clients</h3>
                <p className="text-muted-foreground">
                  Import your existing clients or add new ones to your dashboard.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold mb-4">
                  3
                </div>
                <h3 className="text-h3 font-medium mb-2">Start Training</h3>
                <p className="text-muted-foreground">
                  Schedule sessions, track progress, and grow your business.
                </p>
              </div>
            </div>

            <div className="mt-16 rounded-lg overflow-hidden shadow-lg">
              <Image
                src="/images/image-02.jpg"
                alt="Trainer working with client"
                width={1200}
                height={675}
                className="w-full h-auto"
              />
            </div>
          </div>
        </section>

        {/* Testimonials/Benefits Section */}
        <section className="py-12 px-4 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-h2 font-heading text-center mb-8">Why Trainers Love FitCoachPro</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="rounded-lg overflow-hidden shadow-lg h-full">
                  <Image
                    src="/images/image-03.jpg"
                    alt="Personal trainer with client"
                    width={600}
                    height={800}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                {/* Benefit 1 */}
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-h3 font-medium mb-2">Save 10+ Hours Per Week</h3>
                      <p className="text-muted-foreground">
                        Automate scheduling, client management, and progress tracking to focus more on what matters - training your clients.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefit 2 */}
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-h3 font-medium mb-2">Increase Client Retention</h3>
                      <p className="text-muted-foreground">
                        Keep clients engaged and motivated with visual progress tracking and consistent communication.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefit 3 */}
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-h3 font-medium mb-2">Mobile-First Design</h3>
                      <p className="text-muted-foreground">
                        Manage your business on the go with our responsive app designed for phones and tablets.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Benefit 4 */}
                <div className="bg-background p-6 rounded-lg border border-border">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="h-6 w-6 text-secondary mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-h3 font-medium mb-2">Grow Your Business</h3>
                      <p className="text-muted-foreground">
                        Handle more clients efficiently and scale your personal training business without the administrative headaches.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 px-4 relative">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/image-04.jpg"
              alt="Fitness background"
              fill
              className="object-cover opacity-10"
            />
          </div>
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            <h2 className="text-h2 font-heading mb-4">Ready to Transform Your Training Business?</h2>
            <p className="text-body text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of personal trainers who are saving time, growing their business, and delivering better results for their clients.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Signup Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="destructive" size="lg" className="w-full sm:w-auto">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0 flex items-center">
              <Image
                src="/logo.png"
                alt="FitCoachPro Logo"
                width={42}
                height={42}
                className="mr-2"
              />
              <div>
                <h3 className="text-lg font-bold font-heading">FitCoachPro</h3>
                <p className="text-sm text-muted-foreground">The ultimate platform for personal trainers</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <Link href="/auth/signup" className="text-sm text-foreground hover:text-primary">
                Sign up
              </Link>
              <Link href="/auth/login" className="text-sm text-foreground hover:text-primary">
                Log in
              </Link>
              <Link href="#" className="text-sm text-foreground hover:text-primary">
                Privacy
              </Link>
              <Link href="#" className="text-sm text-foreground hover:text-primary">
                Terms
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
            FitCoachPro &copy; 2025. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all duration-300 z-50 animate-fade-in"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}