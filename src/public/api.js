export const apiClient = () => ({
    config: async () => {
        const response = await fetch('/api/config');

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error (${response.status}): ${errorText}`);
        }

        return response.json();
    },

    info: async () => {
        const response = await fetch('/api/info');

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error (${response.status}): ${errorText}`);
        }

        return response.json();
    },

    read: async (expiration, id) => {
        const response = await fetch('/api/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expiration, id })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error (${response.status}): ${errorText}`);
        }

        return response.text();
    },

    write: async (expiration, value) => {
        const response = await fetch('/api/write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expiration, value })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error (${response.status}): ${errorText}`);
        }

        return response.text();
    }
});