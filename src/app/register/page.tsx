"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "Viewer",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (formData.phone && !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ""))) {
      errors.phone = "Invalid phone format (use E.164 format, e.g., +2348012345678)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use Better-auth client for registration
      const { data, error: authError } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
      });

      if (authError?.code) {
        const errorMap: Record<string, string> = {
          USER_ALREADY_EXISTS: "Email already registered. Please use a different email or login instead.",
          INVALID_EMAIL: "Invalid email address",
          WEAK_PASSWORD: "Password is too weak. Please use at least 8 characters.",
        };
        const message = errorMap[authError.code] || "Registration failed. Please try again.";
        setError(message);
        toast.error(message);
        setIsLoading(false);
        return;
      }

      // Store bearer token for API calls
      if (data?.token) {
        localStorage.setItem("bearer_token", data.token);
      }

      toast.success("Account created successfully! Redirecting...");
      
      // Redirect to home page
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (err: any) {
      const message = err.message || "An error occurred. Please try again.";
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/image-1758311534582.png"
            alt="Company Logo"
            className="h-12 w-auto mx-auto mb-4 rounded-sm"
          />
          <h1 className="text-2xl font-semibold">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-2">Register for Insurance Brokerage Management</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1.5">
                Full Name <span className="text-destructive">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                  fieldErrors.fullName ? "border-destructive" : "border-input"
                }`}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
              />
              {fieldErrors.fullName && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">
                Email Address <span className="text-destructive">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                  fieldErrors.email ? "border-destructive" : "border-input"
                }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@company.com"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password <span className="text-destructive">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                  fieldErrors.password ? "border-destructive" : "border-input"
                }`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 8 characters"
              />
              {fieldErrors.password && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className={`w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring ${
                  fieldErrors.confirmPassword ? "border-destructive" : "border-input"
                }`}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter your password"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}