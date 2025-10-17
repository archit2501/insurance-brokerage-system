"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPolicyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    clientId: "",
    insurerId: "",
    lobId: "",
    subLobId: "",
    sumInsured: "",
    grossPremium: "",
    policyStartDate: "",
    policyEndDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New: option lists
  const [clients, setClients] = useState<Array<{ id: number; companyName: string }>>([]);
  const [insurers, setInsurers] = useState<Array<{ id: number; companyName: string }>>([]);
  const [lobs, setLobs] = useState<Array<{ id: number; name: string }>>([]);
  const [subLobs, setSubLobs] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSubLobs, setLoadingSubLobs] = useState(false);

  const update = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  // Fetch helpers
  const getAuthHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as HeadersInit;
  };

  useEffect(() => {
    // Fetch Clients, Insurers, LOBs in parallel
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const headers = getAuthHeaders();
        const [cRes, iRes, lRes] = await Promise.all([
          fetch(`/api/clients?limit=1000`, { headers }),
          fetch(`/api/insurers?limit=1000`, { headers }),
          fetch(`/api/lobs?limit=1000`, { headers }),
        ]);
        const [cData, iData, lData] = await Promise.all([cRes.json(), iRes.json(), lRes.json()]);
        if (!cRes.ok) throw new Error(cData?.error || "Failed to load clients");
        if (!iRes.ok) throw new Error(iData?.error || "Failed to load insurers");
        if (!lRes.ok) throw new Error(lData?.error || "Failed to load LOBs");

        setClients((cData || []).map((c: any) => ({ id: c.id, companyName: c.companyName })));
        setInsurers((iData || []).map((ins: any) => ({ id: ins.id, companyName: ins.companyName || ins.shortName || `Insurer ${ins.id}` })));
        setLobs((lData || []).map((lob: any) => ({ id: lob.id, name: lob.name })));
      } catch (e: any) {
        setError(e?.message || "Failed to load form options");
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  // Fetch sub-LOBs when LOB changes
  useEffect(() => {
    const lobId = form.lobId;
    if (!lobId) {
      setSubLobs([]);
      update("subLobId", "");
      return;
    }
    const run = async () => {
      try {
        setLoadingSubLobs(true);
        const headers = getAuthHeaders();
        const res = await fetch(`/api/lobs/${lobId}/sublobs?limit=1000`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load sub-LOBs");
        setSubLobs((data || []).map((s: any) => ({ id: s.id, name: s.name })));
      } catch (e: any) {
        setError(e?.message || "Failed to load sub-LOBs");
        setSubLobs([]);
      } finally {
        setLoadingSubLobs(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.lobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Minimal required fields validation matching API
    if (!form.clientId || !form.insurerId || !form.lobId || !form.sumInsured || !form.grossPremium || !form.policyStartDate || !form.policyEndDate) {
      setError("Please fill all required fields.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

    if (!userId) {
      setError("Missing user id. Please ensure you are logged in so x-user-id can be sent.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "x-user-id": userId,
        },
        body: JSON.stringify({
          clientId: Number(form.clientId),
          insurerId: Number(form.insurerId),
          lobId: Number(form.lobId),
          subLobId: form.subLobId ? Number(form.subLobId) : undefined,
          sumInsured: Number(form.sumInsured),
          grossPremium: Number(form.grossPremium),
          policyStartDate: form.policyStartDate,
          policyEndDate: form.policyEndDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `Failed to create policy (${res.status})`);
        return;
      }

      setSuccess("Policy created successfully.");
      // small delay then go back to list
      setTimeout(() => router.push("/policies"), 600);
    } catch (err: any) {
      setError(err?.message || "Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Create Policy</h1>
        <Link href="/policies" className="text-sm text-muted-foreground hover:underline">Back to policies</Link>
      </div>

      <div className="rounded-md border border-border p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-sm mb-1">Client *</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.clientId}
                onChange={(e) => update("clientId", e.target.value)}
                required
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? "Loading clients…" : "Select client"}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            {/* Insurer */}
            <div>
              <label className="block text-sm mb-1">Insurer *</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.insurerId}
                onChange={(e) => update("insurerId", e.target.value)}
                required
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? "Loading insurers…" : "Select insurer"}</option>
                {insurers.map((i) => (
                  <option key={i.id} value={i.id}>{i.companyName}</option>
                ))}
              </select>
            </div>

            {/* LOB */}
            <div>
              <label className="block text-sm mb-1">Line of Business *</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.lobId}
                onChange={(e) => update("lobId", e.target.value)}
                required
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? "Loading LOBs…" : "Select LOB"}</option>
                {lobs.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Sub-LOB */}
            <div>
              <label className="block text-sm mb-1">Sub-LOB</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.subLobId}
                onChange={(e) => update("subLobId", e.target.value)}
                disabled={!form.lobId || loadingSubLobs || subLobs.length === 0}
              >
                <option value="">{!form.lobId ? "Select LOB first" : loadingSubLobs ? "Loading sub-LOBs…" : subLobs.length === 0 ? "No sub-LOBs" : "Select sub-LOB"}</option>
                {subLobs.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Sum Insured *</label>
              <input type="number" step="0.01" className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.sumInsured} onChange={(e) => update("sumInsured", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Gross Premium *</label>
              <input type="number" step="0.01" className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.grossPremium} onChange={(e) => update("grossPremium", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Policy Start Date *</label>
              <input type="date" className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.policyStartDate} onChange={(e) => update("policyStartDate", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Policy End Date *</label>
              <input type="date" className="w-full rounded-md border border-border bg-background px-3 py-2"
                value={form.policyEndDate} onChange={(e) => update("policyEndDate", e.target.value)} required />
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50">
              {submitting ? "Creating…" : "Create Policy"}
            </button>
            <Link href="/policies" className="text-sm text-muted-foreground hover:underline">Cancel</Link>
          </div>
        </form>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">IDs are now selected from dropdowns. Ensure you are logged in so Authorization and x-user-id headers are sent.</p>
    </div>
  );
}