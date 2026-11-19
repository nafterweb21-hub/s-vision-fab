import CocForm from "./CocForm";

export default async function CertificateOfConformityFormPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <CocForm key={id ?? "new"} id={id ?? null} />;
}
