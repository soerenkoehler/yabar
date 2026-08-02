import { TableClient } from '@azure/data-tables';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from "@azure/identity";
import { randomUUID } from 'node:crypto';

let cached = null;

const CONFIG_BLOB_NAME = 'config';
const USERS_BLOB_NAME = 'users';
const APP_DATA_CONTAINER_NAME = 'appdata'; // XXX

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

const streamToString = async (readableStream) => {
    const chunks = [];
    for await (const chunk of readableStream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
};

const connect(connectionString, fromEndpoint, fromConnectionString) => {
    if (!connectionString) {
        throw new Error('TableConnectionString environment variable is not defined.');
    }

    const serviceClient = connectionString.startsWith('http')
        ? fromEndpoint(connectionString, new DefaultAzureCredential())
        : fromConnectionString(connectionString);

    return serviceClient;
}

export const client = async () => {
    if (cached) {
        return cached;
    }

    const tableName = 'messages';
    const messageTable = connect(
        process.env.TableConnectionString,
        (conn, cred) => new TableClient(conn, tableName, cred),
        (conn, cred) => TableClient.fromConnectionString(conn, tableName)
    );
    await messageTable.createTable();

    const appDataContainer = connect(
        process.env.BlobConnectionString,
        (conn, cred) => new BlobServiceClient(conn, cred),
        (conn, cred) => BlobServiceClient.fromConnectionString(conn)
    ).getContainerClient(APP_DATA_CONTAINER_NAME);
    await appDataContainer.createIfNotExists();

    const readJsonBlob = async (blobName) => {
        const blobClient = appDataContainer.getBlobClient(blobName);
        try {
            const download = await blobClient.download();
            const raw = await streamToString(download.readableStreamBody);
            return JSON.parse(raw);
        } catch (error) {
            if (error?.statusCode === 404) {
                throw new Error(`Blob '${blobName}' not found in container '${APP_DATA_CONTAINER_NAME}'.`);
            }
            if (error instanceof SyntaxError) {
                throw new Error(`Blob '${blobName}' contains invalid JSON.`);
            }
            throw error;
        }
    };

    const validateExpiration = (expiration) => {
        const normalized = String(expiration ?? '').trim();
        const config = await readJsonBlob(CONFIG_BLOB_NAME);
        const options = Array.isArray(config?.expiration_options) ? config.expiration_options : [];
        const allowedExpirations = new Set(options.map((option) => String(option?.value ?? '').trim()));

        if (!allowedExpirations.has(normalized)) {
            throw new Error(
                `Unsupported expiration '${expiration}'`
            );
        }
        return normalized;
    };

    const client = {
        config: async () => {
            return readJsonBlob(CONFIG_BLOB_NAME);
        },

        users: async () => {
            return readJsonBlob(USERS_BLOB_NAME);
        },

        write: async (expiration, message) => {
            const partitionKey = validateExpiration(expiration);
            const rowKey = generateRowKey();
            await messageTable.createEntity({
                partitionKey,
                rowKey,
                value: String(message),
                createdAt: new Date().toISOString()
            });
            return rowKey;
        },

        read: async (expiration, rowKey) => {
            const partitionKey = validateExpiration(expiration);
            try {
                const entity = await messageTable.getEntity(partitionKey, rowKey);
                return entity.value ?? '';
            } catch (error) {
                if (error?.statusCode === 404) {
                    throw new Error(`Message with rowKey ${rowKey} not found.`);
                }
                throw error;
            }
        },

        delete: async (expiration, rowKey) => {
            const partitionKey = validateExpiration(expiration);
            await messageTable.deleteEntity(partitionKey, rowKey);
        }
    };

    cached = client;
    return cached;
};
