"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ExpiringPolicy {
  id: number;
  policyNumber: string;
  client: { id: number; companyName: string };
  insurer: { id: number; companyName: string; shortName?: string };
  lob: { id: number; name: string };
  grossPremium: number;
  currency: string;
  policyEndDate: string;
  daysUntilExpiry: number;
  urgency: 'critical' | 'high' | 'medium';
  renewalReminderSent: boolean;
}

interface Summary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  totalPremiumAtRisk: number;
}

export default function RenewalDashboardPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<ExpiringPolicy[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [daysFilter, setDaysFilter] = useState(60);
  const [renewingId, setRenewingId] = useState<number | null>(null);

  useEffect(() => {
    loadExpiringPolicies();
  }, [daysFilter]);

  async function loadExpiringPolicies() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/policies/expiring?days=${daysFilter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!res.ok) throw new Error("Failed to load expiring policies");
      
      const data = await res.json();
      setPolicies(data.policies || []);
      setSummary(data.summary);
    } catch (e: any) {
      setError(e.message || "Error loading policies");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickRenew(policyId: number) {
    if (!confirm("Create renewal with same terms? You can adjust details later.")) {
      return;
    }

    setRenewingId(policyId);
    try {
      const token = localStorage.getItem("bearer_token");
      const policy = policies.find(p => p.id === policyId);
      if (!policy) return;

      // Calculate new dates (1 year from expiry)
      const startDate = new Date(policy.policyEndDate);
      startDate.setDate(startDate.getDate() + 1);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      const res = await fetch(`/api/policies/${policyId}/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          policyStartDate: startDate.toISOString().split('T')[0],
          policyEndDate: endDate.toISOString().split('T')[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to renew policy");
      }

      const data = await res.json();
      alert(`✅ Policy renewed successfully!\nNew Policy: ${data.renewalPolicy.policyNumber}`);
      
      // Redirect to new policy
      router.push(`/policies/${data.renewalPolicy.id}`);
    } catch (e: any) {
      alert(`❌ ${e.message}`);
    } finally {
      setRenewingId(null);
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/policies" className="text-sm text-muted-foreground hover:underline">
              ← Back to Policies
            </Link>
            <h1 className="text-xl font-semibold">🔄 Renewal Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(Number(e.target.value))}
              className="px-3 py-2 rounded-md border border-border bg-background text-sm"
            >
              <option value={30}>Next 30 days</option>
              <option value={60}>Next 60 days</option>
              <option value={90}>Next 90 days</option>
              <option value={180}>Next 6 months</option>
            </select>
            <button
              onClick={loadExpiringPolicies}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-md border border-destructive/20">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="text-sm text-muted-foreground">Total Expiring</div>
              <div className="text-3xl font-bold">{summary.total}</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-600">Critical (≤7 days)</div>
              <div className="text-3xl font-bold text-red-700">{summary.critical}</div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm text-amber-600">High (≤30 days)</div>
              <div className="text-3xl font-bold text-amber-700">{summary.high}</div>
            </div>
            <div className="rounded-lg border border-border p-4 bg-card">
              <div className="text-sm text-muted-foreground">Premium at Risk</div>
              <div className="text-2xl font-bold">
                ₦{summary.totalPremiumAtRisk.toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-xl font-semibold mb-2">All Clear!</div>
            <div className="text-muted-foreground">
              No policies expiring in the next {daysFilter} days
            </div>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Policy</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">LOB</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Premium</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Expiry</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Urgency</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                        {policy.policyNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{policy.client.companyName}</td>
                    <td className="px-4 py-3 text-sm">{policy.lob.name}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {policy.currency} {policy.grossPremium.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(policy.policyEndDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getUrgencyColor(policy.urgency)}`}>
                        {policy.daysUntilExpiry} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <button
                        onClick={() => handleQuickRenew(policy.id)}
                        disabled={renewingId === policy.id}
                        className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {renewingId === policy.id ? "Renewing..." : "🔄 Quick Renew"}
                      </button>
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
