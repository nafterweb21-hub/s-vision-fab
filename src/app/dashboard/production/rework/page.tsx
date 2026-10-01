import { getActiveReworks } from "./actions";
import ReworkClient from "./rework-client";

export const dynamic = "force-dynamic";

export default async function ReworkQueuePage() {
  const reworks = await getActiveReworks();

  return (
    <div className="w-full h-full p-2 sm:p-4 md:p-6 lg:p-8 bg-slate-50/50">
      <ReworkClient initialReworks={reworks} />
    </div>
  );
}
