# 🏋️ CoachMe - Plateforme de Coaching Sportif

CoachMe est une plateforme full-stack professionnelle qui connecte des coachs sportifs certifiés avec des clients au Cameroun. Elle offre un environnement complet pour l'inscription des coachs, la communication sécurisée, et le suivi des progrès.

> **🚀 Démarrage Rapide:** Consultez [QUICK_START.md](QUICK_START.md) pour démarrer en 5 minutes !

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Démarrage rapide en 5 minutes
- **[GUIDE_DEMARRAGE.md](GUIDE_DEMARRAGE.md)** - Guide complet de démarrage et configuration
- **[TESTING.md](TESTING.md)** - Guide de tests manuels complets
- **[RESUME_PROJET.md](RESUME_PROJET.md)** - Résumé technique du projet

---

## Key Functionalities

### 🛡️ Administration
- **Coach Verification Workflow**: Formal approval/rejection system for new coach applications.
- **User Oversight**: Management of coach and client accounts.
- **Discipline Management**: Configuration of various/different disciplines and system-wide settings.
- **System Monitoring**: Access to platform-wide metrics and user activities.

### 👨‍🏫 Coach Features
- **Professional Onboarding**: Dedicated registration flow including certification uploads.
- **Media Portfolio**: Management of professional certificates, training videos, and profile images.
- **Client Management**: Direct communication channel with assigned or discovered clients.
- **Profile Customization**: Detailed coach profiles showcasing expertise and disciplines.

### 🏃 Client Features
- **Coach Discovery**: Browse and find certified coaches based on disciplines.
- **Interactive Messaging**: Real-time communication with coaches to receive guidance and updates.
- **Personalized Profile**: Management of fitness goals, preferences, and personal information.

### 🌐 core System
- **Real-time Communication**: Instant messaging powered by Pusher.
- **Multilingual Support**: Fully localized interface supporting English and French.
- **Rate Limiting**: Security layer preventing API abuse via Upstash Redis.
- **Secure Storage**: High-performance media hosting on Cloudflare R2.

## Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: JWT-based (Role-Based Access Control)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Real-time**: [Pusher](https://pusher.com/)
- **Infrastructure**:
  - **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (S3-compatible)
  - **Rate Limiting**: [Upstash Redis](https://upstash.com/)
- **Validation Layer**: [Zod](https://zod.dev/)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL instance
- `pnpm` (recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd CoachMe-fitness
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *Required: DATABASE_URL, R2 credentials, PUSHER credentials, and UPSTASH_REDIS credentials.*

4. **Database Setup:**
   ```bash
   pnpm prisma:migrate
   pnpm prisma:generate
   ```

5. **Run the Development Server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `pnpm dev`: Start the development server.
- `pnpm build`: Build the application for production.
- `pnpm lint`: Run ESLint for code quality checks.
- `pnpm prisma:studio`: Open an interactive database browser.
