import { app } from '@azure/functions';
import { authorizeRequest } from './auth.js';
import { getExpirationOptions } from './tableClient.js';

app.http('getExpirationOptions', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Processing expiration options request for URL: "${request.url}"`);

        try {
            const roles = await authorizeRequest(request, context);
            context.log('Authorized roles:', roles);
            // FIXME evaluate roles

            const options = await getExpirationOptions();

            return {
                status: 200,
                jsonBody: options
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
