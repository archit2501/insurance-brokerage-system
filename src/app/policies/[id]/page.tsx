import Link from "next/link";

interface PolicyDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getPolicy(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/policies/${id}?id=${id}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const { id } = await params;
  const policy = await getPolicy(id);

  if (!policy) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Policy</h1>
          <Link href="/policies" className="text-sm text-muted-foreground hover:underline">Back to policies</Link>
        </div>
        <div className="rounded-md border border-border p-4 text-sm text-destructive">Unable to load policy.</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Policy #{policy.policyNumber}</h1>
        <Link href="/policies" className="text-sm text-muted-foreground hover:underline">Back to policies</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-md border border-border p-4">
          <h2 className="text-sm font-medium mb-3">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Client</div>
              <div>{policy.client?.companyName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Insurer</div>
              <div>{policy.insurer?.companyName || policy.insurer?.shortName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">LOB</div>
              <div>{policy.lob?.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sub-LOB</div>
              <div>{policy.subLob?.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Sum Insured</div>
              <div>{Number(policy.sumInsured).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Gross Premium</div>
              <div>{Number(policy.grossPremium).toLocaleString()} {policy.currency}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Period</div>
              <div>{new Date(policy.policyStartDate).toLocaleDateString()} — {new Date(policy.policyEndDate).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border p-4">
          <h2 className="text-sm font-medium mb-3">Create CN/DN</h2>
          <NoteCreateCard
            policyId={Number(id)}
            clientId={policy.client?.id}
            insurerId={policy.insurer?.id}
            defaultGross={policy.grossPremium}
          />
        </div>
      </div>
    </div>
  );
}

// Client component is imported dynamically below to keep this page as a server component
import NoteCreateCard from "./NoteCreateCard";