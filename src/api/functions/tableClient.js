import { TableClient } from '@azure/data-tables';
import { randomUUID } from 'node:crypto';

let cached = null;

function formatTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

function generateRowKey() {
    return `${formatTimestamp()}_${randomUUID()}`;
}

export async function getTableClient() {
    if (cached) {
        return cached;
    }

    const connectionString = process.env.TableConnectionString;
    if (!connectionString) {
        throw new Error('TableConnectionString environment variable is not defined.');
    }

    const tableName = process.env.TableName || 'messages';
    // FIXME review partitionKey
    const partitionKey = process.env.TablePartitionKey || 'default';

    const tableClient = TableClient.fromConnectionString(connectionString, tableName);
    await tableClient.createTable();

    const client = {
        tableClient,
        tableName,
        partitionKey,

        async writeMessage(pk, message) {
            const rowKey = generateRowKey();
            await this.tableClient.createEntity({
                partitionKey: pk,
                rowKey,
                value: String(message),
                createdAt: new Date().toISOString()
            });
            return rowKey;
        },

        async readMessage(pk, rowKey) {
            try {
                const entity = await this.tableClient.getEntity(pk, rowKey);
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
export async function writeMessage(partitionKey, message) {
    const client = await getTableClient();
    return client.writeMessage(partitionKey, message);
}

export async function readMessage(partitionKey, rowKey) {
    const client = await getTableClient();
    return client.readMessage(partitionKey, rowKey);
}