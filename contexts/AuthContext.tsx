"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAssetManager: boolean;
  isMinistryLeader: boolean;
  isSystemAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAssetManager, setIsAssetManager] = useState(false);
  const [isMinistryLeader, setIsMinistryLeader] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        checkUserRoles(currentSession.user.id);
      } else {
        setIsAssetManager(false);
        setIsMinistryLeader(false);
        setIsSystemAdmin(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        checkUserRoles(currentSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserRoles = async (userId: string) => {
    try {
      // Get user roles from the database
      const { data: userRoles, error } = await supabase
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("user_id", userId);

      if (error) {
        console.error("Error checking user roles:", error);
        setIsAssetManager(false);
        setIsMinistryLeader(false);
        setIsSystemAdmin(false);
        setLoading(false);
        return;
      }

      // Extract role names
      const roleNames = userRoles?.map((ur: any) => ur.roles?.name) || [];

      setIsSystemAdmin(roleNames.includes("system_admin"));
      setIsAssetManager(roleNames.includes("asset_manager"));
      setIsMinistryLeader(roleNames.includes("ministry_leader"));
    } catch (error) {
      console.error("Error in checkUserRoles:", error);
      setIsAssetManager(false);
      setIsMinistryLeader(false);
      setIsSystemAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAssetManager(false);
    setIsMinistryLeader(false);
    setIsSystemAdmin(false);
    router.push("/auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAssetManager,
        isMinistryLeader,
        isSystemAdmin,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

