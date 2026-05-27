# 🧪 Guide de Test - CoachMe

## Tests Manuels Complets

### 1. Test d'Inscription et Authentification

#### Test 1.1: Inscription Client
```
URL: http://localhost:3000/register
Langue: Français

Données:
- Type: "Je cherche un coach"
- Nom: Jean Dupont
- Email: jean.dupont@test.com
- Téléphone: +237659037423
- Mot de passe: Test123!
- Confirmer: Test123!
- Tranche d'âge: 26-35
- Taille: 175 cm
- Poids: 70 kg
- Objectifs: "Perte de poids et gain musculaire"
- ✓ Accepter les conditions

Résultat attendu:
✅ Message de succès
✅ Redirection vers /login
✅ Email de bienvenue envoyé (vérifier logs)
```

#### Test 1.2: Inscription Coach
```
URL: http://localhost:3000/register

Données:
- Type: "Je suis un coach sportif"
- Nom: Marie Coach
- Email: marie.coach@test.com
- Téléphone: +237659037424 (REQUIS)
- Mot de passe: Coach123!
- Discipline: Yoga
- Bio: "Coach certifiée avec 5 ans d'expérience en Yoga et Pilates"
- Portfolio: https://mariecoach.com
- ✓ Accepter les conditions

Résultat attendu:
✅ Compte créé avec statut PENDING
✅ Email au coach (attente approbation)
✅ Email à l'admin (nouvelle candidature)
✅ Redirection vers /login
```

#### Test 1.3: Login Client
```
URL: http://localhost:3000/login

Données:
- Email: jean.dupont@test.com
- Mot de passe: Test123!

Résultat attendu:
✅ Connexion réussie
✅ Cookie HttpOnly défini
✅ Redirection vers /dashboard
✅ Affichage du nom dans la navbar
```

#### Test 1.4: Login Coach (Pending)
```
URL: http://localhost:3000/login

Données:
- Email: marie.coach@test.com
- Mot de passe: Coach123!

Résultat attendu:
✅ Connexion réussie
✅ Modal "Compte en attente d'approbation"
✅ Accès au profil mais pas visible publiquement
```

#### Test 1.5: Mot de Passe Oublié
```
URL: http://localhost:3000/forgot-password

Étapes:
1. Entrer email: jean.dupont@test.com
2. Cliquer "Envoyer le lien"
3. Vérifier email/logs pour le token
4. Ouvrir: http://localhost:3000/reset-password?token=XXX
5. Entrer nouveau mot de passe: NewTest123!
6. Confirmer
7. Se reconnecter avec nouveau mot de passe

Résultat attendu:
✅ Email de reset envoyé
✅ Token valide pendant 1h
✅ Mot de passe changé
✅ Anciens tokens invalidés
✅ Login avec nouveau mot de passe fonctionne
```

---

### 2. Test du Workflow Admin

#### Test 2.1: Créer un Admin
```bash
# Via Prisma Studio
pnpm prisma:studio

# Ou via SQL
psql -U postgres -d coachme -f scripts/create-admin.sql

Credentials:
- Email: admin@coachme.cm
- Password: Admin123!
```

#### Test 2.2: Login Admin
```
URL: http://localhost:3000/login

Données:
- Email: admin@coachme.cm
- Mot de passe: Admin123!

Résultat attendu:
✅ Connexion réussie
✅ Redirection vers /admin/dashboard
✅ Affichage des statistiques
✅ Liste des coachs en attente
```

#### Test 2.3: Approuver un Coach
```
URL: http://localhost:3000/admin/dashboard

Étapes:
1. Voir section "Pending Coach Applications"
2. Cliquer "Review Application" sur Marie Coach
3. Vérifier les informations:
   - Bio
   - Discipline
   - Portfolio
   - Certificats (si uploadés)
4. Cliquer "Approve"

Résultat attendu:
✅ Statut passe à APPROVED
✅ Email de félicitations envoyé au coach
✅ Coach visible sur /coaches
✅ Coach peut accéder à /coach/dashboard
```

#### Test 2.4: Rejeter un Coach
```
URL: http://localhost:3000/admin/coaches/[coachId]

Étapes:
1. Cliquer "Reject"
2. Entrer raison: "Certificats manquants ou non valides"
3. Confirmer

Résultat attendu:
✅ Statut passe à REJECTED
✅ Email avec raison envoyé au coach
✅ Coach ne peut pas être vu publiquement
✅ Coach peut mettre à jour son profil et resoumettre
```

#### Test 2.5: Gérer les Utilisateurs
```
URL: http://localhost:3000/admin/users

Tests:
1. Rechercher un utilisateur par nom/email
2. Filtrer par rôle (COACH, PROSPECT, ADMIN)
3. Voir détails d'un utilisateur
4. Supprimer un utilisateur (avec confirmation)

Résultat attendu:
✅ Recherche fonctionne
✅ Filtres appliqués correctement
✅ Modal de détails affiche toutes les infos
✅ Suppression avec confirmation
✅ Données associées supprimées (cascade)
```

#### Test 2.6: Gérer les Disciplines
```
URL: http://localhost:3000/admin/disciplines

Tests:
1. Créer une nouvelle discipline:
   - Nom: "Zumba"
   - Image: Upload une image
2. Modifier une discipline existante
3. Supprimer une discipline (sans coachs assignés)

Résultat attendu:
✅ Discipline créée avec image
✅ Modification sauvegardée
✅ Suppression réussie si aucun coach
✅ Erreur si des coachs sont assignés
```

---

### 3. Test du Profil Coach

#### Test 3.1: Compléter le Profil Coach
```
Login: marie.coach@test.com / Coach123!
URL: http://localhost:3000/profile

Étapes:
1. Onglet "Profile"
   - Bio: Ajouter description détaillée
   - Tarif: 15000 FCFA
   - Type: Par heure
   - Expérience: 5 ans
   - Adresse: Douala, Cameroun
   - Ville: Douala
   - Pays: Cameroon

2. Réseaux sociaux:
   - Instagram: https://instagram.com/mariecoach
   - Facebook: https://facebook.com/mariecoach
   - YouTube: https://youtube.com/@mariecoach

3. Cliquer "Save Coach Profile"

Résultat attendu:
✅ Profil sauvegardé
✅ Message de succès
✅ Données visibles sur profil public
```

#### Test 3.2: Upload de Médias
```
URL: http://localhost:3000/profile
Onglet: Media

Tests:
1. Upload Certificats (PDF, JPG):
   - Certification Yoga Alliance
   - Diplôme Sport Science
   
2. Upload Photos (JPG, PNG):
   - Photo de profil
   - Photos de sessions
   - Photos de l'espace d'entraînement

3. Upload Vidéos (MP4):
   - Vidéo de présentation
   - Vidéo d'une session

Résultat attendu:
✅ Upload réussi vers R2
✅ Médias affichés dans le profil
✅ Médias visibles sur profil public
✅ Possibilité de supprimer
```

#### Test 3.3: Changer l'Avatar
```
URL: http://localhost:3000/profile
Onglet: Account

Étapes:
1. Cliquer "Change Avatar"
2. Upload une photo (max 5MB)
3. Recadrer si nécessaire
4. Sauvegarder

Résultat attendu:
✅ Avatar uploadé
✅ Visible dans navbar
✅ Visible sur profil public
✅ Compression automatique
```

---

### 4. Test de Recherche et Découverte

#### Test 4.1: Parcourir les Coachs
```
URL: http://localhost:3000/coaches

Tests:
1. Voir tous les coachs approuvés
2. Vérifier que les coachs PENDING ne sont pas visibles
3. Vérifier les informations affichées:
   - Nom
   - Discipline
   - Tarif
   - Expérience
   - Badge "Certifié"
   - Badge "Portfolio"

Résultat attendu:
✅ Seuls les coachs APPROVED sont visibles
✅ Cartes affichent les bonnes infos
✅ Images chargées correctement
```

#### Test 4.2: Filtrer les Coachs
```
URL: http://localhost:3000/coaches

Tests:
1. Filtrer par discipline: Yoga
2. Filtrer par tarif max: 20000 FCFA
3. Filtrer par type de tarif: Horaire
4. Filtrer par note minimale: 4.0
5. Combiner plusieurs filtres
6. Réinitialiser les filtres

Résultat attendu:
✅ Filtres appliqués correctement
✅ Nombre de résultats mis à jour
✅ Message si aucun résultat
✅ Reset restaure tous les coachs
```

#### Test 4.3: Voir Profil Coach Public
```
URL: http://localhost:3000/coaches/[userId]

Vérifier:
1. Onglet Overview:
   - Bio complète
   - Tarifs
   - Expérience
   - Localisation
   - Réseaux sociaux

2. Onglet Certifications:
   - Liste des certificats
   - Possibilité de voir/télécharger

3. Onglet Media:
   - Galerie photos
   - Vidéos

4. Bouton "Message Coach"

Résultat attendu:
✅ Toutes les infos affichées
✅ Médias chargés
✅ Bouton message visible (si connecté)
✅ Partage de profil fonctionne
```

---

### 5. Test de Messagerie

#### Test 5.1: Démarrer une Conversation (Client)
```
Login: jean.dupont@test.com / Test123!
URL: http://localhost:3000/coaches/[marie-coach-id]

Étapes:
1. Cliquer "Message Coach"
2. Vérifier redirection vers /messages/[chatId]
3. Taper message: "Bonjour, je suis intéressé par vos cours de Yoga"
4. Envoyer

Résultat attendu:
✅ Chat créé
✅ Message envoyé
✅ Message visible immédiatement
✅ Notification temps réel (Pusher)
```

#### Test 5.2: Répondre (Coach)
```
Login: marie.coach@test.com / Coach123!
URL: http://localhost:3000/messages

Étapes:
1. Voir la nouvelle conversation avec Jean
2. Badge de notification (message non lu)
3. Ouvrir la conversation
4. Lire le message
5. Répondre: "Bonjour Jean! Je serais ravie de vous accompagner..."
6. Envoyer

Résultat attendu:
✅ Notification visible
✅ Message marqué comme lu
✅ Réponse envoyée
✅ Client reçoit notification temps réel
```

#### Test 5.3: Conversation Continue
```
Tests:
1. Envoyer plusieurs messages
2. Vérifier l'ordre chronologique
3. Vérifier les timestamps
4. Vérifier le statut "lu/non lu"
5. Vérifier l'indicateur "en train d'écrire..."

Résultat attendu:
✅ Messages dans le bon ordre
✅ Timestamps corrects
✅ Statuts mis à jour
✅ Indicateur typing fonctionne (Pusher)
```

#### Test 5.4: Liste des Conversations
```
URL: http://localhost:3000/messages

Vérifier:
1. Liste de toutes les conversations
2. Dernier message affiché
3. Badge de messages non lus
4. Tri par dernière activité
5. Recherche de conversations

Résultat attendu:
✅ Toutes les conversations listées
✅ Aperçu du dernier message
✅ Compteur de non lus
✅ Tri correct
✅ Recherche fonctionne
```

---

### 6. Test du Dashboard

#### Test 6.1: Dashboard Client
```
Login: jean.dupont@test.com / Test123!
URL: http://localhost:3000/dashboard

Vérifier:
1. Message de bienvenue personnalisé
2. Section "Mes Coachs" (coachs contactés)
3. Section "Conversations récentes"
4. Actions rapides:
   - Parcourir les coachs
   - Messages
   - Mon profil

Résultat attendu:
✅ Nom affiché correctement
✅ Coachs contactés listés
✅ Conversations récentes affichées
✅ Liens fonctionnent
```

#### Test 6.2: Dashboard Coach
```
Login: marie.coach@test.com / Coach123!
URL: http://localhost:3000/coach/dashboard

Vérifier:
1. Statistiques:
   - Nombre de clients
   - Messages non lus
   - Profil complété (%)
2. Conversations récentes
3. Actions rapides
4. Statut du profil

Résultat attendu:
✅ Stats correctes
✅ Conversations affichées
✅ Indicateur de profil complété
✅ Liens fonctionnent
```

---

### 7. Test des Paramètres

#### Test 7.1: Changer le Mot de Passe
```
URL: http://localhost:3000/settings

Étapes:
1. Entrer mot de passe actuel
2. Entrer nouveau mot de passe: NewPass123!
3. Confirmer nouveau mot de passe
4. Sauvegarder
5. Se déconnecter
6. Se reconnecter avec nouveau mot de passe

Résultat attendu:
✅ Mot de passe changé
✅ Tokens de reset invalidés
✅ Login avec nouveau mot de passe fonctionne
✅ Ancien mot de passe ne fonctionne plus
```

#### Test 7.2: Supprimer le Compte
```
URL: http://localhost:3000/settings

Étapes:
1. Cliquer "Delete Account"
2. Confirmer l'action
3. Entrer mot de passe
4. Confirmer suppression

Résultat attendu:
✅ Compte supprimé
✅ Données associées supprimées (cascade)
✅ Redirection vers page d'accueil
✅ Impossible de se reconnecter
```

---

### 8. Test de Sécurité

#### Test 8.1: Protection des Routes
```
Tests (sans être connecté):
1. Accéder à /dashboard → Redirection vers /login
2. Accéder à /admin/dashboard → Redirection vers /login
3. Accéder à /messages → Redirection vers /login
4. Accéder à /profile → Redirection vers /login

Tests (connecté en tant que CLIENT):
1. Accéder à /admin/dashboard → Erreur 403
2. Accéder à /coach/dashboard → Erreur 403

Tests (connecté en tant que COACH):
1. Accéder à /admin/dashboard → Erreur 403

Résultat attendu:
✅ Routes protégées correctement
✅ Redirections appropriées
✅ Messages d'erreur clairs
```

#### Test 8.2: Rate Limiting
```
Test:
1. Faire 10 tentatives de login rapides avec mauvais mot de passe

Résultat attendu:
✅ Après 5 tentatives: Message "Too many attempts"
✅ Blocage pendant 1 minute
✅ Possibilité de réessayer après le délai
```

#### Test 8.3: Validation des Entrées
```
Tests:
1. Email invalide: "notanemail"
2. Mot de passe faible: "123"
3. Téléphone invalide: "123456"
4. URL invalide dans portfolio: "not-a-url"

Résultat attendu:
✅ Messages d'erreur clairs
✅ Validation côté client (Zod)
✅ Validation côté serveur
✅ Pas de soumission si invalide
```

---

### 9. Test Multilingue

#### Test 9.1: Changement de Langue
```
Tests:
1. Accéder à http://localhost:3000 (français par défaut)
2. Changer pour anglais: http://localhost:3000/en
3. Vérifier toutes les pages en anglais
4. Revenir au français: http://localhost:3000/fr

Résultat attendu:
✅ Langue détectée automatiquement
✅ Toutes les traductions affichées
✅ URLs localisées (/fr/login, /en/login)
✅ Préférence sauvegardée
```

---

### 10. Test de Performance

#### Test 10.1: Temps de Chargement
```
Tests:
1. Page d'accueil: < 2s
2. Liste des coachs: < 3s
3. Profil coach: < 2s
4. Dashboard: < 2s

Outils: Chrome DevTools → Network
```

#### Test 10.2: Optimisation Images
```
Vérifier:
1. Images converties en WebP
2. Images responsive (srcset)
3. Lazy loading activé
4. Compression appliquée

Outils: Chrome DevTools → Network → Img
```

---

## Checklist Complète

### Authentification
- [ ] Inscription client
- [ ] Inscription coach
- [ ] Login client
- [ ] Login coach
- [ ] Login admin
- [ ] Mot de passe oublié
- [ ] Reset password
- [ ] Logout
- [ ] Session persistante

### Profils
- [ ] Voir profil client
- [ ] Modifier profil client
- [ ] Voir profil coach
- [ ] Modifier profil coach
- [ ] Upload avatar
- [ ] Upload certificats
- [ ] Upload photos
- [ ] Upload vidéos

### Recherche
- [ ] Liste des coachs
- [ ] Filtrer par discipline
- [ ] Filtrer par tarif
- [ ] Filtrer par note
- [ ] Voir profil public coach

### Messagerie
- [ ] Créer conversation
- [ ] Envoyer message
- [ ] Recevoir message
- [ ] Notifications temps réel
- [ ] Marquer comme lu
- [ ] Liste conversations

### Admin
- [ ] Dashboard admin
- [ ] Approuver coach
- [ ] Rejeter coach
- [ ] Gérer utilisateurs
- [ ] Supprimer utilisateur
- [ ] Gérer disciplines
- [ ] Créer discipline
- [ ] Supprimer discipline

### Sécurité
- [ ] Protection des routes
- [ ] Rate limiting
- [ ] Validation des entrées
- [ ] XSS protection
- [ ] CSRF protection
- [ ] SQL injection protection

### Multilingue
- [ ] Français
- [ ] Anglais
- [ ] Changement de langue

---

**Tests réussis: __ / 60**
