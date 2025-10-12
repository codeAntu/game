# 🎮 Battle Zone Backend

> Battle Zone Backend powers gaming tournaments with secure user management, real-time updates, and robust financial operations. Built for speed and reliability with Bun, Hono.js, and PostgreSQL.

🚀 [Live Demo](https://battle-zone-five.vercel.app/) | 🖥️ [Frontend Repo](https://github.com/codeantu/battle-zone)

---

## 🛠️ Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/Bun-18181B?logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/Hono.js-00C7B7?logo=hono&logoColor=white" alt="Hono.js" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Drizzle%20ORM-FFD700?logo=postgresql&logoColor=white" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Neon-008AFF?logo=neondatabase&logoColor=white" alt="Neon" />
  <img src="https://img.shields.io/badge/Zod-3A3A3A?logo=Zod&logoColor=white" alt="Zod" />
  <img src="https://img.shields.io/badge/JWT-FF9900?logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&logoColor=white" alt="Cloudinary" />
  <img src="https://img.shields.io/badge/Nodemailer-4B8A08?logo=nodemailer&logoColor=white" alt="Nodemailer" />
  <img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" alt="Redis" />
</div>

---

## 📖 About

Built to simplify tournament management for BGMI/Free Fire communities. Handles the full flow: 🧑‍💻 player registration → 💰 wallet deposits → 🎮 tournament entry → 🏆 prize distribution. Admin approval system keeps transactions secure without needing a payment gateway.

---

## 🏆 Key Features

### 👤 User Features

- 🔒 **User Authentication & Authorization**: Secure signup, login, and email verification
- 📝 **Profile Management**: User profile creation and management
- 🎯 **Tournament Participation**: Join and participate in gaming tournaments
- 💳 **Wallet System**: Deposit, withdraw, and manage digital wallet balance
- 📜 **Transaction History**: Track all financial transactions and tournament activities

### 🛡️ Admin Features

- 📊 **Admin Dashboard**: Comprehensive admin panel for platform management
- 🏟️ **Tournament Management**: Create, update, and manage gaming tournaments
- 👥 **User Management**: Monitor and manage user accounts
- 🎲 **Game Management**: Add and configure supported games
- 💸 **Financial Operations**: Handle deposits, withdrawals, and prize distributions

### ⚙️ Core Functionality

- ⏱️ **Real-time Tournament Updates**: Live tournament status and participant tracking
- 🥇 **Prize Distribution**: Automated prize and kill reward distribution
- 🖼️ **Image Management**: Cloudinary integration for image uploads
- 📧 **Email Notifications**: Automated email system for user communications
- 🗄️ **Database Migrations**: Robust database schema management with Drizzle ORM
- 🚦 **Redis Rate Limiting**: Protects API from abuse

---

## ⚡ Quick Start

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/codeAntu/battle-zone-backend-new.git
cd battle-zone-backend-new
```

### 2️⃣ Install Dependencies

```bash
bun install
```

### 3️⃣ Environment Setup

Create a `.env` file in the root directory using the provided `.env.sample`:

```bash
cp .env.sample .env
```

Configure the following environment variables:

```bash
# Database connection URL
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Email configuration
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
JWT_SECRET=your_super_secret_jwt_key

# Cloudinary configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 4️⃣ Database Setup

```bash
# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Optional: Open Drizzle Studio to view your database
bun run db:studio

# Push schema changes to database
bun run db:push
```

### 5️⃣ Start Development Server

```bash
bun run dev
```

The server will start and be available at your configured endpoint.

---

## 📧 Email Integration

The platform includes automated email functionality for:

- ✅ Account verification
- 🏁 Tournament notifications
- 💸 Transaction confirmations
- 🛡️ Admin notifications

---

## ☁️ Cloud Integration

**Cloudinary** is integrated for:

- 🖼️ Game thumbnails and icons
- 🏟️ Tournament images
- 👤 User profile pictures
- ⚡ Image optimization and delivery

---

## 📝 Available Scripts

| Script                | Description                                 |
| --------------------- | ------------------------------------------- |
| `bun run dev`         | 🚀 Start development server with hot reload |
| `bun run build`       | 🏗️ Build the application for production     |
| `bun run start`       | 🏁 Start the production server              |
| `bun run db:generate` | 🗄️ Generate database migration files        |
| `bun run db:migrate`  | 🔄 Run database migrations                  |
| `bun run db:studio`   | 🖥️ Open Drizzle Studio                      |
| `bun run db:push`     | 📤 Push schema changes to database          |

---

## ⚠️ Limitations

- 🚫 No payment gateway integration—deposits and withdrawals are handled manually by the admin
- 🌐 Only a web version is available (mobile-friendly, but no dedicated mobile app)
- 🕹️ Custom games must be added manually when needed
- 💬 No messaging, chat, or commenting features
- 🕵️‍♂️ No fraud detection or anti-cheat system; results and transactions rely on trust and admin review
- 📊 Basic analytics and reporting

---

<div align="center">
  <p>⭐ If you find this project useful, please consider giving it a star!</p>
  <p>Made with ❤️ by CodeAntu 🚀🎮</p>
  <p>🔗 <a href="https://battle-zone-five.vercel.app/">Live Demo</a> | 🗂️ <a href="https://github.com/codeantu/battle-zone">Frontend Repo</a></p>
</div>
