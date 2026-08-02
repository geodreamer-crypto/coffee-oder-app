export type MenuCategory = "COFFEE" | "NON_COFFEE" | "DESSERT";
export type TemperatureOption = "HOT" | "ICE" | "ICE_ONLY" | string;

export interface MenuDTO {
  id: string;
  name: string;
  price: number;
  category: MenuCategory;
  stock: number;
  initialStock: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  availableOptions?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}
