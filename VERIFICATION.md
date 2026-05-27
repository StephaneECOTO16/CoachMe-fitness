# ✅ Checklist de Vérification - CoachMe

## 📋 État du Projet

### ✅ Configuration Initiale
- [x] Dépendances installées (pnpm)
- [x] Fichier .env créé
- [x] Fichier .env.example créé
- [x] docker-compose.yml créé
- [x] Scripts de setup créés
- [x] Documentation complète créée

### ✅ Documentation Créée
- [x] QUICK_START.md - Démarrage rapide
- [x] GUIDE_DEMARRAGE.md - Guide complet
- [x] TESTING.md - Guide de tests
- [x] RESUME_PROJET.md - Résumé technique
- [x] VERIFICATION.md - Ce fichier
- [x] README.md - Mis à jour

### ⏳ À Faire pour Démarrer

#### 1. PostgreSQL
```bash
# Option A: Docker (recommandé)
docker compose up -d

# Option B: Installation locale
sudo apt install postgresql
sudo systemctl start postgresql
```

#### 2. Base de Données
```bash
pnpm prisma:generate
pnpm prisma:migrate:dev
psql -U postgres -d coachme -f scripts/create-admin.sql
```

#### 3. Lancer le Projet
```bash
pnpm dev
# Ouvrir: http://localhost:3000
```

---

## 🔍 Vérifications à Effectuer

### 1. Environnement
```bash
# Vérifier Node.js
node --version  # Doit être v18+

# Vérifier pnpm
pnpm --version  # Doit être v8+

# Vérifier Docker (optionnel)
docker --version
```

### 2. Fichiers de Configuration
```bash
# Vérifier .env
cat .env | grep DATABASE_URL

# Vérifier docker-compose.yml
cat docker-compose.yml
```

### 3. Base de Données
```bash
# Vérifier PostgreSQL
docker ps | grep postgres

# Ou si installation locale
sudo systemctl status postgresql

# Tester la connexion
psql -U postgres -h localhost -d coachme -c "SELECT 1;"
```

### 4. Prisma
```bash
# Vérifier le client Prisma
ls -la node_modules/@prisma/client

# Vérifier les migrations
ls -la prisma/migrations
```

---

## 🧪 Tests à Effectuer

### Test 1: Page d'Accueil
```
URL: http://localhost:3000
Résultat attendu: Page d'accueil s'affiche
```

### Test 2: Inscription Client
```
URL: http://localhost:3000/register
Type: "Je cherche un coach"
Email: test@client.com
Password: Test123!
Résultat attendu: Compte créé, redirection vers /login
```

### Test 3: Login Admin
```
URL: http://localhost:3000/login
Email: admin@coachme.cm
Password: Admin123!
Résultat attendu: Redirection vers /admin/dashboard
```

### Test 4: Inscription Coach
```
URL: http://localhost:3000/register
Type: "Je suis un coach sportif"
Email: test@coach.com
Password: Coach123!
Discipline: Yoga
Résultat attendu: Compte créé avec status PENDING
```

### Test 5: Approbation Coach
```
1. Login admin
2. Aller sur /admin/dashboard
3. Voir "Pending Coach Applications"
4. Cliquer "Review Application"
5. Cliquer "Approve"
Résultat attendu: Coach approuvé, visible sur /coaches
```

### Test 6: Messagerie
```
1. Login client
2. Aller sur /coaches
3. Cliquer sur un coach
4. Cliquer "Message Coach"
5. Envoyer un message
6. Login coach
7. Voir notification
8. Répondre
Résultat attendu: Messages échangés en temps réel
```

---

## 📊 Résumé des URLs

### Pages Publiques
- http://localhost:3000/ - Accueil
- http://localhost:3000/login - Connexion
- http://localhost:3000/register - Inscription
- http://localhost:3000/coaches - Liste des coachs
- http://localhost:3000/about - À propos
- http://localhost:3000/contact - Contact

### Dashboards
- http://localhost:3000/dashboard - Client
- http://localhost:3000/coach/dashboard - Coach
- http://localhost:3000/admin/dashboard - Admin

### Autres
- http://localhost:3000/messages - Messagerie
- http://localhost:3000/profile - Profil
- http://localhost:3000/settings - Paramètres

---

## 🔑 Comptes de Test

### Admin (créé via SQL)
```
Email: admin@coachme.cm
Password: Admin123!
```

### Coach (à créer)
```
Email: coach@test.com
Password: Coach123!
```

### Client (à créer)
```
Email: client@test.com
Password: Client123!
```

---

## 🚨 Problèmes Courants

### Problème: PostgreSQL ne démarre pas
```bash
# Vérifier les logs
docker logs coachme-postgres

# Redémarrer
docker compose restart

# Recréer le conteneur
docker compose down
docker compose up -d
```

### Problème: Port 3000 occupé
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
# Reset la base (⚠️ supprime les données)
pnpm prisma migrate reset

# Réappliquer
pnpm prisma:migrate:dev
```

### Problème: "Module not found"
```bash
# Réinstaller les dépendances
rm -rf node_modules
pnpm install
```

---

## 📈 Prochaines Étapes

### Développement
- [ ] Démarrer PostgreSQL
- [ ] Appliquer les migrations
- [ ] Créer un admin
- [ ] Lancer le serveur
- [ ] Tester l'inscription
- [ ] Tester le login
- [ ] Tester la messagerie

### Production
- [ ] Configurer Cloudflare R2
- [ ] Configurer Pusher
- [ ] Configurer Upstash Redis
- [ ] Configurer SMTP
- [ ] Générer nouveau JWT_SECRET
- [ ] Déployer sur Vercel
- [ ] Configurer le domaine

---

## 📞 Support

### Documentation
- QUICK_START.md - Démarrage rapide
- GUIDE_DEMARRAGE.md - Guide complet
- TESTING.md - Tests manuels
- RESUME_PROJET.md - Résumé technique

### Outils
```bash
pnpm prisma:studio    # Interface DB
docker logs coachme-postgres  # Logs PostgreSQL
pnpm dev              # Mode développement
```

---

## ✅ Checklist Finale

Avant de considérer le projet comme "prêt":

- [ ] PostgreSQL fonctionne
- [ ] Migrations appliquées
- [ ] Admin créé
- [ ] Serveur démarre sans erreur
- [ ] Page d'accueil s'affiche
- [ ] Inscription fonctionne
- [ ] Login fonctionne
- [ ] Dashboard s'affiche
- [ ] Approbation coach fonctionne
- [ ] Messagerie fonctionne

---

**État actuel: Configuration terminée, prêt pour les tests ! ✅**
