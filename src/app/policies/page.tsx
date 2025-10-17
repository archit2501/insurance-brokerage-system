"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  grossPremium: number;
  currency: string;
  status: string;
};

export default function PoliciesPage() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

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
      setPolicies(data.policies || []);
    } catch (e: any) {
      setError(e.message || "Error loading policies");
    } finally {
      setLoading(false);
    }
  }

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

        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            No policies found. Create your first policy to get started.
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
                  <th className="px-4 py-3 text-right text-sm font-medium">Premium</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/50">
                    <td className="px-4 py-3 text-sm">{p.policyNumber}</td>
                    <td className="px-4 py-3 text-sm">{p.clientName || `Client #${p.clientId}`}</td>
                    <td className="px-4 py-3 text-sm">{p.insurerName || `Insurer #${p.insurerId}`}</td>
                    <td className="px-4 py-3 text-sm">{p.lobName || `LOB #${p.lobId}`}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(p.periodFrom).toLocaleDateString()} - {new Date(p.periodTo).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {p.currency} {p.grossPremium.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        p.status === 'Active' ? 'bg-green-100 text-green-800' :
                        p.status === 'Expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.status}
                      </span>
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