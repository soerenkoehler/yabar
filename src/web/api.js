export async function readMessage(id) {
    const response = await fetch(
        `${window.config.api_hostname}/api/readMessage?id=${encodeURIComponent(id)}`,
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
