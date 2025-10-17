"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await authClient.signIn.email({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
        callbackURL: "/"
      });

      if (error?.code) {
        toast.error("Invalid email or password. Please make sure you have already registered an account and try again.");
        setIsLoading(false);
        return;
      }

      // Redirect to home page
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1758311534582.png"
            alt="Company Logo"
            className="h-12 w-auto mx-auto mb-4 rounded-sm"
          />
          <h1 className="text-2xl font-semibold">Insurance Brokerage Management</h1>
          <p className="text-sm text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-muted-foreground">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create one here
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>For testing: Use the credentials provided by your administrator</p>
        </div>
      </div>
    </div>
  );
}