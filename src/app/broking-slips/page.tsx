"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BrokingSlip {
  id: number;
  slipNumber: string;
  slipStatus: "Draft" | "Submitted" | "Bound" | "Declined";
  slipResponse: string | null;
  slipSubmittedAt: string | null;
  slipRespondedAt: string | null;
  policyNumber: string;
  clientName: string;
  insurerName: string;
  grossPremium: number;
  currency: string;
}

export default function BrokingSlipsPage() {
  const [slips, setSlips] = useState<BrokingSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as HeadersInit;

  const loadSlips = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/policies?has_slip=true&limit=100`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Transform the data to extract slip information
        const slipsData = data
          .filter((p: any) => p.slipNumber)
          .map((p: any) => ({
            id: p.id,
            slipNumber: p.slipNumber,
            slipStatus: p.slipStatus || "Draft",
            slipResponse: p.slipResponse,
            slipSubmittedAt: p.slipSubmittedAt,
            slipRespondedAt: p.slipRespondedAt,
            policyNumber: p.policyNumber,
            clientName: p.client?.companyName || "Unknown Client",
            insurerName: p.insurer?.companyName || p.insurer?.shortName || "Unknown Insurer",
            grossPremium: p.grossPremium,
            currency: p.currency || "NGN",
          }));
        setSlips(slipsData);
      }
    } catch (error) {
      console.error("Failed to load slips:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSlips = filter === "all" 
    ? slips 
    : slips.filter(s => s.slipStatus.toLowerCase() === filter.toLowerCase());

  const statusCounts = {
    all: slips.length,
    draft: slips.filter(s => s.slipStatus === "Draft").length,
    submitted: slips.filter(s => s.slipStatus === "Submitted").length,
    bound: slips.filter(s => s.slipStatus === "Bound").length,
    declined: slips.filter(s => s.slipStatus === "Declined").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Broking Slips</h1>
        <p className="text-sm text-muted-foreground">
          Manage and track all broking slips sent to insurers
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          All ({statusCounts.all})
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "draft"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          Draft ({statusCounts.draft})
        </button>
        <button
          onClick={() => setFilter("submitted")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "submitted"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          Submitted ({statusCounts.submitted})
        </button>
        <button
          onClick={() => setFilter("bound")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "bound"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          Bound ({statusCounts.bound})
        </button>
        <button
          onClick={() => setFilter("declined")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "declined"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          Declined ({statusCounts.declined})
        </button>
      </div>

      {/* Slips List */}
      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading broking slips...
          </div>
        ) : filteredSlips.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {filter === "all" ? (
              <>
                <div className="text-4xl mb-2">📋</div>
                <p className="mb-4">No broking slips found</p>
                <p className="text-xs">Generate broking slips from policy pages to see them here</p>
              </>
            ) : (
              <p>No {filter} broking slips found</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Slip Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Policy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Insurer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSlips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono">
                      {slip.slipNumber}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link 
                        href={`/policies/${slip.id}`}
                        className="text-primary hover:underline"
                      >
                        {slip.policyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {slip.clientName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {slip.insurerName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {slip.currency} {slip.grossPremium.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        slip.slipStatus === "Bound" 
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        slip.slipStatus === "Declined" 
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                        slip.slipStatus === "Submitted" 
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                      }`}>
                        {slip.slipStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/policies/${slip.id}/broking-slip`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                        >
                          PDF
                        </a>
                        <Link
                          href={`/policies/${slip.id}`}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {slips.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border p-4 bg-card">
            <div className="text-xs text-muted-foreground mb-1">Total Slips</div>
            <div className="text-2xl font-bold">{slips.length}</div>
          </div>
          <div className="rounded-lg border border-green-200 dark:border-green-800 p-4 bg-green-50 dark:bg-green-950">
            <div className="text-xs text-green-700 dark:text-green-300 mb-1">Bound</div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">{statusCounts.bound}</div>
          </div>
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 p-4 bg-blue-50 dark:bg-blue-950">
            <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Pending</div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{statusCounts.submitted}</div>
          </div>
          <div className="rounded-lg border border-red-200 dark:border-red-800 p-4 bg-red-50 dark:bg-red-950">
            <div className="text-xs text-red-700 dark:text-red-300 mb-1">Declined</div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-200">{statusCounts.declined}</div>
          </div>
        </div>
      )}
    </div>
  );
}
