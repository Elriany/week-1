import { DataSource } from 'typeorm';
import * as msnodesqlv8 from 'mssql/msnodesqlv8';
import { env } from './env';

const connectionString = [
  `Driver={${env.DB_ODBC_DRIVER}}`,
  `Server=${env.DB_SERVER}`,
  `Database=${env.DB_DATABASE}`,
  'Trusted_Connection=yes',
  `TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no'}`,
].join(';') + ';';

export const AppDataSource = new DataSource({
  type: 'mssql',
  driver: msnodesqlv8,          // TOP LEVEL — inside `extra` it is ignored
  database: env.DB_DATABASE,
  synchronize: false,           // NEVER true — migrations are the only schema path
  logging: env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
  entities: [__dirname + '/../modules/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  migrationsTableName: '__migrations',
  extra: { connectionString },
});
