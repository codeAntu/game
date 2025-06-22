export interface AdminData {
  id: number;
  email: string;
  name: string;
  isAdmin: boolean;
}

export interface UserData {
  id: number;
  email: string;
  name: string;
  balance: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  error?: string;
  stack?: string;
  timestamp: string;
}

declare module "hono" {
  interface ContextVariables {
    admin: AdminData;
    user: UserData;
  }
}
