"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userId: string | null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  userId: null,
});

export const useAuth = () => useContext(AuthContext);

// Helper function to safely access localStorage (only in browser)
const getStoredUserId = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('userId');
  }
  return null;
};

// Helper function to safely store userId in localStorage
const storeUserId = (userId: string | null) => {
  if (typeof window !== 'undefined') {
    if (userId) {
      localStorage.setItem('userId', userId);
    } else {
      localStorage.removeItem('userId');
    }
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use useEffect to safely access localStorage after hydration
  useEffect(() => {
    setUserId(getStoredUserId());
  }, []);

  useEffect(() => {
    // Get the current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting session:", error);
      }

      setSession(data.session);
      setUser(data.session?.user || null);

      // Store and set the user ID if available
      const currentUserId = data.session?.user?.id || null;
      if (currentUserId) {
        storeUserId(currentUserId);
        setUserId(currentUserId);
      } else if (!data.session) {
        // Clear userId if no session
        storeUserId(null);
        setUserId(null);
      }

      setIsLoading(false);
    };

    getSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'USER_DELETED' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED', newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user || null);

        // Handle user ID based on auth event
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const newUserId = newSession?.user?.id || null;
          if (newUserId) {
            storeUserId(newUserId);
            setUserId(newUserId);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user ID on sign out
          storeUserId(null);
          setUserId(null);
        }

        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    isLoading,
    userId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
