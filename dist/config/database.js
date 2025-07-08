"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.getClient = exports.query = exports.initializeDatabase = void 0;
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://finsense_user:finsense_password@localhost:5432/finsense',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
exports.pool = pool;
const initializeDatabase = async () => {
    try {
        await pool.query('SELECT NOW()');
        logger_1.logger.info('Database connected successfully');
    }
    catch (error) {
        logger_1.logger.error('Database connection failed:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const query = async (text, params) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
};
exports.query = query;
const getClient = async () => {
    return await pool.connect();
};
exports.getClient = getClient;
exports.default = pool;
//# sourceMappingURL=database.js.map