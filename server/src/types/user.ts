// src/types/User.ts
export interface User {
  id: number;
  name: string;
  email?: string;
  [key: string]: any;
}
