declare module 'mssql/msnodesqlv8' {
  export interface ConnectionPool {
    connect(): Promise<void>;
    close(): Promise<void>;
    request(): {
      query(sql: string): Promise<any>;
    };
  }

  export interface ConnectionPoolConfig {
    connectionString: string;
  }

  export class ConnectionPool {
    constructor(config: ConnectionPoolConfig);
    connect(): Promise<void>;
    close(): Promise<void>;
    request(): {
      query(sql: string): Promise<any>;
    };
  }
}
