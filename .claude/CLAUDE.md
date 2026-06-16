**NEVER ADD CLAUDE CO-AUTHOR CREDITS OR "GENERATED WITH CLAUDE CODE" FOOTERS**

# Michelin Road Intelligence

App web premium qui transforme les données de ride **Strava** d'un cycliste en **intelligence pneu Michelin**. Projet d'école / hackathon (~4 jours, semaine du 15→19 juin 2026), avec soutenance devant un jury Michelin.

## Gestion de projet (Notion)

La gestion de projet (planning Kanban, liste des tâches, brief client) est tenue dans **Notion**. Au besoin, utilise le **MCP Notion** (`notion-search`, `notion-fetch`) pour aller chercher plus de contexte ou la liste des tâches à jour — la page racine est « Michelin Road Intelligence » et son Kanban « Planning Kanban ». Le résumé ci-dessous peut dater ; Notion fait foi.

## Pourquoi (brief client)

Michelin fait d'excellents pneus vélo mais n'est pas le choix naturel du cycliste premium (vs Schwalbe / Continental / Maxxis) : faible demande → faible visibilité distributeurs → achat difficile → faible demande. Cible : cyclistes passionnés qui se renseignent en ligne mais achètent en magasin. **But : capter le moment de recherche et le convertir en intention d'achat**, en positionnant l'app comme un *coach technique personnel* (pas un site e-commerce).

## Les 3 features cœur

1. **Profil cycliste auto-généré** depuis Strava : terrain dominant (plat/montagne/mixte), météo rencontrée (Open-Meteo sur coords GPS), km mensuels, style, région.
2. **Recommandation pneu sur-mesure** : reco contextualisée + explication pédagogique valorisant la techno Michelin (pas générique).
3. **Tyre Score** : usure estimée d'un pneu (modèle + date de pose × km Strava × terrain) + alerte de remplacement. C'est le service de rétention.

Flux : Strava OAuth → activités → analyse profil → moteur de reco (règles métier JSON) → Dashboard React + Tyre Score.

## Structure (monorepo, 2 sous-projets indépendants)

```
backend/    NestJS 11 + TypeScript — API. Gestionnaire : pnpm
frontend/   React 18 + Vite 6 + Tailwind v4 — UI. Gestionnaire : pnpm.
.claude/    Config Claude Code (ce fichier, settings.local.json)
```
Pas de package.json racine : on travaille `cd backend` ou `cd frontend`.

## Commandes

Les deux sous-projets utilisent **pnpm**.
**Backend** (`cd backend`) : `pnpm install` · `pnpm start:dev` (watch) · `pnpm build` · `pnpm test` · `pnpm lint`
**Frontend** (`cd frontend`) : `pnpm install` · `pnpm dev` (Vite) · `pnpm build`

## Contrat d'API attendu par le frontend (déjà codé — à implémenter côté backend)

Le frontend (`frontend/src/app/App.tsx`) appelle ces routes avec `fetch(..., { credentials: "include" })`. **Respecter ces shapes**, sinon il bascule silencieusement sur des données démo.

- `GET /auth/strava` → redirige vers OAuth Strava ; au retour, rediriger le front vers `/?auth=success` (ou `?auth=denied|error`).
- `GET /auth/logout` → détruit la session.
- `GET /api/recommend` → données réelles de l'utilisateur connecté.
- `GET /api/demo` → mêmes données mais jeu de démo (pas d'auth requise).

Réponse JSON pour `/api/recommend` et `/api/demo` :
```jsonc
{
  "success": true,
  "athlete": { "id": 0, "firstname": "", "lastname": "", "city": "", "country": "", "profile": "" },
  "profile": {
    "ride_count": 0, "total_distance_km": 0, "monthly_distance": 0,
    "avg_speed_kmh": 0, "avg_elevation_m": 0,
    "terrain_label": "", "style_label": "",
    "weather_exposure": { "rain_percentage": 0, "rainy_rides": 0 },
    "region": ""
  },
  "explanation": "",
  "recommended": {
    "name": "", "match_score": 0, "description": "", "lifetime_km": 0, "price_range": "",
    "scores": { "wet_grip": 0, "rolling_resistance": 0, "durability": 0, "terrain_versatility": 0 }
  },
  "alternatives": [ { "name": "", "match_score": 0, "description": "" } ]
}
```
La roadmap Notion prévoit aussi `POST /api/tyre-score` (DTO class-validator) pour le calcul d'usure — pas encore consommé par le front.

## Variables d'environnement (backend, dans `backend/.env` — non commité)

`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_CALLBACK_URL`, `SESSION_SECRET`, `PORT=3001`. Open-Meteo ne nécessite pas de clé. **Ne jamais commit `.env`.**

## État actuel (2026-06-16)

- **Frontend : UI quasi complète** — landing, dashboard, reco, garage/Tyre Score, alertes, avis, pairs. Stack riche : Radix UI + MUI + recharts + motion + react-router. Couleurs marque : bleu `#00205B`, jaune `#FCE500`. Données démo en dur en attendant l'API.
- **Backend : scaffold NestJS nu** (`AppModule`/`AppController`/`AppService` seulement). Tout reste à faire.

### À faire (roadmap Kanban Notion)
- Backend : config ports/CORS/sessions/ValidationPipe ; `AuthModule` (Strava OAuth via Passport) ; `StravaModule` (activités) ; service `profiler` ; `RecommenderModule` ; `TyreScoreController` ; `tires.json` (catalogue pneus + scores).
- Finalisation : déploiement Vercel (front) + Railway/Render (back) ; soutenance.

> Recommandation : commencer par l'`AuthModule` (OAuth Strava) car tout le pipeline en dépend, puis `StravaModule` → `profiler` → `recommender`.

## Conventions / pièges

- **pnpm partout** (back + front). pnpm v11 bloque par défaut les scripts de build natifs : ils sont autorisés explicitement via `allowBuilds` dans `pnpm-workspace.yaml` (front : `@tailwindcss/oxide`, `esbuild`). Ne pas committer de `package-lock.json`.
- `backend/` est suivi par le dépôt principal (le `.git` imbriqué qu'avait laissé `nest new` a été supprimé). Un seul dépôt git, à la racine.
- Frontend : alias `@` → `frontend/src`. Tailwind v4 (config via `@tailwindcss/vite`, pas de `tailwind.config.js`).
- Projet en **français** (UI, docs, commits) — garder cette langue.
