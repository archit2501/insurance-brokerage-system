"use client";

import { useState, useEffect } from "react";

interface CoInsuranceShare {
  id?: number;
  policyId: number;
  insurerId: number;
  sharePercentage: number;
  insurer?: {
    id: number;
    companyName: string;
    shortName: string;
  };
}

interface Insurer {
  id: number;
  companyName: string;
  shortName: string;
}

interface Props {
  policyId: number;
}

export default function CoInsuranceSharesManager({ policyId }: Props) {
  const [shares, setShares] = useState<CoInsuranceShare[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as HeadersInit;

  const loadShares = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/co-insurance-shares`, { headers });
      if (res.ok) {
        const data = await res.json();
        setShares(data);
      }
    } catch (error) {
      console.error("Failed to load co-insurance shares:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsurers = async () => {
    try {
      const res = await fetch('/api/insurers?limit=200', { headers });
      if (res.ok) {
        const data = await res.json();
        setInsurers(data);
      }
    } catch (error) {
      console.error("Failed to load insurers:", error);
    }
  };

  useEffect(() => {
    loadShares();
    loadInsurers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  const addNewShare = () => {
    const newShare: CoInsuranceShare = {
      policyId,
      insurerId: 0,
      sharePercentage: 0,
    };
    setShares([...shares, newShare]);
    setEditing(true);
  };

  const deleteShare = async (index: number) => {
    const share = shares[index];
    if (share.id) {
      try {
        await fetch(`/api/policies/${policyId}/co-insurance-shares?shareId=${share.id}`, {
          method: "DELETE",
          headers,
        });
      } catch (error) {
        console.error("Failed to delete share:", error);
      }
    }
    const newShares = shares.filter((_, i) => i !== index);
    setShares(newShares);
  };

  const saveShares = async () => {
    // Validate total is 100%
    const total = shares.reduce((sum, s) => sum + s.sharePercentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      alert(`Total share percentage must be 100%. Current total: ${total.toFixed(2)}%`);
      return;
    }

    try {
      for (const share of shares) {
        if (!share.insurerId) {
          alert("Please select an insurer for all shares");
          return;
        }

        if (share.id) {
          // Update existing
          await fetch(`/api/policies/${policyId}/co-insurance-shares`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ shareId: share.id, sharePercentage: share.sharePercentage }),
          });
        } else {
          // Create new
          await fetch(`/api/policies/${policyId}/co-insurance-shares`, {
            method: "POST",
            headers,
            body: JSON.stringify({ insurerId: share.insurerId, sharePercentage: share.sharePercentage }),
          });
        }
      }
      alert("Co-insurance shares saved successfully!");
      setEditing(false);
      loadShares();
    } catch (error) {
      alert("Failed to save co-insurance shares");
      console.error(error);
    }
  };

  const updateShare = (index: number, field: 'insurerId' | 'sharePercentage', value: any) => {
    const newShares = [...shares];
    newShares[index][field] = field === 'sharePercentage' ? parseFloat(value) : parseInt(value);
    setShares(newShares);
  };

  const totalPercentage = shares.reduce((sum, share) => sum + share.sharePercentage, 0);

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Proposed Co-Insurance Shares</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={saveShares}
                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  loadShares();
                }}
                className="text-xs px-3 py-1 border border-border rounded hover:bg-secondary"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1 border border-border rounded hover:bg-secondary"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {editing && (
        <button
          onClick={addNewShare}
          className="text-xs px-3 py-1 bg-secondary rounded hover:bg-secondary/80"
        >
          + Add Insurer
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-secondary/50">
            <tr>
              <th className="border border-border p-2 text-left">Insurance Company</th>
              <th className="border border-border p-2 text-right">Share %</th>
              {editing && <th className="border border-border p-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {shares.map((share, index) => (
              <tr key={index} className="hover:bg-secondary/20">
                <td className="border border-border p-2">
                  {editing ? (
                    <select
                      value={share.insurerId}
                      onChange={(e) => updateShare(index, 'insurerId', e.target.value)}
                      className="w-full px-2 py-1 border border-border rounded text-xs"
                    >
                      <option value={0}>Select Insurer...</option>
                      {insurers.map((insurer) => (
                        <option key={insurer.id} value={insurer.id}>
                          {insurer.companyName || insurer.shortName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    share.insurer?.companyName || share.insurer?.shortName || 'Unknown'
                  )}
                </td>
                <td className="border border-border p-2 text-right">
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={share.sharePercentage}
                      onChange={(e) => updateShare(index, 'sharePercentage', e.target.value)}
                      className="w-24 px-2 py-1 border border-border rounded text-xs text-right"
                    />
                  ) : (
                    `${share.sharePercentage.toFixed(2)}%`
                  )}
                </td>
                {editing && (
                  <td className="border border-border p-2 text-center">
                    <button
                      onClick={() => deleteShare(index)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-secondary/30">
            <tr>
              <td className="border border-border p-2 text-right font-bold">TOTAL</td>
              <td className={`border border-border p-2 text-right font-bold ${
                Math.abs(totalPercentage - 100) > 0.01 ? 'text-red-600' : 'text-green-600'
              }`}>
                {totalPercentage.toFixed(2)}%
              </td>
              {editing && <td className="border border-border p-2"></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {shares.length === 0 && !editing && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No co-insurance shares defined. This policy is 100% with the primary insurer.
        </div>
      )}

      {editing && Math.abs(totalPercentage - 100) > 0.01 && (
        <div className="text-xs text-red-600">
          Warning: Total must equal 100%. Current total: {totalPercentage.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
