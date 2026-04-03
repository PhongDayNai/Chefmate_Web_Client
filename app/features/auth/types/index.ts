import type { AuthSessionPayload, AuthUser } from "~/utils/authUtils";

export type { AuthSessionPayload, AuthUser };

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export type AuthResponse = ApiResponse<AuthSessionPayload>;
