import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'node:crypto';

let cached = null;

const EXPIRATION_OPTIONS = Object.freeze([
    { value: '1', label: '1 Hour' },
    { value: '24', label: '1 Day' },
    { value: '168', label: '1 Week' },
]);

const ALLOWED_EXPIRATIONS = new Set(EXPIRATION_OPTIONS.map((option) => option.value));

const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
};

const generateRowKey = () => {
    return `${formatTimestamp()}_${randomUUID()}`;
};

const validateExpiration = (expiration) => {
    const normalized = String(expiration ?? '').trim();
    if (!ALLOWED_EXPIRATIONS.has(normalized)) {
        throw new Error(
            `Unsupported expiration \"${expiration}\". Allowed values: ${[...ALLOWED_EXPIRATIONS].join(', ')}`
        );
    }
    return normalized;
};

export const getTableClient = async () => {
    if (cached) {
        return cached;
    }

    const connectionString = process.env.TableConnectionString;
    if (!connectionString) {
        throw new Error('TableConnectionString environment variable is not defined.');
    }

    const tableName = 'messages';
    const tableClient = TableClient.fromConnectionString(connectionString, tableName);
    await tableClient.createTable();

    const client = {
        tableClient,
        tableName,

        getExpirationOptions: () => {
            return EXPIRATION_OPTIONS.map((option) => ({ ...option }));
        },

        writeMessage: async (expiration, message) => {
            const partitionKey = validateExpiration(expiration);
            const rowKey = generateRowKey();
            await tableClient.createEntity({
                partitionKey,
                rowKey,
                value: String(message),
                createdAt: new Date().toISOString()
            });
            return rowKey;
        },

        readMessage: async (expiration, rowKey) => {
            const partitionKey = validateExpiration(expiration);
            try {
                const entity = await tableClient.getEntity(partitionKey, rowKey);
                return entity.value ?? '';
            } catch (error) {
                if (error?.statusCode === 404) {
                    throw new Error(`Message with rowKey "${rowKey}" not found.`);
                }
                throw error;
            }
        }
    };

    cached = client;
    return cached;
};
