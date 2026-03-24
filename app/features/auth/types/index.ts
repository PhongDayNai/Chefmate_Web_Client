export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userId: number;
    fullName: string;
    phone: string;
    email: string;
    createdAt: string;
  };
}
