"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PolicyStatusBadge, StatusFilter } from "@/components/PolicyStatusBadge";

type Policy = {
  id: number;
  policyNumber: string;
  clientId: number;
  clientName?: string;
  insurerId: number;
  insurerName?: string;
  lobId: number;
  lobName?: string;
  periodFrom: string;
  periodTo: string;
  sumInsured: number;
  rate?: number;
  grossPremium: number;
  currency: string;
  status: string;
  autoExpired?: boolean;
};

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    // Apply status filter
    if (statusFilter === "all") {
      setFilteredPolicies(policies);
    } else {
      const filtered = policies.filter(p => {
        const today = new Date();
        const endDate = new Date(p.periodTo);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (statusFilter === "active") {
          return p.status === "active" && daysUntilExpiry > 30;
        } else if (statusFilter === "expiring-soon") {
          return p.status === "active" && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        } else if (statusFilter === "expired") {
          return p.status === "expired" || (p.status === "active" && daysUntilExpiry <= 0);
        } else if (statusFilter === "pending") {
          return p.status === "pending";
        }
        return true;
      });
      setFilteredPolicies(filtered);
    }
  }, [policies, statusFilter]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch("/api/policies", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load policies");
      const data = await res.json();
      // API returns array directly with nested objects
      const policiesData = Array.isArray(data) ? data : (data.policies || []);
      
      // Map API response to component format
      const mapped = policiesData.map((p: any) => ({
        id: p.id,
        policyNumber: p.policyNumber,
        clientId: p.clientId,
        clientName: p.client?.companyName || `Client #${p.clientId}`,
        insurerId: p.insurerId,
        insurerName: p.insurer?.companyName || p.insurer?.shortName || `Insurer #${p.insurerId}`,
        lobId: p.lobId,
        lobName: p.lob?.name || `LOB #${p.lobId}`,
        periodFrom: p.policyStartDate,
        periodTo: p.policyEndDate,
        sumInsured: p.sumInsured,
        rate: p.rate,
        grossPremium: p.grossPremium,
        currency: p.currency,
        status: p.status,
        autoExpired: p.autoExpired
      }));
      
      setPolicies(mapped);
    } catch (e: any) {
      setError(e.message || "Error loading policies");
    } finally {
      setLoading(false);
    }
  }

  // Calculate status counts
  const statusCounts = {
    all: policies.length,
    active: policies.filter(p => {
      const today = new Date();
      const endDate = new Date(p.periodTo);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return p.status === "active" && daysUntilExpiry > 30;
    }).length,
    expiringSoon: policies.filter(p => {
      const today = new Date();
      const endDate = new Date(p.periodTo);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return p.status === "active" && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    }).length,
    expired: policies.filter(p => {
      const today = new Date();
      const endDate = new Date(p.periodTo);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return p.status === "expired" || (p.status === "active" && daysUntilExpiry <= 0);
    }).length,
    pending: policies.filter(p => p.status === "pending").length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              ← Home
            </Link>
            <h1 className="text-xl font-semibold">Policy Management</h1>
          </div>
          <Link
            href="/policies/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            + New Policy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {/* Status Filter */}
        {!loading && policies.length > 0 && (
          <div className="mb-6">
            <StatusFilter
              currentFilter={statusFilter}
              onFilterChange={setStatusFilter}
              counts={statusCounts}
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No policies found. Create your first policy to get started.
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No policies match the selected filter.
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Policy Number</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Insurer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">LOB</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Period</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Rate</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Premium</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">{p.policyNumber}</td>
                    <td className="px-4 py-3 text-sm">{p.clientName || `Client #${p.clientId}`}</td>
                    <td className="px-4 py-3 text-sm">{p.insurerName || `Insurer #${p.insurerId}`}</td>
                    <td className="px-4 py-3 text-sm">{p.lobName || `LOB #${p.lobId}`}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(p.periodFrom).toLocaleDateString()} - {new Date(p.periodTo).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {p.rate ? `${p.rate}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {p.currency} {p.grossPremium.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <PolicyStatusBadge
                        status={p.status}
                        policyEndDate={p.periodTo}
                        autoExpired={p.autoExpired}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <Link
                        href={`/policies/${p.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}