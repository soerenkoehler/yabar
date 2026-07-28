import { currentIdToken } from './auth.js';

export async function readMessage(ttl, id) {
    const response = await fetch(
        `${window.config.api_hostname}/api/readMessage?id=${encodeURIComponent(id)}`,
        {
            method: 'POST',
            headers: currentIdToken ? {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentIdToken}`
            } : {},
            body: JSON.stringify({
                ttl: ttl,
                id: id
            })
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

    return response.json();
}
