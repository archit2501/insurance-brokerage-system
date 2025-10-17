"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

type LOB = {
  id: number;
  name: string;
  code: string;
  description: string;
  defaultBrokeragePct?: number;
  defaultVatPct?: number;
  rateBasis?: string | null;
  ratingInputs?: any;
  minPremium?: number;
  wordingRefs?: string | null;
};

type SubLOB = {
  id: number;
  lobId: number;
  name: string;
  code: string;
  description: string;
  overrideBrokeragePct?: number | null;
  overrideVatPct?: number | null;
  overrideRateBasis?: string | null;
  overrideRatingInputs?: any;
  overrideMinPremium?: number | null;
  wordingRefs?: string | null;
};

// Input sanitization helper
function sanitizeInput(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export default function LOBsPage() {
  const [items, setItems] = useState<LOB[]>([]);
  const [subs, setSubs] = useState<SubLOB[]>([]);
  const [selectedLOB, setSelectedLOB] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<any>({ 
    name: "", 
    code: "",
    description: "",
    defaultBrokeragePct: 0, 
    defaultVatPct: 7.5, 
    minPremium: 0 
  });
  const [subForm, setSubForm] = useState<any>({ 
    name: "", 
    code: "",
    description: "",
    overrideBrokeragePct: undefined, 
    overrideVatPct: undefined 
  });
  const router = useRouter();

  useEffect(() => {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    return;
  }, [router]);

  useEffect(() => { apiGet<LOB[]>("/api/lobs").then(setItems).catch((e)=>setError(String(e))); }, []);
  useEffect(() => { 
    if (selectedLOB) 
      apiGet<SubLOB[]>(`/api/lobs/${selectedLOB}/sublobs`).then(setSubs).catch(()=>setSubs([])); 
    else 
      setSubs([]); 
  }, [selectedLOB]);

  function validateLOB(): boolean {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.code.trim()) errors.code = 'Code is required';
    if (!form.description.trim()) errors.description = 'Description is required';
    if (form.defaultBrokeragePct < 0 || form.defaultBrokeragePct > 100) {
      errors.defaultBrokeragePct = 'Must be between 0 and 100';
    }
    if (form.defaultVatPct < 0 || form.defaultVatPct > 100) {
      errors.defaultVatPct = 'Must be between 0 and 100';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function createLOB() {
    if (!validateLOB()) return;
    
    setError(""); setSuccess(""); setCreating(true);
    try {
      const sanitizedForm = {
        ...form,
        name: sanitizeInput(form.name),
        code: sanitizeInput(form.code),
        description: sanitizeInput(form.description)
      };
      const created = await apiPost<LOB>("/api/lobs", sanitizedForm);
      setItems([created, ...items]);
      setForm({ name: "", code: "", description: "", defaultBrokeragePct: 0, defaultVatPct: 7.5, minPremium: 0 });
      setFieldErrors({});
      setSuccess("✓ LOB created successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e:any) { 
      const errorMsg = e.message || 'Error';
      if (errorMsg.includes('unique') || errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
        setError("A LOB with this code or name already exists. Please use a different code or name.");
      } else {
        setError(errorMsg);
      }
    }
    finally { setCreating(false); }
  }

  async function createSub() {
    if (!selectedLOB) return;
    if (!subForm.name.trim()) { setError("Sub-LOB name is required"); return; }
    if (!subForm.code.trim()) { setError("Sub-LOB code is required"); return; }
    
    setError(""); setSuccess(""); setCreating(true);
    try {
      const sanitizedSubForm = {
        ...subForm,
        name: sanitizeInput(subForm.name),
        code: sanitizeInput(subForm.code),
        description: sanitizeInput(subForm.description || "")
      };
      const created = await apiPost<SubLOB>(`/api/lobs/${selectedLOB}/sublobs`, sanitizedSubForm);
      setSubs([created, ...subs]);
      setSubForm({ name: "", code: "", description: "", overrideBrokeragePct: undefined, overrideVatPct: undefined });
      setSuccess("✓ Sub-LOB created successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch(e:any) { 
      const errorMsg = e.message || 'Error';
      if (errorMsg.includes('unique') || errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
        setError("A Sub-LOB with this code or name already exists. Please use a different code or name.");
      } else {
        setError(errorMsg);
      }
    }
    finally { setCreating(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">LOB & Sub-LOB Master</h1>
      {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Create LOB</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Name *
            <input 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.name ? 'border-red-500' : 'border-border'}`}
              value={form.name} 
              onChange={(e)=>{
                setForm({...form, name: e.target.value});
                if (fieldErrors.name) setFieldErrors({...fieldErrors, name: ''});
              }} 
            />
            {fieldErrors.name && <span className="text-xs text-red-600 mt-1">{fieldErrors.name}</span>}
          </label>
          <label className="text-sm">Code *
            <input 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.code ? 'border-red-500' : 'border-border'}`}
              value={form.code} 
              onChange={(e)=>{
                setForm({...form, code: e.target.value});
                if (fieldErrors.code) setFieldErrors({...fieldErrors, code: ''});
              }} 
            />
            {fieldErrors.code && <span className="text-xs text-red-600 mt-1">{fieldErrors.code}</span>}
          </label>
          <label className="text-sm">Description *
            <input 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.description ? 'border-red-500' : 'border-border'}`}
              value={form.description} 
              onChange={(e)=>{
                setForm({...form, description: e.target.value});
                if (fieldErrors.description) setFieldErrors({...fieldErrors, description: ''});
              }} 
            />
            {fieldErrors.description && <span className="text-xs text-red-600 mt-1">{fieldErrors.description}</span>}
          </label>
          <label className="text-sm">Default Brokerage %
            <input 
              type="number" 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.defaultBrokeragePct ? 'border-red-500' : 'border-border'}`}
              value={form.defaultBrokeragePct} 
              onChange={(e)=>{
                setForm({...form, defaultBrokeragePct: Number(e.target.value)});
                if (fieldErrors.defaultBrokeragePct) setFieldErrors({...fieldErrors, defaultBrokeragePct: ''});
              }} 
            />
            {fieldErrors.defaultBrokeragePct && <span className="text-xs text-red-600 mt-1">{fieldErrors.defaultBrokeragePct}</span>}
          </label>
          <label className="text-sm">Default VAT %
            <input 
              type="number" 
              className={`w-full border rounded px-2 py-1 ${fieldErrors.defaultVatPct ? 'border-red-500' : 'border-border'}`}
              value={form.defaultVatPct} 
              onChange={(e)=>{
                setForm({...form, defaultVatPct: Number(e.target.value)});
                if (fieldErrors.defaultVatPct) setFieldErrors({...fieldErrors, defaultVatPct: ''});
              }} 
            />
            {fieldErrors.defaultVatPct && <span className="text-xs text-red-600 mt-1">{fieldErrors.defaultVatPct}</span>}
          </label>
          <label className="text-sm">Min Premium
            <input type="number" className="w-full border border-border rounded px-2 py-1" value={form.minPremium} onChange={(e)=>setForm({...form, minPremium: Number(e.target.value)})} />
          </label>
          <label className="text-sm">Rate Basis
            <input className="w-full border border-border rounded px-2 py-1" value={form.rateBasis||""} onChange={(e)=>setForm({...form, rateBasis: e.target.value})} />
          </label>
          <label className="text-sm">Wording Refs
            <input className="w-full border border-border rounded px-2 py-1" value={form.wordingRefs||""} onChange={(e)=>setForm({...form, wordingRefs: e.target.value})} />
          </label>
        </div>
        <button disabled={creating} onClick={createLOB} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save LOB'}</button>
      </div>

      <div className="rounded-md border border-border mb-8">
        <div className="bg-secondary text-secondary-foreground p-3 font-medium">
          Existing LOBs ({items.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Brokerage %</th>
                <th className="p-2 text-left">VAT %</th>
                <th className="p-2 text-left">Min Premium</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    No LOBs found. Create one above to get started.
                  </td>
                </tr>
              )}
              {items.map(lob => (
                <tr key={lob.id} className="border-t border-border hover:bg-muted/50">
                  <td className="p-2">{lob.id}</td>
                  <td className="p-2 font-medium">{lob.name}</td>
                  <td className="p-2">
                    <span className="inline-block px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs font-mono">
                      {lob.code}
                    </span>
                  </td>
                  <td className="p-2">{lob.description}</td>
                  <td className="p-2">{lob.defaultBrokeragePct ?? 0}%</td>
                  <td className="p-2">{lob.defaultVatPct ?? 7.5}%</td>
                  <td className="p-2">{lob.minPremium ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Sub-LOBs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="text-sm">Select LOB *
            <select className="w-full border border-border rounded px-2 py-1" value={selectedLOB ?? ''} onChange={(e)=>setSelectedLOB(e.target.value ? Number(e.target.value) : null)}>
              <option value="">-- choose --</option>
              {items.map(l => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </select>
          </label>
          <label className="text-sm">Sub-LOB Name *
            <input className="w-full border border-border rounded px-2 py-1" value={subForm.name} onChange={(e)=>setSubForm({...subForm, name: e.target.value})} />
          </label>
          <label className="text-sm">Code *
            <input className="w-full border border-border rounded px-2 py-1" value={subForm.code} onChange={(e)=>setSubForm({...subForm, code: e.target.value})} />
          </label>
          <label className="text-sm">Description *
            <input className="w-full border border-border rounded px-2 py-1" value={subForm.description} onChange={(e)=>setSubForm({...subForm, description: e.target.value})} />
          </label>
          <label className="text-sm">Override Brokerage %
            <input type="number" className="w-full border border-border rounded px-2 py-1" value={subForm.overrideBrokeragePct||''} onChange={(e)=>setSubForm({...subForm, overrideBrokeragePct: Number(e.target.value)})} />
          </label>
          <label className="text-sm">Override VAT %
            <input type="number" className="w-full border border-border rounded px-2 py-1" value={subForm.overrideVatPct||''} onChange={(e)=>setSubForm({...subForm, overrideVatPct: Number(e.target.value)})} />
          </label>
          <label className="text-sm">Override Rate Basis
            <input className="w-full border border-border rounded px-2 py-1" value={subForm.overrideRateBasis||''} onChange={(e)=>setSubForm({...subForm, overrideRateBasis: e.target.value})} />
          </label>
        </div>
        <button disabled={creating || !selectedLOB} onClick={createSub} className="mt-1 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Add Sub-LOB'}</button>

        {selectedLOB && (
          <div className="rounded-md border border-border mt-4">
            <div className="bg-muted p-2 font-medium text-sm">
              Sub-LOBs for {items.find(l => l.id === selectedLOB)?.name}
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Brokerage %</th>
                  <th className="p-2 text-left">VAT %</th>
                </tr>
              </thead>
              <tbody>
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No Sub-LOBs found for this LOB.
                    </td>
                  </tr>
                )}
                {subs.map(s => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2">{s.id}</td>
                    <td className="p-2">{s.name}</td>
                    <td className="p-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-accent text-accent-foreground text-xs font-mono">
                        {s.code}
                      </span>
                    </td>
                    <td className="p-2">{s.overrideBrokeragePct ?? '-'}</td>
                    <td className="p-2">{s.overrideVatPct ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}