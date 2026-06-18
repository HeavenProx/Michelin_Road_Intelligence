# Michelin Road Intelligence

Application web premium qui transforme les données de ride **Strava** d'un cycliste en **intelligence pneu Michelin** : profil auto-généré, recommandation sur-mesure et suivi d'usure (Tyre Score).

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Structure du dépôt](#structure-du-dépôt)
3. [Démarrage en développement](#démarrage-en-développement)
4. [Variables d'environnement](#variables-denvironnement)
5. [Commandes utiles](#commandes-utiles)
6. [Architecture technique](#architecture-technique)
7. [Conventions de nommage](#conventions-de-nommage)
8. [Schéma de base de données](#schéma-de-base-de-données)
9. [Référence API](#référence-api)
10. [Déploiement en production](#déploiement-en-production)
11. [Secrets GitHub requis](#secrets-github-requis)

---

## Prérequis

| Outil | Version | Notes |
|-------|---------|-------|
| Node.js | 22 LTS | |
| pnpm | 9 | `npm install -g pnpm@9` |
| Docker Desktop | 4.x | Facultatif en dev, requis pour tester le compose prod |
| Compte Strava API | — | Créer une app sur [strava.com/settings/api](https://www.strava.com/settings/api) |

---

## Structure du dépôt

```
.
├── backend/                  # API — NestJS 11 + TypeScript
│   ├── src/
│   │   ├── app.module.ts         # Racine NestJS, enregistre tous les modules
│   │   ├── auth/                 # OAuth Strava, session, guards
│   │   ├── users/                # Entité User, persistance des tokens
│   │   ├── strava/               # Client HTTP Strava (activités, vélos, refresh token)
│   │   ├── profile/              # Calcul + cache du profil cycliste
│   │   ├── recommend/            # Moteur de recommandation pneu
│   │   ├── garage/               # Vélos, pneus montés, Tyre Score
│   │   ├── tyres/                # Catalogue Michelin (seed + API publique)
│   │   ├── alerts/               # Alertes d'usure + rappels avis
│   │   ├── avis/                 # Avis utilisateurs
│   │   ├── peers/                # Comparaison entre cyclistes
│   │   └── notification/         # Envoi d'emails (Nodemailer / SMTP)
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
│
├── frontend/                 # UI — React 18 + Vite 6 + Tailwind v4
│   ├── src/
│   │   ├── app/
│   │   │   └── App.tsx           # Routeur principal, bootstrap auth
│   │   ├── pages/                # Vues complètes (une par onglet)
│   │   │   ├── LandingPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── GaragePage.tsx
│   │   │   ├── AlertePage.tsx
│   │   │   ├── AvisPage.tsx
│   │   │   └── (PeersPage, etc.)
│   │   ├── components/           # Composants réutilisables transverses
│   │   ├── context/
│   │   │   └── AppContext.tsx     # État global : auth, liveData, wearAlerts
│   │   ├── hooks/                # Hooks de fetch (useAlerts, usePeers, useTyres…)
│   │   └── types/
│   │       └── index.ts          # Interfaces TypeScript partagées côté frontend
│   ├── nginx.conf            # Config nginx prod (proxy /api et /auth → backend)
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.prod.yml   # Stack de production complète (backend + frontend + mailpit)
├── .github/
│   └── workflows/ci.yml      # Pipeline CI/CD : lint → build → Docker → Dokploy
└── README.md
```

> **Monorepo sans workspace racine.** Les deux sous-projets sont indépendants — toutes les commandes `pnpm` se lancent depuis `backend/` ou `frontend/`, jamais depuis la racine.

---

## Démarrage en développement

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd Michelin_Road_Intelligence
```

### 2. Créer l'application Strava

Sur [strava.com/settings/api](https://www.strava.com/settings/api) :
- **Authorization Callback Domain** : `localhost`
- **Callback URL** utilisée : `http://localhost:3001/auth/callback`

### 3. Configurer les variables d'environnement

```bash
cd backend
cp .env.example .env
# Renseigner au moins : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SESSION_SECRET
```

### 4. Installer les dépendances et démarrer

Dans deux terminaux :

```bash
# Terminal 1 — Backend (port 3001)
cd backend && pnpm install && pnpm start:dev

# Terminal 2 — Frontend (port 3000)
cd frontend && pnpm install && pnpm dev
```

Application accessible sur **http://localhost:3000**.

Vite proxifie `/api` et `/auth` → `http://localhost:3001` (voir `frontend/vite.config.ts`). Les cookies de session fonctionnent car les deux origines partagent le même hostname.

---

## Variables d'environnement

Fichier : `backend/.env` (à créer depuis `backend/.env.example`, jamais commité).

| Variable | Obligatoire | Valeur par défaut | Description |
|----------|:-----------:|-------------------|-------------|
| `STRAVA_CLIENT_ID` | ✓ | — | ID de l'application Strava |
| `STRAVA_CLIENT_SECRET` | ✓ | — | Secret de l'application Strava |
| `STRAVA_CALLBACK_URL` | ✓ | `http://localhost:3001/auth/callback` | URL de retour OAuth. En prod : `https://<domaine>/auth/callback` |
| `SESSION_SECRET` | ✓ | — | Clé HMAC de la session. Générer : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | | `data/michelin.db` | Chemin du fichier SQLite (créé automatiquement) |
| `PORT` | | `3001` | Port d'écoute du backend |
| `FRONTEND_URL` | | `http://localhost:3000` | Origine CORS + cible des redirections post-OAuth |
| `NODE_ENV` | | — | Mettre `production` en prod (active cookies `secure` + `trust proxy`) |
| `EMAIL_HOST` | | — | Hôte SMTP. Avec Mailpit : `mailpit` |
| `EMAIL_PORT` | | — | Port SMTP. Mailpit : `1025` |
| `EMAIL_USER` | | — | Adresse expéditrice des emails |
| `MAILPIT_HOST` | | `mail.ageronjoachim.com` | Domaine pour l'interface web Mailpit (Traefik) |

---

## Commandes utiles

### Backend (`cd backend`)

```bash
pnpm install          # Installer les dépendances
pnpm start:dev        # Mode watch — rechargement à chaud
pnpm build            # Compile TypeScript → dist/
pnpm start:prod       # Démarre depuis dist/ (mode production)
pnpm test             # Tests unitaires (Jest)
pnpm test:cov         # Tests avec couverture
pnpm lint             # ESLint + Prettier (avec --fix auto)
```

### Frontend (`cd frontend`)

```bash
pnpm install          # Installer les dépendances
pnpm dev              # Vite HMR sur :3000
pnpm build            # Build de production → dist/
pnpm preview          # Prévisualise le build de production
```

---

## Architecture technique

### Vue d'ensemble

```
Navigateur
  │  HTTPS
  ▼
Traefik (reverse proxy, TLS Let's Encrypt)
  │
  ├─ *.michelin.com ──▶ nginx (frontend:80)
  │                        ├── /          → fichiers statiques React
  │                        ├── /api/*     → proxy → backend:3001
  │                        └── /auth/*    → proxy → backend:3001
  │
  └─ mail.michelin.com ──▶ Mailpit (port 8025, interface web)
                                │
                          backend ──SMTP:1025──▶ Mailpit
```

En développement, Vite remplace nginx pour le proxy (`vite.config.ts`).

### Backend — modules NestJS

Chaque fonctionnalité est encapsulée dans un module NestJS autonome :

| Module | Rôle |
|--------|------|
| `AuthModule` | Flux OAuth Strava, session express, guard `AuthenticatedGuard` |
| `UsersModule` | CRUD `User` — trouvé ou créé à chaque login Strava |
| `StravaModule` | Client HTTP Strava avec refresh automatique des tokens |
| `ProfileModule` | Calcule le `RiderProfile` depuis les activités + Open-Meteo ; cache 12 h en DB |
| `RecommendModule` | Score de correspondance pneu × profil ; cache 12 h |
| `GarageModule` | Sync vélos Strava, pose/remplacement/archivage pneus, Tyre Score |
| `TyresModule` | Seed + lecture du catalogue Michelin |
| `AlertsModule` | Alertes d'usure (≥ 80 %) + rappels avis par palier km |
| `AvisModule` | Création et lecture d'avis utilisateurs |
| `PeersModule` | Calcul de similarité de profil entre cyclistes |
| `NotificationModule` | Envoi d'emails via Nodemailer (alerte usure + rappel avis) |

**Dépendances inter-modules** : `GarageModule` importe `StravaModule` et `ProfileModule`. `AlertsModule` importe `GarageModule` et `NotificationModule`. `RecommendModule` importe `StravaModule`, `ProfileModule` et `TyresModule`.

### Authentification et session

- Flux OAuth 2.0 Strava complet avec protection CSRF (`state` UUID en session)
- Session cookie HTTP-only (`connect.sid`) via `express-session`
- `AuthenticatedGuard` protège toutes les routes qui nécessitent une session valide
- En production : `NODE_ENV=production` active `cookie.secure=true` et `app.set('trust proxy', 1)` (requis derrière Traefik)
- Les tokens Strava sont chiffrés en session (access token + refresh token + timestamp d'expiration). Le refresh est transparent : `AuthService.getValidAccessToken()` rafraîchit automatiquement si expiré.

### Frontend — structure React

- **`AppContext`** (`context/AppContext.tsx`) : source de vérité globale. Contient `liveData` (profil + reco), `authStatus` (`checking | authed | guest`), et `wearAlerts` (persistées dans `localStorage` clé `michelin_wear_alerts`).
- **Pages** : composants de haut niveau, une par onglet de navigation.
- **Hooks de fetch** (`hooks/`) : wrappent `fetch` avec gestion d'état (`loading`, `data`, `error`). Pattern uniforme via `useQuery`.
- **Proxy dev** : `vite.config.ts` proxifie `/api` et `/auth` vers `:3001`. En production, nginx fait le même travail.

### Tyre Score — calcul d'usure

Le score d'usure est calculé côté backend dans `garage/garage.wear.ts` à partir de :
- les activités Strava filtrées par `gearId` depuis la date de pose du pneu
- un coefficient de position (arrière s'use 1,6× plus vite)
- un coefficient terrain (gravel/MTB augmente l'abrasion)
- un coefficient de vieillissement du caoutchouc (au-delà de 24 mois)
- la durée de vie nominale (`lifetimeKm`) du modèle

Résultat : `wearPercent`, `kmUsed`, `kmMaxAdjusted`, `kmLeft`, `statusLabel`.

---

## Conventions de nommage

### Fichiers

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Entités TypeORM | `<nom-kebab>.entity.ts` | `garage-tyre.entity.ts` |
| Services NestJS | `<nom-kebab>.service.ts` | `recommend.service.ts` |
| Contrôleurs | `<nom-kebab>.controller.ts` | `garage.controller.ts` |
| Modules | `<nom-kebab>.module.ts` | `tyres.module.ts` |
| DTOs | `<action>-<ressource>.dto.ts` | `replace-tyre.dto.ts` |
| Tests unitaires | `<fichier>.spec.ts` | `alerts.service.spec.ts` |
| Composants React | `PascalCase.tsx` | `TyrePicker.tsx` |
| Pages React | `PascalCasePage.tsx` | `GaragePage.tsx` |
| Hooks React | `use<Nom>.ts` | `useAlerts.ts` |
| Types frontend | `index.ts` dans `src/types/` | |

### Code TypeScript (backend)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Classes | `PascalCase` | `GarageService`, `AuthenticatedGuard` |
| Méthodes / fonctions | `camelCase` | `getRecommendation()`, `syncBikes()` |
| Propriétés d'entité | `camelCase` (TypeScript) | `mountedDate`, `stravaGearId` |
| Colonnes SQL | `snake_case` via `{ name: '…' }` | `mounted_date`, `strava_gear_id` |
| Tables SQL | `snake_case` pluriel | `garage_tyres`, `review_reminders` |
| Constantes | `SCREAMING_SNAKE_CASE` | `SYNC_TTL_MS`, `MILESTONES` |
| Types union littéraux | `SCREAMING_SNAKE_CASE` | `'MOUNTED' \| 'RETIRED'`, `'FRONT' \| 'REAR'` |
| Enums de domaine (chaînes) | `SCREAMING_SNAKE_CASE` | `'ROAD'`, `'GRAVEL'`, `'MTB'` |

### Code TypeScript (frontend)

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Interfaces | `PascalCase` | `GarageTyre`, `LiveProfile` |
| Props de composant | `PascalCaseProps` | `TyreCardProps` |
| Variables d'état | `camelCase` | `activeBikeIdx`, `wearAlerts` |
| Handlers d'événement | `handle<Événement>` | `handleDateChange`, `handleSelect` |
| Fonctions de fetch | `fetch<Ressource>` | `fetchAlerts` |
| Champs JSON de l'API | `snake_case` | `wear_percent`, `mounted_date` |
| Props React | `camelCase` | `onDateChange`, `bikeType` |

### Règle de casse API / entité

Les champs JSON retournés par l'API utilisent `snake_case` (convention REST). Les propriétés TypeScript côté backend utilisent `camelCase` (convention TypeScript). TypeORM effectue la correspondance via l'option `name` de `@Column`.

---

## Schéma de base de données

La base est SQLite (`better-sqlite3`). TypeORM crée et synchronise le schéma automatiquement au démarrage (`synchronize: true`).

### `users`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | Auto-incrémenté |
| `strava_id` | INTEGER UNIQUE | ID Strava de l'athlète |
| `firstname` | TEXT | |
| `lastname` | TEXT | |
| `city` | TEXT nullable | |
| `state` | TEXT nullable | |
| `country` | TEXT nullable | |
| `sex` | TEXT nullable | |
| `profile` | TEXT | URL avatar Strava |
| `access_token` | TEXT | Token Strava courant |
| `refresh_token` | TEXT | Token de renouvellement |
| `token_expires_at` | INTEGER | Epoch secondes |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `bikes`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK→users | CASCADE DELETE |
| `strava_gear_id` | TEXT | Identifiant Strava du matériel |
| `name` | TEXT | |
| `type` | TEXT | `ROAD` / `GRAVEL` / `MTB` / `E-BIKE` |
| `strava_distance_km` | REAL | Distance totale Strava |
| `last_synced_at` | INTEGER | Epoch ms du dernier sync |

Contrainte unique : `(user_id, strava_gear_id)`.

### `garage_tyres`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `bike_id` | INTEGER FK→bikes | CASCADE DELETE |
| `tyre_model_id` | INTEGER FK→tyre_models | EAGER loaded |
| `position` | TEXT | `FRONT` ou `REAR` |
| `mounted_date` | TEXT | ISO `yyyy-mm-dd` |
| `status` | TEXT | `MOUNTED` ou `RETIRED` |
| `removed_date` | TEXT nullable | ISO `yyyy-mm-dd`, renseigné à l'archivage |
| `km_held` | REAL nullable | km réels figés à l'archivage |
| `duration_months` | INTEGER nullable | Durée de vie en mois |
| `final_wear_percent` | INTEGER nullable | Usure finale figée |

### `tyre_models`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `global_id` | TEXT UNIQUE | Identifiant stable (ex. `g-power-road`) |
| `range_name` | TEXT | Gamme (ex. `POWER`) |
| `model_name` | TEXT | Nom complet (ex. `POWER ROAD`) |
| `segment` | TEXT | `PERFORMANCE` / `ENDURANCE` / … |
| `cycle_type` | TEXT | `ROAD` / `MTB` / `CITY` |
| `cycle_type_web` | TEXT nullable | `ROAD` / `GRAVEL` / `MTB` / `E-BIKE` — **champ autoritaire pour le filtrage** |
| `score_wet_grip` | INTEGER | 1–5 |
| `score_rolling_resistance` | INTEGER | 1–5 (5 = très faible résistance) |
| `score_durability` | INTEGER | 1–5 |
| `score_terrain_versatility` | INTEGER | 1–5 |
| `lifetime_km` | INTEGER | Durée de vie estimée |
| `price_range` | TEXT nullable | Ex. `45–58 €` |
| Autres colonnes | TEXT nullable | `bead`, `sealing`, `terrain_types`, `use_type`, technologies… |

### `profile_snapshots`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER UNIQUE FK→users | Relation 1-1 |
| `profile` | TEXT | `RiderProfile` sérialisé en JSON |
| `computed_at` | INTEGER | Epoch ms — TTL de 12 h |
| `updated_at` | DATETIME | |

### `reviews`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER nullable FK→users | `SET NULL` à la suppression de compte |
| `tyre_name` | TEXT | Nom du modèle (référence par nom, pas par ID) |
| `author_name` | TEXT | Snapshot auteur |
| `author_location` | TEXT | |
| `rating` | INTEGER | Note globale |
| `grip_score` | INTEGER | |
| `durability_score` | INTEGER | |
| `comfort_score` | INTEGER | |
| `puncture_score` | INTEGER | |
| `comment` | TEXT | |
| `km_at_review` | INTEGER | km sur ce pneu au moment de l'avis |
| `total_km` | INTEGER | km totaux du cycliste |
| `mount_date` | DATETIME | |
| `created_at` | DATETIME | |

Contrainte unique : `(user_id, tyre_name)`.

### `review_reminders`

| Colonne | Type | Notes |
|---------|------|-------|
| `id` | INTEGER PK | |
| `user_id` | INTEGER | |
| `tyre_id` | INTEGER | ID du pneu monté |
| `tyre_name` | TEXT | Snapshot nom modèle |
| `milestone` | INTEGER | Palier km (500, 1 000, 2 000, 3 500) |
| `sent_at` | TEXT nullable | ISO `yyyy-mm-dd` — null = email pas encore envoyé |
| `done` | BOOLEAN | `true` dès qu'un avis existe pour ce pneu |

---

## Référence API

Toutes les routes sont préfixées selon leur contrôleur. Les routes protégées exigent une session active (cookie `connect.sid`). Les routes publiques fonctionnent sans authentification.

### Auth — `/auth`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/auth/strava` | — | Lance le flux OAuth Strava (redirection vers Strava) |
| `GET` | `/auth/callback` | — | Callback OAuth. Paramètres query : `code`, `state` (succès) ou `error` (refus). Redirige vers `FRONTEND_URL/?auth=success\|denied\|error` |
| `GET` | `/auth/me` | ✓ | Renvoie l'athlète connecté |
| `GET` | `/auth/logout` | — | Détruit la session, efface le cookie |
| `DELETE` | `/auth/account` | ✓ | Supprime le compte et toutes les données associées |

**Réponse `/auth/me` :**
```jsonc
{
  "success": true,
  "athlete": {
    "id": 12345678,
    "firstname": "Alice",
    "lastname": "Martin",
    "city": "Lyon",
    "country": "France",
    "profile": "https://…"
  }
}
```

---

### Recommandation — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/recommend` | ✓ | Profil + recommandation pneu pour l'utilisateur connecté |
| `GET` | `/api/recommend?refresh=true` | ✓ | Idem, force le recalcul (bypass cache 12 h) |
| `GET` | `/api/demo` | — | Même shape, données démo statiques (sans auth) |

**Réponse commune :**
```jsonc
{
  "success": true,
  "athlete": { "id": 0, "firstname": "", "lastname": "", "city": "", "country": "", "profile": "" },
  "profile": {
    "ride_count": 0,
    "total_distance_km": 0,
    "monthly_distance": 0,
    "avg_speed_kmh": 0,
    "avg_elevation_m": 0,
    "terrain_label": "Plat" | "Montagne" | "Mixte",
    "style_label": "Performance" | "Endurance" | "Loisir" | "Gravel" | "VTT",
    "weather_exposure": { "rain_percentage": 0, "rainy_rides": 0 },
    "region": ""
  },
  "explanation": "",
  "recommended": {
    "name": "",
    "match_score": 0,
    "description": "",
    "lifetime_km": 0,
    "price_range": "",
    "scores": { "wet_grip": 0, "rolling_resistance": 0, "durability": 0, "terrain_versatility": 0 }
  },
  "alternatives": [{ "name": "", "match_score": 0, "description": "" }]
}
```

---

### Garage — `/api/garage`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/garage` | ✓ | Garage complet (vélos + pneus + Tyre Score) |
| `GET` | `/api/garage/demo` | — | Données démo statiques |
| `GET` | `/api/garage/history` | ✓ | Historique des pneus retirés, groupé par vélo |
| `PUT` | `/api/garage/tyres` | ✓ | Monte ou remplace le pneu actif à une position |
| `POST` | `/api/garage/tyres/:id/replace` | ✓ | Archive le pneu `:id` et monte un nouveau |
| `PATCH` | `/api/garage/tyres/:id/date` | ✓ | Met à jour la date de pose du pneu `:id` |
| `POST` | `/api/garage/sync` | ✓ | Force la re-synchronisation des vélos depuis Strava |

**Corps `PUT /api/garage/tyres` (`SetTyreDto`) :**
```jsonc
{
  "bikeId": 1,
  "position": "FRONT" | "REAR",
  "modelGlobalId": "g-power-road",
  "mountedDate": "2025-08-15"
}
```

**Corps `POST /api/garage/tyres/:id/replace` (`ReplaceTyreDto`) :**
```jsonc
{ "modelGlobalId": "g-power-road", "mountedDate": "2026-01-01" }
```

**Corps `PATCH /api/garage/tyres/:id/date` (`UpdateTyreDateDto`) :**
```jsonc
{ "mountedDate": "2025-09-01" }
```

**Réponse `GET /api/garage` :**
```jsonc
{
  "success": true,
  "bikes": [{
    "id": 1,
    "name": "Specialized Tarmac",
    "type": "ROAD",
    "strava_distance_km": 4200,
    "tyres": [{
      "id": 1,
      "position": "FRONT",
      "model": { "name": "POWER ROAD", "lifetime_km": 8000, "price_range": "45–58 €" },
      "mounted_date": "2025-08-15",
      "km_used": 1680,
      "km_max_adjusted": 8000,
      "km_left": 6320,
      "wear_percent": 21,
      "status_label": "Bon état",
      "explanation": "…",
      "age_months": 10,
      "age_penalty_percent": 0
    }]
  }]
}
```

---

### Catalogue pneus — `/api/tyres`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/tyres` | — | Liste les modèles (tous types) |
| `GET` | `/api/tyres?bikeType=ROAD` | — | Filtre par type : `ROAD`, `GRAVEL`, `MTB` |

**Réponse :**
```jsonc
[{
  "globalId": "g-power-road",
  "name": "POWER ROAD",
  "segment": "ENDURANCE",
  "useType": "ENDURANCE",
  "lifetimeKm": 8000,
  "priceRange": "45–58 €",
  "scores": { "wetGrip": 4, "rollingResistance": 4, "durability": 4, "terrainVersatility": 2 }
}]
```

---

### Alertes — `/api/alerts`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/alerts` | ✓ | Alertes d'usure (≥ 80 %) + rappels avis pour l'utilisateur |

**Réponse :**
```jsonc
{
  "alerts": [{ "tire": "POWER ROAD", "wear": 85, "date": "18 juin 2026" }],
  "reminders": [{ "tire": "POWER ROAD", "threshold": 1000, "date": "1 juin 2026", "done": false }]
}
```

---

### Avis — `/api/reviews`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/reviews` | — | Liste tous les avis |
| `GET` | `/api/reviews?tire=POWER+ROAD` | — | Filtre par modèle de pneu |
| `POST` | `/api/reviews` | ✓ | Soumet un avis |

**Corps `POST /api/reviews` (`CreateReviewDto`) :**
```jsonc
{
  "tyreName": "POWER ROAD",
  "rating": 5,
  "gripScore": 5,
  "durabilityScore": 4,
  "comfortScore": 4,
  "punctureScore": 3,
  "comment": "Excellent pneu pour la route.",
  "kmAtReview": 3200,
  "totalKm": 12000
}
```

---

### Peers — `/api/peers`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/peers` | ✓ | Cyclistes ayant un profil similaire |
| `GET` | `/api/peers/demo` | — | Données démo |

---

### Notifications — `/api`

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `POST` | `/api/notify-wear` | — | Envoie un email d'alerte d'usure |

**Corps :**
```jsonc
{ "tire": "POWER ROAD", "wear": 87 }
```

---

### Debug Strava — `/api/strava`

Routes utilitaires pour le débogage en développement.

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| `GET` | `/api/strava/activities` | ✓ | Activités brutes de l'utilisateur |
| `GET` | `/api/strava/athlete` | ✓ | Données brutes de l'athlète (incluant `bikes`) |
| `GET` | `/api/strava/bikes` | ✓ | Vélos normalisés |

---

## Déploiement en production

La production tourne sur **Dokploy** (PaaS self-hosted) avec **Traefik** comme reverse proxy et TLS Let's Encrypt automatique.

### Pipeline CI/CD (GitHub Actions — `.github/workflows/ci.yml`)

```
push main
  │
  ├─ [backend]   lint → typecheck → build → tests unitaires
  ├─ [frontend]  typecheck → build
  │
  ├─ [docker]    build & push → ghcr.io/<owner>/michelin-backend:latest
  │                           → ghcr.io/<owner>/michelin-frontend:latest
  │              (build seul sur PR, push uniquement sur main)
  │
  └─ [deploy]    webhook GET → Dokploy
                   Dokploy pull les images et redéploie docker-compose.prod.yml
```

### Services Docker (`docker-compose.prod.yml`)

| Service | Image | Rôle |
|---------|-------|------|
| `frontend` | `ghcr.io/.../michelin-frontend` | nginx sert le build React + proxy `/api` et `/auth` → backend:3001 |
| `backend` | `ghcr.io/.../michelin-backend` | API NestJS, SQLite persisté dans un volume nommé |
| `mailpit` | `axllent/mailpit:latest` | Intercepteur SMTP (port 1025) — UI web sur `https://mail.<domaine>` |

La base SQLite est persistée dans le volume `backend-data` — elle **survit aux redéploiements**.

### Proxy en production

nginx (`frontend/nginx.conf`) proxifie `/api/` et `/auth/` vers `http://backend:3001`. Il transmet l'en-tête `X-Forwarded-Proto` pour que le backend sache que la connexion externe est HTTPS, ce qui est nécessaire pour que les cookies `secure` soient posés correctement.

### Premier déploiement sur un nouveau serveur

1. Créer l'application dans Dokploy → type *Docker Compose* → pointer sur ce dépôt, fichier `docker-compose.prod.yml`.
2. Renseigner les variables d'environnement dans l'onglet *Environment* (cf. tableau ci-dessus).
3. Créer les enregistrements DNS :
   - `<domaine>` → IP du serveur (frontend)
   - `mail.<domaine>` → IP du serveur (Mailpit)
4. Mettre à jour les domaines dans `docker-compose.prod.yml` (labels Traefik).
5. Déclencher un premier déploiement manuel.

---

## Secrets GitHub requis

À configurer dans *Settings → Secrets and variables → Actions* :

| Secret | Description |
|--------|-------------|
| `DOKPLOY_WEBHOOK_URL` | URL du webhook Dokploy (*Deployments → Webhook* de l'app). Déclenche le redéploiement après le push des images Docker. |

Les credentials GHCR (GitHub Container Registry) sont gérés automatiquement par `GITHUB_TOKEN` — aucune configuration supplémentaire requise.
