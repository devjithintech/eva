# BFF data

`data.json` is the candidate-intelligence dataset the web app reads through the
BFF (`/api/*`): `{ count, candidates: { "<Fund Name>": { …record… } } }`. Edit it
and refresh the browser — the server reads it fresh on every request (no restart
needed in dev).

**API docs:** interactive Swagger UI at **`/api/docs`** (spec JSON at
`/api/openapi.json`) — e.g. http://localhost:8787/api/docs.

Paths + descriptions mirror the Renderer API catalog, grouped section-wise in
Swagger (Core · Candidates · Peer data · Pipelines & runs · Renderers). All are
under the `/api` base.

| Group | Endpoint |
| --- | --- |
| Core | `GET /` · `GET /healthz` · `GET /openapi.json` · `GET /audit_log` |
| Candidates | `GET /candidates` · `GET /candidates/{id}` (backed by `data.json`) |
| Peer data | `GET /peer_groups` · `GET /peer_names?q=` · `GET/POST /peer_sets` |
| Pipelines & runs | `POST /pipelines/candidate_flow/run` · `GET /runs/{id}` |
| Renderers | `GET /renderers` · `GET /renderers/{label}` · `GET /renderers/D1-1 … D1-18` |

Only `/candidates*` are backed by `data.json` today; the rest are structural
stubs (in-memory peer sets, stubbed runs/audit). Renderer labels + descriptions
live in `src/bff/renderers.ts`; the spec is generated in `src/bff/openapi.ts`.

Response shapes are typed in `src/bff/types.ts`; the OpenAPI spec is
hand-authored in `src/bff/openapi.ts` — update it when you change a route.
