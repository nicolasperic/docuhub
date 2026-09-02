# DocuHub — Module Docs Import API

Reference for the Magento/Adobe Commerce doc generator (and anyone testing it) to push
per-module documentation into DocuHub. Generated content and human content live in
separate fields with two independent guards, so a nightly re-scan never clobbers a
hand-written runbook.

- **Base URL (local dev):** `http://localhost:3001`
- **Full contract (generator side):** `tools/magento-doc-generator/API_CONTRACT.md`

---

## Authentication

There is **one static shared secret** — no per-request token generation, nothing to sign.
The generator sends it as a bearer header; the server just compares strings.

```
Authorization: Bearer <INGEST_TOKEN>
```

- The value lives in DocuHub's `.env` as `INGEST_TOKEN`. Whatever string is there **is** the
  valid token. Both sides must hold the identical value.
- Match → allowed · mismatch/missing → `401` · server has no `INGEST_TOKEN` set → `500`.
- **Rotating it** (optional): generate a new value, put it in `.env`, restart the dev server,
  and give the generator the same string:
  ```bash
  openssl rand -hex 24
  # or: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  ```

> A newly added/changed env var only takes effect after a **dev-server restart** —
> `next dev` won't inject it into an already-running process.

The read endpoints (`GET`) accept **either** the bearer token **or** a logged-in browser
session, so the generator can read back with the same token the UI uses interactively.

---

## Targeting a Space

Imported modules can be filed under a DocuHub Space. Resolution precedence, highest first:

1. `"space": "<slug>"` field in the payload — per module
2. `?space=<slug>` query param — per request (applies to all items in a bulk call)
3. `INGEST_SPACE_SLUG` env default

The space slug is resolved within the ingest org (`INGEST_ORG_SLUG`, default `aztec-coders`).
If no slug resolves to a real space, the module is still imported — just space-agnostic
(browsable via the vendor tree, not filed under a space).

> Current default: `INGEST_SPACE_SLUG=littlepassports`, so every import lands in the
> **littlepassports** space automatically unless overridden.

---

## Endpoints

| Method & path | Purpose |
|---|---|
| `POST /api/docs/ingest` | Upsert one module's generated doc + wiring |
| `POST /api/docs/ingest/bulk` | Upsert an array of modules (full-repo run) |
| `GET  /api/docs/:moduleName` | Read the full page model (`?render=html` for stitched HTML) |
| `PUT  /api/docs/:moduleName/manual` | Save the human Team Notes section |
| `GET  /api/docs?q=&kind=&space=&component=&depends_on=&plugs=&observes=` | Search + structured filters |
| `GET  /api/docs/components?space=` | Capability facets: `{ facets:[{type,count}], modules:{name:[types]} }` |
| `GET  /api/graph/:moduleName` | Wiring neighbors (plugsInto / observedEvents / dependsOn / dependedOnBy) |
| `GET  /api/docs/tree?space=` | Vendor-grouped navigable tree (+ Runbooks / Concepts) |

---

## 1. Ingest one module — `POST /api/docs/ingest`

Touches only the **generated** + `doc`/`edges` fields; **never** the human `manual` content.

```bash
curl -X POST "http://localhost:3001/api/docs/ingest" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleName": "LittlePassports_AutoCustomerRegistration",
    "dirName": "module-auto-customer-registration",
    "title": "Auto Customer Registration",
    "kind": "module",
    "markdown": "<!-- doc:generated -->\n# Auto Customer Registration\n...",
    "generatedHash": "04ae4002380c",
    "generatedAt": "2026-08-31T18:20:00Z",
    "doc":   { "classes": [], "wiring": {}, "stats": {} },
    "edges": [ { "kind": "plugin", "from": "SomePlugin", "to": "Magento\\Sales\\Api\\OrderManagementInterface" } ]
  }'
```

### Payload fields

| Field | Required | Notes |
|---|---|---|
| `moduleName` | ✅ | Stable upsert key, e.g. `Vendor_Module`. Vendor prefix drives the tree grouping. |
| `title` | ✅ | Human title. |
| `markdown` | ✅ | Generated markdown block. |
| `generatedAt` | ✅ | ISO-8601 timestamp. Drives the staleness guard. |
| `dirName` | — | e.g. `module-auto-customer-registration`. Used as a module ref in `depends` edges. |
| `kind` | — | `module` \| `runbook` \| `concept` (default `module`). |
| `generatedHash` | — | sha1 of the inner block, from the generator. |
| `doc` | — | Any JSON (classes, wiring, stats) — stored verbatim. |
| `edges` | — | Array of `{ kind, from, to }`. Normalized for search/graph; also stored verbatim. |
| `components` | — | Array of `{ type, name, target?, meta? }` — what the module declares (observers, cron, webapi…). Powers the capability facets. See below. |
| `labels` | — | Array of structure labels — `"Checkout"` strings or `{ name, color? }` objects. What the module is *about* / *coupled to* (Domain / Integration / Status). See below. |
| `space` | — | Space slug override (see Targeting a Space). |

### Components (capability facets)

Emit one entry per capability the module declares while scanning `etc/*.xml`, `etc/cron_groups.xml`,
`webapi.xml`, `schema.graphqls`, `etc/db_schema.xml`, etc. These drive the "Declares" facet filters
(click **Observers** → every module that declares one) and the module page's "What's inside" panel.

```jsonc
"components": [
  { "type": "observer",  "name": "sales_order_place_after", "target": "Vendor\\Mod\\Observer\\Foo", "meta": { "area": "global" } },
  { "type": "plugin",    "name": "aroundSave", "target": "Magento\\Catalog\\...\\ProductRepository", "meta": { "sortOrder": 10, "class": "Vendor\\Mod\\Plugin\\Bar" } },
  { "type": "cron",      "name": "vendor_mod_cleanup", "meta": { "schedule": "0 3 * * *", "instance": "Vendor\\Mod\\Cron\\Cleanup" } },
  { "type": "webapi",    "name": "GET /V1/vendor/thing/:id", "meta": { "method": "GET", "service": "Vendor\\Mod\\Api\\ThingInterface", "acl": ["Vendor_Mod::thing"] } },
  { "type": "graphql",   "name": "Query.vendorThing", "meta": { "kind": "query", "resolver": "Vendor\\Mod\\Resolver\\Thing" } },
  { "type": "db_schema", "name": "vendor_thing", "meta": { "operation": "create", "columns": ["id", "name"] } }
]
```

- **`type`** — open-ended string; DocuHub needs no change to accept a new type. Known types get a nice
  label (`plugin`→Plugins, `observer`→Observers, `cron`→Cron Jobs, `webapi`→Web API, `graphql`→GraphQL,
  `db_schema`→DB Schema, `cli`→CLI Commands, `preference`→DI Preferences); unknown types are title-cased.
- **`name`** — the human handle shown in the UI (event name, cron code, `GET /V1/…/:id`, `Query.foo`, table name).
- **`target`** *(optional)* — the wired class/service (observer class, plugin subject, resolver…).
- **`meta`** *(optional)* — any type-specific JSON (schedule, http method, acl, columns…).
- **Bootstrap:** if you omit `components` but send plugin/observer `edges`, DocuHub synthesizes those two
  component types from the edges — so those facets work even before the generator emits `components`.
- On ingest, a module's components are **fully replaced** (same as `edges`).

Facets are read back at `GET /api/docs/components?space=<slug>` → `{ facets:[{type,count}], modules:{ moduleName:[types] } }`,
and you can filter the search with `GET /api/docs?component=<type>`.

### Structure labels

Where **components** describe what a module *does* (its verbs), **labels** describe what it's *about*
and what it's *coupled to* (its nouns) — the cohesion/coupling lens. Emit the labels the module belongs to:

```jsonc
"labels": [
  "Checkout",                                  // plain string — name only
  { "name": "Customer", "color": "#2563eb" },  // or object with a color
  { "name": "Stripe",   "color": "#16a34a" }   // color drives the UI group accent
]
```

Suggested three families (flat, multi-value — a module can carry several):
- **Domain** (cohesion) — what it's about: `Checkout`, `Customer`, `Subscription`, `Stripe`, `Payments`,
  `Refunds`, `Gifts`, `Orders`, `Catalog & Products`, `Promotions & Coupons`, `Fulfillment`, `Shipping`,
  `Inventory`, `Notifications`, `School / B2B`, `Tax`, `Analytics & Marketing`, `Platform / Infra`. Aim for 1–2.
- **Integration** (coupling) — external systems it wires to: `Stripe`, `Payment Service`, `Braintree`,
  `User Services`, `Subscription Mgmt Service`, `Platform Services`, `Deposco`, `Fosdick`, `NetSuite`,
  `Vertex`, `Looker/GCS`, `SmartyStreets`, `Google Drive`, `Braze`, `GA4`, `MetaRouter`, … (0+ as apply).
- **Status** — lifecycle: `Legacy`, `Stub/Placeholder`.

Encode the family in `color` so the UI groups visually (there is no separate family field). Recommended:
Domain `#2563eb` (blue) · Integration `#16a34a` (green) · Status `#a1a1aa` (grey).

- **`name`** — the label text; unique per org. A new name creates a `ModuleLabel`; an existing one reuses it.
- **`color`** *(optional)* — hex; updates the label's accent on every ingest that sends it.
- On ingest, a module's label **assignments are fully replaced** (same as `components`/`edges`).

Read back via `GET /api/docs/:moduleName` (label assignments on the page) and filter search by label
name. Labels are stored as `ModuleLabel` + `ModuleLabelAssignment` (org-scoped, unique by name).

### Timestamp guard

```
no existing module        → 201 { status: "created" }
generatedAt <= stored     → 409 { status: "stale", storedAt, incomingAt }   (unless ?force=true)
otherwise                 → 200 { status: "updated", version }              (manual left untouched)
```

`?force=true` overrides the staleness check (manual re-index).

**Responses:** `201` · `200` · `409 stale` · `422` invalid body · `401` bad/missing token.

---

## 2. Bulk ingest — `POST /api/docs/ingest/bulk`

For a full-repo scan. Accepts a raw array **or** `{ "items": [ ... ] }`.

```bash
curl -X POST "http://localhost:3001/api/docs/ingest/bulk?space=littlepassports" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[
    { "moduleName": "LittlePassports_AutoCustomerRegistration", "title": "Auto Customer Registration", "markdown": "# ...", "generatedAt": "2026-08-31T18:20:00Z" },
    { "moduleName": "LittlePassports_Subscription",            "title": "Subscription",             "markdown": "# ...", "generatedAt": "2026-08-31T18:20:00Z" }
  ]'
```

Same per-item timestamp guard. Returns:

```jsonc
{
  "total": 2,
  "counts": { "created": 2 },
  "results": [
    { "moduleName": "LittlePassports_AutoCustomerRegistration", "status": "created" },
    { "moduleName": "LittlePassports_Subscription", "status": "created" }
  ]
}
```

---

## 3. Read a module — `GET /api/docs/:moduleName`

```bash
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  http://localhost:3001/api/docs/LittlePassports_AutoCustomerRegistration
```

Returns the full page model:

```jsonc
{
  "moduleName": "...", "dirName": "...", "title": "...", "kind": "MODULE",
  "vendor": "LittlePassports", "spaceId": "...",
  "generated": { "markdown": "...", "hash": "...", "generatedAt": "..." },
  "manual":    { "markdown": null, "version": 0, "humanUpdatedAt": null, "updatedBy": null },
  "doc": { ... }, "edges": [ ... ],
  "contentUpdatedAt": "..."
}
```

`?render=html` returns pre-rendered HTML (generated block first, then manual, stitched).

---

## 4. Save human Team Notes — `PUT /api/docs/:moduleName/manual`

Optimistic-lock guard so two editors can't silently overwrite each other.

```bash
curl -X PUT "http://localhost:3001/api/docs/LittlePassports_AutoCustomerRegistration/manual" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "markdown": "## Team Notes\n- watch out for guest carts", "baseVersion": 0, "updatedBy": "nico@azteccoders.com" }'
```

```
baseVersion == stored.version → 200 { status: "saved", version }              (version++, humanUpdatedAt=now)
baseVersion != stored.version → 409 { status: "conflict", currentVersion, currentMarkdown }
```

`updatedBy` falls back to the logged-in session email when saved from the UI.

---

## 5. Search / list — `GET /api/docs`

Query params (all optional, combinable):

| Param | Matches |
|---|---|
| `q` | case-insensitive contains over title / moduleName / generated / manual markdown |
| `kind` | `module` \| `runbook` \| `concept` |
| `space` | space slug |
| `depends_on` | modules whose `depends` edges point at this value (e.g. a `dirName`) |
| `plugs` | modules that plugin the given class (e.g. `Magento\Sales\Api\OrderManagementInterface`) |
| `observes` | modules observing the given event (e.g. `sales_order_place_before`) |

```bash
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  "http://localhost:3001/api/docs?space=littlepassports&q=customer"
```

Returns `{ count, hits: [ { moduleName, title, kind, vendor, snippet } ] }`.

---

## 6. Wiring graph — `GET /api/graph/:moduleName`

```bash
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  http://localhost:3001/api/graph/LittlePassports_AutoCustomerRegistration
```

```jsonc
{
  "moduleName": "...",
  "plugsInto":     [ { "target": "...OrderManagementInterface", "via": "SomePlugin" } ],
  "observedEvents": [ "sales_order_place_before" ],
  "dependsOn":      [ "module-payment-service" ],
  "dependedOnBy":   [ { "moduleName": "...", "dirName": "...", "title": "..." } ]  // reverse edges, computed across all modules
}
```

Edge `kind` synonyms accepted: depends (`depends`/`dependency`/`dependsOn`),
plugin (`plugin`/`plugs`), observer (`observer`/`observes`/`event`).

---

## 7. Navigable tree — `GET /api/docs/tree`

```bash
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  "http://localhost:3001/api/docs/tree?space=littlepassports"
```

Groups modules by vendor prefix, with Runbooks and Concepts as their own top-level groups:

```jsonc
{
  "groups": [
    { "key": "LittlePassports", "label": "LittlePassports", "kind": "MODULE",
      "items": [ { "moduleName": "...", "title": "...", "dirName": "..." } ] },
    { "key": "__runbooks", "label": "Runbooks", "kind": "RUNBOOK", "items": [ ... ] },
    { "key": "__concepts", "label": "Concepts", "kind": "CONCEPT", "items": [ ... ] }
  ]
}
```

`?space=<slug>` scopes the tree to a single space (e.g. a space's module browser).

---

## Quick smoke test

```bash
export INGEST_TOKEN=$(grep '^INGEST_TOKEN' .env | sed 's/INGEST_TOKEN=//; s/"//g')
BASE=http://localhost:3001

# 1. import a module (lands in littlepassports via INGEST_SPACE_SLUG default)
curl -s -X POST "$BASE/api/docs/ingest" \
  -H "Authorization: Bearer $INGEST_TOKEN" -H "Content-Type: application/json" \
  -d '{"moduleName":"LittlePassports_AutoCustomerRegistration","dirName":"module-auto-customer-registration","title":"Auto Customer Registration","kind":"module","markdown":"# Auto Customer Registration","generatedAt":"2026-08-31T18:20:00Z"}'

# 2. read it back
curl -s -H "Authorization: Bearer $INGEST_TOKEN" \
  "$BASE/api/docs/LittlePassports_AutoCustomerRegistration"

# 3. see it in the space tree
curl -s -H "Authorization: Bearer $INGEST_TOKEN" \
  "$BASE/api/docs/tree?space=littlepassports"
```

Expected: `201 created` → full page model with `spaceId` set → tree listing the module
under the `LittlePassports` vendor group.
