"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RenewalCardProps {
  policyId: number;
  policyEndDate: string;
  grossPremium: number;
  currency: string;
  renewedToPolicyId?: number | null;
  renewedFromPolicyId?: number | null;
}

export function RenewalCard({
  policyId,
  policyEndDate,
  grossPremium,
  currency,
  renewedToPolicyId,
  renewedFromPolicyId,
}: RenewalCardProps) {
  const router = useRouter();
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    policyStartDate: "",
    policyEndDate: "",
    adjustmentPercent: 0,
  });

  // Calculate days until expiry
  const today = new Date();
  const expiryDate = new Date(policyEndDate);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Determine urgency
  const isExpired = daysUntilExpiry < 0;
  const isCritical = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  const isHigh = daysUntilExpiry > 7 && daysUntilExpiry <= 30;
  const isMedium = daysUntilExpiry > 30 && daysUntilExpiry <= 60;

  // Auto-calculate suggested dates
  const suggestedStartDate = new Date(expiryDate);
  suggestedStartDate.setDate(suggestedStartDate.getDate() + 1);
  const suggestedEndDate = new Date(suggestedStartDate);
  suggestedEndDate.setFullYear(suggestedEndDate.getFullYear() + 1);

  async function handleRenew() {
    setLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const res = await fetch(`/api/policies/${policyId}/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to renew policy");
      }

      const data = await res.json();
      alert(`✅ Policy renewed successfully!\n\nNew Policy: ${data.renewalPolicy.policyNumber}\n${data.adjustmentSummary?.adjustmentApplied ? `Premium Adjustment: ${data.adjustmentSummary.adjustmentPercent > 0 ? '+' : ''}${data.adjustmentSummary.adjustmentPercent}%` : 'No adjustment applied'}`);
      
      // Redirect to new policy
      router.push(`/policies/${data.renewalPolicy.id}`);
      router.refresh();
    } catch (e: any) {
      alert(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function openRenewalForm() {
    // Pre-fill with suggested dates
    setFormData({
      policyStartDate: suggestedStartDate.toISOString().split('T')[0],
      policyEndDate: suggestedEndDate.toISOString().split('T')[0],
      adjustmentPercent: 0,
    });
    setShowRenewalForm(true);
  }

  // If this policy was renewed to another policy
  if (renewedToPolicyId) {
    return (
      <div className="border border-green-200 rounded-lg p-6 bg-green-50">
        <div className="flex items-start gap-3">
          <div className="text-3xl">✅</div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">Policy Renewed</h3>
            <p className="text-sm text-green-700 mb-3">
              This policy has been renewed to a new policy.
            </p>
            <button
              onClick={() => router.push(`/policies/${renewedToPolicyId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              View Renewal Policy →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If this is a renewal of another policy
  if (renewedFromPolicyId) {
    return (
      <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🔄</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Renewal Policy</h3>
            <p className="text-sm text-blue-700 mb-3">
              This is a renewal of a previous policy.
            </p>
            <button
              onClick={() => router.push(`/policies/${renewedFromPolicyId}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              View Original Policy →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active policy - show renewal options
  const getUrgencyStyle = () => {
    if (isExpired) return "border-red-300 bg-red-50";
    if (isCritical) return "border-red-200 bg-red-50";
    if (isHigh) return "border-amber-200 bg-amber-50";
    if (isMedium) return "border-blue-200 bg-blue-50";
    return "border-border bg-card";
  };

  const getUrgencyText = () => {
    if (isExpired) return { emoji: "⚠️", text: "Expired", color: "text-red-700" };
    if (isCritical) return { emoji: "🔥", text: "Critical - Expires Soon!", color: "text-red-700" };
    if (isHigh) return { emoji: "⚡", text: "High Priority", color: "text-amber-700" };
    if (isMedium) return { emoji: "📅", text: "Upcoming Renewal", color: "text-blue-700" };
    return { emoji: "✓", text: "Active", color: "text-muted-foreground" };
  };

  const urgency = getUrgencyText();

  return (
    <div className={`border rounded-lg p-6 ${getUrgencyStyle()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{urgency.emoji}</div>
          <div>
            <h3 className={`font-semibold mb-1 ${urgency.color}`}>{urgency.text}</h3>
            <p className="text-sm text-muted-foreground">
              {isExpired ? (
                <>Expired {Math.abs(daysUntilExpiry)} days ago</>
              ) : (
                <>Expires in <span className="font-semibold">{daysUntilExpiry} days</span> on {expiryDate.toLocaleDateString()}</>
              )}
            </p>
          </div>
        </div>
        {!showRenewalForm && (
          <button
            onClick={openRenewalForm}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            🔄 Renew Policy
          </button>
        )}
      </div>

      {showRenewalForm && (
        <div className="border-t border-border pt-4 mt-4 space-y-4">
          <h4 className="font-medium">Renewal Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={formData.policyStartDate}
                onChange={(e) => setFormData({ ...formData, policyStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input
                type="date"
                value={formData.policyEndDate}
                onChange={(e) => setFormData({ ...formData, policyEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Premium Adjustment (%)
              <span className="text-muted-foreground font-normal ml-2">
                Current: {currency} {grossPremium.toLocaleString()}
              </span>
            </label>
            <input
              type="number"
              value={formData.adjustmentPercent}
              onChange={(e) => setFormData({ ...formData, adjustmentPercent: parseFloat(e.target.value) || 0 })}
              step="0.01"
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              placeholder="0 = keep same premium"
            />
            {formData.adjustmentPercent !== 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                New Premium: {currency} {(grossPremium * (1 + formData.adjustmentPercent / 100)).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRenew}
              disabled={loading || !formData.policyStartDate || !formData.policyEndDate}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating Renewal..." : "✓ Create Renewal"}
            </button>
            <button
              onClick={() => setShowRenewalForm(false)}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
