import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default function TerminalHistoryPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/terminal"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-600 mb-4"
      >
        <ArrowLeft size={14} /> Back to terminal
      </Link>
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading history…</div>}>
        <HistoryClient />
      </Suspense>
    </div>
  );
}
