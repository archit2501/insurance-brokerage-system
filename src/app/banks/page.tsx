"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useRouter } from "next/navigation";
import { NIGERIAN_BANKS } from "@/db/seeds/nigerian-banks";

type BankAccount = {
  id: number;
  ownerType: "Client" | "Insurer" | "Agent";
  ownerId: number;
  bankName: string;
  branch?: string | null;
  accountNumber: string;
  accountCountry?: string;
  currency: string;
  swiftBic?: string | null;
  usageReceivable?: boolean;
  usagePayable?: boolean;
  isDefault?: boolean;
  statementSource?: string | null;
  glCode?: string | null;
  active?: boolean;
};

export default function BanksPage() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [ownerOptions, setOwnerOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [form, setForm] = useState<any>({
    ownerType: "Client",
    ownerId: 1,
    bankName: "",
    accountNumber: "",
    accountCountry: "NG",
    currency: "NGN",
    usageReceivable: true,
    usagePayable: false,
    isDefault: false,
    statementSource: "Manual",
    active: true,
  });
  const router = useRouter();

  useEffect(() => {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!t) {
      return;
    }
  }, [router]);

  useEffect(() => {
    apiGet<BankAccount[]>("/api/banks").then(setItems).catch((e) => setError(String(e)));
  }, []);

  // Load owner options based on selected owner type
  useEffect(() => {
    const loadOwners = async () => {
      try {
        let endpoint = "";
        if (form.ownerType === "Client") {
          endpoint = "/api/clients-simple";
        } else if (form.ownerType === "Insurer") {
          endpoint = "/api/insurers";
        } else if (form.ownerType === "Agent") {
          endpoint = "/api/agents";
        }
        
        if (endpoint) {
          const list = await apiGet<Array<{ id: number; legalName?: string; fullName?: string }>>(endpoint);
          // Map to consistent format
          const mapped = list.map(item => ({
            id: item.id,
            name: item.legalName || item.fullName || `ID ${item.id}`
          }));
          setOwnerOptions(mapped);
          if (mapped.length > 0) {
            setForm((f: any) => ({ ...f, ownerId: mapped[0].id }));
          }
        } else {
          setOwnerOptions([]);
        }
      } catch (e) {
        setOwnerOptions([]);
      }
    };
    loadOwners();
  }, [form.ownerType]);

  async function create() {
    setError("");
    setSuccess("");
    setCreating(true);
    try {
      // Enforce NG/NGN-only and no SWIFT per policy
      const payload = {
        ...form,
        accountCountry: "NG",
        currency: "NGN",
        swiftBic: undefined,
      };
      const created = await apiPost<BankAccount>("/api/banks", payload);
      setItems([created, ...items]);
      setSuccess("Bank account created successfully!");
      setForm({ 
        ownerType: "Client", 
        ownerId: ownerOptions.length > 0 ? ownerOptions[0].id : 1, 
        bankName: "", 
        accountNumber: "", 
        accountCountry: "NG", 
        currency: "NGN", 
        usageReceivable: true, 
        usagePayable: false, 
        isDefault: false,
        statementSource: "Manual",
        active: true,
      });
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Error");
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: number) {
    try { 
      await apiDelete(`/api/banks/${id}`); 
      setItems(items.filter(i => i.id !== id));
      setSuccess("Bank account deleted successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e:any) { 
      setError(e.message); 
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Bank Master</h1>
      {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-1">Add Bank Account</h2>
        <p className="text-xs text-muted-foreground mb-3">NG/NGN only. SWIFT/BIC not allowed. Account Number must be valid NUBAN (10 digits).</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Owner Type
            <select className="w-full border border-border rounded px-2 py-1" value={form.ownerType} onChange={(e)=>setForm({...form, ownerType: e.target.value})}>
              <option value="Client">Client</option>
              <option value="Insurer">Insurer</option>
              <option value="Agent">Agent</option>
            </select>
          </label>
          {ownerOptions.length > 0 ? (
            <label className="text-sm">Entity Name
              <select
                className="w-full border border-border rounded px-2 py-1"
                value={form.ownerId}
                onChange={(e)=>setForm({...form, ownerId: Number(e.target.value)})}
              >
                {ownerOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="text-sm">Owner ID
              <input type="number" className="w-full border border-border rounded px-2 py-1" value={form.ownerId} onChange={(e)=>setForm({...form, ownerId: Number(e.target.value)})} />
            </label>
          )}
          <label className="text-sm">Bank Name
            <select className="w-full border border-border rounded px-2 py-1" value={form.bankName} onChange={(e)=>setForm({...form, bankName: e.target.value})}>
              <option value="">Select Bank</option>
              {NIGERIAN_BANKS.map((bank) => (
                <option key={bank.shortCode} value={bank.bankName}>{bank.bankName}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Branch
            <input className="w-full border border-border rounded px-2 py-1" value={form.branch||""} onChange={(e)=>setForm({...form, branch: e.target.value})} />
          </label>
          <label className="text-sm">Account Number
            <input
              className="w-full border border-border rounded px-2 py-1"
              inputMode="numeric"
              maxLength={10}
              pattern="\\d{10}"
              value={form.accountNumber}
              onChange={(e)=>{
                const digitsOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                setForm({...form, accountNumber: digitsOnly});
              }}
            />
          </label>
          <label className="text-sm">GL Code
            <input className="w-full border border-border rounded px-2 py-1" value={form.glCode||""} onChange={(e)=>setForm({...form, glCode: e.target.value})} />
          </label>
          <label className="text-sm">Statement Source
            <select className="w-full border border-border rounded px-2 py-1" value={form.statementSource||"Manual"} onChange={(e)=>setForm({...form, statementSource: e.target.value})}>
              <option value="Manual">Manual</option>
              <option value="CSV">CSV</option>
              <option value="API">API</option>
            </select>
          </label>
          <label className="text-sm flex items-center gap-2">Receivable
            <input type="checkbox" checked={!!form.usageReceivable} onChange={(e)=>setForm({...form, usageReceivable: e.target.checked})} />
          </label>
          <label className="text-sm flex items-center gap-2">Payable
            <input type="checkbox" checked={!!form.usagePayable} onChange={(e)=>setForm({...form, usagePayable: e.target.checked})} />
          </label>
          <label className="text-sm flex items-center gap-2">Default
            <input type="checkbox" checked={!!form.isDefault} onChange={(e)=>setForm({...form, isDefault: e.target.checked})} />
          </label>
          <label className="text-sm flex items-center gap-2">Active
            <input type="checkbox" checked={!!form.active} onChange={(e)=>setForm({...form, active: e.target.checked})} />
          </label>
        </div>
        <button disabled={creating} onClick={create} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save Account'}</button>
      </div>

      <div className="rounded-md border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Owner Type</th>
              <th className="p-2 text-left">Owner ID</th>
              <th className="p-2 text-left">Bank Name</th>
              <th className="p-2 text-left">Branch</th>
              <th className="p-2 text-left">Account Number</th>
              <th className="p-2 text-left">Currency</th>
              <th className="p-2 text-left">Usage Flags</th>
              <th className="p-2 text-left">Default</th>
              <th className="p-2 text-left">Statement Source</th>
              <th className="p-2 text-left">GL Code</th>
              <th className="p-2 text-left">Active</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="p-2">{it.id}</td>
                <td className="p-2">{it.ownerType}</td>
                <td className="p-2">#{it.ownerId}</td>
                <td className="p-2">{it.bankName}</td>
                <td className="p-2">{it.branch || '-'}</td>
                <td className="p-2 font-mono">{it.accountNumber}</td>
                <td className="p-2">{it.currency}</td>
                <td className="p-2">
                  <div className="flex gap-1 flex-wrap">
                    {it.usageReceivable ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Receivable</span> : null}
                    {it.usagePayable ? <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Payable</span> : null}
                  </div>
                </td>
                <td className="p-2">
                  {it.isDefault ? <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">Yes</span> : <span className="text-muted-foreground">No</span>}
                </td>
                <td className="p-2">{it.statementSource || '-'}</td>
                <td className="p-2 font-mono text-xs">{it.glCode || '-'}</td>
                <td className="p-2">
                  {it.active ? <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Active</span> : <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Inactive</span>}
                </td>
                <td className="p-2"><button onClick={()=>remove(it.id)} className="text-red-600 hover:underline text-xs">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}