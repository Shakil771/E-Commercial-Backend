
# MERN E-commerce — Backend (Server)

Production-grade REST API built with Node.js, Express, and MongoDB, following
strict MVC architecture.

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT (access + rotating refresh tokens), bcrypt password hashing
- **File storage:** Cloudinary (via Multer memory storage)
- **Payments:** Stripe (PaymentIntents + webhooks)
- **Email:** Nodemailer (SMTP)
- **Security:** Helmet, express-mongo-sanitize, xss-clean, hpp, rate limiting, CORS

## Folder Structure (MVC)

```
src/
  config/       # DB, Cloudinary, and environment configuration
  models/       # Mongoose schemas
  controllers/  # Route handler business logic
  routes/       # Express route definitions
  middlewares/  # Auth, error handling, validation, uploads, rate limiting
  validators/   # express-validator request validation chains
  services/     # Email, tokens, payments, Cloudinary, invoices
  utils/        # ApiError, ApiResponse, catchAsync, logger, pagination, seeder
  constants/    # Roles, order statuses, HTTP status codes
  app.js        # Express app configuration
  server.js     # Entry point
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values (MongoDB URI, JWT
secrets, Cloudinary credentials, SMTP credentials, Stripe keys).

```bash
cp .env.example .env
```

### 3. Run MongoDB

Make sure a MongoDB instance is running and reachable at the URI configured
in `MONGO_URI` (local install, Docker, or MongoDB Atlas).

### 4. Seed sample data (optional, for local development)

```bash
npm run seed          # seeds an admin user + sample categories/products (skips existing)
npm run seed -- --fresh  # wipes users/categories/products and reseeds
```

This creates an admin account:
- **Email:** admin@mernshop.com
- **Password:** Admin@12345

### 5. Run the server

```bash
npm run dev     # nodemon, auto-restarts on file changes
npm start       # production
```

The API will be available at `http://localhost:5000/api/v1`.

## API Overview

| Resource   | Base Path              | Notes                                   |
|------------|-------------------------|------------------------------------------|
| Auth       | `/api/v1/auth`          | register, login, refresh, logout, password reset |
| Users      | `/api/v1/users`         | profile, avatar, addresses               |
| Products   | `/api/v1/products`      | public listing/detail, admin CRUD        |
| Categories | `/api/v1/categories`    | public listing/detail, admin CRUD        |
| Cart       | `/api/v1/cart`          | items, coupon, guest cart via `x-guest-id` header, `/cart/merge` after login |
| Orders     | `/api/v1/orders`        | create, list, detail, cancel             |
| Payments   | `/api/v1/payments`      | Stripe PaymentIntents, webhook           |
| Reviews    | `/api/v1/products/:id/reviews`, `/api/v1/reviews/:id` | product reviews |
| Wishlist   | `/api/v1/wishlist`      | add/remove/list                          |
| Coupons    | `/api/v1/coupons`       | admin CRUD                               |
| Uploads    | `/api/v1/uploads`       | admin generic image upload               |
| Admin      | `/api/v1/admin`         | dashboard stats, order/user/review management |

### Guest Cart & Merge-on-Login

Cart routes accept unauthenticated requests. Anonymous clients must send an
`x-guest-id` header (any client-generated unique string) to identify their
cart. Once the client logs in or registers, call:

```
POST /api/v1/cart/merge
Body: { "guestId": "<the same x-guest-id value>" }
```

This merges the guest cart's items into the authenticated user's cart
(summing quantities and capping at available stock) and deletes the guest
cart document.

All list endpoints support `?page=`, `?limit=`, and resource-specific filters
(e.g. `?category=`, `?minPrice=`, `?sort=`).

## Stripe Webhook (local testing)

```bash
stripe listen --forward-to localhost:5000/api/v1/payments/webhook
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET` in `.env`.
