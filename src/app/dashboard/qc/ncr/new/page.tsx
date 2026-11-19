import NcrForm from "../components/NcrForm";
import { getNcrFormData } from "../actions";

export default async function NewNcrPage() {
  const formData = await getNcrFormData();
  return <NcrForm formData={formData} />;
}
