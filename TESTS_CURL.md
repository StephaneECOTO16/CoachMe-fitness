# Tests API avec curl - CoachMe

## Configuration
- **URL de base**: `http://localhost:3000`
- **Compte admin**: `admin@coachme.cm` / `Admin123!`

## 1. Test de Login (POST /api/auth/login)

### Commande
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"admin@coachme.cm","password":"Admin123!"}'
```

### Résultat attendu
- **Status**: 200 OK
- **Cookie**: `session_token` (HttpOnly, SameSite=lax, Max-Age=604800)
- **Body**:
```json
{
  "success": true,
  "user": {
    "id": "7967a21b-328f-4939-b3f4-543c81e703eb",
    "email": "admin@coachme.cm",
    "name": "Admin CoachMe",
    "role": "ADMIN",
    "phone": null,
    "avatar": null
  }
}
```

### ✅ Test réussi
- Protection CSRF fonctionnelle (header Origin requis)
- Cookie de session créé avec les bonnes options de sécurité
- JWT signé et valide pour 7 jours

---

## 2. Test de Vérification de Session (GET /api/auth/me)

### Commande
```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: session_token=<TOKEN_FROM_LOGIN>"
```

### Résultat attendu
- **Status**: 200 OK
- **Body**:
```json
{
  "success": true,
  "user": {
    "id": "7967a21b-328f-4939-b3f4-543c81e703eb",
    "email": "admin@coachme.cm",
    "name": "Admin CoachMe",
    "role": "ADMIN",
    "phone": null,
    "avatar": null,
    "createdAt": "2026-05-20T15:30:26.199Z"
  }
}
```

### ✅ Test réussi
- Cookie de session validé correctement
- JWT décodé et vérifié
- Données utilisateur retournées

---

## 3. Test de Logout (POST /api/auth/logout)

### Commande
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Origin: http://localhost:3000" \
  -H "Cookie: session_token=<TOKEN_FROM_LOGIN>"
```

### Résultat attendu
- **Status**: 200 OK
- **Cookie**: `session_token=` (vidé avec Max-Age=0)
- **Body**:
```json
{
  "success": true
}
```

### ✅ Test réussi
- Cookie de session supprimé correctement
- Déconnexion effective

---

## 4. Test de Protection CSRF

### Commande (sans header Origin)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@coachme.cm","password":"Admin123!"}'
```

### Résultat attendu
- **Status**: 403 Forbidden
- **Body**:
```json
{
  "success": false,
  "error": {
    "code": "CSRF_VIOLATION",
    "message": "Forbidden"
  }
}
```

### ✅ Test réussi
- Protection CSRF active sur les méthodes mutantes (POST, PUT, DELETE, PATCH)
- Header Origin/Referer obligatoire pour les requêtes API

---

## 5. Test d'Authentification Invalide

### Commande (mauvais mot de passe)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email":"admin@coachme.cm","password":"WrongPassword"}'
```

### Résultat attendu
- **Status**: 401 Unauthorized
- **Body**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

### ✅ Test réussi
- Validation des credentials fonctionnelle
- Message d'erreur générique (ne révèle pas si l'email existe)

---

## Headers de Sécurité Appliqués

Tous les endpoints retournent ces headers de sécurité :

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: [politique complète]
```

---

## Résumé des Tests

| Test | Endpoint | Méthode | Status | Résultat |
|------|----------|---------|--------|----------|
| Login | `/api/auth/login` | POST | 200 | ✅ Réussi |
| Vérification session | `/api/auth/me` | GET | 200 | ✅ Réussi |
| Logout | `/api/auth/logout` | POST | 200 | ✅ Réussi |
| Protection CSRF | `/api/auth/login` | POST | 403 | ✅ Réussi |
| Credentials invalides | `/api/auth/login` | POST | 401 | ✅ Réussi |

**Tous les tests d'authentification sont fonctionnels !** 🎉
