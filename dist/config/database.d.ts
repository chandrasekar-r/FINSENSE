import { Pool } from 'pg';
declare const pool: Pool;
export declare const initializeDatabase: () => Promise<void>;
export declare const query: (text: string, params?: any[]) => Promise<any>;
export declare const getClient: () => Promise<import("pg").PoolClient>;
export { pool };
export default pool;
//# sourceMappingURL=database.d.ts.map