import { app } from '@azure/functions';
import { randomUUID } from 'node:crypto';
import { authorizeRequest } from './auth';
import { getTableClient } from './tableClient';

app.http('writeToQueue', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const authResponse = await authorizeRequest(request, context);

        if (authResponse) {
            return authResponse;
        }

        context.log(`Processing message write request for URL: "${request.url}"`);

        try {
            const body = await request.json();
            const payload = body?.value;

            if (!payload) {
                return {
                    status: 400,
                    body: 'Missing "value" property in request payload.'
                };
            }

            const { tableClient, partitionKey, tableName } = await getTableClient();
            const id = randomUUID();

            await tableClient.createEntity({
                partitionKey,
                rowKey: id,
                value: String(payload),
                createdAt: new Date().toISOString()
            });

            context.log('Stored message in table storage', { tableName, id });

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Message successfully stored.',
                    messageId: id
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
