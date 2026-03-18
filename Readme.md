
---

## 📌 Project Overview

BidKart is a full-featured, multi-vendor e-commerce platform inspired by Amazon, with an integrated real-time auction system. It connects buyers and sellers on a single platform where sellers can either list products at fixed prices or run live timed auctions — and buyers can shop normally or compete in real-time bidding wars to win products at the best price.

The platform supports three distinct user roles — Buyer, Seller, and Admin — each with their own dedicated dashboard and feature set. BidKart is designed to simulate a production-grade marketplace, making it an ideal final year project that demonstrates full stack engineering skills including real-time systems, payment integration, role-based access control, and data analytics.

---

## 🎯 Problem Statement

Existing e-commerce platforms either focus on fixed-price shopping (Amazon, Flipkart) or auction-only models (eBay). There is a gap for a unified platform that allows sellers to choose their selling model — fixed price or auction — while giving buyers a richer, more engaging shopping experience. BidKart solves this by combining both models in one seamless marketplace.

---

## 🌟 How It Works

### For Buyers

1. Register and complete profile with address book
2. Browse products using search, filters, and categories
3. Add to cart and checkout with secure payment
4. Track orders in real time
5. Join live auctions, place bids, and win products
6. Leave reviews and interact with sellers via chat

### For Sellers

1. Register, complete KYC verification, and set up store
2. List products with images, variants, pricing, and stock
3. Manage incoming orders and update statuses
4. Create auctions with start price, reserve price, and duration
5. Monitor earnings, payouts, and store analytics
6. Communicate with buyers via in-app chat

---

## 👥 User Roles

| Role | Access Level | Key Capability |
| --- | --- | --- |
| Buyer | Standard | Browse, cart, checkout, bid in auctions |
| Seller | Elevated | List products, manage orders, create auctions |

---

## 🔑 Features – Detailed Breakdown

### 1. Authentication & User Management

BidKart uses a secure JWT-based authentication system with OAuth support for Google login. Every user registers with email verification. Sellers go through an additional KYC step where they upload identity documents before being allowed to list products.

- JWT access tokens + refresh token rotation
- Google OAuth via Passport.js
- Email verification on signup
- Forgot password with OTP via email
- Role-based route protection on both frontend and backend
- Seller KYC with document upload (Cloudinary)
- User profile management with address book

### 2. Product Management

Sellers can create rich product listings with multiple images, variant support (size, color, etc.), stock quantity, and category tagging. Products go through an admin approval step before going live.

- Multi-image upload with drag-and-drop
- Product variants (size, color, material)
- Stock management with low-stock alerts
- Category and subcategory tagging
- Rich text product description editor
- Admin approval workflow
- Product duplication for faster listing

### 3. Search & Discovery

Buyers can find products quickly through a powerful search and filtering system. A recommendation engine surfaces relevant products based on browsing history.

- Full-text search with MongoDB Atlas Search or Elasticsearch
- Filters: price range, category, rating, seller, location
- Sort by: newest, price low-high, most popular
- AI-powered product recommendations
- Recently viewed products
- Trending and featured product sections
- Wishlist with price drop alerts

### 4. Shopping Cart & Checkout

A seamless cart and checkout flow supporting multiple addresses, coupon codes, and multiple payment methods.

- Persistent cart (saved across sessions)
- Multi-seller cart with grouped orders
- Coupon and discount code system
- Address selection and management
- Order summary with tax and shipping calculation
- Guest checkout with email tracking

### 5. Payment System

BidKart integrates Razorpay (or Stripe for international) for secure payments. An escrow mechanism holds auction payments until delivery is confirmed.

- Razorpay / Stripe payment gateway
- UPI, card, net banking, wallet support
- Escrow system for auction payments
- Automatic seller payout after order completion
- Refund processing for returns
- Payment history and invoice download

### 6. Order Management & Tracking

Both buyers and sellers get a complete order management experience with real-time status updates.

- Order lifecycle: Placed → Confirmed → Packed → Shipped → Delivered
- Real-time status updates via WebSockets
- Shipment tracking integration (Shiprocket API)
- Return and refund request flow
- Order cancellation with reason
- Email and in-app notifications at every step


### 8. Seller Dashboard & Analytics

Sellers get a powerful dashboard to run their business on BidKart.

- Revenue charts (daily, weekly, monthly)
- Top performing products
- Order fulfillment rate
- Customer demographics
- Auction performance reports
- Inventory alerts and restocking suggestions
- Payout history and upcoming payouts

### 9. Admin Panel

A complete back-office for platform administrators.

- User and seller management (ban, suspend, approve)
- Product listing review and approval queue
- Dispute resolution center with ticket system
- Platform revenue, GMV, and commission analytics
- Homepage banner and category management
- System health monitoring
- Audit logs for all admin actions



### 11. Reviews & Ratings

A trust system that keeps quality high across the platform.

- Star rating + written review after order completion
- Verified purchase badge
- Seller can respond to reviews
- Review helpfulness voting
- Review-based seller rating and trust score



## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
| --- | --- |
| **Next.js 14** | React framework with SSR and SSG for SEO-friendly pages |
| **Tailwind CSS** | Utility-first styling for rapid UI development |
| **Redux Toolkit** | Global state management (cart, user, filters) |
| [**Socket.io](http://Socket.io) Client** | Real-time auction bidding and chat |
| **React Query** | Server state, caching, and data fetching |
| **Recharts** | Analytics charts for seller and admin dashboards |
| **React Hook Form** | Form handling with validation |
| **Framer Motion** | Smooth UI animations and transitions |
| **Shard UI** | Pre-built accessible components for faster development |
### Backend

| Technology | Purpose |
| --- | --- |
| **Node.js** | JavaScript runtime environment |
| **Express.js** | REST API framework |
| **MongoDB + Mongoose** | NoSQL database and ODM |

### Database & Storage

| Technology | Purpose |
| --- | --- |
| **MongoDB + Mongoose** | Primary database for all application data |
| **Cloudinary** | Image and document storage (CDN-backed) |
| **MongoDB Atlas Search** | Full-text product search with filters |


---

## 🗃️ Database Schema – Key Models

### User

```
_id, name, email, password, role, avatar,
addresses[], wishlist[], isVerified, createdAt
```

### SellerProfile

```
_id, userId, storeName, description, logo,
kycDocuments[], isApproved, rating, totalSales, bankDetails
```

### Product

```
_id, sellerId, title, description, images[],
category, variants[], basePrice, stock,
ratings, reviewsCount, isApproved, tags[]
```

### Auction

```
_id, sellerId, productId, startPrice, reservePrice,
buyItNowPrice, currentBid, currentBidderId,
startTime, endTime, status, bids[], winnerId
```

### Bid

```
_id, auctionId, bidderId, amount, isAutoBid,
maxAutoBidAmount, timestamp
```

### Order

```
_id, buyerId, items[], totalAmount, status,
paymentId, shippingAddress, trackingId,
escrowStatus, createdAt
```

### Cart

```
_id, userId, items[{productId, variantId, quantity, sellerId}],
couponApplied, updatedAt
```

### Review

```
_id, productId, userId, orderId, rating,
title, body, images[], sellerReply, isVerified
```

### Message

```
_id, chatId, senderId, receiverId, content,
mediaUrl, isRead, timestamp
```

---

## 📁 Project Folder Structure

```
bidkart/
├── client/                    # Next.js Frontend
│   ├── app/                   # App router pages
│   │   ├── (buyer)/           # Buyer pages
│   │   ├── (seller)/          # Seller dashboard
│   │   ├── (admin)/           # Admin panel
│   │   └── auction/           # Auction pages
│   ├── components/            # Reusable UI components
│   ├── store/                 # Redux slices
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # API clients, utils
│   └── sockets/               # Socket.io event handlers
│
├── server/                    # Node.js Backend
│   ├── controllers/           # Route controllers
│   ├── models/                # Mongoose models
│   ├── routes/                # Express routers
│   ├── middleware/             # Auth, error, upload middleware
│   ├── sockets/               # Socket.io event handlers
│   ├── services/              # Business logic layer
│   ├── jobs/                  # Cron jobs and Bull queues
│   └── utils/                 # Helpers and constants
│
├── docker-compose.yml
├── .github/workflows/         # CI/CD pipelines
└── README.md
```

---

## 📅 Development Timeline (6 Months)

| Month | Phase | Deliverables |
| --- | --- | --- |
| **Month 1** | Foundation | Project setup, auth system, DB schema, role-based routing, basic UI shell |
| **Month 2** | Core Commerce | Product CRUD, image upload, search & filters, category system, seller onboarding |
| **Month 3** | Transactions | Cart, checkout, Razorpay integration, order management, email notifications |
| **Month 4** | Auction System | Real-time bidding with [Socket.io](http://Socket.io), Redis bid locking, auto-bid, anti-snipe, escrow |
| **Month 5** | Polish & Features | Admin panel, reviews, chat system, seller analytics, shipment tracking |
| **Month 6** | Deployment & Docs | AI recommendations, Docker setup, CI/CD, full testing, documentation, demo prep |

---

## 🏆 What Makes BidKart Stand Out

- **Real-time auction engine** using WebSockets is rare in student projects and impressive in demos
- **Three-role architecture** demonstrates understanding of complex access control and system design
- **Escrow payment logic** shows industry-level thinking about financial transactions
- **Redis for bid locking** prevents race conditions — a real-world distributed systems concept
- **Full analytics dashboards** for both sellers and admins show data engineering skills
- **Clean folder structure and Docker setup** shows production readiness

---

## 📊 Project Metrics (Estimated)

| Metric | Estimate |
| --- | --- |
| Total API Endpoints | 60–80 |
| Database Collections | 15–18 |
| Frontend Pages | 40–50 |
| WebSocket Events | 15–20 |
| Lines of Code | 15,000–25,000 |

---

## 🔗 Suggested Project Links

- GitHub Repository (monorepo)
- Live Demo URL
- API Documentation (Postman Collection)
- Project Report PDF
- Demo Video (YouTube)

---
