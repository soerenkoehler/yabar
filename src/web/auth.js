let currentUserHint = null;
let currentIdToken = null;

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

function setLoggedIn(username, userHint) {
    const authStatus = document.getElementById('authStatus');
    const logoutButton = document.getElementById('logoutButton');
    authStatus.textContent = `logged in as ${username}`;
    logoutButton.style.display = 'inline-block';
    currentUserHint = userHint || null;
}

function setLoggedOut() {
    const authStatus = document.getElementById('authStatus');
    const logoutButton = document.getElementById('logoutButton');
    authStatus.textContent = 'Not logged in';
    logoutButton.style.display = 'none';
    currentUserHint = null;
    currentIdToken = null;
}

// must be global for data-callback="handleCredentialResponse"
window.handleCredentialResponse = async function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);
    if (!payload) {
        setLoggedOut();
        return;
    }

    currentIdToken = response.credential;
    const userName = payload.name || payload.email || payload.sub || 'unknown user';
    const userHint = payload.email || payload.sub;
    setLoggedIn(`${userName} (${userHint})`, userHint);
};

function loadGoogleGsiScript() {
    return new Promise((resolve, reject) => {
        if (document.querySelector('script[data-google-gsi="true"]')) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.dataset.googleGsi = 'true';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Google GSI script'));
        document.head.appendChild(script);
    });
}
