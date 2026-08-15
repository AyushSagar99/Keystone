# Keystone — Location-Based Inventory Reservation

Web track assignment. Backend-first inventory reservation service.

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

1. **Seed scenario** — creates product + 3 warehouses + stock
2. **Start checkout** — reserves stock for a pincode
3. **Payment outcome** — success / failed / user-dropped
4. **Expire abandoned** — releases dropped checkouts past retry window
5. **Tables** — product availability + location inventory

## API endpoints

- `POST /products` — create product
- `POST /locations` — create location
- `POST /inventory` — add stock at a location
- `POST /checkouts` — start checkout and reserve stock (`Idempotency-Key` header required)
- `POST /checkouts/:id/payment/success` — payment succeeded (reserved → sold)
- `POST /checkouts/:id/payment/failed` — payment failed (release reservation)
- `POST /checkouts/:id/payment/dropped` — user abandoned (keep reserved until expiry)
- `POST /checkouts/expire` — expire abandoned checkouts past retry window
- `GET /products/:id/availability` — product availability
- `GET /inventory/product/:productId` — location-level inventory

## Example flow

```bash
# 1. Create product
curl -X POST http://localhost:5566/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Widget","sku":"WID-001"}'

# 2. Create location
curl -X POST http://localhost:5566/locations \
  -H "Content-Type: application/json" \
  -d '{"name":"Delhi WH","city":"Delhi","state":"Delhi","priority":1,"serviceZones":["110001"]}'

# 3. Add inventory (use IDs from above)
curl -X POST http://localhost:5566/inventory \
  -H "Content-Type: application/json" \
  -d '{"productId":"<product-id>","locationId":"<location-id>","quantity":10}'

# 4. Start checkout
curl -X POST http://localhost:5566/checkouts \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-1" \
  -d '{"productId":"<product-id>","quantity":2,"deliveryPincode":"110001"}'

# 5. Check availability
curl http://localhost:5566/products/<product-id>/availability

# 6. Payment success
curl -X POST http://localhost:5566/checkouts/<checkout-id>/payment/success

# 7. Payment failed (use a different checkout)
curl -X POST http://localhost:5566/checkouts/<checkout-id>/payment/failed

# 8. User dropped (use a different checkout)
curl -X POST http://localhost:5566/checkouts/<checkout-id>/payment/dropped

# 9. Expire abandoned checkouts
curl -X POST http://localhost:5566/checkouts/expire
```

## Run tests

```bash
# Requires Postgres running (docker compose up -d db)
cd backend
npm run test:e2e
```

- **Postgres + row locks** (`SELECT … FOR UPDATE`) to prevent overselling under concurrent checkouts
- **Idempotency key** on checkout start — same key + same body returns existing checkout; different body is rejected
- **Location selection**: service zone (pincode) → same city → same state → any active location; lowest priority number wins ties
