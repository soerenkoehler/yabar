import { currentIdToken } from './auth.js';

export async function readMessage(token) {
    const response = await fetch(
        `${window.config.api_hostname}/api/readMessage`,
        {
            method: 'POST',
            headers: currentIdToken ? {
                'Authorization': `Bearer ${currentIdToken}`
            } : {},
            body: token
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.text();
}

export async function writeMessage(ttl, value) {
    const response = await fetch(
        `${window.config.api_hostname}/api/writeMessage`,
        {
            method: 'POST',
            headers: currentIdToken ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            } : {},
            body: JSON.stringify({
                ttl: ttl,
                value: value
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error (${response.status}): ${errorText}`);
    }

    return response.text();
}
