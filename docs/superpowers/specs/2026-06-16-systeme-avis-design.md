# Système d'avis — Design

**Date :** 2026-06-16
**Statut :** validé en brainstorming, prêt pour plan d'implémentation
**Périmètre choisi :** système complet avec avis vérifié (badge adossé aux km Strava réels)

## Objectif

Brancher la page Avis du frontend (aujourd'hui 100 % données démo) sur un vrai backend :
lecture des avis depuis la base, soumission persistée par l'utilisateur connecté, et
**badge « avis vérifié »** adossé aux kilomètres Strava réels parcourus depuis la pose du pneu.

## Contexte existant

- **Front déjà construit** (données démo en dur) :
  - `frontend/src/pages/AvisPage.tsx` — liste, filtre par modèle + recherche, agrégats par pneu, CTA « laisser un avis ».
  - `frontend/src/components/ReviewModal.tsx` — formulaire (note globale + 4 critères + commentaire), soumission factice (`setTimeout`).
  - `frontend/src/components/StarRating.tsx`, `CritBar.tsx` — affichage.
  - Données démo : `frontend/src/data/demo.ts` → `REVIEWS` (7 avis).
  - Fetch : `frontend/src/context/AppContext.tsx`, `fetch(path, { credentials: "include" })`, **fallback silencieux** sur démo si l'appel échoue.
- **Back** : NestJS 11 + TypeORM (better-sqlite3, `synchronize: true`). Entités `User`, `TyreModel`, `TyreSize`, `ProfileSnapshot`. Modules `auth`, `strava`, `profile`, `recommend`, `users`. **Aucun module avis.**
- **Seed** : script standalone `backend/scripts/import-tyres.ts` (better-sqlite3 direct). Pattern à suivre pour seeder les avis démo.
- `ProfileService` somme déjà les distances des activités Strava → réutilisable pour le calcul km-depuis-pose.

## Shape attendu par le front (à respecter)

Un avis tel que consommé par `AvisPage` :

```jsonc
{
  "id": 1,
  "name": "Élodie M.",
  "location": "Annecy, Haute-Savoie",
  "tire": "Power All Season TLR",
  "km": 2840,            // km au moment de l'avis
  "totalKm": 8420,       // km total du cycliste
  "rating": 5,           // note globale 1–5
  "text": "…",
  "date": "12 avril 2026",
  "criteria": { "grip": 5, "durabilite": 4, "confort": 5, "anticrv": 5 },
  "verified": true       // AJOUT — badge avis vérifié
}
```

Les agrégats par pneu (`count`, `avg`) restent **calculés côté front** à partir de la liste (code déjà présent dans `AvisPage`).

## Architecture (back)

Nouveau module autonome `backend/src/avis/` :

```
avis/
  review.entity.ts          # entité TypeORM Review
  avis.module.ts
  avis.controller.ts        # routes /api/reviews
  avis.service.ts           # lecture, soumission (upsert), gate vérifié
  dto/create-review.dto.ts  # validation class-validator
```

À enregistrer dans `app.module.ts` (entité `Review` dans le tableau `entities`, `AvisModule` dans `imports`).

### Couture de vérification (point de jointure unique)

Le calcul des km Strava vit côté Strava/Profile, **pas** dans le module avis :

- `kmRiddenSince(userId, since: Date): Promise<number>` — somme des distances des activités Strava postérieures à `since`. Réutilisée plus tard par le Tyre Score.
- `resolveMountDate(userId, tyreModelId): Promise<Date>` — **stub** : renvoie aujourd'hui − 90 jours.
  - `// TODO: remplacer par la date de pose persistée (garage) quand le Tyre Score back existera.`
  - **C'est le seul endroit à changer** lorsque le garage persistera la pose. Le module avis ne bouge pas.

Décision de séquencement (validée) : on ne bloque pas les avis sur le garage. Le calcul km-depuis-date
est fait **en vrai** dès maintenant (données Strava déjà disponibles) ; seule la *source de la date de pose*
est stubée et basculera plus tard sur le garage.

## Modèle de données — entité `Review`

| Champ | Type | Source |
|---|---|---|
| `id` | PK auto | — |
| `userId` | int **nullable**, FK User (`onDelete: CASCADE`) | session (null pour les avis démo seedés) |
| `tyreModelId` | int, FK TyreModel | choix du modèle |
| `authorName` | text | **snapshot** : `firstname + " " + lastname[0] + "."` à l'écriture ; en dur pour les seeds |
| `authorLocation` | text | **snapshot** : `city + ", " + state` à l'écriture ; en dur pour les seeds |
| `rating` | int 1–5 | formulaire (note globale) |
| `gripScore` | int 1–5 | critère grip |
| `durabilityScore` | int 1–5 | critère durabilité |
| `comfortScore` | int 1–5 | critère confort |
| `punctureScore` | int 1–5 | critère anti-crevaison |
| `comment` | text | formulaire |
| `mountDate` | date | `resolveMountDate(...)` |
| `kmAtReview` | int | **calculé** : `kmRiddenSince(userId, mountDate)` |
| `totalKm` | int | **calculé** : km Strava total du cycliste |
| `verified` | bool | `kmAtReview >= SEUIL_VERIF` |
| `createdAt` | timestamp (`@CreateDateColumn`) | auto |

**Dénormalisation `authorName`/`authorLocation`** : snapshot stocké sur l'avis (pas de JOIN, gère
seeds démo sans `User` réel et vrais avis de façon uniforme).

**Unicité `(userId, tyreModelId)`** → upsert : re-soumettre sur le même pneu met à jour l'avis existant.
NB : SQLite traite les `NULL` comme distincts dans une contrainte unique → plusieurs avis démo (`userId = null`)
sur le même modèle restent permis (le jeu démo a 4 avis sur « Power All Season TLR »).

**Constante** : `SEUIL_VERIF = 500` (km).

## Routes API

Contrôleur `@Controller('api')` (cohérent avec `recommend`).

| Route | Auth | Rôle |
|---|---|---|
| `GET /api/reviews?tire=<model>` | non (public) | Liste d'avis au shape front ci-dessus, filtrable par modèle. Tri par `createdAt` desc. |
| `GET /api/reviews/eligibility?tire=<model>` | oui (`AuthenticatedGuard`) | `{ kmOnTire, threshold: 500, eligible }` → pilote le bloc CTA (« Vous avez parcouru X km… seuil 500 km »). |
| `POST /api/reviews` | oui (`AuthenticatedGuard`) | Soumet / upsert un avis. Calcule `mountDate`, `kmAtReview`, `totalKm`, `verified`, le snapshot auteur. Renvoie l'avis créé au shape front. |

- **Lecture publique** (alimente la page démo et la landing sans auth).
- `POST` corps validé par `CreateReviewDto` (`tyreModelId` ou nom de modèle, `rating` 1–5, 4 critères 1–5, `comment`).
- **Gate dur** (cohérent avec le titre « Avis vérifiés » et le CTA « seuil requis pour laisser un avis ») : si `kmAtReview < SEUIL_VERIF`, le `POST` est **refusé** (HTTP 403) avec le km courant renvoyé. Conséquence : tout avis persisté est vérifié → `verified = true` pour tous les avis postés (et les seeds). La colonne `verified` est conservée pour la clarté du shape front et la robustesse future.

## Liste des fonctionnalités

**Lecture**
- Lister les avis, filtre par modèle + recherche (UI existante → branchée sur l'API).
- Agrégats par pneu (nombre + note moyenne) — calculés côté front à partir de la liste.
- Carte d'avis : auteur, lieu, modèle, km à l'avis, km total, note globale, 4 critères, texte, date, **badge vérifié**.

**Écriture**
- Soumission : note globale (requise) + 4 critères + commentaire, rattachée à un modèle de pneu.
- Auth obligatoire (utilisateur Strava connecté).
- `mountDate` résolu côté back (stub aujourd'hui, garage demain) — **pas de champ date dans le modal**.
- Upsert : un avis par `(user, modèle)` ; re-soumission = mise à jour.
- Validation DTO (`rating` 1–5, critères 1–5, longueur commentaire, modèle existant).

**Vérification**
- Calcul km-depuis-pose via Strava (`kmRiddenSince`).
- Badge `verified` selon le seuil (500 km).
- Endpoint d'éligibilité pour piloter l'affichage du CTA côté garage / page avis.

**Plomberie / démo**
- Entité `Review` + module enregistrés dans `app.module.ts`.
- Seed des 7 avis démo en base (`userId = null`, `authorName`/`authorLocation` en dur, `verified = true`),
  via un script type `scripts/import-tyres.ts`, pour que la liste ne soit pas vide au jury.
- Front :
  - Remplacer la lecture de `REVIEWS` (démo) par un `fetch('/api/reviews')` (fallback silencieux sur `REVIEWS` démo si échec — convention CLAUDE.md).
  - Brancher la soumission du `ReviewModal` sur `POST /api/reviews`.

## Hors scope (YAGNI hackathon)

- Modération / signalement d'avis.
- Votes « utile » / likes.
- Photos.
- Historique d'édition.
- Pagination (jeu de données petit).
- Persistance du garage / Tyre Score back (chantier séparé ; seule `resolveMountDate` y fera le pont).

## Points tranchés en brainstorming

1. **Date de pose** : stub `aujourd'hui − 90 j` côté back (pas de champ dans le modal) ; basculera sur le garage via `resolveMountDate` uniquement.
2. **Upsert** : un avis par `(user, modèle)`, re-soumission = mise à jour.
3. **Lecture publique** des avis (sans auth).
4. **Calcul Strava réel** dès maintenant (données déjà disponibles), pas de mock du calcul ; seule la source de la date est stubée.
5. **Snapshot auteur** dénormalisé (`authorName`/`authorLocation`) pour gérer seeds et vrais avis uniformément.
