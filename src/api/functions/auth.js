import { OAuth2Client } from 'google-auth-library';

const authGoogleClientId = process.env.AUTH_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(authGoogleClientId);
const roleAssignments = {
    'soerenkoehler@gmail.com': ['admin', 'write'],
};

const throwAuthError = (message, response) => {
    throw new Error(message, { cause: response });
};

const authorizeRequest = async (request, context) => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throwAuthError('Unauthorized: Missing or malformed Bearer token.', {
            status: 401,
            jsonBody: { error: 'Unauthorized: Missing or malformed Bearer token.' }
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: authGoogleClientId,
        });

        const payload = ticket.getPayload();
        const userEmail = payload.email;
        const isEmailVerified = payload.email_verified;

        if (!isEmailVerified || !userEmail) {
            context.log(`Unauthorized access attempt by: ${userEmail}`);
            throwAuthError('Unauthorized: Email is not verified.', {
                status: 401,
                jsonBody: { error: 'Unauthorized: Email is not verified.' }
            });
        }

        return roleAssignments[userEmail] ?? [];
    } catch (error) {
        if (error?.cause?.status) {
            throw error;
        }

        context.error('Token validation failed:', error.message);
        throwAuthError('Unauthorized: Invalid or expired token.', {
            status: 401,
            jsonBody: { error: 'Unauthorized: Invalid or expired token.' }
        });
    }
};

export { authorizeRequest };