// app/features/pantry/types/index.ts

export interface PantryItemType {
  pantryItemId: number;
  pantryId: number;
  userId: number;
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PantryType {
  pantryId: number;
  name: string;
  ownerUserId: number;
  userRole: "owner" | "editor" | "viewer";
  itemCount: number;
  createdAt: string;
}

export interface ShareType {
  userId: number;
  fullName: string;
  role: "viewer" | "editor";
  sharedAt: string;
}