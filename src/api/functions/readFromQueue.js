import { app } from '@azure/functions';
import { authorizeRequest } from './auth';
import { getQueueClient } from './queueClient';

app.http('readFromQueue', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const authResponse = await authorizeRequest(request, context);

        if (authResponse) {
            return authResponse;
        }

        try {
            const url = new URL(request.url);
            const messageId = url.searchParams.get('id');

            if (!messageId) {
                return {
                    status: 400,
                    body: 'Missing "id" query parameter.'
                };
            }

            const { queueClient } = await getQueueClient();

            // Azure Queue does not support direct lookup by messageId.
            // We receive messages in batches, delete the matching one,
            // and re-show non-matching messages immediately.
            const batchSize = 32;
            const maxPasses = 50;

            for (let pass = 0; pass < maxPasses; pass++) {
                const receiveResponse = await queueClient.receiveMessages({
                    numberOfMessages: batchSize,
                    visibilityTimeout: 30
                });

                const items = receiveResponse.receivedMessageItems || [];
                if (items.length === 0) {
                    break;
                }

                for (const item of items) {
                    if (item.messageId === messageId) {
                        await queueClient.deleteMessage(item.messageId, item.popReceipt);

                        let decoded = item.messageText || '';
                        try {
                            decoded = Buffer.from(item.messageText || '', 'base64').toString('utf8');
                        } catch {
                            // keep original text if decoding fails
                        }

                        return {
                            status: 200,
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                            body: decoded
                        };
                    }

                    // Not the target message: make it visible again immediately.
                    await queueClient.updateMessage(
                        item.messageId,
                        item.popReceipt,
                        item.messageText,
                        { visibilityTimeout: 0 }
                    );
                }
            }

            return {
                status: 404,
                body: `Message with id "${messageId}" not found.`
            };
        } catch (error) {
            context.error(`Failed to read message from queue: ${error.message}`);
            return {
                status: 500,
                body: 'Internal server error.'
            };
        }
    }
});