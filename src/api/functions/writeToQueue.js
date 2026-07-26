const { app } = require('@azure/functions');
const { QueueServiceClient } = require('@azure/storage-queue');
const { authorizeRequest } = require('./auth');

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

            const connectionString = process.env.QueueConnectionString;
            if (!connectionString) {
                throw new Error("QueueConnectionString environment variable is not defined.")
            }

            // Initialize the Queue Service Client
            const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
            context.log(`Queue service client: ${queueServiceClient}`);
            const queueName = 'my-storage-queue';
            const queueClient = queueServiceClient.getQueueClient(queueName);
            context.log(`Queue client: ${queueClient}`);
            if(!queueClient){
                throw new Error("Cannot create queue client.")
            }

            // Ensure the target queue exists prior to sending the message
            await queueClient.createIfNotExists();
            context.log("Queue created");

            // Base64 encode the message to prevent XML/JSON serialization issues in downstream services
            const base64Message = Buffer.from(payload).toString('base64');
            context.log(`Message: ${base64Message}`);

            const sendResponse = await queueClient.sendMessage(base64Message);
            context.log(`Message sent: ${sendResponse}`);

            // Debug: list existing messages currently in the queue (peek does not dequeue)
            const peekResponse = await queueClient.peekMessages({ numberOfMessages: 32 });
            context.log("Messages peeked");
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
            context.log("Messages collected");

            // Output debug info to console
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
