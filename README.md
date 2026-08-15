# Keystone — Location-Based Inventory Reservation

Web track assignment. Backend-first inventory reservation service.

**Live API:** `https://keystone-jh8u.onrender.com`  
**Live UI:** `https://keystone-sigma-blue.vercel.app`

## Deployment

- **Backend API** is hosted on [Render](https://render.com) (Docker + Postgres).
- **Frontend UI** is hosted on [Vercel](https://vercel.com).

> **Cold start note:** The API runs on Render's free tier. After ~15 minutes of inactivity, the service spins down. The first request after that can take **30–60 seconds** to respond while the container wakes up. Subsequent requests are fast until the next idle period.

## Quick start (local)

```bash
docker compose up --build
```

API: `http://localhost:5566`

## Run API without Docker

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev
```

## Frontend (Next.js — web track)

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

UI: `http://localhost:3001`

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to your API URL (local or hosted).

### UI flow

1. **Seed scenario** — resets DB and creates 2 products (Widget + Gadget) across 3 warehouses
2. **Start checkout** — reserves stock for a pincode
3. **Payment outcome** — success / failed / user-dropped
4. **Expire abandoned** — releases dropped checkouts past retry window
5. **Tables** — product availability + location inventory

### Seeded inventory

| Product | SKU | Delhi | Noida | Mumbai | Total |
|---------|-----|-------|-------|--------|-------|
| Widget | WID-DEMO | 10 | 8 | 5 | 23 |
| Gadget | GAD-DEMO | 6 | 4 | 3 | 13 |

## API endpoints

- `POST /demo/seed` — reset and seed demo products, locations, and inventory
- `POST /products` — create product
- `POST /locations` — create location
- `POST /inventory` — add stock at a location
- `POST /checkouts` — start checkout and reserve stock (`Idempotency-Key` header required)
- `GET /checkouts/:id` — fetch checkout by id
- `POST /checkouts/:id/payment/success` — payment succeeded (reserved → sold)
- `POST /checkouts/:id/payment/failed` — payment failed (release reservation)
- `POST /checkouts/:id/payment/dropped` — user abandoned (keep reserved until expiry)
- `POST /checkouts/expire` — expire abandoned checkouts past retry window
- `GET /products/:id/availability` — product availability
- `GET /inventory/product/:productId` — location-level inventory

## Concurrency — how it works

When multiple checkout requests hit at the same time for the same product/location, we must not oversell.

### Implementation

1. Each reservation runs inside a **Postgres transaction**.
2. Before checking or updating stock, the inventory row is locked with:
   ```sql
   SELECT id, stock, reserved FROM "Inventory" WHERE id = $1 FOR UPDATE
   ```
3. Available stock is computed as `stock - reserved`. If `available < quantity`, the transaction fails with `422 Insufficient stock`.
4. Only the transaction that holds the row lock can increment `reserved`, so concurrent requests are serialized per inventory row.

Checkout rows are also locked with `SELECT … FOR UPDATE` during payment state changes to avoid double-processing.

### Why this is correct

- `FOR UPDATE` blocks other transactions from reading/updating the same inventory row until the current transaction commits or rolls back.
- Stock and reserved are updated atomically inside that transaction.
- If 10 units are available and 10 clients each try to reserve 1 unit concurrently, exactly 10 succeed and the rest get `422`.

### Test concurrency (automated)

```bash
docker compose up -d db
cd backend
npm run test:e2e
```

The test `concurrent checkouts cannot reserve more than available stock` seeds **1 unit**, fires **10 parallel** checkout requests with different idempotency keys, and asserts:

- exactly **1** succeeds (`201`)
- exactly **9** fail (`422`)
- `totalReserved` stays **1**

### Test concurrency (manual curl)

Seed first, then grab a product id:

```bash
API=https://keystone-jh8u.onrender.com   # or http://localhost:5566

curl -s -X POST "$API/demo/seed" | jq -r '.products[0].id'
```

Pick a product with low stock (or add inventory with quantity `1`), then run parallel requests:

```bash
PRODUCT_ID="<product-id>"

for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/checkouts" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: concurrent-test-$i" \
    -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"deliveryPincode\":\"110001\"}" &
done
wait
```

You should see **one `201`** and the rest **`422`**. Verify with:

```bash
curl -s "$API/products/$PRODUCT_ID/availability" | jq
```

## Idempotency — how it works

Clients can safely retry `POST /checkouts` if the network drops — the same request must not reserve stock twice.

### Implementation

1. Every checkout start requires an **`Idempotency-Key`** header.
2. The request body (`productId`, `quantity`, `deliveryPincode`) is hashed (SHA-256) and stored on the checkout as `payloadHash`.
3. On retry:
   - **Same key + same body** → return the existing checkout (`200`-equivalent behavior: same checkout object, no second reservation).
   - **Same key + different body** → `409 Conflict` (key reuse is rejected).
   - **New key** → normal new checkout flow.

The idempotency check happens **before** the reservation transaction, so a retry never reaches `FOR UPDATE` twice for the same logical checkout.

### Why this is correct

- Network retries are safe: duplicate submits with the same key do not double-reserve.
- Key reuse with a changed payload is rejected, so one key cannot mean two different orders.
- Different keys always create separate checkouts (as long as stock allows).

### Test idempotency (automated)

E2E tests cover:

- `idempotent checkout retry returns the existing checkout without reserving twice` — same key twice → same checkout id, `totalReserved = 2` (not 4).
- `same idempotency key with a changed payload is rejected` — second call with same key but `quantity: 5` → `409`, reserved stays `2`.

### Test idempotency (manual curl)

```bash
API=https://keystone-jh8u.onrender.com
PRODUCT_ID="<product-id>"

# First request
curl -s -X POST "$API/checkouts" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: manual-idem-1" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":2,\"deliveryPincode\":\"110001\"}" | jq '.id'

# Retry with SAME key + SAME body → same checkout id, no extra reservation
curl -s -X POST "$API/checkouts" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: manual-idem-1" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":2,\"deliveryPincode\":\"110001\"}" | jq '.id'

# Same key, DIFFERENT body → 409 Conflict
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$API/checkouts" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: manual-idem-1" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":5,\"deliveryPincode\":\"110001\"}"

curl -s "$API/products/$PRODUCT_ID/availability" | jq '.totalReserved'  # should still be 2
```

> **Note:** The web UI generates a new `Idempotency-Key` per checkout click, so idempotency is best verified via curl or the e2e tests.

## Example flow

```bash
API=http://localhost:5566

# 0. Seed demo data (2 products + 3 warehouses)
curl -X POST "$API/demo/seed"

# 1. Create product
curl -X POST "$API/products" \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WID-001"}'

# 2. Create location
curl -X POST "$API/locations" \
  -H "Content-Type: application/json" \
  -d '{"name":"Delhi WH","city":"Delhi","state":"Delhi","priority":1,"serviceZones":["110001"]}'

# 3. Add inventory (use IDs from above)
curl -X POST "$API/inventory" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<product-id>","locationId":"<location-id>","quantity":10}'

# 4. Start checkout
curl -X POST "$API/checkouts" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-1" \
  -d '{"productId":"<product-id>","quantity":2,"deliveryPincode":"110001"}'

# 5. Check availability
curl "$API/products/<product-id>/availability"

# 6. Payment success
curl -X POST "$API/checkouts/<checkout-id>/payment/success"

# 7. Payment failed (use a different checkout)
curl -X POST "$API/checkouts/<checkout-id>/payment/failed"

# 8. User dropped (use a different checkout)
curl -X POST "$API/checkouts/<checkout-id>/payment/dropped"

# 9. Expire abandoned checkouts
curl -X POST "$API/checkouts/expire"
```

## Run tests

```bash
# Requires Postgres running (docker compose up -d db)
cd backend
npm run test:e2e
```

All **10** e2e tests must pass. They cover:

| # | Scenario |
|---|----------|
| 1 | Checkout reserves stock |
| 2 | Payment success deducts stock |
| 3 | Payment failure releases reservation |
| 4 | User-dropped keeps stock reserved |
| 5 | Expired dropped checkout releases stock |
| 6 | Location selection by service zone |
| 7 | Fallback when zone location has no stock |
| 8 | Idempotent retry (same key, same body) |
| 9 | Idempotency conflict (same key, different body) |
| 10 | Concurrent checkouts cannot oversell |

## Design decisions

- **Postgres + row locks** (`SELECT … FOR UPDATE`) to prevent overselling under concurrent checkouts
- **Idempotency key** on checkout start — same key + same body returns existing checkout; different body is rejected with `409`
- **Location selection**: service zone (pincode) → same city → same state → any active location; lowest priority number wins ties
- **Checkout lifecycle**: `RESERVED` → `PAID` / `FAILED` / `USER_DROPPED` → `EXPIRED` (for abandoned retries past the retry window)
