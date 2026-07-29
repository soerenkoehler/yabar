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

            const expiration = body?.expiration;
            if (!expiration) {
                throwHttpError(400, "Missing 'expiration' property in request payload.");
            }

            const value = body?.value;
            if (!value) {
                throwHttpError(400, "Missing 'value' property in request payload.");
            }

            const client = await getTableClient();

            let id;
            try {
                id = await client.writeMessage(expiration, value);
            } catch (error) {
                if (error.message.includes('Unsupported expiration')) {
                    throwHttpError(400, error.message);
                }
                throw error;
            }

            return {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
                body: id
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
