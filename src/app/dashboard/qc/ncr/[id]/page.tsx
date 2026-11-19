import NcrForm from "../components/NcrForm";
import { getNcrFormData, getNcr } from "../actions";
import { notFound } from "next/navigation";

export default async function EditNcrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [formData, ncr] = await Promise.all([getNcrFormData(), getNcr(id)]);
  if (!ncr) notFound();

  // Dates and Decimals don't cross the server/client boundary as-is.
  return <NcrForm formData={formData} initialData={JSON.parse(JSON.stringify(ncr))} />;
}
