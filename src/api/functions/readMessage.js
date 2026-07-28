import { app } from '@azure/functions';
import { authorizeRequest } from './auth.js';
import { throwHttpError } from './http.js';
import { getTableClient } from './tableClient.js';

app.http('readMessage', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing message read request for URL: "${request.url}"`);

        try {
            const roles = await authorizeRequest(request, context);
            context.log('Authorized roles:', roles);
            // FIXME evaluate roles

            const body = await request.json();

            const ttl = data?.ttl;
            if (!ttl) {
                throwHttpError(400, "Missing 'ttl' property in request payload.");
            }

            const id = data?.id;
            if (!id) {
                throwHttpError(400, "Missing 'id' property in request payload.");
            }

            const client = await getTableClient();

            let value;
            try {
                value = await client.readMessage(ttl, id);
            } catch (error) {
                // FIXME explicitly check for existence in advance
                if (error.message.includes('not found')) {
                    throwHttpError(404, `Message with id "${id}" not found.`);
                }
                throw error;
            }

            await client.tableClient.deleteEntity(ttl, id);

            return {
                status: 200,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: value
            };
        } catch (error) {
            context.error(`Failed to process request: ${error.message}`);

            if (error?.cause?.status) {
                return error.cause;
            }

            return {
                status: 500,
                body: 'Internal server error.'
            };
        }
    }
});
