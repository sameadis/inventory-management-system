"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Auth page - Handles authentication
 * 
 * Development: Provides email/password login via Supabase Auth
 * Production: Redirects to external auth app (ALIC-Calendar)
 */
export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  // If external auth URL is configured, redirect to it (production mode)
  // Otherwise, show local auth form (development mode)
  const externalAuthUrl = process.env.NEXT_PUBLIC_AUTH_URL;

  if (externalAuthUrl) {
    // Redirect to external auth app (ALIC-Calendar)
    window.location.href = externalAuthUrl;
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to external authentication...</p>
      </div>
    );
  }

  // Show local auth form (development/testing mode)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/inventory");
      router.refresh();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/inventory`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setError("Check your email for the confirmation link!");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">ALIC Inventory</h1>
          <p className="text-muted-foreground mt-2">
            {mode === "signin" ? "Sign in to your account" : "Create a new account"}
          </p>
          <p className="text-xs text-yellow-600 mt-2 font-medium">
            🔧 Local Development Mode
          </p>
        </div>

        <div className="border rounded-lg p-6 space-y-6">
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className={`text-sm p-3 rounded-md ${
                  error.includes("Check your email")
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : mode === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-sm text-primary hover:underline"
            >
              {mode === "signin"
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>🔧 Local Development Authentication</p>
          <p>To use external auth, set NEXT_PUBLIC_AUTH_URL</p>
        </div>
      </div>
    </div>
  );
}
