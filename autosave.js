document.addEventListener('DOMContentLoaded', () => {
    // This function will be called from settings.js when the user changes the interval
    window.setupAutosave = function() {
        // Always clear any existing interval before setting a new one
        if (window.autosaveInterval) {
            clearInterval(window.autosaveInterval);
            window.autosaveInterval = null;
        }

        const storageMethod = localStorage.getItem('storageMethod');
        const intervalMs = parseInt(localStorage.getItem('autosaveInterval') || '0', 10);

        if (intervalMs > 0 && storageMethod === 'dropbox' && localStorage.getItem('dropboxAccessToken')) {
            window.autosaveInterval = setInterval(() => {
                console.log(`Autosaving to Dropbox... (Interval: ${intervalMs}ms)`);
                saveToDropbox(false, true); // Pass true for silent mode
            }, intervalMs);
        }
    };

    // Initial setup on page load
    setupAutosave();
});

// --- Dropbox API Functions (moved here for global access) ---
const DROPBOX_CLIENT_ID = 'jghzh4x67volsfv';

function showAutosavePopup() {
    let popup = document.getElementById('autosave-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'autosave-popup';
        document.body.appendChild(popup);
    }
    popup.textContent = '✅ Autosaved to Dropbox';
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 3000);
}

async function refreshDropboxToken() {
    const refreshToken = localStorage.getItem('dropboxRefreshToken');
    if (!refreshToken) return null;
    try {
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ 'grant_type': 'refresh_token', 'refresh_token': refreshToken, 'client_id': DROPBOX_CLIENT_ID, }),
        });
        if (!response.ok) throw new Error('Failed to refresh token.');
        const data = await response.json();
        localStorage.setItem('dropboxAccessToken', data.access_token);
        return data.access_token;
    } catch (error) {
        console.error('Dropbox token refresh error:', error);
        localStorage.removeItem('dropboxAccessToken');
        localStorage.removeItem('dropboxRefreshToken');
        // If on settings page, update UI. Otherwise, just fail silently.
        if (typeof updateDropboxUI === 'function') {
            updateDropboxUI();
        }
        return null;
    }
}

async function saveToDropbox(isRetry = false, isSilent = false) {
    let accessToken = localStorage.getItem('dropboxAccessToken');
    if (!accessToken) {
        if (!isSilent) alert('Not connected to Dropbox.');
        return;
    }

    const dataToExport = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('recurringTasks') || key.startsWith('myTaskTemplates') || key.startsWith('dailyTasks') || key.startsWith('completedRecurring') || key.startsWith('calendarTasks-')) {
            try {
                dataToExport[key] = JSON.parse(localStorage.getItem(key));
            } catch (e) {
                dataToExport[key] = localStorage.getItem(key);
            }
        }
    }
    const storageMethod = localStorage.getItem('storageMethod');
    if (storageMethod) {
        dataToExport.storageMethod = storageMethod;
    }

    const fileContent = JSON.stringify(dataToExport, null, 2);
    const file = new Blob([fileContent], { type: 'application/octet-stream' });

    try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({ path: '/backup.td', mode: 'overwrite', autorename: false, mute: true })
            },
            body: file
        });

        if (response.status === 401 && !isRetry) {
            const newAccessToken = await refreshDropboxToken();
            if (newAccessToken) {
                await saveToDropbox(true, isSilent);
            } else {
                if (!isSilent) alert('Your Dropbox session has expired. Please reconnect.');
            }
            return;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dropbox API error: ${response.statusText} - ${errorText}`);
        }

        if (isSilent) {
            showAutosavePopup();
        } else {
            alert('Successfully saved to Dropbox!');
        }

    } catch (error) {
        console.error('Failed to save to Dropbox:', error);
        if (!isSilent) alert('An error occurred while saving to Dropbox. Check the console for details.');
    }
}