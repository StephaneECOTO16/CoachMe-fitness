# 🚀 Guide de Démarrage - CoachMe Fitness

## 📋 Table des Matières
1. [Vue d'ensemble du projet](#vue-densemble)
2. [Architecture et Technologies](#architecture)
3. [Installation et Configuration](#installation)
4. [Démarrage du Projet](#démarrage)
5. [Test du Login et Fonctionnalités](#test-login)
6. [URLs et Routes Principales](#urls-principales)
7. [Rôles et Permissions](#rôles)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble du projet {#vue-densemble}

**CoachMe** est une plateforme full-stack qui connecte des coachs sportifs certifiés avec des clients au Cameroun.

### Fonctionnalités Principales

#### 👨‍💼 Administration
- Système d'approbation/rejet des coachs
- Gestion des utilisateurs (coachs et clients)
- Gestion des disciplines sportives
- Statistiques et monitoring de la plateforme

#### 👨‍🏫 Coachs
- Inscription avec upload de certifications
- Gestion de portfolio (photos, vidéos, certificats)
- Communication directe avec les clients
- Profil personnalisable avec tarifs et expérience

#### 🏃 Clients
- Recherche de coachs par discipline
- Messagerie en temps réel avec les coachs
- Profil personnalisé avec objectifs fitness
- Historique des conversations

---

## 🏗️ Architecture et Technologies {#architecture}

### Stack Technique

**Frontend & Backend:**
- **Framework:** Next.js 16 (App Router) avec TypeScript
- **Styling:** Tailwind CSS 4
- **Validation:** Zod + React Hook Form
- **Internationalisation:** next-intl (Français/Anglais)

**Base de Données:**
- **Database:** PostgreSQL
- **ORM:** Prisma 6.7.0
- **Migrations:** Prisma Migrate

**Authentification:**
- **Type:** JWT (JSON Web Tokens)
- **Stockage:** HttpOnly Cookies (sécurisé contre XSS)
- **RBAC:** Role-Based Access Control (ADMIN, COACH, PROSPECT)

**Infrastructure:**
- **Storage:** Cloudflare R2 (S3-compatible) pour médias
- **Real-time:** Pusher pour messagerie instantanée
- **Rate Limiting:** Upstash Redis
- **Email:** SMTP (Nodemailer)

### Structure du Projet

```
CoachMe-fitness/
├── prisma/
│   ├── schema.prisma          # Schéma de base de données
│   ├── migrations/            # Migrations SQL
│   └── seed.ts               # Données de test
├── src/
│   ├── app/
│   │   ├── [locale]/         # Routes localisées (fr/en)
│   │   │   ├── login/        # Page de connexion
│   │   │   ├── register/     # Page d'inscription
│   │   │   ├── dashboard/    # Tableau de bord client
│   │   │   ├── coach/        # Dashboard coach
│   │   │   ├── admin/        # Panel admin
│   │   │   ├── coaches/      # Liste et profils coachs
│   │   │   ├── messages/     # Messagerie
│   │   │   └── profile/      # Profil utilisateur
│   │   └── api/              # API Routes
│   │       ├── auth/         # Authentification
│   │       ├── coach/        # Endpoints coachs
│   │       ├── admin/        # Endpoints admin
│   │       └── chat/         # Messagerie
│   ├── components/           # Composants React
│   ├── contexts/            # Context API (Auth, etc.)
│   ├── lib/                 # Utilitaires
│   │   ├── auth/           # JWT, cookies, sessions
│   │   ├── db/             # Prisma client
│   │   ├── storage/        # R2/S3 uploads
│   │   ├── mail/           # Templates email
│   │   └── validation/     # Schémas Zod
│   └── services/           # Logique métier
├── messages/               # Traductions (en.json, fr.json)
└── public/                # Assets statiques
```

---

## 💻 Installation et Configuration {#installation}

### Prérequis

- **Node.js:** 18+ (recommandé: 20+)
- **pnpm:** Gestionnaire de paquets (déjà installé: v10.32.0)
- **PostgreSQL:** 14+ (via Docker ou installation locale)
- **Docker:** (optionnel) pour PostgreSQL

### Étape 1: Installation des Dépendances

Les dépendances sont déjà installées. Si besoin de réinstaller:

```bash
pnpm install
```

### Étape 2: Configuration PostgreSQL

#### Option A: Avec Docker (Recommandé)

```bash
# Démarrer PostgreSQL
docker compose up -d

# Vérifier que le conteneur fonctionne
docker ps | grep postgres

# Logs du conteneur
docker logs coachme-postgres
```

#### Option B: Installation Locale

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Créer la base de données
sudo -u postgres psql
CREATE DATABASE coachme;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE coachme TO postgres;
\q
```

### Étape 3: Configuration des Variables d'Environnement

Le fichier `.env` a été créé avec des valeurs de développement. Pour la production, vous devez configurer:

**Variables Critiques à Configurer:**

```bash
# Base de données (si différent)
DATABASE_URL="postgresql://user:password@host:5432/coachme"
POSTGRES_PRISMA_URL="postgresql://user:password@host:5432/coachme?pgbouncer=true"

# JWT Secret (IMPORTANT: Générer un nouveau secret)
JWT_SECRET=$(openssl rand -hex 64)

# Cloudflare R2 (pour upload de médias)
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_BUCKET_NAME="your-bucket"
R2_ACCESS_KEY_ID="your-key"
R2_SECRET_ACCESS_KEY="your-secret"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"

# Pusher (messagerie temps réel)
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="mt1"
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="mt1"

# SMTP (emails)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT="2525"
SMTP_USER="your-username"
SMTP_PASS="your-password"
ADMIN_EMAIL="admin@coachme.cm"

# Upstash Redis (rate limiting)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### Étape 4: Initialisation de la Base de Données

```bash
# Générer le client Prisma (déjà fait)
pnpm prisma:generate

# Appliquer les migrations
pnpm prisma:migrate:dev

# (Optionnel) Seed avec des données de test
pnpm prisma:seed
```

---

## 🚀 Démarrage du Projet {#démarrage}

### Mode Développement

```bash
# Démarrer le serveur de développement
pnpm dev
```

Le projet sera accessible sur: **http://localhost:3000**

### Autres Commandes Utiles

```bash
# Build pour production
pnpm build

# Démarrer en mode production
pnpm start

# Linter
pnpm lint

# Type checking
pnpm type-check

# Prisma Studio (interface graphique DB)
pnpm prisma:studio
```

---

## 🧪 Test du Login et Fonctionnalités {#test-login}

### 1. Créer un Compte Client (PROSPECT)

**URL:** http://localhost:3000/register (ou http://localhost:3000/fr/register)

**Étapes:**
1. Sélectionner "Je cherche un coach"
2. Remplir le formulaire:
   - Nom complet: `Jean Dupont`
   - Email: `jean@test.com`
   - Téléphone: `+237659037423` (optionnel)
   - Mot de passe: `Test123!` (min 8 chars, majuscule, minuscule, chiffre)
   - Confirmer le mot de passe
3. Informations additionnelles (optionnel):
   - Tranche d'âge: `26-35`
   - Taille: `175` cm
   - Poids: `70` kg
   - Objectifs: `Perte de poids et gain musculaire`
4. Accepter les conditions
5. Cliquer sur "Créer un Compte"

**Résultat:** Redirection vers `/login` avec message de succès

### 2. Créer un Compte Coach

**URL:** http://localhost:3000/register

**Étapes:**
1. Sélectionner "Je suis un coach sportif"
2. Remplir le formulaire:
   - Nom complet: `Marie Coach`
   - Email: `marie@coach.com`
   - Téléphone: `+237659037424` (requis pour coachs)
   - Mot de passe: `Coach123!`
   - Discipline: Sélectionner une discipline (ex: Yoga, CrossFit)
   - Bio: `Coach certifiée avec 5 ans d'expérience...`
   - Portfolio: `https://mariecoach.com` (optionnel)
3. Accepter les conditions
4. Cliquer sur "Créer un Compte"

**Résultat:** 
- Compte créé avec statut `PENDING`
- Email envoyé au coach et à l'admin
- Redirection vers `/login`

### 3. Se Connecter

**URL:** http://localhost:3000/login

**Étapes:**
1. Entrer l'email: `jean@test.com`
2. Entrer le mot de passe: `Test123!`
3. (Optionnel) Cocher "Se souvenir de moi"
4. Cliquer sur "Se Connecter"

**Résultat:** Redirection automatique selon le rôle:
- **PROSPECT** → `/dashboard` (tableau de bord client)
- **COACH** → `/coach/dashboard` (si approuvé) ou modal d'attente
- **ADMIN** → `/admin/dashboard`

### 4. Tester le Mot de Passe Oublié

**URL:** http://localhost:3000/forgot-password

**Étapes:**
1. Entrer l'email: `jean@test.com`
2. Cliquer sur "Envoyer le lien"
3. Vérifier l'email (ou les logs en dev)
4. Cliquer sur le lien de réinitialisation
5. Entrer un nouveau mot de passe
6. Se reconnecter

### 5. Créer un Compte Admin (Via Base de Données)

```bash
# Ouvrir Prisma Studio
pnpm prisma:studio

# Ou via SQL
psql -U postgres -d coachme

# Créer un admin
INSERT INTO "User" (id, email, password, role, name, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@coachme.cm',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7LjT.NSHoy', -- password: Admin123!
  'ADMIN',
  'Admin CoachMe',
  NOW(),
  NOW()
);
```

**Login Admin:**
- Email: `admin@coachme.cm`
- Password: `Admin123!`

### 6. Workflow Complet: Client → Coach

#### A. En tant que Client

1. **Login** → http://localhost:3000/login
2. **Parcourir les coachs** → http://localhost:3000/coaches
3. **Filtrer par discipline** → Sélectionner une discipline
4. **Voir profil coach** → Cliquer sur un coach
5. **Démarrer conversation** → Cliquer "Contacter le Coach"
6. **Envoyer message** → Taper et envoyer un message
7. **Voir conversations** → http://localhost:3000/messages

#### B. En tant que Coach (après approbation)

1. **Login** → http://localhost:3000/login
2. **Dashboard** → http://localhost:3000/coach/dashboard
3. **Compléter profil** → http://localhost:3000/profile
   - Ajouter bio, tarifs, expérience
   - Upload certificats, photos, vidéos
4. **Voir messages** → http://localhost:3000/messages
5. **Répondre aux clients**

#### C. En tant qu'Admin

1. **Login** → http://localhost:3000/login
2. **Dashboard Admin** → http://localhost:3000/admin/dashboard
3. **Voir coachs en attente** → Section "Pending Coach Applications"
4. **Examiner candidature** → Cliquer "Review Application"
5. **Approuver/Rejeter:**
   - **Approuver:** Cliquer "Approve" → Coach devient visible
   - **Rejeter:** Cliquer "Reject" → Entrer raison → Confirmer
6. **Gérer utilisateurs** → http://localhost:3000/admin/users
7. **Gérer disciplines** → http://localhost:3000/admin/disciplines

---

## 🔗 URLs et Routes Principales {#urls-principales}

### Pages Publiques (Non authentifié)

| URL | Description | Langues |
|-----|-------------|---------|
| `/` | Page d'accueil | ✅ fr/en |
| `/login` | Connexion | ✅ fr/en |
| `/register` | Inscription | ✅ fr/en |
| `/forgot-password` | Mot de passe oublié | ✅ fr/en |
| `/reset-password?token=xxx` | Réinitialisation | ✅ fr/en |
| `/coaches` | Liste des coachs | ✅ fr/en |
| `/coaches/[userId]` | Profil coach public | ✅ fr/en |
| `/about` | À propos | ✅ fr/en |
| `/contact` | Contact | ✅ fr/en |
| `/terms` | Conditions d'utilisation | ✅ fr/en |
| `/privacy` | Politique de confidentialité | ✅ fr/en |

### Routes Client (PROSPECT)

| URL | Description | Protection |
|-----|-------------|------------|
| `/dashboard` | Tableau de bord client | 🔒 PROSPECT |
| `/messages` | Liste conversations | 🔒 PROSPECT |
| `/messages/[chatId]` | Conversation spécifique | 🔒 PROSPECT |
| `/profile` | Profil utilisateur | 🔒 PROSPECT |
| `/settings` | Paramètres compte | 🔒 PROSPECT |

### Routes Coach

| URL | Description | Protection |
|-----|-------------|------------|
| `/coach/dashboard` | Dashboard coach | 🔒 COACH |
| `/messages` | Messagerie | 🔒 COACH |
| `/profile` | Profil + médias | 🔒 COACH |
| `/settings` | Paramètres | 🔒 COACH |

### Routes Admin

| URL | Description | Protection |
|-----|-------------|------------|
| `/admin/dashboard` | Dashboard admin | 🔒 ADMIN |
| `/admin/coaches` | Gestion coachs | 🔒 ADMIN |
| `/admin/coaches/[coachId]` | Détail coach | 🔒 ADMIN |
| `/admin/users` | Gestion utilisateurs | 🔒 ADMIN |
| `/admin/disciplines` | Gestion disciplines | 🔒 ADMIN |
| `/admin/messages` | Monitoring messages | 🔒 ADMIN |

### API Endpoints

#### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Session actuelle
- `POST /api/auth/forgot-password` - Demande reset
- `POST /api/auth/reset-password` - Reset password

#### Coachs
- `GET /api/coaches` - Liste coachs (publique)
- `GET /api/coaches/[userId]` - Profil coach
- `POST /api/coach/onboarding` - Compléter profil
- `POST /api/coach/media` - Upload médias

#### Chat
- `GET /api/chat` - Liste conversations
- `POST /api/chat` - Créer conversation
- `GET /api/chat/[chatId]` - Messages
- `POST /api/chat/[chatId]` - Envoyer message

#### Admin
- `GET /api/admin/stats` - Statistiques
- `GET /api/admin/coaches` - Coachs en attente
- `POST /api/admin/coaches/[coachId]/approve` - Approuver
- `POST /api/admin/coaches/[coachId]/reject` - Rejeter
- `GET /api/admin/users` - Liste utilisateurs
- `DELETE /api/admin/users/[userId]` - Supprimer user

---

## 👥 Rôles et Permissions {#rôles}

### PROSPECT (Client)
✅ Parcourir les coachs  
✅ Voir profils coachs publics  
✅ Envoyer messages aux coachs  
✅ Gérer son profil client  
❌ Accès admin  
❌ Accès dashboard coach  

### COACH
✅ Dashboard coach  
✅ Gérer profil (bio, tarifs, médias)  
✅ Recevoir/envoyer messages  
✅ Upload certificats/photos/vidéos  
❌ Accès admin  
❌ Voir autres coachs en attente  

**Note:** Les coachs avec statut `PENDING` peuvent accéder à leur dashboard mais ne sont pas visibles publiquement.

### ADMIN
✅ Accès complet à toutes les routes  
✅ Approuver/rejeter coachs  
✅ Gérer utilisateurs (supprimer, modifier)  
✅ Gérer disciplines  
✅ Voir statistiques plateforme  
✅ Monitoring conversations  

---

## 🔧 Troubleshooting {#troubleshooting}

### Problème: "Missing required environment variables"

**Solution:**
```bash
# Vérifier que .env existe
ls -la .env

# Vérifier les variables
cat .env | grep -E "DATABASE_URL|JWT_SECRET"

# Copier depuis .env.example si nécessaire
cp .env.example .env
```

### Problème: "Can't reach database server"

**Solution:**
```bash
# Vérifier PostgreSQL
docker ps | grep postgres

# Redémarrer le conteneur
docker compose restart

# Vérifier la connexion
psql -U postgres -h localhost -d coachme
```

### Problème: "Prisma Client not generated"

**Solution:**
```bash
pnpm prisma:generate
```

### Problème: "Invalid credentials" lors du login

**Causes possibles:**
1. Email/mot de passe incorrect
2. Compte n'existe pas
3. Hash du mot de passe corrompu

**Solution:**
```bash
# Vérifier l'utilisateur dans la DB
pnpm prisma:studio

# Ou créer un nouveau compte via /register
```

### Problème: Coach ne peut pas accéder au dashboard

**Cause:** Statut `PENDING` ou `REJECTED`

**Solution:**
1. Login en tant qu'admin
2. Aller sur `/admin/coaches`
3. Approuver le coach

### Problème: Upload de médias échoue

**Cause:** Configuration R2 invalide

**Solution temporaire:**
Les uploads échoueront en dev sans vraie config R2. Pour tester:
1. Créer un compte Cloudflare R2 (gratuit)
2. Configurer les variables R2 dans `.env`
3. Ou utiliser un mock local (à implémenter)

### Problème: Messagerie temps réel ne fonctionne pas

**Cause:** Configuration Pusher invalide

**Solution:**
1. Créer un compte Pusher (gratuit)
2. Configurer les variables PUSHER dans `.env`
3. Redémarrer le serveur

### Problème: Emails ne sont pas envoyés

**Cause:** Configuration SMTP invalide

**Solution dev:**
1. Utiliser Mailtrap.io (gratuit)
2. Configurer SMTP_* variables
3. Les emails apparaîtront dans Mailtrap

**Note:** En dev, les tokens de reset password sont loggés dans la console.

---

## 📊 Données de Test

### Créer des Disciplines

```sql
INSERT INTO "Discipline" (name, "imageUrl", "createdAt", "updatedAt") VALUES
('Yoga', NULL, NOW(), NOW()),
('CrossFit', NULL, NOW(), NOW()),
('Musculation', NULL, NOW(), NOW()),
('Cardio', NULL, NOW(), NOW()),
('Pilates', NULL, NOW(), NOW());
```

### Comptes de Test Recommandés

1. **Admin:** admin@coachme.cm / Admin123!
2. **Coach:** coach@test.com / Coach123!
3. **Client:** client@test.com / Client123!

---

## 🎉 Prochaines Étapes

1. ✅ Configurer PostgreSQL
2. ✅ Lancer les migrations
3. ✅ Créer un compte admin
4. ✅ Créer des disciplines
5. ✅ Tester l'inscription client
6. ✅ Tester l'inscription coach
7. ✅ Approuver un coach (admin)
8. ✅ Tester la messagerie
9. ✅ Upload de médias (si R2 configuré)
10. ✅ Tester en production

---

**Bon développement! 🚀**
