"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const redis_1 = require("redis");
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
exports.redisClient = (0, redis_1.createClient)({ url: redisUrl });
exports.redisClient.on('error', (err) => {
    console.error('❌ [Redis] Client error:', err);
});
(async () => {
    if (!exports.redisClient.isOpen) {
        await exports.redisClient.connect();
        console.log('✅ [Redis] Connected');
    }
})();
//# sourceMappingURL=redis.js.map