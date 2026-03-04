import type { AssetCategory, AssetEntry } from '../types/assets';

// ---------------------------------------------------------------------------
// Category defaults — anchor & offset
// ---------------------------------------------------------------------------
const GROUND_ANCHOR = { x: 0.5, y: 0 };    // top-center (matches current grass tile)
const UPRIGHT_ANCHOR = { x: 0.5, y: 1.0 };  // bottom-center ("foot" of sprite)
const DEFAULT_OFFSET = { x: 0, y: 0 };
const DEFAULT_SIZE = { w: 1, h: 1 };

const BASE = 'assets/GiantCityBuilder';

// ---------------------------------------------------------------------------
// Helper: register one entry
// ---------------------------------------------------------------------------
function entry(
  key: string,
  textureKey: string,
  displayName: string,
  category: AssetCategory,
  anchor = UPRIGHT_ANCHOR,
  gridOffset = DEFAULT_OFFSET,
  size = DEFAULT_SIZE,
): AssetEntry {
  return { key, textureKey, displayName, anchor, gridOffset, category, size };
}

// ---------------------------------------------------------------------------
// Tile helpers
// ---------------------------------------------------------------------------
function tileEntry(filename: string, displayName: string, category: AssetCategory = 'tile'): AssetEntry {
  return entry(filename, `${BASE}/Tiles/${filename}.png`, displayName, category, GROUND_ANCHOR);
}

// ---------------------------------------------------------------------------
// Pattern generators
// ---------------------------------------------------------------------------

function generateTiles(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Base terrain + half variants
  const terrains = ['Grass', 'Dirt', 'LowDirt', 'Asfalt', 'Concreet', 'Water'];
  for (const t of terrains) {
    entries.push(tileEntry(t, t));
    entries.push(tileEntry(`${t}_HalfBottom`, `${t} Half Bottom`));
    entries.push(tileEntry(`${t}_HalfSide`, `${t} Half Side`));
    entries.push(tileEntry(`${t}_HalfTop`, `${t} Half Top`));
  }

  // Roads (9 variants × 3 types)
  const roadTypes = ['Road', 'DirtRoad', 'GrassRoad'];
  for (const rt of roadTypes) {
    for (let i = 1; i <= 9; i++) {
      entries.push(tileEntry(`${rt}_Tile${i}`, `${rt} ${i}`, 'road'));
    }
  }

  // Sidewalks (9 variants)
  for (let i = 1; i <= 9; i++) {
    entries.push(tileEntry(`Sidewalk_Tile${i}`, `Sidewalk ${i}`, 'sidewalk'));
  }

  // StonePath (7 variants)
  for (let i = 1; i <= 7; i++) {
    entries.push(tileEntry(`StonePath_Tile${i}`, `Stone Path ${i}`, 'sidewalk'));
  }

  // Train tracks (6 + 2 half variants)
  for (let i = 1; i <= 6; i++) {
    entries.push(tileEntry(`TrainTrack_Tile${i}`, `Train Track ${i}`));
  }
  entries.push(tileEntry('TrainTrack_Tile6Bottom', 'Train Track 6 Bottom'));
  entries.push(tileEntry('TrainTrack_Tile6Top', 'Train Track 6 Top'));

  // Water pipes (7 variants)
  for (let i = 1; i <= 7; i++) {
    entries.push(tileEntry(`WaterPipe_Tile${i}`, `Water Pipe ${i}`));
  }

  return entries;
}

function generateHouses(): AssetEntry[] {
  const entries: AssetEntry[] = [];
  const colors = ['Blue', 'Brown', 'Green', 'Grey', 'Pink', 'Red', 'White', 'Yellow'];

  for (const color of colors) {
    for (let i = 1; i <= 20; i++) {
      const key = `House_${color}_Type${i}`;
      entries.push(entry(
        key,
        `${BASE}/Houses/${color}/House_Type${i}.png`,
        `${color} House Type ${i}`,
        'building-residential',
      ));
    }
  }

  // Garden variants (root of Houses/)
  const gardens = ['Garden_Driveway', 'Garden_Pool', 'Garden_Rustic'];
  for (const g of gardens) {
    entries.push(entry(
      g,
      `${BASE}/Houses/${g}.png`,
      g.replace('_', ' '),
      'building-residential',
      GROUND_ANCHOR, // gardens are ground-level
    ));
  }

  return entries;
}

function generateApartments(): AssetEntry[] {
  const entries: AssetEntry[] = [];
  const colors = ['Blue', 'Green', 'Grey', 'Pink', 'Red', 'Yellow'];
  const sizes = ['1x1', '1x2', '2x2'];

  for (const color of colors) {
    for (const size of sizes) {
      for (let level = 1; level <= 3; level++) {
        const key = `Appartment_${color}_${size}_Level${level}`;
        const gridSize = size === '2x2' ? { w: 2, h: 2 } : size === '1x2' ? { w: 1, h: 2 } : DEFAULT_SIZE;
        entries.push(entry(
          key,
          `${BASE}/Appartments/${key}.png`,
          `${color} Apartment ${size} L${level}`,
          'building-residential',
          UPRIGHT_ANCHOR,
          DEFAULT_OFFSET,
          gridSize,
        ));
      }
    }
  }

  return entries;
}

function generateShopping(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Shops with OneFloor/OneFloorRoofed/TwoFloors/TwoFloorsRoofed pattern
  const shopTypes = ['Butcher', 'Clothing', 'Empty', 'Fish', 'Flowers', 'Kiosk', 'Music', 'Pets', 'Pharmacy', 'Tools', 'Veggies'];
  for (const type of shopTypes) {
    const variants = ['OneFloor', 'OneFloorRoofed', 'TwoFloors', 'TwoFloorsRoofed'];
    for (const v of variants) {
      const key = `Shop_${type}_${v}`;
      entries.push(entry(key, `${BASE}/Shopping/${key}.png`, `${type} Shop (${v})`, 'building-commercial'));
    }
  }

  // Shops with Front variants
  const fronts = ['Shop_Empty_Front', 'Shop_Flowers_Front', 'Shop_Kiosk_Front', 'Shop_Tools_Front'];
  for (const f of fronts) {
    entries.push(entry(f, `${BASE}/Shopping/${f}.png`, f.replace(/_/g, ' '), 'building-commercial'));
  }

  // Groceries
  entries.push(entry('Groceries_Mall', `${BASE}/Shopping/Groceries_Mall.png`, 'Groceries Mall', 'building-commercial'));
  entries.push(entry('Groceries_Mall_Front', `${BASE}/Shopping/Groceries_Mall_Front.png`, 'Groceries Mall Front', 'building-commercial'));
  entries.push(entry('Groceries_Market', `${BASE}/Shopping/Groceries_Market.png`, 'Groceries Market', 'building-commercial'));
  for (let i = 1; i <= 3; i++) {
    entries.push(entry(`Groceries_Market_Front${i}`, `${BASE}/Shopping/Groceries_Market_Front${i}.png`, `Groceries Market Front ${i}`, 'building-commercial'));
  }
  entries.push(entry('Groceries_Store', `${BASE}/Shopping/Groceries_Store.png`, 'Groceries Store', 'building-commercial'));

  // Standalone shops
  entries.push(entry('Shop_Laundromat', `${BASE}/Shopping/Shop_Laundromat.png`, 'Laundromat', 'building-commercial'));
  entries.push(entry('Shop_Pawnshop', `${BASE}/Shopping/Shop_Pawnshop.png`, 'Pawnshop', 'building-commercial'));

  // Workplaces
  const workplaceTypes = ['Dentist', 'Electrician', 'Empty', 'Handyman'];
  for (const type of workplaceTypes) {
    entries.push(entry(`Workplace_${type}_OneFloor`, `${BASE}/Shopping/Workplace_${type}_OneFloor.png`, `${type} Workplace (1F)`, 'building-commercial'));
    entries.push(entry(`Workplace_${type}_TwoFloors`, `${BASE}/Shopping/Workplace_${type}_TwoFloors.png`, `${type} Workplace (2F)`, 'building-commercial'));
  }
  // Irregular naming
  entries.push(entry('Workplace_OneFloor_PestControl', `${BASE}/Shopping/Workplace_OneFloor_PestControl.png`, 'Pest Control (1F)', 'building-commercial'));
  entries.push(entry('Workplace_PestControl_TwoFloors', `${BASE}/Shopping/Workplace_PestControl_TwoFloors.png`, 'Pest Control (2F)', 'building-commercial'));
  entries.push(entry('Workplace_TwoFloorsRoofed_Clothing', `${BASE}/Shopping/Workplace_TwoFloorsRoofed_Clothing.png`, 'Clothing Workplace (2F Roofed)', 'building-commercial'));
  entries.push(entry('WorkSpace_Bank', `${BASE}/Shopping/WorkSpace_Bank.png`, 'Bank', 'building-commercial'));

  return entries;
}

function generateRestaurants(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  const types = ['Breakfast', 'Burger', 'Cake', 'Chicken', 'Chinese', 'French', 'Grill', 'Indian', 'Mexican', 'Pizza', 'Ramen', 'Sandwich', 'Sushi', 'Veggies'];
  for (const type of types) {
    entries.push(entry(`Restaurant_${type}`, `${BASE}/Restaurants/Restaurant_${type}.png`, `${type} Restaurant`, 'restaurant'));
    entries.push(entry(`Restaurant_${type}_Front`, `${BASE}/Restaurants/Restaurant_${type}_Front.png`, `${type} Restaurant Front`, 'restaurant'));
  }

  // Bar & Cafe
  entries.push(entry('Bar', `${BASE}/Restaurants/Bar.png`, 'Bar', 'restaurant'));
  entries.push(entry('Bar_Front', `${BASE}/Restaurants/Bar_Front.png`, 'Bar Front', 'restaurant'));
  entries.push(entry('Cafe', `${BASE}/Restaurants/Cafe.png`, 'Cafe', 'restaurant'));
  entries.push(entry('Cafe_Front', `${BASE}/Restaurants/Cafe_Front.png`, 'Cafe Front', 'restaurant'));

  return entries;
}

function generatePublic(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Simple single-file buildings
  const singles: Array<[string, string]> = [
    ['Airport_Hangar', 'Airport Hangar'],
    ['Airport_RunwayBottom', 'Runway Bottom'],
    ['Airport_RunwayTop', 'Runway Top'],
    ['BusStop', 'Bus Stop'],
    ['BusStop_Front', 'Bus Stop Front'],
    ['Doctor_EmergencyRoom', 'Emergency Room'],
    ['Doctor_Hospital', 'Hospital'],
    ['Doctor_Office', 'Doctor Office'],
    ['Education_College', 'College'],
    ['Education_School', 'School'],
    ['Education_University', 'University'],
    ['Emergency_FireStation', 'Fire Station'],
    ['Emergency_PoliceStation', 'Police Station'],
    ['Emergency_Prison', 'Prison'],
    ['Emergency_Prison_Front', 'Prison Front'],
    ['GasStation', 'Gas Station'],
    ['GasStation_Front1', 'Gas Station Front 1'],
    ['GasStation_Front2', 'Gas Station Front 2'],
    ['HelicopterPad', 'Helicopter Pad'],
    ['Industrial_PowerPlant', 'Power Plant'],
    ['Industrial_WaterPlant', 'Water Plant'],
    ['Industrial_WaterPlant_Front', 'Water Plant Front'],
    ['LandFill', 'Landfill'],
    ['MetroStation', 'Metro Station'],
    ['MetroStation_Front', 'Metro Station Front'],
    ['Park_Fountain', 'Park Fountain'],
    ['Park_Pond', 'Park Pond'],
    ['Pool', 'Public Pool'],
    ['PostOffice', 'Post Office'],
    ['Public_Library', 'Library'],
    ['Public_Library_Front', 'Library Front'],
    ['Public_Townhall', 'Town Hall'],
    ['Public_Trainstation', 'Train Station'],
    ['RadioStation', 'Radio Station'],
    ['Recycling', 'Recycling Center'],
    ['TeleTower', 'Telecom Tower'],
  ];
  for (const [key, name] of singles) {
    entries.push(entry(key, `${BASE}/Public/${key}.png`, name, 'building-public'));
  }

  // Carparks
  const carparkSizes = ['1x1', '1x2', '2x2'];
  for (const size of carparkSizes) {
    entries.push(entry(`Carpark_${size}`, `${BASE}/Public/Carpark_${size}.png`, `Car Park ${size}`, 'building-public'));
    entries.push(entry(`Carpark_${size}_Sign`, `${BASE}/Public/Carpark_${size}_Sign.png`, `Car Park ${size} Sign`, 'building-public'));
  }
  entries.push(entry('Carpark_Fancy_GateDown', `${BASE}/Public/Carpark_Fancy_GateDown.png`, 'Fancy Car Park Gate Down', 'building-public'));
  entries.push(entry('Carpark_Fancy_GateUp', `${BASE}/Public/Carpark_Fancy_GateUp.png`, 'Fancy Car Park Gate Up', 'building-public'));

  // Construction
  for (const size of ['1x1', '1x2', '2x2']) {
    entries.push(entry(`Construction_${size}`, `${BASE}/Public/Construction_${size}.png`, `Construction ${size}`, 'building-public'));
  }

  // Hotels
  const hotels: Array<[string, string]> = [
    ['Hotel_BarFront', 'Hotel Bar Front'],
    ['Hotel_Front', 'Hotel Front'],
    ['Hotel_OneFloor', 'Hotel (1F)'],
    ['Hotel_RoofBar', 'Hotel Roof Bar'],
    ['Hotel_ThreeFloors', 'Hotel (3F)'],
    ['Hotel_TwoFloors', 'Hotel (2F)'],
  ];
  for (const [key, name] of hotels) {
    entries.push(entry(key, `${BASE}/Public/${key}.png`, name, 'building-public'));
  }

  // Leisure
  const leisure: Array<[string, string]> = [
    ['Leasure_Cinema', 'Cinema'],
    ['Leasure_Cinema_Front', 'Cinema Front'],
    ['Leasure_Museum', 'Museum'],
    ['Leasure_Museum_Front', 'Museum Front'],
    ['Leasure_Theater', 'Theater'],
    ['Leasure_Theater_Front', 'Theater Front'],
  ];
  for (const [key, name] of leisure) {
    entries.push(entry(key, `${BASE}/Public/${key}.png`, name, 'building-public'));
  }

  // Stadiums
  const stadiums: Array<[string, string]> = [
    ['Stadium_Athletics', 'Athletics Stadium'],
    ['Stadium_Athletics_Roof', 'Athletics Stadium Roof'],
    ['Stadium_Baseball', 'Baseball Stadium'],
    ['Stadium_Baseball_Roof', 'Baseball Stadium Roof'],
    ['Stadium_Cricket', 'Cricket Stadium'],
    ['Stadium_Cricket_Roof', 'Cricket Stadium Roof'],
    ['Stadium_FootballAmerican', 'American Football Stadium'],
    ['Stadium_FootballAmerican_Front', 'American Football Stadium Front'],
    ['Stadium_FootballAmerican_Roof', 'American Football Stadium Roof'],
    ['Stadium_FootballSocker', 'Soccer Stadium'],
    ['Stadium_FootballSocker_Front', 'Soccer Stadium Front'],
    ['Stadium_FootballSocker_Roof', 'Soccer Stadium Roof'],
    ['Stadium_Tennis', 'Tennis Stadium'],
    ['Stadium_Tennis_Front', 'Tennis Stadium Front'],
    ['Stadium_TennisRoof', 'Tennis Stadium Roof'],
  ];
  for (const [key, name] of stadiums) {
    entries.push(entry(key, `${BASE}/Public/${key}.png`, name, 'building-public'));
  }

  // Street stands
  const stands = ['Coffee', 'Flowers', 'Icecream', 'NewsPaper'];
  for (const s of stands) {
    entries.push(entry(`StreetStand_${s}`, `${BASE}/Public/StreetStand_${s}.png`, `${s} Stand`, 'building-public'));
    entries.push(entry(`StreetStand_${s}_Front`, `${BASE}/Public/StreetStand_${s}_Front.png`, `${s} Stand Front`, 'building-public'));
  }

  return entries;
}

function generateDecor(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  const items: string[] = [
    'AirconBox', 'Antenna', 'AppleCrate', 'ATM', 'Bag',
    'Banana1', 'Banana2', 'Bananas', 'Bar',
    'Boxes1', 'Boxes2', 'Boxes3',
    'Cabinette', 'Cart', 'Cart2',
    'ChairBack', 'ChairFront',
    'Chimney1', 'Chimney2', 'Chords', 'CleansingTank',
    'Crane', 'CraneBody', 'CraneHook', 'CraneLine',
    'DirtPile1', 'DirtPile2', 'DirtPile3', 'DirtPile4', 'DirtPile5',
    'ElectricalBox1', 'ElectricalBox2', 'ElectricalBox3', 'ElectricalBox4',
    'ElectricalTower', 'EmergencyCone', 'FireHydrant',
    'Fish', 'Fruit', 'Gas',
    'GateDown', 'GateHolder', 'GateHouse', 'GateUp',
    'Glasses', 'GumballMachine', 'IceCreamSign', 'Jukebox',
    'Ladder', 'Lamp', 'Light', 'Lights', 'Mailbox',
    'Notes1', 'Notes2', 'Oranges', 'Papers', 'Parabol', 'Parasol',
    'Pole1', 'Pole2', 'Pole3', 'Pole4',
    'PoolBall', 'PoolChair', 'PoolFloatie', 'PoolLifeguardChair', 'PoolParasol',
    'SafetyRail', 'Sculpture', 'Seat',
    'ShippingContainer1', 'ShippingContainer2', 'ShippingContainer3',
    'ShippingContainer4', 'ShippingContainer5', 'ShippingContainer6',
    'ShippingContainer7', 'ShippingContainer8', 'ShippingContainer9', 'ShippingContainer10',
    'Sign1', 'Sign2', 'Sign3', 'Sign4', 'Sign5',
    'Sign6', 'Sign7', 'Sign8', 'Sign9', 'Sign10',
    'Sign11', 'Sign12', 'Sign13', 'Sign14', 'Sign15',
    'Sign16', 'Sign17', 'Sign18', 'Sign19', 'Sign20', 'SignMap',
    'StreetLampGlow', 'StreetLampOff', 'StreetLampOn', 'StreetSign',
    'Swingset', 'Table',
    'TableSet1', 'TableSet2', 'TableSet3', 'TableSet4',
    'TraficSign1', 'TraficSign2', 'TraficSign3', 'TraficSign4',
    'TrashBag1', 'TrashBag2',
    'TrashCan', 'TrashCanLarge', 'TrashCanSmall',
    'TrashContrainer1', 'TrashContrainer2', 'TrashContrainer3', 'TrashContrainer4', 'TrashContrainer5',
    'TrashContrainerBig', 'TrashContrainerBigFront',
    'UmbrellaHolder', 'Vip1', 'Vip2', 'WallPole',
    'WaterBasin', 'Watertower', 'WheelBarrel', 'WoodenBoards',
    'WoodenBox1', 'WoodenBox2', 'WoodenPole',
  ];

  for (const item of items) {
    entries.push(entry(
      `Decor_${item}`,
      `${BASE}/DecorItems/${item}.png`,
      item.replace(/([A-Z])/g, ' $1').trim(),
      'decor',
    ));
  }

  return entries;
}

function generatePlants(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Trees 1-27
  for (let i = 1; i <= 27; i++) {
    entries.push(entry(`Tree${i}`, `${BASE}/Plants/Tree${i}.png`, `Tree ${i}`, 'plant'));
  }
  // Bare trees 1-3
  for (let i = 1; i <= 3; i++) {
    entries.push(entry(`BareTree${i}`, `${BASE}/Plants/BareTree${i}.png`, `Bare Tree ${i}`, 'plant'));
  }
  // Pine 1-12
  for (let i = 1; i <= 12; i++) {
    entries.push(entry(`Pine${i}`, `${BASE}/Plants/Pine${i}.png`, `Pine ${i}`, 'plant'));
  }
  // Palm 1-3
  for (let i = 1; i <= 3; i++) {
    entries.push(entry(`Palm${i}`, `${BASE}/Plants/Palm${i}.png`, `Palm ${i}`, 'plant'));
  }
  // Bushes 1-11
  for (let i = 1; i <= 11; i++) {
    entries.push(entry(`Bushes${i}`, `${BASE}/Plants/Bushes${i}.png`, `Bush ${i}`, 'plant'));
  }
  // Plants 1-15
  for (let i = 1; i <= 15; i++) {
    entries.push(entry(`Plant${i}`, `${BASE}/Plants/Plant${i}.png`, `Plant ${i}`, 'plant'));
  }
  // Weeds 1-11
  for (let i = 1; i <= 11; i++) {
    entries.push(entry(`Weeds${i}`, `${BASE}/Plants/Weeds${i}.png`, `Weeds ${i}`, 'plant'));
  }

  return entries;
}

function generateFences(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Electrical post
  entries.push(entry('ElectricalPost', `${BASE}/Fences/ElectricalPost.png`, 'Electrical Post', 'fence'));
  entries.push(entry('ElectricalPost_Addition', `${BASE}/Fences/ElectricalPost_Addition.png`, 'Electrical Post Addition', 'fence'));

  // Hedges 1-4
  for (let i = 1; i <= 4; i++) {
    entries.push(entry(`Hedge${i}`, `${BASE}/Fences/Hedge${i}.png`, `Hedge ${i}`, 'fence'));
    entries.push(entry(`Hedge${i}_Addition`, `${BASE}/Fences/Hedge${i}_Addition.png`, `Hedge ${i} Addition`, 'fence'));
  }

  // Metal fence
  entries.push(entry('MetalFence', `${BASE}/Fences/MetalFence.png`, 'Metal Fence', 'fence'));
  entries.push(entry('MetalFence_Addition', `${BASE}/Fences/MetalFence_Addition.png`, 'Metal Fence Addition', 'fence'));
  entries.push(entry('MetalFenceSign', `${BASE}/Fences/MetalFenceSign.png`, 'Metal Fence Sign', 'fence'));

  // Picket fences 1-4
  for (let i = 1; i <= 4; i++) {
    entries.push(entry(`PicketFence${i}`, `${BASE}/Fences/PicketFence${i}.png`, `Picket Fence ${i}`, 'fence'));
    entries.push(entry(`PicketFence${i}_Gate`, `${BASE}/Fences/PicketFence${i}_Gate.png`, `Picket Fence ${i} Gate`, 'fence'));
    entries.push(entry(`PicketFence${i}_Open`, `${BASE}/Fences/PicketFence${i}_Open.png`, `Picket Fence ${i} Open`, 'fence'));
  }

  // Simple fences 1-4
  for (let i = 1; i <= 4; i++) {
    entries.push(entry(`SimpleFence${i}`, `${BASE}/Fences/SimpleFence${i}.png`, `Simple Fence ${i}`, 'fence'));
    entries.push(entry(`SimpleFence${i}_Addition`, `${BASE}/Fences/SimpleFence${i}_Addition.png`, `Simple Fence ${i} Addition`, 'fence'));
  }

  return entries;
}

function generateVehicles(): AssetEntry[] {
  const entries: AssetEntry[] = [];

  // Buses
  const busColors = ['Grey', 'Orange', 'Yellow'];
  for (const color of busColors) {
    entries.push(entry(`Bus_${color}_Back`, `${BASE}/Vehicles/Bus_${color}_Back.png`, `${color} Bus (Back)`, 'vehicle'));
    entries.push(entry(`Bus_${color}_Front`, `${BASE}/Vehicles/Bus_${color}_Front.png`, `${color} Bus (Front)`, 'vehicle'));
  }

  // CarType1
  const car1Colors = ['Black', 'Blue', 'Green', 'Grey', 'Police', 'Red', 'Silver', 'Taxi', 'White', 'Yellow'];
  for (const color of car1Colors) {
    entries.push(entry(`CarType1_${color}_Back`, `${BASE}/Vehicles/CarType1_${color}_Back.png`, `Car Type1 ${color} (Back)`, 'vehicle'));
    entries.push(entry(`CarType1_${color}_Front`, `${BASE}/Vehicles/CarType1_${color}_Front.png`, `Car Type1 ${color} (Front)`, 'vehicle'));
  }

  // CarType2
  const car2Variants = [
    'Ambulance', 'Black', 'Blue', 'Dentist', 'Fish', 'Flower', 'Green', 'Grey',
    'Groceries', 'IceCream', 'Mail', 'Music', 'PestControl', 'Pet', 'Police',
    'Red', 'Silver', 'Tool', 'White', 'Yellow',
  ];
  for (const v of car2Variants) {
    entries.push(entry(`CarType2_${v}_Back`, `${BASE}/Vehicles/CarType2_${v}_Back.png`, `Van ${v} (Back)`, 'vehicle'));
    entries.push(entry(`CarType2_${v}_Front`, `${BASE}/Vehicles/CarType2_${v}_Front.png`, `Van ${v} (Front)`, 'vehicle'));
  }

  // Trucks
  const truckVariants = ['Black', 'Fire', 'Fish', 'Flower', 'Garbage', 'Groceries', 'Mail', 'Music', 'Pet', 'Red', 'Tool', 'White'];
  for (const v of truckVariants) {
    entries.push(entry(`Truck_${v}_Back`, `${BASE}/Vehicles/Truck_${v}_Back.png`, `Truck ${v} (Back)`, 'vehicle'));
    entries.push(entry(`Truck_${v}_Front`, `${BASE}/Vehicles/Truck_${v}_Front.png`, `Truck ${v} (Front)`, 'vehicle'));
  }

  // Boats & ships
  entries.push(entry('FishingBoat_Back', `${BASE}/Vehicles/FishingBoat_Back.png`, 'Fishing Boat (Back)', 'vehicle'));
  entries.push(entry('FishingBoat_Back_Fish', `${BASE}/Vehicles/FishingBoat_Back_Fish.png`, 'Fishing Boat (Back, Fish)', 'vehicle'));
  entries.push(entry('FishingBoat_Front', `${BASE}/Vehicles/FishingBoat_Front.png`, 'Fishing Boat (Front)', 'vehicle'));
  entries.push(entry('FishingBoat_Front_Fish', `${BASE}/Vehicles/FishingBoat_Front_Fish.png`, 'Fishing Boat (Front, Fish)', 'vehicle'));
  entries.push(entry('RowBoat_Back', `${BASE}/Vehicles/RowBoat_Back.png`, 'Row Boat (Back)', 'vehicle'));
  entries.push(entry('RowBoat_Front', `${BASE}/Vehicles/RowBoat_Front.png`, 'Row Boat (Front)', 'vehicle'));
  entries.push(entry('Ship_ContainerShip', `${BASE}/Vehicles/Ship_ContainerShip.png`, 'Container Ship', 'vehicle'));
  entries.push(entry('Ship_ContainerShip_Overlay', `${BASE}/Vehicles/Ship_ContainerShip_Overlay.png`, 'Container Ship Overlay', 'vehicle'));
  entries.push(entry('Ship_Ferry', `${BASE}/Vehicles/Ship_Ferry.png`, 'Ferry', 'vehicle'));
  entries.push(entry('Ship_Ferry_Overlay', `${BASE}/Vehicles/Ship_Ferry_Overlay.png`, 'Ferry Overlay', 'vehicle'));
  entries.push(entry('Plane', `${BASE}/Vehicles/Plane.png`, 'Plane', 'vehicle'));

  return entries;
}

// ---------------------------------------------------------------------------
// Build the registry
// ---------------------------------------------------------------------------
function buildRegistry(): Map<string, AssetEntry> {
  const map = new Map<string, AssetEntry>();

  const allEntries = [
    ...generateTiles(),
    ...generateHouses(),
    ...generateApartments(),
    ...generateShopping(),
    ...generateRestaurants(),
    ...generatePublic(),
    ...generateDecor(),
    ...generatePlants(),
    ...generateFences(),
    ...generateVehicles(),
  ];

  for (const e of allEntries) {
    map.set(e.key, e);
  }

  return map;
}

export const ASSET_REGISTRY: ReadonlyMap<string, AssetEntry> = buildRegistry();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAsset(key: string): AssetEntry | undefined {
  return ASSET_REGISTRY.get(key);
}

export function getAssetsByCategory(category: AssetCategory): AssetEntry[] {
  const results: AssetEntry[] = [];
  for (const e of ASSET_REGISTRY.values()) {
    if (e.category === category) results.push(e);
  }
  return results;
}

export function getAllAssetKeys(): string[] {
  return [...ASSET_REGISTRY.keys()];
}
