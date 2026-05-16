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

// ============ RECOMMENDATION TYPES ============

export interface MissingIngredient {
  ingredientName: string;
  need: number | null;
  have: number | null;
  unit: string | null;
}

export interface Recommendation {
  index?: number;
  recommendationType: string;
  recipeId: number;
  recipeName: string;
  image?: string;
  cookingTime?: string;
  ration?: number;
  completionRate?: number;
  missing?: MissingIngredient[];
  score?: number;
  reasons?: string[];
  scoreBreakdown?: Record<string, number>;
}

export interface RecommendationPayload {
  recommendationLimit: number;
  recommendations: Recommendation[];
  readyToCook: Recommendation[];
  almostReady: Recommendation[];
  context?: string;
  appliedContext?: Record<string, unknown>;
  profileConfidence?: number;
  insights?: Record<string, unknown>[];
  items: Recommendation[];
}