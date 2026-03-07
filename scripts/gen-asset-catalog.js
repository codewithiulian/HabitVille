const fs = require("fs");
const path = require("path");
const { parse } = require("yaml");

// ---------------------------------------------------------------------------
// Load config
// ---------------------------------------------------------------------------
const ymlPath = path.join(__dirname, "..", "config.yml");
const config = parse(fs.readFileSync(ymlPath, "utf8"));
const categories = config.assets.categories;

const ASSETS_DIR = path.join(
  __dirname,
  "..",
  "public",
  "assets",
  "GiantCityBuilder"
);
const BASE_KEY = "assets/GiantCityBuilder";
const OUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "config",
  "asset-catalog.gen.json"
);

// ---------------------------------------------------------------------------
// Category → filesystem discovery
// ---------------------------------------------------------------------------

/** List PNG files in a directory (non-recursive). */
function listPngs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort();
}

/** List subdirectories in a directory. */
function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => fs.statSync(path.join(dir, f)).isDirectory())
    .sort();
}

/** Stem without extension. */
function stem(filename) {
  return filename.replace(/\.png$/, "");
}

/** Generate display name from filename stem. */
function displayName(s) {
  return s.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Discover assets for a category.
 * Returns array of { assetId, name, spriteKey, colorVariants? }
 */
function discoverCategory(catConfig) {
  const id = catConfig.id;

  if (id === "roads") return []; // Roads handled separately

  if (id === "houses") return discoverHouses();
  if (id === "apartments") return discoverApartments();

  // All other categories: flat directory scan
  const dirMap = {
    public_buildings: "Public",
    restaurants: "Restaurants",
    shopping: "Shopping",
    vehicles: "Vehicles",
    plants: "Plants",
    decorations: "DecorItems",
    fences: "Fences",
  };

  const dirName = dirMap[id];
  if (!dirName) return [];

  const dir = path.join(ASSETS_DIR, dirName);
  return listPngs(dir).map((f) => ({
    assetId: `${id}_${stem(f)}`,
    name: displayName(stem(f)),
    spriteKey: `${BASE_KEY}/${dirName}/${f}`,
  }));
}

function discoverHouses() {
  const housesDir = path.join(ASSETS_DIR, "Houses");
  const colors = listDirs(housesDir);
  const typeSet = new Set();

  // Discover unique type numbers across all colors
  for (const color of colors) {
    const files = listPngs(path.join(housesDir, color));
    for (const f of files) {
      const match = f.match(/House_Type(\d+)\.png/);
      if (match) typeSet.add(parseInt(match[1]));
    }
  }

  const types = [...typeSet].sort((a, b) => a - b);
  const firstColor = colors[0] || "Blue";

  return types.map((typeNum) => ({
    assetId: `houses_House_Type${typeNum}`,
    name: `House Type ${typeNum}`,
    spriteKey: `${BASE_KEY}/Houses/${firstColor}/House_Type${typeNum}.png`,
    colorVariants: 8,
  }));
}

function discoverApartments() {
  const dir = path.join(ASSETS_DIR, "Appartments");
  return listPngs(dir).map((f) => ({
    assetId: `apartments_${stem(f)}`,
    name: displayName(stem(f)),
    spriteKey: `${BASE_KEY}/Appartments/${f}`,
  }));
}

// ---------------------------------------------------------------------------
// Distribution: assign unlock levels and prices
// ---------------------------------------------------------------------------

function distribute(assets, catConfig) {
  const count = assets.length;
  if (count === 0) return [];

  const levels = catConfig.unlock_levels || {
    start: catConfig.unlock_level || 1,
    end: catConfig.unlock_level || 1,
  };
  const priceRange = catConfig.price_range || {
    min: catConfig.price || 0,
    max: catConfig.price || 0,
  };

  return assets.map((asset, i) => {
    const t = count > 1 ? i / (count - 1) : 0;
    const unlockLevel = Math.round(
      levels.start + t * (levels.end - levels.start)
    );
    const price = Math.round(
      priceRange.min + t * (priceRange.max - priceRange.min)
    );

    return {
      assetId: asset.assetId,
      category: catConfig.id,
      name: asset.name,
      spriteKey: asset.spriteKey,
      unlockLevel,
      price,
      ...(asset.colorVariants ? { colorVariants: asset.colorVariants } : {}),
    };
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const catalog = [];

for (const cat of categories) {
  if (cat.id === "roads") {
    catalog.push({
      assetId: "roads_Road",
      category: "roads",
      name: "Roads",
      spriteKey: `${BASE_KEY}/Tiles/Road_Tile7.png`,
      unlockLevel: 1,
      price: 0,
    });
    continue;
  }

  const discovered = discoverCategory(cat);
  const distributed = distribute(discovered, cat);
  catalog.push(...distributed);
}

// Sort by unlock level, then by category
catalog.sort((a, b) => a.unlockLevel - b.unlockLevel || a.category.localeCompare(b.category));

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(catalog, null, 2));

console.log(`Generated ${OUT_PATH} (${catalog.length} assets)`);
