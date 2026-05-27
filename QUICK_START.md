# ⚡ Quick Start - CoachMe

## 🚀 Démarrage en 5 Minutes

### 1️⃣ Vérifier les Prérequis
```bash
node --version    # v18+ requis
pnpm --version    # v8+ requis
docker --version  # optionnel
```

### 2️⃣ Démarrer PostgreSQL
```bash
# Avec Docker (recommandé)
docker compose up -d

# Vérifier
docker ps | grep postgres
```

### 3️⃣ Configurer la Base de Données
```bash
# Générer le client Prisma
pnpm prisma:generate

# Appliquer les migrations
pnpm prisma:migrate:dev

# Créer un admin
psql -U postgres -d coachme -f scripts/create-admin.sql
```

### 4️⃣ Lancer le Projet
```bash
pnpm dev
```

### 5️⃣ Tester
```
✅ Ouvrir: http://localhost:3000
✅ Login Admin: admin@coachme.cm / Admin123!
✅ Créer un compte client: /register
✅ Créer un compte coach: /register
```

---

## 📋 Commandes Essentielles

### Développement
```bash
pnpm dev              # Démarrer le serveur (port 3000)
pnpm build            # Build pour production
pnpm start            # Démarrer en mode production
pnpm lint             # Linter
pnpm type-check       # Vérification TypeScript
```

### Base de Données
```bash
pnpm prisma:generate        # Générer le client Prisma
pnpm prisma:migrate:dev     # Créer/appliquer migrations
pnpm prisma:migrate:deploy  # Appliquer migrations (prod)
pnpm prisma:studio          # Interface graphique DB
pnpm prisma:seed            # Ajouter données de test
```

### Docker
```bash
docker compose up -d        # Démarrer PostgreSQL
docker compose down         # Arrêter PostgreSQL
docker compose restart      # Redémarrer
docker logs coachme-postgres  # Voir les logs
```

---

## 🔑 Comptes de Test

### Admin (créé via SQL)
```
URL: http://localhost:3000/login
Email: admin@coachme.cm
Password: Admin123!
→ Accès: /admin/dashboard
```

### Coach (à créer via /register)
```
URL: http://localhost:3000/register
Type: "Je suis un coach sportif"
Email: coach@test.com
Password: Coach123!
Discipline: Yoga
→ Status: PENDING (nécessite approbation admin)
```

### Client (à créer via /register)
```
URL: http://localhost:3000/register
Type: "Je cherche un coach"
Email: client@test.com
Password: Client123!
→ Accès immédiat: /dashboard
```

---

## 🗺️ URLs Principales

### Pages Publiques
```
http://localhost:3000/              # Accueil
http://localhost:3000/login         # Connexion
http://localhost:3000/register      # Inscription
http://localhost:3000/coaches       # Liste des coachs
http://localhost:3000/about         # À propos
http://localhost:3000/contact       # Contact
```

### Dashboards
```
http://localhost:3000/dashboard           # Client
http://localhost:3000/coach/dashboard     # Coach
http://localhost:3000/admin/dashboard     # Admin
```

### Autres
```
http://localhost:3000/messages      # Messagerie
http://localhost:3000/profile       # Profil
http://localhost:3000/settings      # Paramètres
```

---

## 🧪 Workflow de Test Complet

### 1. Créer et Approuver un Coach

```bash
# 1. Créer un compte coach
→ http://localhost:3000/register
→ Type: "Je suis un coach sportif"
→ Remplir le formulaire
→ Status: PENDING

# 2. Login admin
→ http://localhost:3000/login
→ admin@coachme.cm / Admin123!

# 3. Approuver le coach
→ http://localhost:3000/admin/dashboard
→ Section "Pending Coach Applications"
→ Cliquer "Review Application"
→ Cliquer "Approve"
→ Status: APPROVED

# 4. Vérifier
→ http://localhost:3000/coaches
→ Le coach est maintenant visible
```

### 2. Tester la Messagerie

```bash
# 1. Login client
→ http://localhost:3000/login
→ client@test.com / Client123!

# 2. Trouver un coach
→ http://localhost:3000/coaches
→ Cliquer sur un coach

# 3. Démarrer une conversation
→ Cliquer "Message Coach"
→ Taper un message
→ Envoyer

# 4. Login coach
→ http://localhost:3000/login
→ coach@test.com / Coach123!

# 5. Répondre
→ http://localhost:3000/messages
→ Voir la notification
→ Ouvrir la conversation
→ Répondre
```

### 3. Compléter le Profil Coach

```bash
# 1. Login coach
→ http://localhost:3000/login
→ coach@test.com / Coach123!

# 2. Aller au profil
→ http://localhost:3000/profile

# 3. Onglet "Profile"
→ Ajouter bio
→ Définir tarif: 15000 FCFA / heure
→ Expérience: 5 ans
→ Adresse: Douala, Cameroun
→ Réseaux sociaux
→ Sauvegarder

# 4. Onglet "Media"
→ Upload certificats (PDF, JPG)
→ Upload photos
→ Upload vidéos

# 5. Vérifier le profil public
→ http://localhost:3000/coaches/[userId]
```

---

## 🔧 Troubleshooting Rapide

### Problème: "Can't reach database server"
```bash
# Vérifier PostgreSQL
docker ps | grep postgres

# Redémarrer
docker compose restart

# Vérifier les logs
docker logs coachme-postgres
```

### Problème: "Prisma Client not generated"
```bash
pnpm prisma:generate
```

### Problème: "Missing environment variables"
```bash
# Vérifier .env
cat .env | grep DATABASE_URL

# Copier depuis .env.example si nécessaire
cp .env.example .env
```

### Problème: Port 3000 déjà utilisé
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
PORT=3000 pnpm dev
```

### Problème: Migrations échouent
```bash
# Reset la base de données (⚠️ supprime toutes les données)
pnpm prisma migrate reset

# Réappliquer les migrations
pnpm prisma:migrate:dev
```

---

## 📊 Structure du Projet

```
CoachMe-fitness/
├── 📄 .env                    # Variables d'environnement
├── 📄 docker-compose.yml      # PostgreSQL container
├── 📚 GUIDE_DEMARRAGE.md      # Guide complet
├── 📚 TESTING.md              # Guide de tests
├── 📚 RESUME_PROJET.md        # Résumé du projet
├── 📚 QUICK_START.md          # Ce fichier
│
├── 📁 prisma/
│   ├── schema.prisma          # Schéma de base de données
│   ├── migrations/            # Migrations SQL
│   └── seed.ts               # Données de test
│
├── 📁 scripts/
│   ├── setup-dev.sh          # Script de setup
│   └── create-admin.sql      # Créer admin
│
├── 📁 src/
│   ├── app/                  # Routes Next.js
│   │   ├── [locale]/        # Routes localisées (fr/en)
│   │   └── api/             # API endpoints
│   ├── components/          # Composants React
│   ├── contexts/            # React Context
│   ├── lib/                 # Utilitaires
│   └── services/            # Logique métier
│
├── 📁 messages/             # Traductions
│   ├── en.json
│   └── fr.json
│
└── 📁 public/               # Assets statiques
```

---

## 🎯 Fonctionnalités Clés

### ✅ Authentification
- Inscription client/coach
- Login avec JWT (HttpOnly cookies)
- Mot de passe oublié
- Rate limiting (5 tentatives/min)

### ✅ Profils
- Profil client (objectifs, mesures)
- Profil coach (bio, tarifs, expérience)
- Upload médias (certificats, photos, vidéos)

### ✅ Recherche
- Liste des coachs approuvés
- Filtres (discipline, tarif, note)
- Profil public détaillé

### ✅ Messagerie
- Conversations 1-to-1
- Temps réel (Pusher)
- Notifications
- Statut lu/non lu

### ✅ Administration
- Dashboard avec statistiques
- Approuver/rejeter coachs
- Gérer utilisateurs
- Gérer disciplines

### ✅ Sécurité
- HttpOnly cookies (anti-XSS)
- RBAC (Role-Based Access Control)
- Rate limiting
- Input validation (Zod)

### ✅ Multilingue
- Français
- Anglais
- URLs localisées

---

## 🌐 Langues

### Changer de langue
```
Français: http://localhost:3000/fr
Anglais:  http://localhost:3000/en
```

### Ajouter une traduction
```
1. Modifier messages/fr.json
2. Modifier messages/en.json
3. Utiliser dans le code: t('key')
```

---

## 📦 Technologies Utilisées

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- React Hook Form + Zod

### Backend
- Next.js API Routes
- Prisma ORM
- PostgreSQL
- JWT (jsonwebtoken)
- bcrypt

### Infrastructure
- Cloudflare R2 (Storage)
- Pusher (Real-time)
- Upstash Redis (Rate limiting)
- SMTP (Emails)

---

## 🔐 Sécurité

### Bonnes Pratiques Implémentées
✅ Passwords hashés avec bcrypt (12 rounds)  
✅ JWT dans HttpOnly cookies (anti-XSS)  
✅ Rate limiting sur login/register  
✅ Validation des entrées (Zod)  
✅ RBAC sur toutes les routes  
✅ CSRF protection (SameSite cookies)  
✅ SQL injection protection (Prisma)  

### À Configurer en Production
🔴 HTTPS obligatoire  
🔴 Nouveau JWT_SECRET (64+ chars)  
🔴 CORS configuré  
🔴 Rate limiting strict  
🔴 Monitoring des erreurs  

---

## 📈 Prochaines Étapes

### Développement
1. ✅ Configurer PostgreSQL
2. ✅ Lancer les migrations
3. ✅ Créer un admin
4. ✅ Tester l'inscription
5. ✅ Tester l'approbation coach
6. ✅ Tester la messagerie

### Production
1. ⬜ Configurer Cloudflare R2
2. ⬜ Configurer Pusher
3. ⬜ Configurer Upstash Redis
4. ⬜ Configurer SMTP
5. ⬜ Déployer sur Vercel
6. ⬜ Configurer le domaine
7. ⬜ Tests de charge

---

## 📞 Aide

### Documentation
- **GUIDE_DEMARRAGE.md** - Guide complet et détaillé
- **TESTING.md** - Tests manuels complets
- **RESUME_PROJET.md** - Résumé technique
- **QUICK_START.md** - Ce fichier (démarrage rapide)

### Outils Utiles
```bash
pnpm prisma:studio    # Interface graphique DB
docker logs -f coachme-postgres  # Logs PostgreSQL
pnpm dev              # Mode développement avec hot reload
```

### Logs
```bash
# Logs du serveur Next.js
→ Terminal où vous avez lancé "pnpm dev"

# Logs PostgreSQL
docker logs coachme-postgres

# Logs Prisma
→ Activés en mode développement dans la console
```

---

## 🎉 C'est Parti !

```bash
# Tout en une commande
docker compose up -d && \
pnpm prisma:generate && \
pnpm prisma:migrate:dev && \
psql -U postgres -d coachme -f scripts/create-admin.sql && \
pnpm dev
```

**Ouvrez http://localhost:3000 et commencez à tester ! 🚀**

---

**Bon développement ! 💪**
