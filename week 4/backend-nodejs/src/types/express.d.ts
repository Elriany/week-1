export interface AuthContext {
  userId: string;
  email: string;
  roleId: string;
  roleCode: string;
  branchId: string;
  departmentId: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      /** Populated by the `authenticate` middleware. Absent on public routes. */
      auth?: AuthContext;
    }
  }
}

export {};
