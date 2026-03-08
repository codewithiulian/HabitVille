export const SHOP_CATEGORIES = [
  { id: 'houses', label: 'Houses' },
  { id: 'apartments', label: 'Apartments' },
  { id: 'public_buildings', label: 'Public' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'plants', label: 'Plants' },
  { id: 'decorations', label: 'Decorations' },
  { id: 'fences', label: 'Fences' },
] as const;

export type ShopCategoryId = typeof SHOP_CATEGORIES[number]['id'];
