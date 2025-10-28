"use client";

import { useState, useEffect } from "react";

interface PropertyItem {
  id?: number;
  slNo: number;
  itemType: string;
  description: string;
  details?: string;
  // Fire & Special Perils
  value?: number;
  noOfUnits?: number;
  sumInsured?: number;
  // Public Liability
  maxLiability?: number;
  aoaAmount?: number;
  aoyAmount?: number;
  // Business Interruption
  grossProfit?: number;
  netProfit?: number;
  standingCharges?: number;
  auditorFees?: number;
  increasedCostOfWorking?: number;
  indemnityPeriodMonths?: number;
  // Common
  rate: number;
  premium: number;
}

interface Props {
  policyId: number;
  subLobName: string;
}

export default function PropertyItemsManager({ policyId, subLobName }: Props) {
  const [items, setItems] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as HeadersInit;

  // Determine item type based on Sub-LOB name
  const getItemType = () => {
    const lobLower = subLobName.toLowerCase();
    if (lobLower.includes('liability')) return 'public_liability';
    if (lobLower.includes('business') && lobLower.includes('interruption')) return 'business_interruption';
    if (lobLower.includes('fire') || lobLower.includes('property')) return 'fire_perils';
    if (lobLower.includes('marine')) return 'marine';
    if (lobLower.includes('motor')) return 'motor';
    return 'fire_perils'; // default
  };

  const itemType = getItemType();

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/property-items`, { headers });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to load property items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  const addNewRow = () => {
    const newItem: PropertyItem = {
      slNo: items.length + 1,
      itemType,
      description: "",
      rate: 0,
      premium: 0,
    };
    setItems([...items, newItem]);
    setEditing(true);
  };

  const deleteRow = async (index: number) => {
    const item = items[index];
    if (item.id) {
      try {
        await fetch(`/api/policies/${policyId}/property-items?itemId=${item.id}`, {
          method: "DELETE",
          headers,
        });
      } catch (error) {
        console.error("Failed to delete item:", error);
      }
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const saveItems = async () => {
    try {
      for (const item of items) {
        if (item.id) {
          // Update existing
          await fetch(`/api/policies/${policyId}/property-items`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ ...item, itemId: item.id }),
          });
        } else {
          // Create new
          await fetch(`/api/policies/${policyId}/property-items`, {
            method: "POST",
            headers,
            body: JSON.stringify(item),
          });
        }
      }
      alert("Property items saved successfully!");
      setEditing(false);
      loadItems();
    } catch (error) {
      alert("Failed to save property items");
      console.error(error);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    // Auto-calculate for Fire & Special Perils
    if (itemType === 'fire_perils') {
      const item = newItems[index];
      if (item.value && item.noOfUnits) {
        item.sumInsured = item.value * item.noOfUnits;
      }
      if (item.sumInsured && item.rate) {
        item.premium = (item.sumInsured * item.rate) / 100;
      }
    }

    // Auto-calculate premium for other types
    if (itemType === 'public_liability' && newItems[index].maxLiability && newItems[index].rate) {
      newItems[index].premium = (newItems[index].maxLiability! * newItems[index].rate) / 100;
    }

    if (itemType === 'business_interruption' && newItems[index].grossProfit && newItems[index].rate) {
      newItems[index].premium = (newItems[index].grossProfit! * newItems[index].rate) / 100;
    }

    setItems(newItems);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Property Details - {subLobName}</h3>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={saveItems}
                className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  loadItems();
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
          onClick={addNewRow}
          className="text-xs px-3 py-1 bg-secondary rounded hover:bg-secondary/80"
        >
          + Add Row
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-secondary/50">
            <tr>
              <th className="border border-border p-2 text-left">Sl No</th>
              <th className="border border-border p-2 text-left">Description</th>

              {/* Fire & Special Perils columns */}
              {itemType === 'fire_perils' && (
                <>
                  <th className="border border-border p-2 text-right">Value</th>
                  <th className="border border-border p-2 text-right">Units</th>
                  <th className="border border-border p-2 text-right">Sum Insured</th>
                </>
              )}

              {/* Public Liability columns */}
              {itemType === 'public_liability' && (
                <>
                  <th className="border border-border p-2 text-left">Details</th>
                  <th className="border border-border p-2 text-right">Max Liability</th>
                  <th className="border border-border p-2 text-right">AOA : AOY</th>
                </>
              )}

              {/* Business Interruption columns */}
              {itemType === 'business_interruption' && (
                <>
                  <th className="border border-border p-2 text-left">Details</th>
                  <th className="border border-border p-2 text-right">Gross Profit</th>
                  <th className="border border-border p-2 text-right">Net Profit</th>
                  <th className="border border-border p-2 text-right">Standing Charges</th>
                  <th className="border border-border p-2 text-right">Indemnity (months)</th>
                </>
              )}

              <th className="border border-border p-2 text-right">Rate %</th>
              <th className="border border-border p-2 text-right">Premium</th>
              {editing && <th className="border border-border p-2">Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-secondary/20">
                <td className="border border-border p-2">{item.slNo}</td>
                <td className="border border-border p-2">
                  {editing ? (
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="w-full px-2 py-1 border border-border rounded text-xs"
                    />
                  ) : (
                    item.description
                  )}
                </td>

                {/* Fire & Special Perils fields */}
                {itemType === 'fire_perils' && (
                  <>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.value || ''}
                          onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.value?.toLocaleString()
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.noOfUnits || ''}
                          onChange={(e) => updateItem(index, 'noOfUnits', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.noOfUnits
                      )}
                    </td>
                    <td className="border border-border p-2 text-right font-medium">
                      {item.sumInsured?.toLocaleString()}
                    </td>
                  </>
                )}

                {/* Public Liability fields */}
                {itemType === 'public_liability' && (
                  <>
                    <td className="border border-border p-2">
                      {editing ? (
                        <textarea
                          value={item.details || ''}
                          onChange={(e) => updateItem(index, 'details', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-xs"
                          rows={2}
                        />
                      ) : (
                        item.details
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.maxLiability || ''}
                          onChange={(e) => updateItem(index, 'maxLiability', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.maxLiability?.toLocaleString()
                      )}
                    </td>
                    <td className="border border-border p-2 text-center">
                      {editing ? (
                        <div className="flex gap-1 items-center justify-center">
                          <input
                            type="number"
                            placeholder="AOA"
                            value={item.aoaAmount || ''}
                            onChange={(e) => updateItem(index, 'aoaAmount', parseFloat(e.target.value))}
                            className="w-20 px-1 py-1 border border-border rounded text-xs text-right"
                          />
                          <span>:</span>
                          <input
                            type="number"
                            placeholder="AOY"
                            value={item.aoyAmount || ''}
                            onChange={(e) => updateItem(index, 'aoyAmount', parseFloat(e.target.value))}
                            className="w-20 px-1 py-1 border border-border rounded text-xs text-right"
                          />
                        </div>
                      ) : (
                        `${item.aoaAmount?.toLocaleString() || '0'} : ${item.aoyAmount?.toLocaleString() || '0'}`
                      )}
                    </td>
                  </>
                )}

                {/* Business Interruption fields */}
                {itemType === 'business_interruption' && (
                  <>
                    <td className="border border-border p-2">
                      {editing ? (
                        <textarea
                          value={item.details || ''}
                          onChange={(e) => updateItem(index, 'details', e.target.value)}
                          className="w-full px-2 py-1 border border-border rounded text-xs"
                          rows={2}
                        />
                      ) : (
                        item.details
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.grossProfit || ''}
                          onChange={(e) => updateItem(index, 'grossProfit', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.grossProfit?.toLocaleString()
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.netProfit || ''}
                          onChange={(e) => updateItem(index, 'netProfit', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.netProfit?.toLocaleString()
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.standingCharges || ''}
                          onChange={(e) => updateItem(index, 'standingCharges', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.standingCharges?.toLocaleString()
                      )}
                    </td>
                    <td className="border border-border p-2 text-right">
                      {editing ? (
                        <input
                          type="number"
                          value={item.indemnityPeriodMonths || ''}
                          onChange={(e) => updateItem(index, 'indemnityPeriodMonths', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-border rounded text-xs text-right"
                        />
                      ) : (
                        item.indemnityPeriodMonths
                      )}
                    </td>
                  </>
                )}

                <td className="border border-border p-2 text-right">
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border border-border rounded text-xs text-right"
                    />
                  ) : (
                    `${item.rate}%`
                  )}
                </td>
                <td className="border border-border p-2 text-right font-medium">
                  {item.premium.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </td>
                {editing && (
                  <td className="border border-border p-2 text-center">
                    <button
                      onClick={() => deleteRow(index)}
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
              <td colSpan={itemType === 'fire_perils' ? 5 : itemType === 'public_liability' ? 5 : 7} className="border border-border p-2 text-right font-bold">
                Total:
              </td>
              <td className="border border-border p-2 text-right font-bold">
                {items.reduce((sum, item) => sum + (item.premium || 0), 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </td>
              {editing && <td className="border border-border p-2"></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {items.length === 0 && !editing && (
        <div className="text-center text-muted-foreground text-sm py-4">
          No property items added yet. Click Edit to add items.
        </div>
      )}
    </div>
  );
}
