"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Shield, Users, Building2, FileText, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: session, isPending } = useSession();

  const features = [
    {
      icon: Users,
      title: "Client Management",
      description: "Manage individual and corporate clients with comprehensive KYC documentation",
      href: "/clients"
    },
    {
      icon: Building2,
      title: "Insurer & Agent Management",
      description: "Track insurers, agents, and bank accounts with centralized data",
      href: "/insurers"
    },
    {
      icon: FileText,
      title: "Policy & Notes",
      description: "Issue policies, generate Credit/Debit notes with automatic calculations",
      href: "/policies"
    },
    {
      icon: Shield,
      title: "Compliance & Audit",
      description: "Full audit trail for regulatory compliance and transparency",
      href: "/audit"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Insurance Brokerage
            <span className="block text-blue-600 dark:text-blue-400">Management System</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Comprehensive platform for managing insurance operations, clients, policies, and compliance
            in the Nigerian insurance market
          </p>

          {/* Loading and Auth States */}
          <div className="flex justify-center gap-4 min-h-[48px]">
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            ) : session?.user ? (
              <Link
                href="/clients"
                className="inline-flex items-center px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-medium transition-colors"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center px-6 py-3 rounded-lg text-white bg-blue-600 hover:bg-blue-700 font-medium transition-colors"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium border border-gray-300 dark:border-gray-600 transition-colors"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link
                key={feature.title}
                href={feature.href}
                className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-lg transition-all"
              >
                <Icon className="w-12 h-12 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {feature.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Key Capabilities */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Key Capabilities
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Nigerian Insurance Standards
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Built-in support for NAICOM regulations, Nigerian LOBs, and local compliance requirements
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Automated Calculations
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Automatic brokerage, VAT (7.5%), NAICOM, NCRIB, and ED tax computations
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Document Generation
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Professional PDF generation for Credit/Debit Notes and Broking Slips
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Role-Based Access
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Granular permissions for Admin, Underwriter, Accounts, and other roles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}