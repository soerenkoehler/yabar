import { QueueServiceClient } from '@azure/storage-queue';

async function getQueueClient() {
    const connectionString = process.env.QueueConnectionString;
    if (!connectionString) {
        throw new Error('QueueConnectionString environment variable is not defined.');
    }

    const queueName = process.env.QueueName || 'my-storage-queue';
    const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
    const queueClient = queueServiceClient.getQueueClient(queueName);

    await queueClient.createIfNotExists();

    return { queueClient, queueName };
}

export default { getQueueClient };