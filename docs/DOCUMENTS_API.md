# DocuHub — Documents Ingest API

Programmatic create/manage of Confluence-style **documents** (the human doc system — distinct
from the Magento module docs in `IMPORT_API.md`). Built for automated processes: e.g. a
PDF→document skill, or a session that drafts Exception-Report runbooks and pushes them into a
space. You send **markdown**; DocuHub converts it to the Tiptap JSON the editor renders.

- **Base URL (local dev):** `http://localhost:3001`
- **Auth:** same shared bearer token as the module ingest API.

---

## Authentication

```
Authorization: Bearer <INGEST_TOKEN>
```

Single static secret in DocuHub's `.env` (`INGEST_TOKEN`). Match → allowed; missing/wrong → `401`;
server has no token set → `500`. Only the `/api/documents/ingest*` paths are token-exempt from the
session middleware — the rest of `/api/documents` stays session-only for the UI.

> A newly changed env var needs a dev-server **restart** to take effect.

---

## Resolution defaults (org / space / author)

- **Org** — from `INGEST_ORG_SLUG` (default `aztec-coders`), else the sole org.
- **Space** — precedence: `space` field in the payload → `?space=<slug>` query → `INGEST_SPACE_SLUG`
  (default `littlepassports`). A document **must** resolve to a space, or you get `422`.
- **Author** — `authorEmail` in the payload (must be a user in the org) → else the org **OWNER** →
  else any member. Documents require an author.

---

## Endpoints

| Method & path | Purpose |
|---|---|
| `POST /api/documents/ingest` | Create or upsert one document |
| `POST /api/documents/ingest/bulk` | Create/upsert an array of documents |
| `GET  /api/documents/ingest?space=&slug=&q=&content=1` | Read one (with `slug`) or list a space's docs |
| `DELETE /api/documents/ingest?space=&slug=` | Delete one document |

---

## 1. Create / upsert — `POST /api/documents/ingest`

```bash
curl -X POST "http://localhost:3001/api/documents/ingest" \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Exception: Null customer_region",
    "slug": "exc-null-customer-region",
    "space": "littlepassports",
    "status": "PUBLISHED",
    "markdown": "# Databricks Exception\n\nWhen **customer_region** is null the rollup fails.\n\n## How to rectify\n1. Open the job\n2. Re-run the [backfill](https://example.com)\n\n```sql\nUPDATE bronze.orders SET region='"'"'UNKNOWN'"'"' WHERE region IS NULL;\n```",
    "tags": ["Exception Report", "Databricks"],
    "authorEmail": "nico@azteccoders.com"
  }'
```

### Payload fields

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | Document title. |
| `markdown` | — | Body as markdown → converted to Tiptap JSON. Supports headings, **bold**/*italic*/`code`/~~strike~~, links, bullet/ordered lists, blockquotes, fenced code blocks, `---` rules, images. (Tables have no editor node → preserved as a code block.) |
| `content` | — | **OR** raw Tiptap JSON (object or string) if you'd rather build it yourself. Takes precedence over `markdown`. |
| `slug` | — | **Stable idempotency key.** If given and it already exists in the space → **update**; otherwise create. Omit to always create a new doc (auto-slugged from title, deduped). |
| `space` | — | Space slug override (see Resolution defaults). |
| `status` | — | `DRAFT` \| `PUBLISHED` \| `ARCHIVED` (default `DRAFT`). |
| `excerpt` | — | Short summary; auto-derived from the first paragraph if omitted. |
| `parentSlug` | — | Nest under an existing document in the same space (its slug). `404` if not found. |
| `authorEmail` | — | Attribute authorship; falls back to org owner. |
| `tags` | — | Array of tag names; created in the org if missing and connected. Replaces the doc's tags on update. |

**Responses:** `201 { status:"created", id, slug, url, title }` · `200 { status:"updated", … }` ·
`404` (bad `parentSlug`) · `422` (invalid body / no space / no author) · `401` (bad token).

`url` is the in-app path, e.g. `/spaces/littlepassports/exc-null-customer-region`.

---

## 2. Bulk — `POST /api/documents/ingest/bulk`

Accepts a raw array **or** `{ "items": [ ... ] }`. Same per-item upsert. Returns:

```jsonc
{ "total": 2, "counts": { "created": 2 },
  "results": [ { "status":"created", "title":"…", "slug":"bulk-a", "id":"…" }, … ] }
```

---

## 3. Read / list — `GET /api/documents/ingest`

```bash
# list a space's documents
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  "http://localhost:3001/api/documents/ingest?space=littlepassports"

# read one (add content=1 for the stored Tiptap JSON)
curl -H "Authorization: Bearer $INGEST_TOKEN" \
  "http://localhost:3001/api/documents/ingest?space=littlepassports&slug=exc-null-customer-region&content=1"
```

- `?slug=` → the single document `{ id, title, slug, status, excerpt, parentId, author, documentTags, url, [content] }`.
- otherwise → `{ count, documents:[{ id, title, slug, status, excerpt, parentId, updatedAt }] }` (add `?q=` to filter by title).

---

## 4. Delete — `DELETE /api/documents/ingest?space=&slug=`

```bash
curl -X DELETE -H "Authorization: Bearer $INGEST_TOKEN" \
  "http://localhost:3001/api/documents/ingest?space=littlepassports&slug=exc-null-customer-region"
```

Cascades comments/reactions/favorites/tags. Children's `parentId` is set null (not deleted).

---

## Idempotency & re-runs

Give each document a **stable `slug`** and re-running your process is a safe upsert — it updates
title/content/excerpt/status/parent/tags in place and leaves comments, reactions, and favorites
intact. Omit `slug` only when you truly want a fresh doc each run.

## Quick smoke test

```bash
export INGEST_TOKEN=$(grep '^INGEST_TOKEN' .env | sed 's/INGEST_TOKEN=//; s/"//g')
BASE=http://localhost:3001

curl -s -X POST "$BASE/api/documents/ingest" \
  -H "Authorization: Bearer $INGEST_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Test Doc","slug":"test-doc","space":"littlepassports","status":"PUBLISHED","markdown":"# Hello\n\nA **first** doc."}'

curl -s -H "Authorization: Bearer $INGEST_TOKEN" "$BASE/api/documents/ingest?space=littlepassports"
# then open http://localhost:3001/spaces/littlepassports/test-doc in the UI to see it render
curl -s -X DELETE -H "Authorization: Bearer $INGEST_TOKEN" "$BASE/api/documents/ingest?space=littlepassports&slug=test-doc"
```
