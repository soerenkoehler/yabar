import { currentIdToken } from './auth.js';

export const readMessage = async (ttl, id) => {
    const response = await fetch(
        `${window.config.api_hostname}/api/readMessage`,
        {
            method: 'POST',
            headers: currentIdToken ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            } : {},
            body: JSON.stringify({ ttl, id })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.text();
};

export const writeMessage = async (ttl, value) => {
    const response = await fetch(
        `${window.config.api_hostname}/api/writeMessage`,
        {
            method: 'POST',
            headers: currentIdToken ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            } : {},
            body: JSON.stringify({ ttl, value })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.text();
};
