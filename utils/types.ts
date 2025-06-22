
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

declare module "hono" {
  interface ContextVariables {
    admin: AdminData;
    user: UserData;
  }
}
