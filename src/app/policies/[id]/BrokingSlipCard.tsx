"use client";

import { useState, useEffect } from "react";

interface BrokingSlipCardProps {
  policyId: number;
  policy: any;
}

export default function BrokingSlipCard({ policyId, policy }: BrokingSlipCardProps) {
  const [slipData, setSlipData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [responding, setResponding] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  } as HeadersInit;

  // Load broking slip data
  const loadSlipData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/policies/${policyId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSlipData(data);
      }
    } catch (error) {
      console.error("Failed to load slip data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSlipData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  // Generate slip number
  const generateSlip = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/generate-slip`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const result = await res.json();
        // Reload policy data to get updated slip information
        await loadSlipData();
        alert(`Broking slip generated: ${result.data.slipNumber}`);
      } else {
        const error = await res.json();
        alert(`Failed to generate slip: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to generate broking slip");
    } finally {
      setGenerating(false);
    }
  };

  // Submit slip to insurer
  const submitSlip = async () => {
    if (!slipData?.slipNumber) {
      alert("Please generate a slip first");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/submit-slip`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          slipNumber: slipData.slipNumber,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlipData(data);
        alert("Broking slip submitted to insurer");
      } else {
        const error = await res.json();
        alert(`Failed to submit slip: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to submit broking slip");
    } finally {
      setSubmitting(false);
    }
  };

  // Record insurer response
  const recordResponse = async (response: "Bound" | "Declined", notes?: string) => {
    if (!slipData?.slipNumber) {
      alert("No slip to respond to");
      return;
    }

    setResponding(true);
    try {
      const res = await fetch(`/api/policies/${policyId}/slip-response`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          slipNumber: slipData.slipNumber,
          response,
          responseNotes: notes,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSlipData(data);
        alert(`Response recorded: ${response}`);
      } else {
        const error = await res.json();
        alert(`Failed to record response: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to record response");
    } finally {
      setResponding(false);
    }
  };

  // Download/View PDF
  const viewPDF = () => {
    if (!slipData?.slipNumber) {
      alert("Please generate a slip first");
      return;
    }
    window.open(`/api/policies/${policyId}/broking-slip`, "_blank");
  };

  // Email slip
  const emailSlip = async () => {
    if (!slipData?.slipNumber) {
      alert("Please generate a slip first");
      return;
    }

    try {
      const res = await fetch("/api/dispatch/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "broking-slip",
          policyId: policyId,
          slipNumber: slipData.slipNumber,
        }),
      });
      if (res.ok) {
        alert("Broking slip emailed successfully");
      } else {
        const error = await res.json();
        alert(`Failed to email slip: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      alert("Failed to email broking slip");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  const hasSlip = !!slipData?.slipNumber;
  const slipStatus = slipData?.slipStatus || "Draft";
  const slipResponse = slipData?.slipResponse;

  return (
    <div className="space-y-3">
      {/* Status Display */}
      {hasSlip && (
        <div className="space-y-2 p-3 bg-secondary/30 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Slip Number:</span>
            <span className="font-mono font-medium">{slipData.slipNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              slipStatus === "Bound" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
              slipStatus === "Declined" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
              slipStatus === "Submitted" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}>
              {slipStatus}
            </span>
          </div>
          {slipResponse && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Insurer Response:</div>
              <div className="text-xs font-medium">{slipResponse}</div>
            </div>
          )}
          {slipData.slipSubmittedAt && (
            <div className="text-xs text-muted-foreground">
              Submitted: {new Date(slipData.slipSubmittedAt).toLocaleDateString()}
            </div>
          )}
          {slipData.slipRespondedAt && (
            <div className="text-xs text-muted-foreground">
              Responded: {new Date(slipData.slipRespondedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!hasSlip && (
          <button
            onClick={generateSlip}
            disabled={generating}
            className="w-full text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
          >
            {generating ? "Generating..." : "📋 Generate Broking Slip"}
          </button>
        )}

        {hasSlip && slipStatus === "Draft" && (
          <>
            <button
              onClick={viewPDF}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              📄 View PDF
            </button>
            <button
              onClick={submitSlip}
              disabled={submitting}
              className="w-full text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
            >
              {submitting ? "Submitting..." : "✉️ Submit to Insurer"}
            </button>
          </>
        )}

        {hasSlip && slipStatus === "Submitted" && (
          <>
            <button
              onClick={viewPDF}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              📄 View PDF
            </button>
            <button
              onClick={emailSlip}
              className="w-full text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              ✉️ Email Slip
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => recordResponse("Bound")}
                disabled={responding}
                className="text-sm px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                ✅ Bound
              </button>
              <button
                onClick={() => recordResponse("Declined")}
                disabled={responding}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                ❌ Declined
              </button>
            </div>
          </>
        )}

        {hasSlip && (slipStatus === "Bound" || slipStatus === "Declined") && (
          <button
            onClick={viewPDF}
            className="w-full text-sm px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            📄 View Final Slip
          </button>
        )}
      </div>

      {/* Info Text */}
      {!hasSlip && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Generate a broking slip to send to the insurer for approval
        </p>
      )}
    </div>
  );
}
