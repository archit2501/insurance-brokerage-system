"use client";

import { useEffect, useState } from "react";
import { usePremiumCalculator } from "@/hooks/use-premium-calculator";
import { PremiumCalculatorDisplay, BrokerageSlabSelector } from "@/components/PremiumCalculator";
import { AutoCalculateIndicator, ExcelLikeBadge, FormulaDisplay } from "@/components/AutoCalculateIndicator";
import { BROKERAGE_SLABS } from "@/lib/brokerage-slabs";

type NoteType = "DN" | "CN";

interface Client { id: number; companyName: string }
interface Insurer { id: number; companyName: string; shortName?: string }
interface Policy { 
  id: number; 
  policyNumber: string;
  grossPremium?: number;
  sumInsured?: number;
  lobId?: number;
}
interface NoteItem {
  id: number;
  noteId: string;
  noteType: NoteType;
  clientId: number;
  insurerId?: number | null;
  policyId: number;
  grossPremium: number;
  brokeragePct: number;
  vatPct: number;
  agentCommissionPct: number;
  netAmountDue: number;
  status: "Draft" | "Approved" | "Issued";
  pdfPath?: string | null;
}

const INSURER_ROLES = [
  "underwriter",
  "marketer",
  "MD",
  "ED",
  "DGM",
  "Head_of_RI",
  "claims",
  "technical",
] as const;

export default function NotesPageEnhanced() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;

  const [form, setForm] = useState({
    noteType: "DN" as NoteType,
    clientId: "",
    policyId: "",
    insurerId: "",
    // Enhanced fields
    paymentTerms: "",
    paymentDueDate: "",
    currency: "NGN",
    exchangeRate: "1.0",
    issueDate: "",
    specialConditions: "",
    endorsementDetails: "",
    lobSpecificDetails: {} as any,
  });

  const [dispatchForm, setDispatchForm] = useState({
    roles: new Set<string>(["underwriter"]),
    extraEmails: "",
  });

  // Use premium calculator hook for automatic calculations
  const {
    values,
    calculation,
    suggestions,
    updateValue,
    setValues,
    recalculate,
  } = usePremiumCalculator({
    onCalculate: (calc) => {
      setIsCalculating(true);
      console.log("Note calculation updated:", calc);
      setTimeout(() => setIsCalculating(false), 500);
    },
  });

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(userId ? { "x-user-id": userId } : {}),
  } as HeadersInit;

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsRes, insurersRes, policiesRes, notesRes] = await Promise.all([
        fetch(`/api/clients?limit=200`),
        fetch(`/api/insurers?limit=200`),
        fetch(`/api/policies?limit=200`),
        fetch(`/api/notes?limit=50`, { headers }),
      ]);
      const [clientsJson, insurersJson, policiesJson, notesJson] = await Promise.all([
        clientsRes.json(),
        insurersRes.json(),
        policiesRes.json(),
        notesRes.json(),
      ]);

      // Map policies response
      const policiesData = Array.isArray(policiesJson) ? policiesJson : [];
      const mappedPolicies = policiesData.map((p: any) => ({
        id: p.id,
        policyNumber: p.policyNumber || `Policy #${p.id}`,
        grossPremium: p.grossPremium,
        sumInsured: p.sumInsured,
        lobId: p.lobId,
      }));

      setClients(Array.isArray(clientsJson) ? clientsJson : []);
      setInsurers(Array.isArray(insurersJson) ? insurersJson : []);
      setPolicies(mappedPolicies);

      // Map notes response
      console.log('Notes API Response:', notesJson);
      const notesData = Array.isArray(notesJson) ? notesJson : [];
      console.log('Notes Data (array):', notesData);
      const mapped = notesData.map((n: any) => (n.note ? n.note : n));
      console.log('Mapped Notes:', mapped);
      setNotes(mapped);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserIdAndLoad = async () => {
      try {
        const sessionRes = await fetch("/api/auth/get-session", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const id = sessionData?.user?.id || sessionData?.session?.userId || null;
          setUserId(id ? String(id) : null);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }

      await loadAll();
    };

    fetchUserIdAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Auto-populate when policy is selected
  useEffect(() => {
    if (form.policyId) {
      const selectedPolicy = policies.find(p => p.id === Number(form.policyId));
      if (selectedPolicy) {
        // Auto-fill ALL available policy data
        const updates: any = {};
        
        if (selectedPolicy.grossPremium) {
          updates.grossPremium = selectedPolicy.grossPremium.toString();
        }
        if (selectedPolicy.sumInsured) {
          updates.sumInsured = selectedPolicy.sumInsured.toString();
        }
        
        // If we have both, calculate rate
        if (selectedPolicy.grossPremium && selectedPolicy.sumInsured) {
          const rate = (selectedPolicy.grossPremium / selectedPolicy.sumInsured) * 100;
          updates.ratePct = rate.toFixed(4);
        }
        
        // Auto-suggest brokerage based on premium
        if (selectedPolicy.grossPremium && !values.brokeragePct) {
          if (selectedPolicy.grossPremium >= 10000000) {
            updates.brokeragePct = '20';
          } else if (selectedPolicy.grossPremium >= 1000000) {
            updates.brokeragePct = '15';
          } else {
            updates.brokeragePct = '9';
          }
        }
        
        if (Object.keys(updates).length > 0) {
          setValues(updates);
        }
      }
    }
  }, [form.policyId, policies, setValues, values.brokeragePct]);

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.policyId || !values.grossPremium || !values.brokeragePct) return;
    if (form.noteType === "CN" && !form.insurerId) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          noteType: form.noteType,
          clientId: Number(form.clientId),
          policyId: Number(form.policyId),
          insurerId: form.noteType === "CN" ? Number(form.insurerId) : undefined,
          grossPremium: Number(values.grossPremium),
          brokeragePct: Number(values.brokeragePct),
          vatPct: Number(values.vatPct || 7.5),
          agentCommissionPct: Number(values.agentCommissionPct || 0),
          // Enhanced fields
          paymentTerms: form.paymentTerms || undefined,
          paymentDueDate: form.paymentDueDate || undefined,
          currency: form.currency || 'NGN',
          exchangeRate: form.exchangeRate ? Number(form.exchangeRate) : 1.0,
          issueDate: form.issueDate || undefined,
          specialConditions: form.specialConditions || undefined,
          endorsementDetails: form.endorsementDetails || undefined,
          lobSpecificDetails: Object.keys(form.lobSpecificDetails).length > 0 ? form.lobSpecificDetails : undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes((prev) => [created, ...prev]);
        setForm({ 
          noteType: "DN", 
          clientId: "", 
          policyId: "", 
          insurerId: "",
          paymentTerms: "",
          paymentDueDate: "",
          currency: "NGN",
          exchangeRate: "1.0",
          issueDate: "",
          specialConditions: "",
          endorsementDetails: "",
          lobSpecificDetails: {},
        });
        setValues({
          grossPremium: '',
          brokeragePct: '',
          sumInsured: '',
          ratePct: '',
          vatPct: '7.5',
          agentCommissionPct: '0',
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`Failed to create note: ${errorData.error || 'Unknown error'}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const approveNote = async (n: NoteItem) => {
    try {
      const res = await fetch(`/api/notes/${n.id}/approve`, {
        method: "POST",
        headers: {
          ...headers,
          "x-approval-level": "L2", // Add approval level header for authorization
        },
      });
      
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((it) => (it.id === n.id ? { ...it, status: updated.status } : it)));
        alert('✅ Note approved successfully!');
      } else {
        const error = await res.json();
        alert(`❌ Failed to approve: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Approve error:', error);
      alert(`❌ Error: ${error.message || 'Failed to approve note'}`);
    }
  };

  const issueNote = async (n: NoteItem) => {
    try {
      const res = await fetch(`/api/notes/${n.id}/issue`, {
        method: "POST",
        headers: {
          ...headers,
          "x-approval-level": "L3", // Issue requires L3 approval level
        },
        body: JSON.stringify({ noteId: n.noteId }),
      });
      
      if (res.ok) {
        const json = await res.json();
        const updated = json.note || json;
        setNotes((prev) => prev.map((it) => (it.noteId === n.noteId ? { ...it, status: updated.status } : it)));
        alert('✅ Note issued successfully!');
      } else {
        const error = await res.json();
        alert(`❌ Failed to issue: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Issue error:', error);
      alert(`❌ Error: ${error.message || 'Failed to issue note'}`);
    }
  };

  const emailNote = async (n: NoteItem) => {
    setEmailingId(n.id);
    try {
      const toRoles = Array.from(dispatchForm.roles);
      const toExtraEmails = dispatchForm.extraEmails
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch("/api/dispatch/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          noteId: n.noteId,
          toRoles: toRoles.length > 0 ? toRoles : ["underwriter"],
          toExtraEmails,
        }),
      });
      
      if (res.ok) {
        const result = await res.json();
        alert(`✅ Email sent successfully!\n\nSent to: ${result.sentTo?.join(', ') || 'recipients'}`);
      } else {
        const error = await res.json();
        alert(`❌ Failed to send email: ${error.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Email error:', error);
      alert(`❌ Error: ${error.message || 'Failed to send email'}`);
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Calculation Indicator */}
      <AutoCalculateIndicator isCalculating={isCalculating} show={true} />

      <h1 className="text-2xl font-bold mb-6">Credit/Debit Notes - Excel-like Auto-Calculation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left: Form */}
        <div className="rounded-lg border border-border p-6 bg-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create Note</h2>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Auto-filled
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Live calc
              </span>
            </div>
          </div>

          {/* Excel-like Info Banner */}
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200 flex items-start gap-2">
              <span className="text-lg">📊</span>
              <span>
                <strong>Excel-like Auto-calculation:</strong> Enter any value and watch related fields update automatically! 
                Change Gross Premium or Rate % and see everything recalculate instantly.
              </span>
            </p>
          </div>

          <form onSubmit={createNote} className="space-y-4">
            {/* Note Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-background"
                value={form.noteType}
                onChange={(e) => setForm((f) => ({ ...f, noteType: e.target.value as NoteType }))}
              >
                <option value="DN">Debit Note</option>
                <option value="CN">Credit Note</option>
              </select>
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-medium mb-2">Client *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-background"
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                required
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            {/* Policy */}
            <div>
              <label className="block text-sm font-medium mb-2">Policy *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 bg-background"
                value={form.policyId}
                onChange={(e) => setForm({ ...form, policyId: e.target.value })}
                required
              >
                <option value="">Select Policy</option>
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>{p.policyNumber}</option>
                ))}
              </select>
            </div>

            {/* Insurer (for CN) */}
            {form.noteType === "CN" && (
              <div>
                <label className="block text-sm font-medium mb-2">Insurer *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  value={form.insurerId}
                  onChange={(e) => setForm({ ...form, insurerId: e.target.value })}
                  required
                >
                  <option value="">Select Insurer</option>
                  {insurers.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.companyName || ins.shortName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Gross Premium */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                Gross Premium *
                {form.policyId && <ExcelLikeBadge type="auto-filled" />}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                type="number"
                step="0.01"
                placeholder="Enter amount or select policy"
                value={values.grossPremium}
                onChange={(e) => updateValue('grossPremium', e.target.value)}
                required
              />
              {values.sumInsured && values.ratePct && parseFloat(values.grossPremium) > 0 && (
                <FormulaDisplay 
                  formula={`= Sum Insured × Rate% = ${parseFloat(values.sumInsured).toLocaleString()} × ${values.ratePct}%`}
                  result={parseFloat(values.grossPremium)}
                  currency="NGN"
                />
              )}
            </div>

            {/* Sum Insured (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                Sum Insured
                {values.sumInsured && parseFloat(values.sumInsured) > 0 && (
                  <ExcelLikeBadge type="calculated" />
                )}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 bg-secondary/30 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                type="number"
                step="0.01"
                placeholder="Auto-calculated from premium & rate"
                value={values.sumInsured}
                onChange={(e) => updateValue('sumInsured', e.target.value)}
              />
              {values.grossPremium && values.ratePct && parseFloat(values.sumInsured) > 0 && (
                <FormulaDisplay 
                  formula={`= Gross Premium ÷ Rate% = ${parseFloat(values.grossPremium).toLocaleString()} ÷ ${values.ratePct}%`}
                  result={parseFloat(values.sumInsured)}
                  currency="NGN"
                />
              )}
            </div>

            {/* Rate % (Auto-calculated) */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                Rate %
                {values.ratePct && parseFloat(values.ratePct) > 0 && (
                  <ExcelLikeBadge type="calculated" />
                )}
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 bg-secondary/30 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                type="number"
                step="0.0001"
                placeholder="Auto-calculated from premium & sum"
                value={values.ratePct}
                onChange={(e) => updateValue('ratePct', e.target.value)}
              />
              {values.grossPremium && values.sumInsured && parseFloat(values.ratePct) > 0 && (
                <FormulaDisplay 
                  formula={`= (Gross Premium ÷ Sum Insured) × 100 = ${values.ratePct}%`}
                />
              )}
            </div>

            {/* Brokerage Slab Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Brokerage Slab *
                {calculation && (
                  <span className="ml-2 text-xs text-purple-600">
                    💡 Suggested based on premium
                  </span>
                )}
              </label>
              <BrokerageSlabSelector
                value={values.brokeragePct}
                onChange={(value) => updateValue('brokeragePct', value)}
                suggestedValue={
                  parseFloat(values.grossPremium) >= 10000000 ? 20 :
                  parseFloat(values.grossPremium) >= 1000000 ? 15 : 
                  parseFloat(values.grossPremium) > 0 ? 9 : undefined
                }
              />
            </div>

            {/* VAT % */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">VAT %</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  type="number"
                  step="0.01"
                  value={values.vatPct}
                  onChange={(e) => updateValue('vatPct', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Agent Commission %</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  type="number"
                  step="0.01"
                  value={values.agentCommissionPct}
                  onChange={(e) => updateValue('agentCommissionPct', e.target.value)}
                />
              </div>
            </div>

            {/* Enhanced Fields Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3 text-primary">Enhanced Credit Note Details (Optional)</h3>
              
              {/* Currency & Exchange Rate */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Currency</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 bg-background"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="NGN">Nigerian Naira (NGN)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="ZAR">South African Rand (ZAR)</option>
                    <option value="KES">Kenyan Shilling (KES)</option>
                    <option value="GHS">Ghanaian Cedi (GHS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Exchange Rate</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 bg-background"
                    type="number"
                    step="0.01"
                    placeholder="1.0 for NGN"
                    value={form.exchangeRate}
                    onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                  />
                </div>
              </div>

              {/* Payment Information */}
              {form.noteType === "CN" && (
                <>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">Payment Terms</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 bg-background"
                      type="text"
                      placeholder="e.g., 30 days from invoice date"
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-2">Payment Due Date</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 bg-background"
                      type="date"
                      value={form.paymentDueDate}
                      onChange={(e) => setForm({ ...form, paymentDueDate: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Issue Date Override */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Issue Date (Optional)</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to use creation date</p>
              </div>

              {/* Special Conditions */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Special Conditions</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  rows={2}
                  placeholder="Any special conditions or notes"
                  value={form.specialConditions}
                  onChange={(e) => setForm({ ...form, specialConditions: e.target.value })}
                />
              </div>

              {/* Endorsement Details */}
              <div className="mb-3">
                <label className="block text-sm font-medium mb-2">Endorsement Details (if applicable)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 bg-background"
                  rows={2}
                  placeholder="Endorsement information"
                  value={form.endorsementDetails}
                  onChange={(e) => setForm({ ...form, endorsementDetails: e.target.value })}
                />
              </div>

              {/* LOB-Specific Details - Show conditionally based on selected policy's LOB */}
              {form.policyId && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-2">Insurance Specific Details</label>
                  <div className="space-y-2 p-3 bg-secondary/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Add details specific to this insurance type</p>
                    
                    {/* Marine Insurance Fields */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium mb-2">🚢 Marine Insurance Details</summary>
                      <div className="ml-4 mt-2 space-y-2">
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          placeholder="Vessel Name"
                          value={form.lobSpecificDetails.vesselName || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, vesselName: e.target.value }})}
                        />
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          placeholder="Voyage Details"
                          value={form.lobSpecificDetails.voyageDetails || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, voyageDetails: e.target.value }})}
                        />
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          rows={2}
                          placeholder="Cargo Description"
                          value={form.lobSpecificDetails.cargoDescription || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, cargoDescription: e.target.value }})}
                        />
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          placeholder="Bill of Lading Number"
                          value={form.lobSpecificDetails.billOfLadingNo || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, billOfLadingNo: e.target.value }})}
                        />
                      </div>
                    </details>

                    {/* Motor Insurance Fields */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium mb-2">🚗 Motor Insurance Details</summary>
                      <div className="ml-4 mt-2 space-y-2">
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          placeholder="Vehicle Registration Number"
                          value={form.lobSpecificDetails.vehicleRegNo || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, vehicleRegNo: e.target.value }})}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                            placeholder="Make (e.g., Toyota)"
                            value={form.lobSpecificDetails.make || ''}
                            onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, make: e.target.value }})}
                          />
                          <input
                            className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                            placeholder="Model (e.g., Camry)"
                            value={form.lobSpecificDetails.model || ''}
                            onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, model: e.target.value }})}
                          />
                        </div>
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          type="number"
                          placeholder="Year"
                          value={form.lobSpecificDetails.year || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, year: e.target.value }})}
                        />
                      </div>
                    </details>

                    {/* Fire/Property Insurance Fields */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium mb-2">🏢 Fire/Property Insurance Details</summary>
                      <div className="ml-4 mt-2 space-y-2">
                        <textarea
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          rows={2}
                          placeholder="Property Address"
                          value={form.lobSpecificDetails.propertyAddress || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, propertyAddress: e.target.value }})}
                        />
                        <input
                          className="w-full border rounded-lg px-3 py-2 bg-background text-sm"
                          placeholder="Building Type (e.g., Commercial Warehouse)"
                          value={form.lobSpecificDetails.buildingType || ''}
                          onChange={(e) => setForm({ ...form, lobSpecificDetails: { ...form.lobSpecificDetails, buildingType: e.target.value }})}
                        />
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.brokerageSlab && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 {suggestions.brokerageSlab}
                </p>
              </div>
            )}

            <button
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {submitting ? "Creating..." : "Create Note"}
            </button>
          </form>
        </div>

        {/* Right: Live Calculator */}
        <div className="rounded-lg border border-border p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">Live Calculation</h2>
          <PremiumCalculatorDisplay
            calculation={calculation}
            currency="NGN"
            showDetails={true}
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Notes ({notes.length})</h2>
            <div className="flex items-center gap-3">
              {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
              <button
                onClick={loadAll}
                className="text-sm px-3 py-1 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          {/* Search Bar */}
          <div>
            <input
              type="text"
              placeholder="🔍 Search notes by ID, policy, or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
        </div>
        {notes.filter(n => {
          if (!searchTerm) return true;
          const search = searchTerm.toLowerCase();
          return (
            n.noteId.toLowerCase().includes(search) ||
            n.policyId.toString().includes(search) ||
            n.grossPremium.toString().includes(search) ||
            n.netAmountDue.toString().includes(search) ||
            n.status.toLowerCase().includes(search)
          );
        }).length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <p className="mb-2">No notes yet.</p>
            <p className="text-xs">Create a credit note or debit note using the form above.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notes.filter(n => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                n.noteId.toLowerCase().includes(search) ||
                n.policyId.toString().includes(search) ||
                n.grossPremium.toString().includes(search) ||
                n.netAmountDue.toString().includes(search) ||
                n.status.toLowerCase().includes(search)
              );
            }).map((n) => (
              <li key={n.id} className="px-6 py-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-semibold">{n.noteType} {n.noteId}</span>
                      <span className={`text-xs px-2 py-1 rounded-full border ${
                        n.status === "Issued" ? "bg-green-100 text-green-800 border-green-200" :
                        n.status === "Approved" ? "bg-amber-100 text-amber-800 border-amber-200" :
                        "bg-gray-100 text-gray-800 border-gray-200"
                      }`}>
                        {n.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Policy {n.policyId} • Gross: ₦{n.grossPremium.toLocaleString()}</p>
                      <p>Brokerage: {n.brokeragePct}% • Net Due: ₦{n.netAmountDue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          const url = `/pdf/${n.noteType === 'CN' ? 'credit-note' : 'debit-note'}/${n.id}`;
                          const response = await fetch(url, { headers });

                          if (!response.ok) {
                            const errorText = await response.text();
                            let errorMessage = 'Failed to generate PDF';
                            try {
                              const errorJson = JSON.parse(errorText);
                              errorMessage = errorJson.error || errorMessage;
                            } catch {
                              errorMessage = errorText || errorMessage;
                            }
                            alert(`❌ Error: ${errorMessage}`);
                            console.error('PDF Error:', errorText);
                            return;
                          }

                          // Success - open PDF in new tab
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          window.open(blobUrl, '_blank');
                        } catch (error: any) {
                          alert(`❌ Error generating PDF: ${error.message}`);
                          console.error('PDF Error:', error);
                        }
                      }}
                      className="text-sm px-3 py-1 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      📄 Print
                    </button>
                    <button
                      onClick={() => emailNote(n)}
                      disabled={emailingId === n.id}
                      className="text-sm px-3 py-1 rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors"
                    >
                      {emailingId === n.id ? "Sending..." : "Email"}
                    </button>
                    {n.status === "Draft" && (
                      <button
                        onClick={() => approveNote(n)}
                        className="text-sm px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {n.status === "Approved" && (
                      <button
                        onClick={() => issueNote(n)}
                        className="text-sm px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Issue
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Email Options */}
      <div className="rounded-lg border border-border p-6 bg-card mt-6">
        <h3 className="text-lg font-semibold mb-4">Email Dispatch Options</h3>
        <p className="text-sm text-muted-foreground mb-4">
          For CN, select insurer roles. For DN, primary client contacts will be used.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          {INSURER_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={dispatchForm.roles.has(r)}
                onChange={(e) => {
                  setDispatchForm((prev) => {
                    const next = new Set(prev.roles);
                    if (e.target.checked) next.add(r); else next.delete(r);
                    return { ...prev, roles: next };
                  });
                }}
                className="rounded"
              />
              <span className="capitalize">{r.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
        <input
          className="w-full border rounded-lg px-3 py-2 bg-background"
          placeholder="Extra recipient emails (comma separated)"
          value={dispatchForm.extraEmails}
          onChange={(e) => setDispatchForm((p) => ({ ...p, extraEmails: e.target.value }))}
        />
      </div>
    </div>
  );
}
