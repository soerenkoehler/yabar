export async function readFromQueue(id) {
    const response = await fetch(
        `${window.config.api_hostname}/api/readFromQueue?id=${encodeURIComponent(id)}`,
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

export async function writeToQueue(ttl, value) {
    const response = await fetch(
        `${window.config.api_hostname}/api/writeToQueue`,
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
