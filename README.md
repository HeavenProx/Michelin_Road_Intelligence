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
7. [Déploiement en production](#déploiement-en-production)
8. [Secrets GitHub requis](#secrets-github-requis)

---

## Prérequis

| Outil | Version minimale | Notes |
|-------|-----------------|-------|
| Node.js | 22 | LTS recommandé |
| pnpm | 9 | `npm install -g pnpm@9` |
| Docker Desktop | 4.x | Facultatif en dev, requis pour tester le compose prod |
| Compte Strava (API) | — | Créer une app sur [strava.com/settings/api](https://www.strava.com/settings/api) |

---

## Structure du dépôt

```
.
├── backend/          # API NestJS 11 + TypeScript
│   ├── src/
│   │   ├── auth/         # OAuth Strava + gestion session
│   │   ├── strava/       # Client API Strava (activités, vélos)
│   │   ├── profile/      # Calcul du profil cycliste
│   │   ├── recommend/    # Moteur de recommandation pneu
│   │   ├── garage/       # Gestion des vélos et pneus montés
│   │   ├── tyres/        # Catalogue Michelin (seed + API)
│   │   ├── alerts/       # Alertes d'usure et rappels avis
│   │   ├── peers/        # Comparaison entre cyclistes
│   │   ├── avis/         # Avis utilisateurs
│   │   └── notification/ # Envoi d'emails (Nodemailer)
│   ├── Dockerfile
│   ├── .env.example  # Modèle de variables d'environnement
│   └── package.json
│
├── frontend/         # React 18 + Vite 6 + Tailwind v4
│   ├── src/
│   │   ├── pages/        # Dashboard, Garage, Alertes, Avis, Peers
│   │   ├── components/   # Composants réutilisables
│   │   ├── context/      # AppContext (état global + alertes)
│   │   ├── hooks/        # useAlerts, usePeers, useTyres…
│   │   └── types/        # Types TypeScript partagés
│   ├── Dockerfile
│   ├── nginx.conf    # Reverse proxy nginx (→ backend :3001)
│   └── package.json
│
├── docker-compose.prod.yml  # Stack de production complète
├── .github/
│   └── workflows/ci.yml    # CI/CD : lint → build → Docker → Dokploy
└── README.md
```

> **Monorepo sans workspace racine.** Les deux sous-projets sont indépendants. Toutes les commandes `pnpm` se lancent depuis `backend/` ou `frontend/`, jamais depuis la racine.

---

## Démarrage en développement

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd Michelin_Road_Intelligence
```

### 2. Configurer l'application Strava

Sur [strava.com/settings/api](https://www.strava.com/settings/api), créer une application avec :
- **Authorization Callback Domain** : `localhost`
- **Callback URL** (à noter) : `http://localhost:3001/auth/callback`

### 3. Configurer les variables d'environnement backend

```bash
cd backend
cp .env.example .env
```

Renseigner `.env` (voir [section Variables d'environnement](#variables-denvironnement)).

### 4. Installer les dépendances et démarrer

Dans deux terminaux séparés :

```bash
# Terminal 1 — Backend (port 3001)
cd backend
pnpm install
pnpm start:dev

# Terminal 2 — Frontend (port 3000)
cd frontend
pnpm install
pnpm dev
```

L'application est accessible sur **http://localhost:3000**.

Le backend expose son API sur **http://localhost:3001**. Le frontend Vite proxifie automatiquement `/api` et `/auth` vers ce port (voir `vite.config.ts`).

---

## Variables d'environnement

Le fichier `backend/.env.example` liste toutes les variables. Copier en `backend/.env` et renseigner :

| Variable | Obligatoire | Valeur par défaut | Description |
|----------|-------------|-------------------|-------------|
| `STRAVA_CLIENT_ID` | Oui | — | ID de l'application Strava |
| `STRAVA_CLIENT_SECRET` | Oui | — | Secret de l'application Strava |
| `STRAVA_CALLBACK_URL` | Oui | `http://localhost:3001/auth/callback` | URL de retour OAuth. En prod : `https://michelin.ageronjoachim.com/auth/callback` |
| `SESSION_SECRET` | Oui | — | Clé de chiffrement session. Générer : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DB_PATH` | Non | `data/michelin.db` | Chemin du fichier SQLite (créé automatiquement) |
| `PORT` | Non | `3001` | Port d'écoute du backend |
| `FRONTEND_URL` | Non | `http://localhost:3000` | Origine CORS + cible des redirections post-OAuth |
| `NODE_ENV` | Non | — | Mettre `production` en prod (active cookies `secure` + `trust proxy`) |
| `EMAIL_HOST` | Non | — | Hôte SMTP. En prod avec Mailpit : `mailpit` |
| `EMAIL_PORT` | Non | — | Port SMTP. Mailpit : `1025` |
| `EMAIL_USER` | Non | — | Expéditeur des emails (ex. `noreply@michelin.com`) |

> **Ne jamais commiter `.env`** — il est dans `.gitignore`.

---

## Commandes utiles

### Backend (`cd backend`)

```bash
pnpm install          # Installer les dépendances
pnpm start:dev        # Démarrer en mode watch (rechargement auto)
pnpm build            # Compiler TypeScript → dist/
pnpm start:prod       # Démarrer depuis dist/ (mode production)
pnpm test             # Lancer les tests unitaires (Jest)
pnpm test:cov         # Tests avec couverture de code
pnpm lint             # ESLint + Prettier
```

### Frontend (`cd frontend`)

```bash
pnpm install          # Installer les dépendances
pnpm dev              # Démarrer Vite (HMR sur :3000)
pnpm build            # Build de production → dist/
pnpm preview          # Prévisualiser le build de production
```

---

## Architecture technique

### Backend

- **NestJS 11** avec TypeScript strict
- **TypeORM + SQLite** (`better-sqlite3`) — base de données fichier, zéro infrastructure
- **Passport.js** — stratégie OAuth 2.0 Strava, session cookie HTTP-only
- **Open-Meteo** — données météo sans clé API (requêtes sur coordonnées GPS des activités)
- **Nodemailer** — envoi d'emails via SMTP (Mailpit en prod/dev)

### Frontend

- **React 18** + **Vite 6** + **TypeScript**
- **Tailwind CSS v4** (config via plugin Vite, pas de `tailwind.config.js`)
- **Radix UI** + **MUI** — composants accessibles
- **Recharts** — graphiques d'usure
- **Alias `@`** → `frontend/src`

### Flux OAuth Strava

```
Utilisateur
  │ GET /auth/strava
  ▼
Backend ──redirect──▶ strava.com/oauth/authorize
                            │ callback
                            ▼
                    GET /auth/callback
                            │ échange code → tokens
                            │ findOrCreate(user) en DB
                            ▼
                    Redirect → frontend /?auth=success
```

### Flux de données

```
Frontend ──GET /api/recommend──▶ Backend
                                    ├─ Strava API  (activités 12 mois)
                                    ├─ Open-Meteo  (météo par coordonnées GPS)
                                    └─ Moteur reco (règles JSON + catalogue pneus)
```

---

## Déploiement en production

La production tourne sur **Dokploy** (plateforme PaaS self-hosted) avec **Traefik** comme reverse proxy et TLS Let's Encrypt automatique.

### Pipeline CI/CD (GitHub Actions)

Chaque push sur `main` déclenche `.github/workflows/ci.yml` :

```
push main
  │
  ├─ [backend]  lint → typecheck → build → tests
  ├─ [frontend] typecheck → build
  │
  ├─ [docker]   build & push images → ghcr.io
  │               ghcr.io/<owner>/michelin-backend:latest
  │               ghcr.io/<owner>/michelin-frontend:latest
  │
  └─ [deploy]   webhook GET → Dokploy
                  Dokploy pull les nouvelles images
                  et redéploie docker-compose.prod.yml
```

### Services en production (`docker-compose.prod.yml`)

| Service | Image | Rôle |
|---------|-------|------|
| `frontend` | `ghcr.io/.../michelin-frontend` | Nginx sert le build React + proxy `/api` et `/auth` → backend |
| `backend` | `ghcr.io/.../michelin-backend` | API NestJS, SQLite persisté dans un volume Docker |
| `mailpit` | `axllent/mailpit:latest` | Intercepteur SMTP — UI accessible sur `https://mail.ageronjoachim.com` |

La base de données SQLite est persistée dans le volume `backend-data` — elle survit aux redéploiements.

### Premier déploiement sur un nouveau serveur Dokploy

1. **Créer l'application** dans Dokploy → type *Docker Compose* → pointer sur ce dépôt.
2. **Renseigner les variables d'environnement** dans l'onglet *Environment* (cf. tableau ci-dessus + `MAILPIT_HOST`).
3. **Créer l'entrée DNS** `mail.<votre-domaine>` → IP du serveur (pour l'interface Mailpit).
4. **Déclencher un premier déploiement** manuel depuis Dokploy.

### Modifier le domaine de production

Dans `docker-compose.prod.yml`, remplacer `michelin.ageronjoachim.com` et `mail.ageronjoachim.com` par vos propres domaines, ou surcharger via la variable d'environnement `MAILPIT_HOST`.

---

## Secrets GitHub requis

À configurer dans *Settings → Secrets and variables → Actions* du dépôt :

| Secret | Description |
|--------|-------------|
| `DOKPLOY_WEBHOOK_URL` | URL du webhook Dokploy pour déclencher le redéploiement (trouvable dans *Deployments → Webhook* de l'app Dokploy) |

Les credentials GHCR (GitHub Container Registry) sont gérés automatiquement par `GITHUB_TOKEN` — aucune configuration supplémentaire requise.
