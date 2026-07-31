import { useEffect, useState } from "react";
import { TopBar } from "./components/layout/TopBar";
import { ChatDrawer } from "./components/layout/ChatDrawer";
import { CandidatesPage } from "./pages/CandidatesPage";
import { CandidateDetailPage } from "./pages/CandidateDetailPage";
import { PeerFitPage } from "./pages/PeerFitPage";

type Route =
  | { name: "candidates" }
  | { name: "detail"; id: string }
  | { name: "peer-fit"; id: string };

/** Small hash router — no react-router dependency, mirroring the minimal
 *  routing style already used elsewhere in this monorepo. Routes:
 *  `#/` (dashboard), `#/candidates/:id`, `#/candidates/:id/peer-fit`. */
function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "candidates" && parts[1]) {
    if (parts[2] === "peer-fit") return { name: "peer-fit", id: parts[1] };
    return { name: "detail", id: parts[1] };
  }
  return { name: "candidates" };
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function App() {
  const route = useHashRoute();
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <>
      <TopBar chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} />
      <div id="pageWrap">
        {route.name === "candidates" && <CandidatesPage />}
        {route.name === "detail" && <CandidateDetailPage id={route.id} />}
        {route.name === "peer-fit" && <PeerFitPage id={route.id} />}
      </div>
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
