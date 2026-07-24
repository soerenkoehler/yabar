const { app } = require('@azure/functions');
// const { QueueServiceClient } = require('@azure/storage-queue');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.AUTH_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(CLIENT_ID);

const ALLOWED_EMAILS = ['soerenkoehler@gmail.com'];

app.http('writeToQueue', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const authHeader = request.headers.get('authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                status: 401,
                jsonBody: { error: 'Unauthorized: Missing or malformed Bearer token.' }
            };
        }

        const token = authHeader.split(' ')[1];

        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: CLIENT_ID,
            });

            const payload = ticket.getPayload();
            const userEmail = payload.email;
            const isEmailVerified = payload.email_verified;

            if (!isEmailVerified || !ALLOWED_EMAILS.includes(userEmail)) {
                context.log(`Forbidden access attempt by: ${userEmail}`);
                return {
                    status: 403,
                    jsonBody: { error: 'Forbidden: You do not have permission to access this resource.' }
                };
            }

        } catch (error) {
            context.error('Token validation failed:', error.message);
            return {
                status: 401,
                jsonBody: { error: 'Unauthorized: Invalid or expired token.' }
            };
        }

        context.log(`Processing queue write request for URL: "${request.url}"`);

        // try {
        //     const body = await request.json();
        //     const payload = body.value;

        //     if (!payload) {
        //         return {
        //             status: 400,
        //             body: 'Missing "value" property in request payload.'
        //         };
        //     }

            // TODO disabled
            // const connectionString = process.env.QueueConnectionString;
            // if (!connectionString) {
            //     context.error('QueueConnectionString environment variable is not defined.');
            //     return {
            //         status: 500,
            //         body: 'Internal server configuration error.'
            //     };
            // }

            // Initialize the Queue Service Client
            // const queueServiceClient = QueueServiceClient.fromConnectionString(connectionString);
            // const queueName = 'my-storage-queue';
            // const queueClient = queueServiceClient.getQueueClient(queueName);

            // Ensure the target queue exists prior to sending the message
            // await queueClient.createIfNotExists();

            // Base64 encode the message to prevent XML/JSON serialization issues in downstream services
            // const base64Message = Buffer.from(payload).toString('base64');

            // await queueClient.sendMessage(base64Message);

            return {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Message successfully enqueued.' })
            };

        // } catch (error) {
        //     context.error(`Failed to process request: ${error.message}`);
        //     return {
        //         status: 500,
        //         body: 'Failed to write message to the storage queue.'
        //     };
        // }
    }
});
