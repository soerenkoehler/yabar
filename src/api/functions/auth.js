import { OAuth2Client } from 'google-auth-library';

const authGoogleClientId = process.env.AUTH_GOOGLE_CLIENT_ID;
const client = new OAuth2Client(authGoogleClientId);
const allowedEmails = ['soerenkoehler@gmail.com'];

const authorizeRequest = async (request, context) => {
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
            audience: authGoogleClientId,
        });

        const payload = ticket.getPayload();
        const userEmail = payload.email;
        const isEmailVerified = payload.email_verified;

        if (!isEmailVerified || !allowedEmails.includes(userEmail)) {
            context.log(`Forbidden access attempt by: ${userEmail}`);
            return {
                status: 403,
                jsonBody: { error: 'Forbidden: You do not have permission to access this resource.' }
            };
        }

        return null;
    } catch (error) {
        context.error('Token validation failed:', error.message);
        return {
            status: 401,
            jsonBody: { error: 'Unauthorized: Invalid or expired token.' }
        };
    }
};

export default {
    authorizeRequest
};