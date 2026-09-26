import History from "./History.jsx";

// Tasks and History show the same underlying list for this prototype;
// History is kept as a distinct route per the spec's navigation structure.
export default function TaskList() {
  return <History />;
}
