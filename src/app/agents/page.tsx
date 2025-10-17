"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

type Agent = {
  id: number;
  agent_type: "Individual" | "Corporate";
  full_name: string;
  cac_rc?: string | null;
  tin?: string | null;
  default_commission_pct?: number;
  commission_model?: string | null;
  status: string;
};

type AgentContact = {
  id: number;
  fullName: string;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary: number | boolean;
  status: string;
};

type BankAccount = {
  id: number;
  bankName: string;
  accountNumber: string;
  currency: string;
  isDefault?: boolean | number;
  usageReceivable?: boolean | number;
  usagePayable?: boolean | number;
  active?: boolean | number;
};

type KycFile = {
  id: number;
  fileName: string;
  fileType: string;
  filePath: string;
  fileSize?: number;
  sha256Hash: string;
  createdAt: string;
};

export default function AgentsPage() {
  const [items, setItems] = useState<Agent[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [form, setForm] = useState<any>({ agent_type: 'Individual', full_name: '', default_commission_pct: 0, commission_model: 'Flat', status: 'Active', cac_rc: '', tin: '' });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Record<number, AgentContact[]>>({});
  const [contactsLoading, setContactsLoading] = useState<Record<number, boolean>>({});
  const [contactsForm, setContactsForm] = useState<Record<number, Partial<AgentContact> & { isPrimary?: boolean }>>({});

  const [banks, setBanks] = useState<Record<number, BankAccount[]>>({});
  const [banksLoading, setBanksLoading] = useState<Record<number, boolean>>({});
  const [bankForm, setBankForm] = useState<Record<number, { bankName: string; accountNumber: string; currency: string }>>({});

  const [kycs, setKycs] = useState<Record<number, KycFile[]>>({});
  const [kycLoading, setKycLoading] = useState<Record<number, boolean>>({});
  const [kycForm, setKycForm] = useState<Record<number, { file?: File | null; fileType: string }>>({});

  useEffect(() => {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem('bearer_token') : null;
    const r = typeof window !== 'undefined' ? window.localStorage.getItem('role') : null;
    setRole(r || "");
  }, [router]);

  useEffect(() => {
    apiGet<any[]>("/api/agents")
      .then((res) => {
        // Transform backend camelCase to local display shape
        const mapped: Agent[] = res.map((a: any) => ({
          id: a.id,
          agent_type: (a.type === 'corporate' ? 'Corporate' : 'Individual') as Agent["agent_type"],
          full_name: a.fullName ?? a.legalName ?? "",
          cac_rc: a.cacRc ?? null,
          tin: a.tin ?? null,
          default_commission_pct: a.defaultCommissionPct ?? 0,
          commission_model: a.commissionModel ? (a.commissionModel === 'variable' ? 'Variable' : 'Flat') : 'Flat',
          status: a.status ? (a.status === 'inactive' ? 'Inactive' : 'Active') : 'Active'
        }));
        setItems(mapped);
      })
      .catch((e)=>setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function create() {
    setError(""); 
    setSuccess("");
    setCreating(true);
    try {
      // Map local form to backend payload
      const isCorporate = String(form.agent_type).toLowerCase() === 'corporate';

      // Validation: CAC & TIN required for corporate
      if (isCorporate) {
        const hasCac = String(form.cac_rc || '').trim().length > 0;
        const hasTin = String(form.tin || '').trim().length > 0;
        if (!hasCac || !hasTin) {
          throw new Error('CAC/RC and TIN are required for Corporate agents');
        }
      }

      const payload: any = {
        type: isCorporate ? 'corporate' : 'individual',
        defaultCommissionPct: Number(form.default_commission_pct) || 0,
        commissionModel: String(form.commission_model).toLowerCase() === 'variable' ? 'variable' : 'flat',
        status: String(form.status).toLowerCase() === 'inactive' ? 'inactive' : 'active',
      };
      if (isCorporate) {
        payload.legalName = String(form.full_name || '').trim();
        if (form.cac_rc) payload.cacRc = String(form.cac_rc).trim();
        if (form.tin) payload.tin = String(form.tin).trim();
      } else {
        payload.fullName = String(form.full_name || '').trim();
      }

      // Use fetch without role header
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(()=>({}));
        throw new Error(j?.error || 'Failed to create agent');
      }
      const created = await res.json();

      // Transform created to local display shape
      const mappedCreated: Agent = {
        id: created.id,
        agent_type: (created.type === 'corporate' ? 'Corporate' : 'Individual'),
        full_name: created.fullName ?? created.legalName ?? '',
        cac_rc: created.cacRc ?? null,
        tin: created.tin ?? null,
        default_commission_pct: created.defaultCommissionPct ?? 0,
        commission_model: created.commissionModel ? (created.commissionModel === 'variable' ? 'Variable' : 'Flat') : 'Flat',
        status: created.status ? (created.status === 'inactive' ? 'Inactive' : 'Active') : 'Active'
      } as Agent;

      setItems([mappedCreated, ...items]);
      setForm({ agent_type: 'Individual', full_name: '', default_commission_pct: 0, commission_model: 'Flat', status: 'Active', cac_rc: '', tin: '' });
      setSuccess("Agent created successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch(e:any) { setError(e?.message || 'Error'); }
    finally { setCreating(false); }
  }

  // Inline update of commission percentage
  async function saveCommission(agent: Agent) {
    setError("");
    setSuccess("");
    try {
      const payload = { defaultCommissionPct: Number(agent.default_commission_pct || 0) };
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to update');
      }
      setSuccess("Commission updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to update');
    }
  }

  // Soft delete (deactivate)
  async function deactivate(id: number) {
    try {
      const res = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Failed to delete');
      }
      setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'Inactive' } : a)));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    }
  }

  async function toggleManage(agentId: number) {
    setExpandedId((prev) => (prev === agentId ? null : agentId));
    if (expandedId === agentId) return;
    // Load contacts, banks, kyc in parallel when expanding
    loadContacts(agentId);
    loadBanks(agentId);
    loadKycs(agentId);
  }

  async function loadContacts(agentId: number) {
    setContactsLoading((m) => ({ ...m, [agentId]: true }));
    try {
      const res = await fetch(`/api/agents/${agentId}/contacts`, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load contacts');
      setContacts((m) => ({ ...m, [agentId]: data }));
    } catch (e: any) {
      setError(e?.message || 'Failed loading contacts');
    } finally {
      setContactsLoading((m) => ({ ...m, [agentId]: false }));
    }
  }

  async function addContact(agentId: number) {
    const f = contactsForm[agentId] || {};
    try {
      const res = await fetch(`/api/agents/${agentId}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
        body: JSON.stringify({
          fullName: f.fullName,
          designation: f.designation,
          email: f.email,
          phone: f.phone,
          isPrimary: !!f.isPrimary,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to add contact');
      setContacts((m) => ({ ...m, [agentId]: [data, ...(m[agentId] || [])] }));
      setContactsForm((m) => ({ ...m, [agentId]: {} }));
    } catch (e: any) {
      setError(e?.message || 'Failed adding contact');
    }
  }

  async function deleteContact(agentId: number, contactId: number) {
    try {
      const res = await fetch(`/api/agents/${agentId}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete contact');
      setContacts((m) => ({ ...m, [agentId]: (m[agentId] || []).filter((c) => c.id !== contactId) }));
    } catch (e: any) {
      setError(e?.message || 'Failed deleting contact');
    }
  }

  async function loadBanks(agentId: number) {
    setBanksLoading((m) => ({ ...m, [agentId]: true }));
    try {
      const url = `/api/banks?owner_type=Agent&owner_id=${agentId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load bank accounts');
      setBanks((m) => ({ ...m, [agentId]: data }));
      if (!bankForm[agentId]) setBankForm((m) => ({ ...m, [agentId]: { bankName: '', accountNumber: '', currency: 'NGN' } }));
    } catch (e: any) {
      setError(e?.message || 'Failed loading banks');
    } finally {
      setBanksLoading((m) => ({ ...m, [agentId]: false }));
    }
  }

  async function addBank(agentId: number) {
    const f = bankForm[agentId] || { bankName: '', accountNumber: '', currency: 'NGN' };
    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
        body: JSON.stringify({
          ownerType: 'Agent',
          ownerId: agentId,
          bankName: f.bankName,
          accountNumber: f.accountNumber,
          accountCountry: 'NG',
          currency: f.currency || 'NGN',
          usageReceivable: true,
          usagePayable: true,
          isDefault: false,
          statementSource: 'Manual',
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to add bank account');
      setBanks((m) => ({ ...m, [agentId]: [data, ...(m[agentId] || [])] }));
      setBankForm((m) => ({ ...m, [agentId]: { bankName: '', accountNumber: '', currency: 'NGN' } }));
    } catch (e: any) {
      setError(e?.message || 'Failed adding bank');
    }
  }

  async function loadKycs(agentId: number) {
    setKycLoading((m) => ({ ...m, [agentId]: true }));
    try {
      const res = await fetch(`/api/agents/${agentId}/kyc`, {
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load KYC');
      setKycs((m) => ({ ...m, [agentId]: data }));
      if (!kycForm[agentId]) setKycForm((m) => ({ ...m, [agentId]: { file: null, fileType: 'passport' } }));
    } catch (e: any) {
      setError(e?.message || 'Failed loading KYC');
    } finally {
      setKycLoading((m) => ({ ...m, [agentId]: false }));
    }
  }

  async function uploadKyc(agentId: number) {
    const f = kycForm[agentId] || { file: null, fileType: 'passport' };
    if (!f.file) { setError('Select a file'); return; }
    try {
      const fd = new FormData();
      fd.append('file', f.file as Blob);
      fd.append('fileType', f.fileType);
      const res = await fetch(`/api/agents/${agentId}/kyc`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to upload KYC');
      setKycs((m) => ({ ...m, [agentId]: [data, ...(m[agentId] || [])] }));
      setKycForm((m) => ({ ...m, [agentId]: { file: null, fileType: 'passport' } }));
    } catch (e: any) {
      setError(e?.message || 'Failed uploading KYC');
    }
  }

  async function deleteKyc(agentId: number, fileId: number) {
    try {
      const res = await fetch(`/api/agents/${agentId}/kyc/${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('bearer_token') : ''}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to delete KYC');
      setKycs((m) => ({ ...m, [agentId]: (m[agentId] || []).filter((k) => k.id !== fileId) }));
    } catch (e: any) {
      setError(e?.message || 'Failed deleting KYC');
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Agent Master</h1>
      {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-600">{success}</div>}
      {loading && <div className="mb-4 text-sm text-muted-foreground">Loading agents...</div>}

      <div className="rounded-md border border-border p-4 mb-8">
        <h2 className="font-medium mb-3">Create Agent</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-sm">Agent Type
            <select className="w-full border border-border rounded px-2 py-1" value={form.agent_type} onChange={(e)=>setForm({...form, agent_type: e.target.value})}>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
            </select>
          </label>
          <label className="text-sm">{String(form.agent_type).toLowerCase()==='corporate' ? 'Legal Name' : 'Full Name'}
            <input className="w-full border border-border rounded px-2 py-1" value={form.full_name} onChange={(e)=>setForm({...form, full_name: e.target.value})} />
          </label>
          <label className="text-sm">CAC/RC
            <input className="w-full border border-border rounded px-2 py-1" value={form.cac_rc||''} onChange={(e)=>setForm({...form, cac_rc: e.target.value})} disabled={String(form.agent_type).toLowerCase()!=='corporate'} />
          </label>
          <label className="text-sm">TIN
            <input className="w-full border border-border rounded px-2 py-1" value={form.tin||''} onChange={(e)=>setForm({...form, tin: e.target.value})} disabled={String(form.agent_type).toLowerCase()!=='corporate'} />
          </label>
          <label className="text-sm">Default Commission %
            <input type="number" className="w-full border border-border rounded px-2 py-1" value={form.default_commission_pct} onChange={(e)=>setForm({...form, default_commission_pct: Number(e.target.value)})} />
          </label>
          <label className="text-sm">Commission Model
            <select className="w-full border border-border rounded px-2 py-1" value={form.commission_model} onChange={(e)=>setForm({...form, commission_model: e.target.value})}>
              <option value="Flat">Flat</option>
              <option value="Variable">Variable</option>
            </select>
          </label>
          <label className="text-sm">Status
            <select className="w-full border border-border rounded px-2 py-1" value={form.status} onChange={(e)=>setForm({...form, status: e.target.value})}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
        </div>
        <button disabled={creating} onClick={create} className="mt-3 inline-flex items-center px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-50">{creating? 'Saving...' : 'Save Agent'}</button>
      </div>

      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Commission %</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it)=> (
              <>
                <tr key={it.id} className="border-t border-border">
                  <td className="p-2">{it.id}</td>
                  <td className="p-2">{it.full_name}</td>
                  <td className="p-2">{it.agent_type}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 border border-border rounded px-2 py-1"
                        value={it.default_commission_pct ?? 0}
                        onChange={(e)=>{
                          const val = Number(e.target.value);
                          setItems((prev)=> prev.map((a)=> a.id===it.id ? { ...a, default_commission_pct: val } : a));
                        }}
                      />
                      <button
                        className="px-2 py-1 text-xs rounded bg-accent"
                        onClick={() => saveCommission(it)}
                      >Save</button>
                    </div>
                  </td>
                  <td className="p-2">{it.status}</td>
                  <td className="p-2 space-x-2">
                    <button
                      className="px-2 py-1 text-xs rounded bg-muted"
                      onClick={() => toggleManage(it.id)}
                    >{expandedId === it.id ? 'Hide' : 'Manage'}</button>
                    <button
                      className="px-2 py-1 text-xs rounded bg-destructive text-white disabled:opacity-50"
                      disabled={it.status === 'Inactive'}
                      onClick={() => deactivate(it.id)}
                    >{it.status === 'Inactive' ? 'Inactive' : 'Deactivate'}</button>
                  </td>
                </tr>
                {expandedId === it.id && (
                  <tr className="border-t border-border">
                    <td colSpan={6} className="p-3 bg-accent/30">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="rounded border border-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Contacts</h4>
                            <button className="text-xs underline" onClick={() => loadContacts(it.id)}>Refresh</button>
                          </div>
                          {contactsLoading[it.id] ? (
                            <p className="text-xs text-muted-foreground">Loading contacts...</p>
                          ) : (
                            <ul className="space-y-2">
                              {(contacts[it.id] || []).map((c) => (
                                <li key={c.id} className="flex items-center justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-sm">{c.fullName} {c.isPrimary ? <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">Primary</span> : null}</div>
                                    <div className="text-xs text-muted-foreground">{c.email || '—'} • {c.phone || '—'}</div>
                                  </div>
                                  <button className="text-xs text-red-600" onClick={() => deleteContact(it.id, c.id)}>Delete</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 border-t border-border pt-3">
                            <h5 className="text-xs font-medium mb-2">Add Contact</h5>
                            <div className="space-y-2">
                              <input className="w-full border border-border rounded px-2 py-1 text-sm" placeholder="Full name" value={(contactsForm[it.id]?.fullName as any) || ''} onChange={(e)=>setContactsForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), fullName: e.target.value }}))} />
                              <input className="w-full border border-border rounded px-2 py-1 text-sm" placeholder="Designation" value={(contactsForm[it.id]?.designation as any) || ''} onChange={(e)=>setContactsForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), designation: e.target.value }}))} />
                              <div className="grid grid-cols-2 gap-2">
                                <input className="border border-border rounded px-2 py-1 text-sm" placeholder="Email" value={(contactsForm[it.id]?.email as any) || ''} onChange={(e)=>setContactsForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), email: e.target.value }}))} />
                                <input className="border border-border rounded px-2 py-1 text-sm" placeholder="Phone (+234...)" value={(contactsForm[it.id]?.phone as any) || ''} onChange={(e)=>setContactsForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), phone: e.target.value }}))} />
                              </div>
                              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!contactsForm[it.id]?.isPrimary} onChange={(e)=>setContactsForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), isPrimary: e.target.checked }}))} /> Set as primary</label>
                              <button className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50" onClick={()=>addContact(it.id)}>Add Contact</button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded border border-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Linked Bank Accounts</h4>
                            <button className="text-xs underline" onClick={() => loadBanks(it.id)}>Refresh</button>
                          </div>
                          {banksLoading[it.id] ? (
                            <p className="text-xs text-muted-foreground">Loading bank accounts...</p>
                          ) : (
                            <ul className="space-y-2">
                              {(banks[it.id] || []).map((b) => (
                                <li key={b.id} className="text-sm flex items-center justify-between">
                                  <span>{b.bankName} • {b.accountNumber} • {b.currency}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 border-t border-border pt-3">
                            <h5 className="text-xs font-medium mb-2">Add Bank</h5>
                            <div className="space-y-2">
                              <input className="w-full border border-border rounded px-2 py-1 text-sm" placeholder="Bank name" value={(bankForm[it.id]?.bankName) || ''} onChange={(e)=>setBankForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{ currency:'NGN'}), bankName: e.target.value }}))} />
                              <div className="grid grid-cols-2 gap-2">
                                <input className="border border-border rounded px-2 py-1 text-sm" placeholder="Account number" value={(bankForm[it.id]?.accountNumber) || ''} onChange={(e)=>setBankForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{ currency:'NGN'}), accountNumber: e.target.value }}))} />
                                <select className="border border-border rounded px-2 py-1 text-sm" value={(bankForm[it.id]?.currency) || 'NGN'} onChange={(e)=>setBankForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), currency: e.target.value }}))}>
                                  <option value="NGN">NGN</option>
                                  <option value="USD">USD</option>
                                  <option value="EUR">EUR</option>
                                </select>
                              </div>
                              <button className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50" onClick={()=>addBank(it.id)}>Add Bank</button>
                            </div>
                          </div>
                        </div>

                        <div className="rounded border border-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">KYC Uploads</h4>
                            <button className="text-xs underline" onClick={() => loadKycs(it.id)}>Refresh</button>
                          </div>
                          {kycLoading[it.id] ? (
                            <p className="text-xs text-muted-foreground">Loading KYC...</p>
                          ) : (
                            <ul className="space-y-2">
                              {(kycs[it.id] || []).map((k) => (
                                <li key={k.id} className="flex items-center justify-between text-sm">
                                  <span>{k.fileType.toUpperCase()} • {k.fileName}</span>
                                  <button className="text-xs text-red-600" onClick={()=>deleteKyc(it.id, k.id)}>Delete</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-3 border-t border-border pt-3">
                            <h5 className="text-xs font-medium mb-2">Upload KYC</h5>
                            <div className="space-y-2">
                              <select className="w-full border border-border rounded px-2 py-1 text-sm" value={(kycForm[it.id]?.fileType) || 'passport'} onChange={(e)=>setKycForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{}), fileType: e.target.value }}))}>
                                <option value="passport">Passport</option>
                                <option value="id">ID</option>
                                <option value="cac">CAC</option>
                                <option value="tin">TIN</option>
                                <option value="other">Other</option>
                              </select>
                              <input type="file" className="w-full text-sm" onChange={(e)=>{
                                const file = e.target.files?.[0] || null;
                                setKycForm((m)=> ({...m, [it.id]: { ...(m[it.id]||{ fileType: 'passport'}), file }}));
                              }} />
                              <button className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50" onClick={()=>uploadKyc(it.id)}>Upload</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}