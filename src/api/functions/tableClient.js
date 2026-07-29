import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'node:crypto';

let cached = null;

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

        writeMessage: async (pk, message) => {
            const rowKey = generateRowKey();
            await tableClient.createEntity({
                partitionKey: pk,
                rowKey,
                value: String(message),
                createdAt: new Date().toISOString()
            });
            return rowKey;
        },

        readMessage: async (pk, rowKey) => {
            try {
                const entity = await tableClient.getEntity(pk, rowKey);
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
}

// Standalone function exports for convenience
export const writeMessage = async (partitionKey, message) => {
    const client = await getTableClient();
    return client.writeMessage(partitionKey, message);
};

export const readMessage = async (partitionKey, rowKey) => {
    const client = await getTableClient();
    return client.readMessage(partitionKey, rowKey);
};