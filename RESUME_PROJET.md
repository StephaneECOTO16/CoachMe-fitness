# 📊 Résumé du Projet CoachMe

## 🎯 Vue d'Ensemble

**CoachMe** est une plateforme marketplace qui connecte des coachs sportifs certifiés avec des clients au Cameroun. Le projet utilise Next.js 16 avec TypeScript, PostgreSQL, et diverses technologies modernes pour offrir une expérience complète et sécurisée.

---

## 🏗️ Architecture Technique

### Stack Principal
- **Framework:** Next.js 16 (App Router)
- **Langage:** TypeScript
- **Base de données:** PostgreSQL + Prisma ORM
- **Authentification:** JWT (HttpOnly Cookies)
- **Styling:** Tailwind CSS 4
- **Temps réel:** Pusher
- **Storage:** Cloudflare R2
- **Rate Limiting:** Upstash Redis
- **Email:** SMTP (Nodemailer)
- **i18n:** next-intl (Français/Anglais)

### Modèle de Données

```
User (UUID)
├── role: PROSPECT | COACH | ADMIN
├── email, password (bcrypt)
├── name, phone, avatar
├── CoachProfile (1:1)
│   ├── bio, portfolio
│   ├── disciplineId → Discipline
│   ├── status: PENDING | APPROVED | REJECTED
│   ├── rateAmount, rateType (HOUR|WEEK|MONTH)
│   ├── experienceYears, address, city
│   └── Media[] (certificats, photos, vidéos)
├── ClientProfile (1:1)
│   ├── ageRange, heightCm, weightKg
│   └── goals
└── Messages[]

Chat
├── coachId → CoachProfile
├── clientId → ClientProfile
└── messages[]

Discipline
├── name (unique)
├── imageUrl
└── coaches[]
```

---

## 🔐 Système d'Authentification

### Flux d'Inscription

**Client (PROSPECT):**
1. Formulaire d'inscription avec infos personnelles
2. Création User + ClientProfile
3. Email de bienvenue
4. Redirection vers login
5. Accès immédiat au dashboard

**Coach:**
1. Formulaire d'inscription + discipline
2. Création User + CoachProfile (status: PENDING)
3. Email au coach (attente approbation)
4. Email à l'admin (nouvelle candidature)
5. Accès au dashboard mais profil non visible publiquement
6. Après approbation admin → status: APPROVED → visible sur /coaches

### Flux de Connexion

1. POST /api/auth/login avec email + password
2. Vérification bcrypt du password
3. Génération JWT avec payload: {userId, role, email, name, avatar}
4. Cookie HttpOnly défini (sécurisé contre XSS)
5. Redirection selon rôle:
   - PROSPECT → /dashboard
   - COACH → /coach/dashboard (ou modal si PENDING)
   - ADMIN → /admin/dashboard

### Sécurité

- **Cookies HttpOnly:** JWT jamais accessible en JavaScript
- **Rate Limiting:** 5 tentatives/minute via Upstash Redis
- **Password:** Min 8 chars, majuscule, minuscule, chiffre
- **RBAC:** Middleware vérifie le rôle sur chaque route protégée
- **CSRF:** Protection via SameSite cookies
- **SQL Injection:** Prisma ORM (requêtes paramétrées)

---

## 🎭 Rôles et Permissions

### PROSPECT (Client)
✅ Parcourir coachs approuvés  
✅ Voir profils publics  
✅ Envoyer messages  
✅ Gérer son profil  
❌ Accès admin  
❌ Accès dashboard coach  

### COACH
✅ Dashboard coach  
✅ Gérer profil (bio, tarifs, médias)  
✅ Upload certificats/photos/vidéos  
✅ Messagerie avec clients  
❌ Accès admin  
❌ Visible si status = PENDING  

### ADMIN
✅ Accès complet  
✅ Approuver/rejeter coachs  
✅ Gérer utilisateurs  
✅ Gérer disciplines  
✅ Statistiques plateforme  

---

## 🗺️ Routes Principales

### Pages Publiques
```
/                          → Page d'accueil
/login                     → Connexion
/register                  → Inscription
/forgot-password           → Mot de passe oublié
/reset-password?token=xxx  → Réinitialisation
/coaches                   → Liste coachs (APPROVED only)
/coaches/[userId]          → Profil coach public
/about                     → À propos
/contact                   → Contact
```

### Routes Protégées - Client
```
/dashboard                 → Dashboard client
/messages                  → Liste conversations
/messages/[chatId]         → Conversation
/profile                   → Profil + édition
/settings                  → Paramètres compte
```

### Routes Protégées - Coach
```
/coach/dashboard           → Dashboard coach
/messages                  → Messagerie
/profile                   → Profil + médias
/settings                  → Paramètres
```

### Routes Protégées - Admin
```
/admin/dashboard           → Dashboard + stats
/admin/coaches             → Gestion coachs
/admin/coaches/[coachId]   → Détail + approbation
/admin/users               → Gestion utilisateurs
/admin/disciplines         → Gestion disciplines
```

### API Endpoints
```
POST   /api/auth/register          → Inscription
POST   /api/auth/login             → Connexion
POST   /api/auth/logout            → Déconnexion
GET    /api/auth/me                → Session actuelle
POST   /api/auth/forgot-password   → Demande reset
POST   /api/auth/reset-password    → Reset password

GET    /api/coaches                → Liste coachs (publique)
GET    /api/coaches/[userId]       → Profil coach
POST   /api/coach/onboarding       → Compléter profil
POST   /api/coach/media            → Upload médias

GET    /api/chat                   → Liste conversations
POST   /api/chat                   → Créer conversation
GET    /api/chat/[chatId]          → Messages
POST   /api/chat/[chatId]          → Envoyer message

GET    /api/admin/stats            → Statistiques
GET    /api/admin/coaches          → Coachs en attente
POST   /api/admin/coaches/[id]/approve  → Approuver
POST   /api/admin/coaches/[id]/reject   → Rejeter
GET    /api/admin/users            → Liste utilisateurs
DELETE /api/admin/users/[userId]   → Supprimer user
```

---

## 🚀 Démarrage Rapide

### 1. Installation

```bash
# Cloner le repo
git clone <repo-url>
cd CoachMe-fitness

# Installer les dépendances (déjà fait)
pnpm install

# Copier .env (déjà fait)
cp .env.example .env
```

### 2. Configuration PostgreSQL

```bash
# Option A: Docker (recommandé)
docker compose up -d

# Option B: Installation locale
sudo apt install postgresql
sudo systemctl start postgresql
```

### 3. Base de Données

```bash
# Générer le client Prisma
pnpm prisma:generate

# Appliquer les migrations
pnpm prisma:migrate:dev

# (Optionnel) Seed
pnpm prisma:seed

# Créer un admin
psql -U postgres -d coachme -f scripts/create-admin.sql
```

### 4. Lancer le Projet

```bash
# Mode développement
pnpm dev

# Ouvrir http://localhost:3000
```

---

## 🧪 Tests Essentiels

### 1. Test Inscription/Login

```bash
# Client
URL: http://localhost:3000/register
Type: "Je cherche un coach"
Email: client@test.com
Password: Client123!

# Coach
URL: http://localhost:3000/register
Type: "Je suis un coach sportif"
Email: coach@test.com
Password: Coach123!
Discipline: Yoga

# Admin (via SQL)
Email: admin@coachme.cm
Password: Admin123!
```

### 2. Test Workflow Coach

```bash
1. Inscription coach → Status PENDING
2. Login admin → Approuver le coach
3. Login coach → Accès dashboard
4. Compléter profil → Tarifs, bio, médias
5. Coach visible sur /coaches
```

### 3. Test Messagerie

```bash
1. Login client
2. Parcourir /coaches
3. Cliquer "Message Coach"
4. Envoyer message
5. Login coach
6. Voir notification
7. Répondre
8. Vérifier temps réel (Pusher)
```

---

## 📁 Structure des Fichiers

```
CoachMe-fitness/
├── .env                      # Variables d'environnement
├── .env.example              # Template des variables
├── docker-compose.yml        # PostgreSQL container
├── GUIDE_DEMARRAGE.md        # Guide complet (ce fichier)
├── TESTING.md                # Guide de tests
├── RESUME_PROJET.md          # Résumé du projet
│
├── prisma/
│   ├── schema.prisma         # Schéma DB
│   ├── migrations/           # Migrations SQL
│   └── seed.ts              # Données de test
│
├── scripts/
│   ├── setup-dev.sh         # Script de setup
│   └── create-admin.sql     # Créer admin
│
├── src/
│   ├── app/
│   │   ├── [locale]/        # Routes localisées
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   ├── coach/
│   │   │   ├── admin/
│   │   │   ├── coaches/
│   │   │   ├── messages/
│   │   │   └── profile/
│   │   └── api/             # API Routes
│   │       ├── auth/
│   │       ├── coach/
│   │       ├── admin/
│   │       └── chat/
│   │
│   ├── components/          # Composants React
│   │   ├── ui/             # Composants UI
│   │   ├── auth/           # Auth guards
│   │   └── layout/         # Layout components
│   │
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx
│   │
│   ├── lib/                # Utilitaires
│   │   ├── auth/          # JWT, cookies
│   │   ├── db/            # Prisma client
│   │   ├── storage/       # R2 uploads
│   │   ├── mail/          # Email templates
│   │   ├── validation/    # Zod schemas
│   │   ├── rate-limit.ts  # Rate limiting
│   │   └── env.ts         # Validation env vars
│   │
│   └── services/          # Logique métier
│       └── auth.service.ts
│
├── messages/              # Traductions
│   ├── en.json
│   └── fr.json
│
└── public/               # Assets statiques
    ├── coachMe-logo.png
    └── videos/
```

---

## 🔧 Variables d'Environnement Critiques

### Développement (déjà configuré)
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/coachme"
JWT_SECRET="dev-jwt-secret-key-for-local-development-only-min-32-chars-long-12345678"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Production (à configurer)
```bash
# Database (Vercel Postgres, Supabase, etc.)
DATABASE_URL="postgresql://..."
POSTGRES_PRISMA_URL="postgresql://...?pgbouncer=true"

# JWT (générer avec: openssl rand -hex 64)
JWT_SECRET="<64-char-secret>"

# Cloudflare R2
R2_ENDPOINT="https://..."
R2_BUCKET_NAME="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"

# Pusher
PUSHER_APP_ID="..."
PUSHER_KEY="..."
PUSHER_SECRET="..."
NEXT_PUBLIC_PUSHER_KEY="..."

# SMTP
SMTP_HOST="smtp.sendgrid.net"
SMTP_USER="..."
SMTP_PASS="..."
ADMIN_EMAIL="admin@coachme.cm"

# Upstash Redis
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

## 📊 Fonctionnalités Implémentées

### ✅ Authentification
- [x] Inscription client/coach
- [x] Login avec JWT
- [x] Logout
- [x] Mot de passe oublié
- [x] Reset password
- [x] Session persistante
- [x] Rate limiting

### ✅ Profils
- [x] Profil client (objectifs, mesures)
- [x] Profil coach (bio, tarifs, expérience)
- [x] Upload avatar
- [x] Upload certificats
- [x] Upload photos/vidéos
- [x] Réseaux sociaux

### ✅ Recherche & Découverte
- [x] Liste des coachs
- [x] Filtres (discipline, tarif, note)
- [x] Profil public coach
- [x] Pagination

### ✅ Messagerie
- [x] Créer conversation
- [x] Envoyer/recevoir messages
- [x] Temps réel (Pusher)
- [x] Notifications
- [x] Marquer comme lu

### ✅ Administration
- [x] Dashboard admin
- [x] Approuver/rejeter coachs
- [x] Gérer utilisateurs
- [x] Gérer disciplines
- [x] Statistiques

### ✅ Sécurité
- [x] HttpOnly cookies
- [x] RBAC (Role-Based Access Control)
- [x] Rate limiting
- [x] Input validation (Zod)
- [x] XSS protection
- [x] CSRF protection

### ✅ Internationalisation
- [x] Français
- [x] Anglais
- [x] URLs localisées

---

## 🎯 Comptes de Test

### Admin
```
Email: admin@coachme.cm
Password: Admin123!
Accès: /admin/dashboard
```

### Coach (à créer)
```
Email: coach@test.com
Password: Coach123!
Accès: /coach/dashboard (après approbation)
```

### Client (à créer)
```
Email: client@test.com
Password: Client123!
Accès: /dashboard
```

---

## 📚 Documentation

- **GUIDE_DEMARRAGE.md** - Guide complet de démarrage
- **TESTING.md** - Guide de tests manuels
- **RESUME_PROJET.md** - Ce fichier (résumé)
- **README.md** - Documentation générale

---

## 🚨 Points d'Attention

### En Développement
⚠️ Les services externes (R2, Pusher, Upstash) utilisent des valeurs factices  
⚠️ Les emails sont loggés dans la console  
⚠️ Rate limiting peut être désactivé pour les tests  

### Pour la Production
🔴 Configurer toutes les variables d'environnement  
🔴 Générer un nouveau JWT_SECRET  
🔴 Configurer Cloudflare R2 pour les uploads  
🔴 Configurer Pusher pour le temps réel  
🔴 Configurer Upstash Redis pour rate limiting  
🔴 Configurer SMTP pour les emails  
🔴 Activer HTTPS  
🔴 Configurer les CORS  

---

## 📞 Support

Pour toute question ou problème:
1. Consulter GUIDE_DEMARRAGE.md
2. Consulter TESTING.md
3. Vérifier les logs: `pnpm dev`
4. Vérifier la DB: `pnpm prisma:studio`

---

**Projet créé avec ❤️ pour CoachMe**
