import { currentIdToken } from './auth.js';

const getRequestHeaders = () => {
    return currentIdToken ? {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentIdToken}`
    } : {};
};

export const getExpirationOptions = async () => {
    const response = await fetch(
        `${window.config.api_hostname}/api/getExpirationOptions`,
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
};

export const readMessage = async (expiration, id) => {
    const response = await fetch(
        `${window.config.api_hostname}/api/readMessage`,
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
};

export const writeMessage = async (expiration, value) => {
    const response = await fetch(
        `${window.config.api_hostname}/api/writeMessage`,
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
};
