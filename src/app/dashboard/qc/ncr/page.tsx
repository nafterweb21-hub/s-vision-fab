import { getNcrList } from "./actions";
import NcrList from "./components/NcrList";

export default async function NcrListPage() {
  const ncrs = await getNcrList();
  // Dates don't cross the server/client boundary as-is.
  return <NcrList ncrs={JSON.parse(JSON.stringify(ncrs))} />;
}
