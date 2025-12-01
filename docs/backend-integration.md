# Intégration avec le backend MonPetitBiz

## Vue d'ensemble

Le portail admin communique avec le backend MonPetitBiz via des routes API proxy qui utilisent un token de service/admin pour l'authentification.

## Configuration requise dans le backend

### 1. Créer les endpoints admin

Le backend doit avoir des endpoints `/admin/dashboard/*` qui bypassent la vérification de propriété du business. Ces endpoints doivent :

- Accepter un token de service/admin
- Bypasser la vérification `user.businessId !== businessId`
- Utiliser le même `DashboardService` que les endpoints normaux

**Endpoints à créer dans le backend** :
- `GET /admin/dashboard/:businessId`
- `GET /admin/dashboard/:businessId/summary`
- `GET /admin/dashboard/:businessId/chart-data`
- `GET /admin/dashboard/:businessId/stock-warnings`
- `GET /admin/dashboard/:businessId/recent-transactions`
- `GET /admin/dashboard/:businessId/metrics`
- `GET /admin/dashboard/:businessId/export`
- `GET /admin/dashboard/:businessId/export/csv`
- `POST /admin/businesses/:id/products/bulk-create` - Créer des produits en masse pour une entreprise

### 2. Authentification avec token de service

Le backend doit accepter un token de service/admin qui :
- Est configuré dans les variables d'environnement du backend
- Permet l'accès à tous les businesses (bypass la vérification de propriété)
- Peut être vérifié via un guard ou middleware spécial

### 3. Configuration CORS

Le backend doit autoriser les requêtes depuis le portail admin. Cette configuration est déjà présente dans `main.ts` du backend avec `FRONTEND_URL`.

## Configuration dans le portail admin

### Variables d'environnement

Ajoutez dans votre fichier `.env.local` :

```bash
# URL du backend MonPetitBiz
NEXT_PUBLIC_API_URL=http://localhost:9000

# Token de service/admin pour authentifier les requêtes vers le backend
# Ce token doit correspondre au token configuré dans le backend
BACKEND_SERVICE_TOKEN=your_backend_service_token_here
```

### Comment obtenir le token de service

Le token de service doit être :
1. Un JWT valide généré par le backend
2. Configuré dans les variables d'environnement du backend
3. Accepté par le backend comme ayant accès admin à tous les businesses

Pour générer un token de service, vous pouvez :
- Créer un utilisateur admin dans le backend et utiliser son JWT
- Créer un endpoint spécial dans le backend pour générer des tokens de service
- Utiliser un token statique configuré dans les deux projets

## Architecture

```
Frontend (Portail Admin)
    ↓
Routes API Next.js (/api/backend/dashboard/*)
    ↓ (avec BACKEND_SERVICE_TOKEN)
Backend MonPetitBiz (/admin/dashboard/*)
    ↓
DashboardService
    ↓
Base de données
```

## Sécurité

- Le token de service est **jamais exposé au client**
- Il est uniquement utilisé côté serveur dans les routes API Next.js
- Le token doit être gardé secret et ne jamais être commité dans le repository
- Utilisez des variables d'environnement pour stocker le token

## Test

Pour tester l'intégration :

1. Assurez-vous que le backend est démarré et accessible
2. Configurez `BACKEND_SERVICE_TOKEN` dans votre `.env.local`
3. Accédez au dashboard dans le portail admin
4. Vérifiez que les données sont récupérées depuis le backend

## Dépannage

### Erreur 401 (Unauthorized)
- Vérifiez que `BACKEND_SERVICE_TOKEN` est correctement configuré
- Vérifiez que le token est accepté par le backend
- Vérifiez que le backend a bien les endpoints `/admin/dashboard/*`

### Erreur 403 (Forbidden)
- Vérifiez que les endpoints admin bypassent bien la vérification de propriété
- Vérifiez que le token de service a les permissions admin

### Erreur de connexion
- Vérifiez que `NEXT_PUBLIC_API_URL` pointe vers le bon backend
- Vérifiez que le backend est démarré et accessible
- Vérifiez la configuration CORS dans le backend

## Endpoint de création de produits en masse

### POST /admin/businesses/:id/products/bulk-create

Cet endpoint permet de créer plusieurs produits pour une entreprise en une seule requête. Il est utilisé par la fonctionnalité d'upload CSV de produits.

#### Authentification

- **Méthode**: Bearer Token
- **Header**: `Authorization: Bearer {BACKEND_SERVICE_TOKEN}`
- Le token doit avoir les permissions admin pour accéder à tous les businesses

#### Requête

**URL**: `/admin/businesses/:id/products/bulk-create`

**Method**: `POST`

**Headers**:
```
Authorization: Bearer {BACKEND_SERVICE_TOKEN}
Content-Type: application/json
```

**Body**:
```json
{
  "products": [
    {
      "name": "Produit A",
      "quantity": 100,
      "unitPrice": 1500
    },
    {
      "name": "Produit B",
      "quantity": 50
    }
  ]
}
```

**Paramètres**:
- `id` (path): L'ID de l'entreprise pour laquelle créer les produits
- `products` (body, array): Liste des produits à créer
  - `name` (string, requis): Nom du produit
  - `quantity` (number, requis): Quantité en stock (doit être >= 0)
  - `unitPrice` (number, optionnel): Prix unitaire du produit (doit être >= 0 si fourni)

#### Réponse

**Succès (200)**:
```json
{
  "success": true,
  "created": 2,
  "skipped": 0,
  "errors": []
}
```

**Champs de réponse**:
- `success` (boolean): Indique si l'opération a réussi
- `created` (number): Nombre de produits créés avec succès
- `skipped` (number): Nombre de produits ignorés (produits existants avec le même nom)
- `errors` (array<string>): Liste des erreurs rencontrées lors du traitement

#### Comportement

1. **Produits existants**: Si un produit avec le même nom existe déjà pour l'entreprise, il est ignoré (skip) sans générer d'erreur. Le compteur `skipped` est incrémenté.

2. **Validation**: 
   - Le nom du produit est requis et ne peut pas être vide
   - La quantité doit être un nombre >= 0
   - Le prix unitaire, s'il est fourni, doit être un nombre >= 0

3. **Traitement par lot**: Tous les produits valides sont traités même si certains échouent. Les erreurs sont collectées dans le tableau `errors`.

#### Exemple d'utilisation

```bash
curl -X POST http://localhost:9000/admin/businesses/business-123/products/bulk-create \
  -H "Authorization: Bearer your_service_token" \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      {"name": "Produit A", "quantity": 100, "unitPrice": 1500},
      {"name": "Produit B", "quantity": 50},
      {"name": "Produit C", "quantity": 200, "unitPrice": 2000}
    ]
  }'
```

#### Notes d'implémentation

- L'endpoint doit vérifier que l'entreprise existe avant de créer les produits
- Les produits doivent être associés à l'entreprise spécifiée dans l'URL
- Le backend doit gérer les transactions pour garantir la cohérence des données
- Les produits existants doivent être identifiés par leur nom (comparaison insensible à la casse recommandée)

