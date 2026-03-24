// app/features/recipes/types/index.ts

export interface Tag {
  tagId: number;
  tagName: string;
}

export interface Ingredient {
  ingredientId: number;
  ingredientName: string;
  weight: number;
  unit: string;
  isMain: boolean;
  isCommon: boolean;
}

export interface CookingStep {
  indexStep: number;
  stepContent: string;
}

// 1. THÊM INTERFACE COMMENT
export interface Comment {
  commentId: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
}

export interface Recipe {
  recipeId: number;
  image: string;
  recipeName: string;
  userName: string;
  likeQuantity: number;
  viewCount: number;
  cookingTime: string;
  ration: number;
  ingredients: Ingredient[];
  cookingSteps: CookingStep[];
  tags: Tag[];
  isLiked: boolean;
  createdAt: string;
  
  comments: Comment[]; 
}
