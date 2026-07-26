import { app } from '@azure/functions';
import { authorizeRequest } from './auth';
import { getQueueClient } from './queueClient';

app.http('writeToQueue', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const authResponse = await authorizeRequest(request, context);

        if (authResponse) {
            return authResponse;
        }

        context.log(`Processing queue write request for URL: "${request.url}"`);

        try {
            const body = await request.json();
            const payload = body.value;

            if (!payload) {
                return {
                    status: 400,
                    body: 'Missing "value" property in request payload.'
                };
            }

            const { queueClient, queueName } = await getQueueClient();

            // Base64 encode the message to prevent XML/JSON serialization issues in downstream services
            const base64Message = Buffer.from(payload).toString('base64');
            const sendResponse = await queueClient.sendMessage(base64Message);

            // Debug: list existing messages currently in the queue (peek does not dequeue)
            const peekResponse = await queueClient.peekMessages({ numberOfMessages: 32 });
            const existingMessages = (peekResponse.peekedMessageItems || []).map((m) => {
                let decodedText = null;
                try {
                    decodedText = Buffer.from(m.messageText || '', 'base64').toString('utf8');
                } catch {
                    decodedText = null;
                }

                return {
                    messageId: m.messageId,
                    insertedOn: m.insertedOn,
                    expiresOn: m.expiresOn,
                    dequeueCount: m.dequeueCount,
                    messageTextBase64: m.messageText,
                    messageTextDecoded: decodedText
                };
            });

            context.log('Debug queue info:', {
                queueName,
                messageCount: existingMessages.length,
                messages: existingMessages
            });

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Message successfully enqueued.',
                    messageId: sendResponse.messageId
                })
            };

        } catch (error) {
            context.error(`Failed to process request: ${error.message}`);
            return {
                status: 500,
                body: 'Internal server error.'
            };
        }
    }
});
