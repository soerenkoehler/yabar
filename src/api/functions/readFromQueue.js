import { app } from '@azure/functions';
import { authorizeRequest } from './auth';
import { getTableClient } from './tableClient';

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

            const { tableClient, partitionKey } = await getTableClient();

            let entity;
            try {
                entity = await tableClient.getEntity(partitionKey, messageId);
            } catch (error) {
                if (error?.statusCode === 404) {
                    return {
                        status: 404,
                        body: `Message with id "${messageId}" not found.`
                    };
                }
                throw error;
            }

            await tableClient.deleteEntity(partitionKey, messageId);

            return {
                status: 200,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: entity.value ?? ''
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