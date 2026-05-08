<div align="center">

# 📚 Library Pro

**Run your library with clarity, control, and calm.**

_A comprehensive management system designed to track members, seats, payments, expenses, and business intelligence — all from a single, focused workspace._

[![React](https://img.shields.io/badge/React-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## ✨ Features

### 📊 Business Intelligence Dashboard

Get a high-level overview of your library's performance with key metrics like active revenue, operating expenses, member counts, and at-risk payments. Visualize trends with charts for revenue vs. expenses, and gain actionable insights with AI-style suggestions.

### 👥 Member Management

Maintain a complete database of library members. Register new members, view and edit details, and manage their lifecycle. Includes a robust payment status tracker:

- ✅ **Paid** — Member is up to date
- 🔔 **Due** — Payment coming up
- ❗ **Overdue** — Immediate attention required

### 🪑 Visual Seat Management

An interactive, configurable seat layout for multiple floors. Visually track occupancy in real-time, inspect seat availability, and manage custom pricing for individual seats.

### 💰 Comprehensive Financial Tracking

| Module                 | Description                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 🧾 **Payment History** | A detailed, auditable log of every payment per member, including monthly fees, registration fees, and refundable security deposits |
| 📋 **Expense Ledger**  | Track all operational costs such as rent, electricity, and supplies. Categorize expenses and view spending summaries               |

### ✅ Operational Task Management

A simple but effective To-Do list to manage and track daily library tasks, ensuring smooth operations.

### 🔐 Secure Authentication

Administrator access is secured using Supabase's authentication system.

---

## 🛠️ Technology Stack

| Layer                     | Technology                  |
| ------------------------- | --------------------------- |
| ⚡ **Frontend**           | React (Vite), Tailwind CSS  |
| 🗄️ **Backend & Database** | Supabase (PostgreSQL, Auth) |
| 🎨 **UI Components**      | Radix UI, Lucide React      |
| 📈 **Data Visualization** | Recharts                    |
| 🔀 **Routing**            | React Router                |
| 🚀 **Deployment**         | Vercel                      |

---

## 🗂️ Core Modules

```
src/
├── 📊 features/dashboard        → Business intelligence & metrics aggregation
├── 👥 features/members          → Registration, member list, details & payment history
├── 🪑 features/seatmanagement   → Visual seat selector & layout configuration
├── 📋 features/librarymanagement→ Expense ledger & task-based To-Do list (localStorage)
└── 🔐 auth/                     → Admin login & authentication flows
```

---

## 🗃️ Database Schema

Library Pro's data is powered by a **Supabase PostgreSQL** database with the following core tables:

### `library_members`

> Stores all member information including personal details, assigned seat, fee amount, and current status (`active` / `inactive`). Also tracks exit information like leaving date and notes.

### `payment_history`

> A complete audit trail for all financial transactions. Each record is linked to a member and stores the amount, payment date, reason for payment (e.g., `Monthly Fee`, `Locker Security`), and associated notes.

> 📁 Database migrations are located in `supabase/migrations/` and managed using the **Supabase CLI**.

---

## 🚀 Local Development Setup

> **Prerequisites:** Node.js, npm, and the Supabase CLI

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/deepaksemwal121/library-pro.git
cd library-pro
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Set Up Supabase

Create a new project on [Supabase](https://supabase.com/), then link it and push migrations:

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### 4️⃣ Configure Environment Variables

Create a `.env` file in the project root and add your Supabase credentials (found in your project's API settings):

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-anon-key
```

### 5️⃣ Run the Development Server

```bash
npm run dev
```

🌐 The app will be live at **`http://localhost:5173`**

---

<div align="center">

Made with ❤️ for library administrators everywhere.

</div>
