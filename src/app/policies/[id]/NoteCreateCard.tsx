"use client";

import { useState } from "react";

interface NoteCreateCardProps {
  policyId: number;
  clientId?: number;
  insurerId?: number;
  defaultGross?: number;
}

interface CoInsRow {
  insurerId: string;
  percentage: string;
}

export default function NoteCreateCard({ policyId, clientId, insurerId, defaultGross }: NoteCreateCardProps) {
  const [noteType, setNoteType] = useState<"CN" | "DN">("DN");
  const [grossPremium, setGrossPremium] = useState<string>(defaultGross ? String(defaultGross) : "");
  const [brokeragePct, setBrokeragePct] = useState<string>("");
  const [vatPct, setVatPct] = useState<string>("7.5");
  const [agentCommissionPct, setAgentCommissionPct] = useState<string>("0");
  const [levies, setLevies] = useState<{ niacom?: string; ncrib?: string; ed_tax?: string }>({ niacom: "0", ncrib: "0", ed_tax: "0" });

  const [coinsEnabled, setCoinsEnabled] = useState(false);
  const [coins, setCoins] = useState<CoInsRow[]>([{ insurerId: insurerId ? String(insurerId) : "", percentage: "100" }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addRow = () => setCoins((rows) => [...rows, { insurerId: "", percentage: "" }]);
  const removeRow = (idx: number) => setCoins((rows) => rows.filter((_, i) => i !== idx));
  const updateRow = (idx: number, key: keyof CoInsRow, val: string) =>
    setCoins((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: val } : r)));

  const getAuthHeaders = () => {
    // Prefer 'bearer_token' for consistency, fallback to 'token'
    const token = typeof window !== "undefined" ? (localStorage.getItem("bearer_token") || localStorage.getItem("token")) : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { "x-user-id": userId } : {}),
    } as HeadersInit;
  };

  const validate = () => {
    if (!clientId) return "Missing clientId on policy";
    if (!policyId) return "Missing policyId";
    if (!grossPremium) return "Gross premium is required";
    if (!brokeragePct) return "Brokerage % is required";
    const bp = parseFloat(brokeragePct);
    const vp = parseFloat(vatPct);
    const ac = parseFloat(agentCommissionPct);
    if ([bp, vp, ac].some((n) => isNaN(n) || n < 0 || n > 100)) return "Percentages must be between 0 and 100";
    if (noteType === "CN") {
      if (!insurerId && !coinsEnabled) return "Insurer is required for CN";
      if (coinsEnabled) {
        if (coins.length === 0) return "Add at least one co-insurer row";
        const total = coins.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0);
        if (Math.abs(total - 100) > 0.01) return "Co-insurance percentages must sum to 100";
        if (coins.some((r) => !r.insurerId)) return "All co-insurance rows require insurerId";
      }
    }
    return null;
  };

  const onSubmit = async () => {
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      setSubmitting(true);
      const headers = getAuthHeaders();
      if (!(headers as any)["x-user-id"]) {
        setError("Missing user id. Please login again.");
        setSubmitting(false);
        return;
      }

      const body: any = {
        noteType,
        clientId,
        policyId,
        grossPremium: parseFloat(grossPremium),
        brokeragePct: parseFloat(brokeragePct),
        vatPct: parseFloat(vatPct),
        agentCommissionPct: parseFloat(agentCommissionPct),
        levies: {
          niacom: parseFloat(levies.niacom || "0") || 0,
          ncrib: parseFloat(levies.ncrib || "0") || 0,
          ed_tax: parseFloat(levies.ed_tax || "0") || 0,
        },
        payableBankAccountId: null,
      };

      if (noteType === "CN") {
        if (coinsEnabled) {
          body.coInsurance = coins.map((r) => ({ insurerId: Number(r.insurerId), percentage: Number(r.percentage) }));
        } else if (insurerId) {
          body.insurerId = insurerId;
        }
        if (body.coInsurance && (!Array.isArray(body.coInsurance) || body.coInsurance.length === 0)) {
          delete body.coInsurance;
        }
        if (!body.insurerId && !body.coInsurance) {
          setError("Provide insurerId or co-insurance rows for CN");
          setSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/notes", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || `Failed to create note (${res.status})`);
        return;
      }
      setSuccess(`${data.noteType} created: ${data.noteId}`);
      // reset some fields
      setBrokeragePct("");
      setAgentCommissionPct("0");
      setLevies({ niacom: "0", ncrib: "0", ed_tax: "0" });
      setCoinsEnabled(false);
    } catch (e: any) {
      setError(e?.message || "Failed to create note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground">Type</label>
        <select
          className="flex-1 rounded-md border border-border bg-background px-2 py-1"
          value={noteType}
          onChange={(e) => setNoteType(e.target.value as any)}
        >
          <option value="DN">DN (Debit Note)</option>
          <option value="CN">CN (Credit Note)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-muted-foreground mb-1">Gross Premium</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-2 py-1"
            value={grossPremium}
            onChange={(e) => setGrossPremium(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-muted-foreground mb-1">Brokerage %</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-2 py-1"
            value={brokeragePct}
            onChange={(e) => setBrokeragePct(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-muted-foreground mb-1">VAT %</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-2 py-1"
            value={vatPct}
            onChange={(e) => setVatPct(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-muted-foreground mb-1">Agent Comm %</label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-border bg-background px-2 py-1"
            value={agentCommissionPct}
            onChange={(e) => setAgentCommissionPct(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-muted-foreground mb-1">NIACOM Levy</label>
          <input type="number" step="0.01" className="w-full rounded-md border border-border bg-background px-2 py-1" value={levies.niacom || ""} onChange={(e) => setLevies((s) => ({ ...s, niacom: e.target.value }))} />
        </div>
        <div>
          <label className="block text-muted-foreground mb-1">NCRIB Levy</label>
          <input type="number" step="0.01" className="w-full rounded-md border border-border bg-background px-2 py-1" value={levies.ncrib || ""} onChange={(e) => setLevies((s) => ({ ...s, ncrib: e.target.value }))} />
        </div>
        <div>
          <label className="block text-muted-foreground mb-1">ED Tax</label>
          <input type="number" step="0.01" className="w-full rounded-md border border-border bg-background px-2 py-1" value={levies.ed_tax || ""} onChange={(e) => setLevies((s) => ({ ...s, ed_tax: e.target.value }))} />
        </div>
      </div>

      {noteType === "CN" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground">Use Co-insurance</label>
            <input type="checkbox" checked={coinsEnabled} onChange={(e) => setCoinsEnabled(e.target.checked)} />
          </div>

          {coinsEnabled ? (
            <div className="space-y-2">
              {coins.map((row, idx) => (
                <div key={idx} className="grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="block text-muted-foreground mb-1">Insurer ID</label>
                    <input
                      type="number"
                      className="w-full rounded-md border border-border bg-background px-2 py-1"
                      value={row.insurerId}
                      onChange={(e) => updateRow(idx, "insurerId", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-muted-foreground mb-1">% Share</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-border bg-background px-2 py-1"
                      value={row.percentage}
                      onChange={(e) => updateRow(idx, "percentage", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 flex justify-end">
                    <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => removeRow(idx)}>Remove</button>
                  </div>
                </div>
              ))}
              <button type="button" className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent" onClick={addRow}>Add Co-insurer</button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">If not using co-insurance, the single insurer from the policy will be used.</p>
          )}
        </div>
      )}

      {error && <div className="text-destructive">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-md border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-50"
      >
        {submitting ? "Creating…" : noteType === "CN" ? "Create Credit Note" : "Create Debit Note"}
      </button>
    </div>
  );
}