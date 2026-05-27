# Connexion avec Email OU Téléphone - Documentation

## 📋 Vue d'ensemble

La fonctionnalité de connexion a été améliorée pour permettre aux utilisateurs de se connecter avec **soit leur email, soit leur numéro de téléphone**.

## 🎯 Objectif

Offrir plus de flexibilité aux utilisateurs en leur permettant de choisir leur méthode de connexion préférée, particulièrement utile pour les utilisateurs qui mémorisent mieux leur numéro de téléphone que leur email.

## 🔧 Implémentation Technique

### 1. Schéma de Validation (Backend)

**Fichier**: `src/lib/validation/schemas.ts`

```typescript
export const LoginRequestSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});
```

- Le champ `email` a été remplacé par `identifier`
- Accepte n'importe quelle chaîne non vide
- La validation du format (email vs téléphone) se fait côté serveur

### 2. Détection Automatique du Type d'Identifiant

**Fichier**: `src/app/api/auth/login/route.ts`

```typescript
function detectIdentifierType(identifier: string): "email" | "phone" {
  const trimmed = identifier.trim();
  
  // Format E.164: +[code pays][numéro] (ex: +237659037423)
  const e164Pattern = /^\+[1-9]\d{6,14}$/;
  if (e164Pattern.test(trimmed)) {
    return "phone";
  }
  
  // Sinon, traité comme email
  return "email";
}
```

**Logique**:
- Si l'identifiant commence par `+` et contient 7-15 chiffres → **téléphone**
- Sinon → **email**

### 3. Recherche de l'Utilisateur

```typescript
const identifierType = detectIdentifierType(identifier);
const normalizedIdentifier = identifier.toLowerCase().trim();

let user;
if (identifierType === "email") {
  user = await prisma.user.findUnique({
    where: { email: normalizedIdentifier },
  });
} else {
  user = await prisma.user.findFirst({
    where: { phone: identifier.trim() },
  });
}
```

**Comportement**:
- **Email**: Recherche par `email` (normalisé en minuscules)
- **Téléphone**: Recherche par `phone` (sensible à la casse, espaces supprimés)

### 4. Schéma Frontend

**Fichier**: `src/lib/schemas.ts`

```typescript
export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Email or phone number is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});
```

### 5. Interface Utilisateur

**Fichier**: `src/app/[locale]/login/page.tsx`

```tsx
<Input
  type="text"
  label={t("emailOrPhone")}
  placeholder="name@example.com or +237659037423"
  error={errors.identifier?.message}
  {...register("identifier")}
/>
```

**Changements**:
- Type changé de `email` à `text` pour accepter les numéros de téléphone
- Label traduit: "Email or Phone Number" / "Email ou Numéro de téléphone"
- Placeholder montre les deux formats acceptés

## 📱 Format du Numéro de Téléphone

### Format E.164 (Standard International)

**Structure**: `+[code pays][numéro]`

**Exemples valides**:
- `+237659037423` (Cameroun)
- `+33612345678` (France)
- `+1234567890` (USA)

**Règles**:
- Commence par `+`
- Suivi du code pays (1-3 chiffres)
- Suivi du numéro national (6-14 chiffres)
- **Total**: 7-15 chiffres après le `+`
- **Pas d'espaces, tirets ou parenthèses**

## ✅ Tests Effectués

### Test 1: Connexion avec Email
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"identifier":"testuser@coachme.cm","password":"Test123!"}'
```

**Résultat**: ✅ Succès
```json
{
  "success": true,
  "user": {
    "id": "adff6abe-78b6-4246-a5e8-9fe0985e7d50",
    "email": "testuser@coachme.cm",
    "name": "Test User",
    "role": "PROSPECT",
    "phone": "+237659037423",
    "avatar": null
  }
}
```

### Test 2: Connexion avec Téléphone
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"identifier":"+237659037423","password":"Test123!"}'
```

**Résultat**: ✅ Succès (même utilisateur)

### Test 3: Connexion Admin (Email)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"identifier":"admin@coachme.cm","password":"Admin123!"}'
```

**Résultat**: ✅ Succès

### Test 4: Identifiant Invalide
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"identifier":"nonexistent@test.com","password":"Test123!"}'
```

**Résultat**: ✅ Erreur 401
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email/phone or password"
  }
}
```

### Test 5: Téléphone Invalide
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"identifier":"+237999999999","password":"Test123!"}'
```

**Résultat**: ✅ Erreur 401

## 🔒 Sécurité

### Protection CSRF
- Toujours active pour les requêtes POST
- Header `Origin` requis et vérifié

### Protection contre les Timing Attacks
```typescript
const passwordMatch = user
  ? await comparePassword(password, user.password)
  : await comparePassword(password, "$2b$12$invalidhashfortimingattackprevention");
```
- Le temps de réponse est constant, que l'utilisateur existe ou non
- Empêche de deviner si un email/téléphone est enregistré

### Messages d'Erreur Génériques
```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email/phone or password"
}
```
- Ne révèle pas si l'identifiant existe
- Ne révèle pas quel champ est incorrect

### Rate Limiting
- Limite de tentatives par IP
- Protection contre les attaques par force brute

## 📊 Données de Test

### Compte Admin
- **Email**: `admin@coachme.cm`
- **Téléphone**: Non défini
- **Mot de passe**: `Admin123!`
- **Rôle**: ADMIN

### Compte Test
- **Email**: `testuser@coachme.cm`
- **Téléphone**: `+237659037423`
- **Mot de passe**: `Test123!`
- **Rôle**: PROSPECT

## 🎨 Interface Utilisateur

### Avant
```
┌─────────────────────────────────┐
│ Email                           │
│ ┌─────────────────────────────┐ │
│ │ name@example.com            │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Après
```
┌─────────────────────────────────┐
│ Email or Phone Number           │
│ ┌─────────────────────────────┐ │
│ │ name@example.com or         │ │
│ │ +237659037423               │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## 🌍 Traductions

### Anglais (`messages/en.json`)
```json
{
  "auth": {
    "email": "Email",
    "emailOrPhone": "Email or Phone Number"
  }
}
```

### Français (`messages/fr.json`)
```json
{
  "auth": {
    "email": "Email",
    "emailOrPhone": "Email ou Numéro de téléphone"
  }
}
```

## 📝 Logs

Le système enregistre le type d'identifiant utilisé :

```typescript
logger.info(
  { 
    userId: user.id, 
    role: user.role, 
    identifierType  // "email" ou "phone"
  }, 
  `User logged in via ${identifierType}`
);
```

**Exemple de log**:
```
INFO: User logged in via phone { userId: "adff6abe...", role: "PROSPECT", identifierType: "phone" }
```

## 🚀 Avantages

1. **Flexibilité**: Les utilisateurs choisissent leur méthode préférée
2. **Accessibilité**: Utile pour les utilisateurs qui mémorisent mieux leur téléphone
3. **UX améliorée**: Un seul champ au lieu de deux options séparées
4. **Sécurité maintenue**: Toutes les protections existantes sont conservées
5. **Rétrocompatibilité**: Les utilisateurs existants peuvent toujours se connecter avec leur email

## 🔄 Migration

**Aucune migration nécessaire** ! 

- Les utilisateurs existants sans numéro de téléphone peuvent toujours se connecter avec leur email
- Les nouveaux utilisateurs peuvent fournir un téléphone lors de l'inscription
- Le champ `phone` est optionnel dans la base de données

## 📚 Fichiers Modifiés

1. `src/lib/validation/schemas.ts` - Schéma backend
2. `src/app/api/auth/login/route.ts` - Logique de connexion
3. `src/lib/schemas.ts` - Schéma frontend
4. `src/app/[locale]/login/page.tsx` - Interface utilisateur
5. `messages/en.json` - Traductions anglaises
6. `messages/fr.json` - Traductions françaises
7. `scripts/create-admin.sql` - Hash admin corrigé

## ✨ Conclusion

La fonctionnalité de connexion avec email OU téléphone est maintenant **pleinement opérationnelle** avec:
- ✅ Détection automatique du type d'identifiant
- ✅ Validation robuste
- ✅ Sécurité maintenue
- ✅ Interface utilisateur intuitive
- ✅ Tests complets réussis
- ✅ Traductions en anglais et français
