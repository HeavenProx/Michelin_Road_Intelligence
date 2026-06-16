/**
 * Script d'import du catalogue pneus Michelin depuis le fichier Excel.
 *
 * Usage :
 *   cd backend
 *   pnpm tsx scripts/import-tyres.ts <chemin_vers_xlsx>
 *
 * Peuple deux tables :
 *   - tyre_models : 1 ligne par modèle (Global ID unique)
 *   - tyre_sizes  : 1 ligne par variante de taille (EAN unique)
 */

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const XLSX_PATH = process.argv[2];
if (!XLSX_PATH) {
  console.error('Usage: pnpm tsx scripts/import-tyres.ts <chemin_vers_xlsx>');
  process.exit(1);
}
if (!fs.existsSync(XLSX_PATH)) {
  console.error(`Fichier introuvable : ${XLSX_PATH}`);
  process.exit(1);
}

const dbPath =
  process.env.DB_PATH ?? path.join(__dirname, '../data/michelin.db');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanStr(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean')
    return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function cleanInt(v: unknown): number | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = parseInt(String(v), 10);
  return isNaN(n) ? null : n;
}

function cleanFloat(v: unknown): number | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Score logic — calculés une fois par modèle
// ---------------------------------------------------------------------------

function scoreWetGrip(rubber: string | null): number {
  if (!rubber) return 2;
  const r = rubber.toUpperCase();
  if (r.includes('MAGI-X2') || r.includes('GUM-X3D')) return 5;
  if (r.includes('MAGI-X,GUM-X') || r.includes('GUM-X,MAGI-X')) return 5;
  if (r.includes('GUM-X') || r.includes('MAGI-X')) return 4;
  if (r.includes('E-GUM-X')) return 3;
  return 2;
}

function scoreRollingResistance(segment: string, tpi: string | null): number {
  const highTpi =
    tpi && (tpi.includes('150') || tpi.includes('180') || tpi.includes('160'));
  const medTpi =
    tpi && (tpi.includes('127') || tpi.includes('120') || tpi.includes('110'));
  if (segment.includes('RACING')) return highTpi ? 5 : 4;
  if (segment.includes('COMPETITION')) return highTpi ? 5 : medTpi ? 4 : 3;
  if (segment.includes('PERFORMANCE')) return medTpi ? 4 : 3;
  return 2;
}

function scoreDurability(
  reinforcement: string | null,
  segment: string,
): number {
  const hasHD = reinforcement?.toUpperCase().includes('HD') ?? false;
  const hasB2B = reinforcement?.toUpperCase().includes('BEAD TO BEAD') ?? false;
  if (hasHD && hasB2B) return 5;
  if (hasHD || hasB2B) return 4;
  if (segment.includes('PERFORMANCE') || segment.includes('ACCESS')) return 4;
  return 3;
}

function scoreTerrainVersatility(terrains: string | null): number {
  if (!terrains) return 1;
  const count = terrains
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean).length;
  if (count >= 4) return 5;
  if (count === 3) return 4;
  if (count === 2) return 3;
  return terrains.toUpperCase().includes('ASPHALT') ? 1 : 2;
}

function estimateLifetimeKm(
  segment: string,
  reinforcement: string | null,
): number {
  const prot = reinforcement != null;
  if (segment.includes('RACING')) return prot ? 4000 : 2500;
  if (segment.includes('COMPETITION')) return prot ? 7000 : 5000;
  if (segment.includes('PERFORMANCE')) return prot ? 10000 : 8000;
  return prot ? 15000 : 12000;
}

function estimatePriceRange(segment: string): string {
  if (segment.includes('RACING')) return '70–100€';
  if (segment.includes('COMPETITION')) return '45–75€';
  if (segment.includes('PERFORMANCE')) return '25–45€';
  return '15–30€';
}

// ---------------------------------------------------------------------------
// Lecture Excel
// ---------------------------------------------------------------------------

const wb = XLSX.readFile(XLSX_PATH);
const ws = wb.Sheets['ACTIVE PRODUCTS'];
if (!ws) {
  console.error('Feuille "ACTIVE PRODUCTS" introuvable dans le fichier.');
  process.exit(1);
}

type Row = Record<string, unknown>;
const allRows: Row[] = XLSX.utils.sheet_to_json<Row>(ws);
const tyreRows = allRows.filter((r) => r['Product Type'] === 'TYRE');
console.log(`Variantes de pneus dans le catalogue : ${tyreRows.length}`);

// Regrouper par Global ID pour construire les modèles
const byGlobalId = new Map<string, Row[]>();
for (const row of tyreRows) {
  const gid = cleanStr(row['Global ID']);
  if (!gid) continue;
  if (!byGlobalId.has(gid)) byGlobalId.set(gid, []);
  byGlobalId.get(gid)!.push(row);
}
console.log(`Modèles distincts : ${byGlobalId.size}`);

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tyre_models (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    global_id                   TEXT    NOT NULL UNIQUE,
    range_name                  TEXT    NOT NULL,
    model_name                  TEXT    NOT NULL,
    segment                     TEXT    NOT NULL,
    cycle_type                  TEXT    NOT NULL,
    cycle_type_web              TEXT,
    bead                        TEXT,
    sealing                     TEXT,
    terrain_types               TEXT,
    use_type                    TEXT,
    rubber_technologies         TEXT,
    casing_technologies         TEXT,
    tread_technologies          TEXT,
    reinforcement_technologies  TEXT,
    sidewall_type               TEXT,
    fitting                     TEXT,
    available_widths_mm         TEXT    NOT NULL DEFAULT '[]',
    score_wet_grip              INTEGER NOT NULL DEFAULT 3,
    score_rolling_resistance    INTEGER NOT NULL DEFAULT 3,
    score_durability            INTEGER NOT NULL DEFAULT 3,
    score_terrain_versatility   INTEGER NOT NULL DEFAULT 3,
    lifetime_km                 INTEGER NOT NULL DEFAULT 5000,
    price_range                 TEXT
  );

  CREATE TABLE IF NOT EXISTS tyre_sizes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id        INTEGER NOT NULL REFERENCES tyre_models(id) ON DELETE CASCADE,
    global_id       TEXT    NOT NULL,
    designation     TEXT,
    width_mm        INTEGER,
    diameter_etrto  INTEGER,
    diameter_inch   REAL,
    weight_g        INTEGER,
    tpi             TEXT,
    min_pressure_bar REAL,
    max_pressure_bar REAL,
    ean_code        TEXT
  );
`);

const upsertModel = db.prepare(`
  INSERT INTO tyre_models (
    global_id, range_name, model_name, segment, cycle_type, cycle_type_web,
    bead, sealing, terrain_types, use_type,
    rubber_technologies, casing_technologies, tread_technologies,
    reinforcement_technologies, sidewall_type, fitting,
    available_widths_mm,
    score_wet_grip, score_rolling_resistance, score_durability,
    score_terrain_versatility, lifetime_km, price_range
  ) VALUES (
    @globalId, @rangeName, @modelName, @segment, @cycleType, @cycleTypeWeb,
    @bead, @sealing, @terrainTypes, @useType,
    @rubberTechnologies, @casingTechnologies, @treadTechnologies,
    @reinforcementTechnologies, @sidewallType, @fitting,
    @availableWidthsMm,
    @scoreWetGrip, @scoreRollingResistance, @scoreDurability,
    @scoreTerrainVersatility, @lifetimeKm, @priceRange
  )
  ON CONFLICT(global_id) DO UPDATE SET
    range_name = excluded.range_name,
    model_name = excluded.model_name,
    segment = excluded.segment,
    cycle_type = excluded.cycle_type,
    cycle_type_web = excluded.cycle_type_web,
    bead = excluded.bead,
    sealing = excluded.sealing,
    terrain_types = excluded.terrain_types,
    use_type = excluded.use_type,
    rubber_technologies = excluded.rubber_technologies,
    casing_technologies = excluded.casing_technologies,
    tread_technologies = excluded.tread_technologies,
    reinforcement_technologies = excluded.reinforcement_technologies,
    sidewall_type = excluded.sidewall_type,
    fitting = excluded.fitting,
    available_widths_mm = excluded.available_widths_mm,
    score_wet_grip = excluded.score_wet_grip,
    score_rolling_resistance = excluded.score_rolling_resistance,
    score_durability = excluded.score_durability,
    score_terrain_versatility = excluded.score_terrain_versatility,
    lifetime_km = excluded.lifetime_km,
    price_range = excluded.price_range
  RETURNING id
`);

const insertSize = db.prepare(`
  INSERT INTO tyre_sizes (
    model_id, global_id, designation,
    width_mm, diameter_etrto, diameter_inch,
    weight_g, tpi, min_pressure_bar, max_pressure_bar, ean_code
  ) VALUES (
    @modelId, @globalId, @designation,
    @widthMm, @diameterEtrto, @diameterInch,
    @weightG, @tpi, @minPressureBar, @maxPressureBar, @eanCode
  )
`);

const deleteOldSizes = db.prepare(`DELETE FROM tyre_sizes WHERE global_id = ?`);

const importAll = db.transaction(() => {
  let modelsInserted = 0;
  let sizesInserted = 0;

  for (const [globalId, rows] of byGlobalId) {
    // Le premier row sert de référence pour les données modèle
    const ref = rows[0];
    const segment = cleanStr(ref['Segment']) ?? 'ACCESS LINE';
    const rubber = cleanStr(ref['Rubber Technologies']);
    const reinforcement = cleanStr(ref['Reinforcement Technologies']);
    const terrains = cleanStr(ref['Terrain Types']);

    // Largeurs uniques disponibles
    const widths = [
      ...new Set(
        rows
          .map((r) => cleanInt(r['Width ETRTO'] ?? r['Web Width (mm)']))
          .filter((w): w is number => w !== null),
      ),
    ].sort((a, b) => a - b);

    // TPI du ref (pour calcul rolling resistance)
    const tpi = cleanStr(ref['TPI']);

    const modelRow = {
      globalId,
      rangeName: cleanStr(ref['Web Range Name']) ?? '',
      modelName: cleanStr(ref['Range (Internal)']) ?? globalId,
      segment,
      cycleType: cleanStr(ref['Cycle Type']) ?? '',
      cycleTypeWeb: cleanStr(ref['CYCLE TYPE WEB']),
      bead: cleanStr(ref['Bead']),
      sealing: cleanStr(ref['Sealing']),
      terrainTypes: terrains,
      useType: cleanStr(ref['Use']),
      rubberTechnologies: rubber,
      casingTechnologies: cleanStr(ref['Casing Technologies']),
      treadTechnologies: cleanStr(ref['Tread Pattern Technologies']),
      reinforcementTechnologies: reinforcement,
      sidewallType: cleanStr(ref['Sidewall Type']),
      fitting: cleanStr(ref['Fitting']),
      availableWidthsMm: JSON.stringify(widths),
      scoreWetGrip: scoreWetGrip(rubber),
      scoreRollingResistance: scoreRollingResistance(segment, tpi),
      scoreDurability: scoreDurability(reinforcement, segment),
      scoreTerrainVersatility: scoreTerrainVersatility(terrains),
      lifetimeKm: estimateLifetimeKm(segment, reinforcement),
      priceRange: estimatePriceRange(segment),
    };

    const result = upsertModel.get(modelRow) as { id: number };
    modelsInserted++;

    // Reconstruire les variantes de taille pour ce modèle
    deleteOldSizes.run(globalId);
    for (const row of rows) {
      insertSize.run({
        modelId: result.id,
        globalId,
        designation: cleanStr(row['Web Product Designation']),
        widthMm: cleanInt(row['Width ETRTO'] ?? row['Web Width (mm)']),
        diameterEtrto: cleanInt(row['Diameter ETRTO']),
        diameterInch: cleanFloat(row['Web Diameter (Inch)']),
        weightG: cleanInt(row['Weight (g)']),
        tpi: cleanStr(row['TPI']),
        minPressureBar: cleanFloat(row['Minimum Pressure (Bar)']),
        maxPressureBar: cleanFloat(row['Maximum Pressure (Bar)']),
        eanCode: cleanStr(row['EAN Code']),
      });
      sizesInserted++;
    }
  }

  return { modelsInserted, sizesInserted };
});

const result = importAll();
console.log(
  `Import terminé : ${result.modelsInserted} modèles, ${result.sizesInserted} variantes → ${dbPath}`,
);

// Stats
const stats = db
  .prepare(
    'SELECT cycle_type, COUNT(*) as n FROM tyre_models GROUP BY cycle_type',
  )
  .all();
console.log('Répartition par type de vélo :', stats);

const segStats = db
  .prepare(
    'SELECT segment, COUNT(*) as n FROM tyre_models GROUP BY segment ORDER BY n DESC',
  )
  .all();
console.log('Répartition par segment :', segStats);
