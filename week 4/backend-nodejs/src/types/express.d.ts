export interface AuthContext {
  userId: string;
  email: string;
  roleId: string;
  roleCode: string;
  branchId: string;
  departmentId: string;
  permissions: string[];
  /** Non-null only for an account linked to a Customers row. See Story 15. */
  customerId: string | null;
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
