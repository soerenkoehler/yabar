import { currentIdToken } from './auth.js';

let cached = null;

const getRequestHeaders = () => {
    return currentIdToken ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentIdToken}`
    } : {};
};

export const getApiClient = async (api_hostname) => {
    if (cached) {
        return cached;
    }

    const client = {
        getExpirationOptions: async () => {
            const response = await fetch(
                `${api_hostname}/api/getExpirationOptions`,
                {
                    method: 'GET',
                    headers: currentIdToken ? {
                        'Authorization': `Bearer ${currentIdToken}`
                    } : {}
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error (${response.status}): ${errorText}`);
            }

            return response.json();
        },

        readMessage: async (expiration, id) => {
            const response = await fetch(
                `${api_hostname}/api/readMessage`,
                {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify({ expiration, id })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error (${response.status}): ${errorText}`);
            }

            return response.text();
        },

        writeMessage: async (expiration, value) => {
            const response = await fetch(
                `${api_hostname}/api/writeMessage`,
                {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify({ expiration, value })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error (${response.status}): ${errorText}`);
            }

            return response.text();
        }
    };

    cached = client;
    return cached;
};
