const { app } = require('@azure/functions');
const { QueueServiceClient } = require('@azure/storage-queue');

app.http('helloWorld', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing request for URL: "${request.url}"`);
        return {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello World!' })
        };
    }
});