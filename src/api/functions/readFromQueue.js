import { app } from '@azure/functions';
import { authorizeRequest } from './auth.js';
import { getTableClient } from './tableClient.js';

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

            const client = await getTableClient();

            let value;
            try {
                value = await client.readMessage(client.partitionKey, messageId);
            } catch (error) {
                if (error.message.includes('not found')) {
                    return {
                        status: 404,
                        body: `Message with id "${messageId}" not found.`
                    };
                }
                throw error;
            }

            await client.tableClient.deleteEntity(client.partitionKey, messageId);

            return {
                status: 200,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: value
            };
        } catch (error) {
            context.error(`Failed to read message from table: ${error.message}`);
            return {
                status: 500,
                body: 'Internal server error.'
            };
        }
    }
});