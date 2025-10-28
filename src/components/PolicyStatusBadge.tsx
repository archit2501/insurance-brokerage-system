"use client";

interface PolicyStatusBadgeProps {
  status: string;
  policyEndDate: string;
  autoExpired?: boolean;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PolicyStatusBadge({
  status,
  policyEndDate,
  autoExpired = false,
  className = "",
  showIcon = true,
  size = "md",
}: PolicyStatusBadgeProps) {
  // Calculate days until/since expiry
  const today = new Date();
  const endDate = new Date(policyEndDate);
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Determine display status and styling
  let displayStatus = status || "unknown";
  let bgColor = "bg-gray-100";
  let textColor = "text-gray-800";
  let borderColor = "border-gray-200";
  let icon = "❓";

  // Status-based styling
  if (status === "expired" || status === "cancelled") {
    bgColor = "bg-red-100";
    textColor = "text-red-800";
    borderColor = "border-red-200";
    icon = "⛔";
    displayStatus = status;
  } else if (status === "active") {
    // Check if expiring soon
    if (daysUntilExpiry <= 0) {
      // Should be expired but status not updated yet
      bgColor = "bg-red-100";
      textColor = "text-red-800";
      borderColor = "border-red-200";
      icon = "⚠️";
      displayStatus = "Needs Update";
    } else if (daysUntilExpiry <= 7) {
      // Critical - expires within 7 days
      bgColor = "bg-red-50";
      textColor = "text-red-700";
      borderColor = "border-red-200";
      icon = "🔥";
      displayStatus = "Expiring Soon";
    } else if (daysUntilExpiry <= 30) {
      // High priority - expires within 30 days
      bgColor = "bg-amber-50";
      textColor = "text-amber-700";
      borderColor = "border-amber-200";
      icon = "⚡";
      displayStatus = "Active";
    } else {
      // Normal active
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      borderColor = "border-green-200";
      icon = "✓";
      displayStatus = "Active";
    }
  } else if (status === "pending") {
    bgColor = "bg-blue-100";
    textColor = "text-blue-800";
    borderColor = "border-blue-200";
    icon = "⏳";
    displayStatus = "Pending";
  } else if (status === "draft") {
    bgColor = "bg-gray-100";
    textColor = "text-gray-700";
    borderColor = "border-gray-200";
    icon = "📝";
    displayStatus = "Draft";
  }

  // Size variants
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${bgColor} ${textColor} ${borderColor} ${sizeClasses[size]} ${className}`}
      title={autoExpired ? "Auto-expired by system" : undefined}
    >
      {showIcon && <span className="leading-none">{icon}</span>}
      <span className="capitalize">{displayStatus}</span>
      {autoExpired && status === "expired" && (
        <span className="text-xs opacity-70" title="Auto-expired by system">
          (Auto)
        </span>
      )}
    </span>
  );
}

// Status filter buttons component
interface StatusFilterProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
  counts?: {
    all: number;
    active: number;
    expired: number;
    expiringSoon: number;
    pending: number;
  };
}

export function StatusFilter({ currentFilter, onFilterChange, counts }: StatusFilterProps) {
  const filters = [
    { value: "all", label: "All", count: counts?.all },
    { value: "active", label: "Active", count: counts?.active, color: "text-green-600" },
    { value: "expiring-soon", label: "Expiring Soon", count: counts?.expiringSoon, color: "text-amber-600" },
    { value: "expired", label: "Expired", count: counts?.expired, color: "text-red-600" },
    { value: "pending", label: "Pending", count: counts?.pending, color: "text-blue-600" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
            currentFilter === filter.value
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-accent"
          }`}
        >
          {filter.label}
          {filter.count !== undefined && (
            <span className={`ml-1.5 ${currentFilter === filter.value ? "opacity-90" : "opacity-60"}`}>
              ({filter.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Compact status indicator for tables
export function PolicyStatusDot({ status, policyEndDate }: { status: string; policyEndDate: string }) {
  const today = new Date();
  const endDate = new Date(policyEndDate);
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let color = "bg-gray-400";
  let tooltip = status;

  if (status === "expired" || status === "cancelled") {
    color = "bg-red-500";
    tooltip = status === "expired" ? "Expired" : "Cancelled";
  } else if (status === "active") {
    if (daysUntilExpiry <= 0) {
      color = "bg-red-500";
      tooltip = "Needs Update";
    } else if (daysUntilExpiry <= 7) {
      color = "bg-red-400";
      tooltip = `Critical: ${daysUntilExpiry} days left`;
    } else if (daysUntilExpiry <= 30) {
      color = "bg-amber-400";
      tooltip = `Active: ${daysUntilExpiry} days left`;
    } else {
      color = "bg-green-500";
      tooltip = `Active: ${daysUntilExpiry} days left`;
    }
  } else if (status === "pending") {
    color = "bg-blue-400";
    tooltip = "Pending";
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={tooltip} />
      <span className="text-xs text-muted-foreground capitalize">{status || "N/A"}</span>
    </div>
  );
}
