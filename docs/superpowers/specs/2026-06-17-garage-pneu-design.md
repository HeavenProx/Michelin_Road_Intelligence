# Système de garage pneu — Design

> Statut : validé en brainstorming le 2026-06-17. À implémenter côté backend (`backend/src/garage/`). Le frontend est déjà maquetté (`GaragePage.tsx`, `AlertePage.tsx`) en données démo.

## Objectif

Permettre au cycliste de gérer un **garage multi-vélos** : chaque vélo importé de Strava porte un pneu Michelin **avant** et **arrière**, dont on suit l'usure (Tyre Score) en continu à partir des km Strava, avec alertes de remplacement et historique des pneus retirés. C'est le service de **rétention** de l'app.

## Décisions de cadrage

- **Garage multi-vélos** (option C2) : vélos auto-importés de Strava → 2 pneus par vélo (avant + arrière).
- **Avant / arrière suivis séparément**, avec coefficient d'usure distinct (arrière ~1.9× l'avant).
- **Tyre Score pondéré par position + terrain** ; météo et style restent **pédagogiques** (texte d'explication), pas dans le chiffre.
- **Import auto Strava** (option A) : zéro saisie de vélo, l'utilisateur n'assigne que le modèle de pneu + la date de pose.
- **Remplacement → archivage** dans un historique (option A) : **affichage seul**, pas de couplage avec le moteur `recommend`.

## Modèle de données (TypeORM, `backend/src/garage/`)

### `Bike` — vélo importé de Strava (1 par `gear_id`)

| Champ | Type | Note |
|---|---|---|
| `id` | PK | |
| `user` | FK `User` | propriétaire |
| `stravaGearId` | string | unique par utilisateur |
| `name` | string | nom Strava du vélo |
| `type` | string | ROAD / GRAVEL / MTB… (dérivé du `sport_type` dominant) |
| `stravaDistanceKm` | number | distance totale Strava (référence) |
| `lastSyncedAt` | Date | pour le sync paresseux |

### `GarageTyre` — un pneu, monté **ou** archivé (entité unique)

| Champ | Type | Note |
|---|---|---|
| `id` | PK | |
| `bike` | FK `Bike` | |
| `position` | enum `FRONT` \| `REAR` | |
| `tyreModel` | FK `TyreModel` | modèle Michelin monté |
| `mountedDate` | Date | date de pose |
| `status` | enum `MOUNTED` \| `RETIRED` | |
| `removedDate` | Date \| null | null si monté |
| `kmHeld` | number \| null | km réels tenus, figé à l'archivage |
| `durationMonths` | number \| null | durée d'usage, figé à l'archivage |
| `finalWearPercent` | number \| null | usure finale, figé à l'archivage |

**Choix : une seule entité** plutôt que `MountedTyre` + `TyreHistory` séparées. Le remplacement passe le statut à `RETIRED` + fige les chiffres, puis crée une nouvelle ligne `MOUNTED`. L'historique est un simple `WHERE status = RETIRED`.

**Contrainte d'unicité** : un seul `MOUNTED` par couple (`bike`, `position`).

## Calcul du Tyre Score

Pour un pneu monté, on filtre les activités du `gear_id` du vélo depuis `mountedDate` (exclure `trainer` / `manual`) :

```
kmUsed        = Σ distanceKm des activités (km réels roulés)
kmMaxAjuste   = tyreModel.lifetimeKm / (coeffPosition × coeffTerrainMoyen)
wearPercent   = clamp(0, 100, round(kmUsed / kmMaxAjuste × 100))
kmLeft        = max(0, kmMaxAjuste − kmUsed)
```

Coefficients :

- `coeffPosition` : avant `1.0` · arrière `~1.9`
- `coeffTerrain` (par activité, moyenné pondéré par les km) : asphalte/route `1.0` · gravel/offroad `~1.3–1.5`, dérivé de `sportType` + dénivelé.

Statut visuel (cohérent avec la maquette) :

- `wear < 55` → **Bon état** (vert)
- `55 ≤ wear < 80` → **À surveiller** (ambre)
- `wear ≥ 80` → **À remplacer** (rouge) → déclenche une alerte

> On dégrade `kmMax` plutôt que de gonfler les km : cela colle au libellé maquette « km max\* ajusté selon votre terrain » et reste honnête à l'affichage. Météo / style n'entrent **pas** dans le chiffre — ils habillent l'explication texte.

## API (`backend/src/garage/garage.controller.ts`)

| Méthode | Route | Auth | Rôle |
|---|---|---|---|
| `GET` | `/api/garage` | oui | Garage complet : vélos + pneus montés + Tyre Scores. Sync Strava paresseux si `lastSyncedAt` périmé. |
| `GET` | `/api/garage/demo` | non | Même shape, jeu démo (cohérent avec `/api/demo`). |
| `PUT` | `/api/garage/tyres` | oui | Assigner / modifier un pneu monté `{ bikeId, position, modelGlobalId, mountedDate }` (DTO class-validator). |
| `POST` | `/api/garage/tyres/:id/replace` | oui | Archiver l'ancien + monter le nouveau `{ modelGlobalId, mountedDate }`. |
| `GET` | `/api/garage/history` | oui | Pneus retirés, groupés par vélo. |
| `POST` | `/api/garage/sync` | oui | Forcer le ré-import des vélos Strava. |

### Shape de réponse `/api/garage` (et `/demo`)

```jsonc
{
  "success": true,
  "bikes": [
    {
      "id": 0,
      "name": "",
      "type": "",
      "strava_distance_km": 0,
      "tyres": [
        {
          "id": 0,
          "position": "FRONT",       // ou "REAR"
          "model": { "name": "", "lifetime_km": 0, "price_range": "" },
          "mounted_date": "2025-08-15",
          "km_used": 0,
          "km_max_adjusted": 0,
          "km_left": 0,
          "wear_percent": 0,
          "status_label": "",         // Bon état | À surveiller | À remplacer
          "explanation": ""           // texte pédagogique (terrain + météo/style)
        }
      ]
    }
  ]
}
```

`/api/garage/history` renvoie les `GarageTyre` `RETIRED` (modèle, `km_held`, `duration_months`, `final_wear_percent`, `mounted_date`, `removed_date`) groupés par vélo.

## Ajout côté Strava (`backend/src/strava/`)

- `strava.service.getAthleteBikes()` → `GET /athlete` (champ `bikes[]` : `id`, `name`, `distance`, `primary`) pour peupler `Bike`.
- Nouveau type `StravaBike` (raw + normalisé) dans `strava.types.ts`.

## Fonctionnalités utilisateur (référence)

1. Import auto des vélos Strava au premier accès.
2. Par vélo : choix du pneu avant + arrière (sélecteur avec recherche, déjà maquetté) + date de pose.
3. Suggestion de date de pose par défaut = date de la 1ʳᵉ activité avec ce vélo (modifiable).
4. Tyre Score par pneu (avant ET arrière), jauge % + km utilisés / restants / max.
5. Recalcul continu des km depuis Strava, pondéré position × terrain.
6. Statut visuel Bon état / À surveiller / À remplacer.
7. Vue d'ensemble du garage (tous vélos + 4 pneus).
8. Alerte de remplacement au seuil → alimente l'`AlertePage` existante.
9. Rappels d'avis sur jalons km (maquetté) → module `avis`.
10. CTA « Trouver un remplacement » → `StoreSection`.
11. Bouton « J'ai remplacé ce pneu » → archive + amorce le nouveau.
12. Historique des pneus passés par vélo (preuve de longévité Michelin).
13. Laisser un avis depuis le garage (`ReviewModal`).

## Hors périmètre (YAGNI pour le hackathon)

- Vélos manuels / hors Strava (option C hybride écartée).
- Couplage historique → moteur de reco (`recommend`).
- Notifications proactives (email / push) : les alertes restent **in-app**.
- Météo / style dans le calcul chiffré de l'usure.
