import { TableClient } from '@azure/data-tables';

let cached = null;

export async function getTableClient() {
    if (cached) {
        return cached;
    }

    const connectionString = process.env.TableConnectionString;
    if (!connectionString) {
        throw new Error('TableConnectionString environment variable is not defined.');
    }

    const tableName = process.env.TableName || 'messages';
    // FIX review partitionKey
    const partitionKey = process.env.TablePartitionKey || 'default';

    const tableClient = TableClient.fromConnectionString(connectionString, tableName);
    await tableClient.createTable();

    cached = { tableClient, tableName, partitionKey };
    return cached;
}