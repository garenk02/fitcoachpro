"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    // Check if the device is iOS
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    );

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e as BeforeInstallPromptEvent);
      // Show the install button
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Don't show the prompt if the app is already installed
  if (isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    // Show the install prompt
    await installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await installPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the saved prompt since it can't be used again
    setInstallPrompt(null);
    setIsVisible(false);
  };

  const dismissPrompt = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-card p-4 rounded-lg shadow-lg border border-border z-50 animate-slide-up">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-h3 font-heading">Install FitCoachPro</h3>
        <button onClick={dismissPrompt} className="text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
      </div>

      {isIOS ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            To install this app on your iOS device, tap the share button
            <span role="img" aria-label="share icon"> ⎋ </span>
            and then &quot;Add to Home Screen&quot;
            <span role="img" aria-label="plus icon"> ➕ </span>.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Install this app on your device for quick and easy access when you&apos;re on the go.
          </p>
          <Button onClick={handleInstallClick} className="w-full">
            <Download className="mr-2 h-4 w-4" /> Install App
          </Button>
        </div>
      )}
    </div>
  );
}
