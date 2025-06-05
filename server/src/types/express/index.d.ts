// src/types/express/index.d.ts
import { User } from '../../types/user';
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
