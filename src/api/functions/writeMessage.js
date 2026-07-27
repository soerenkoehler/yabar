import { app } from '@azure/functions';
import { authorizeRequest } from './auth.js';
import { throwHttpError } from './http.js';
import { getTableClient } from './tableClient.js';

app.http('writeMessage', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing message write request for URL: "${request.url}"`);

        try {
            const roles = await authorizeRequest(request, context);
            context.log('Authorized roles:', roles);
            // FIXME evaluate roles

            const body = await request.json();
            const ttl = body?.ttl;
            const value = body?.value;

            if (!value) {
                throwHttpError(400, 'Missing "value" property in request payload.');
            }

            const client = await getTableClient();
            const id = await client.writeMessage(ttl, value);

            context.log('Stored message in table storage', { tableName: client.tableName, id });

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
