export interface PantryItemType {
  pantryItemId: number;
  userId: number;
  ingredientId?: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}