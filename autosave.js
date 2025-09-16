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
const DROPBOX_CLIENT_ID = 'q3ra3185xx6ftrd';

// --- Passive Autosave Popup Logic ---
let popupTimer;
function showAutosavePopup() {
    const popup = document.getElementById('autosave-popup');
    if (!popup) return;

    // If a timer is already running, clear it
    if (popupTimer) {
        clearTimeout(popupTimer);
    }

    popup.textContent = '✅ Autosaved to Dropbox';
    popup.classList.add('visible');

    // Set a timer to hide the popup after 3 seconds
    popupTimer = setTimeout(() => {
        popup.classList.remove('visible');
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

async function saveToDropbox(isAutosave = false, isRetry = false) {
    let accessToken = localStorage.getItem('dropboxAccessToken');
    if (!accessToken) {
        if (!isAutosave) console.log('Save to Dropbox skipped: Not connected.');
        return;
    }

    // --- FIX: Correctly prepare data for backup ---
    const dataToSave = {};
    const sensitiveKeys = ['dropboxAccessToken', 'dropboxRefreshToken', 'pkceCodeVerifier'];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!sensitiveKeys.includes(key)) {
            let value = localStorage.getItem(key);
            try {
                // This ensures that JSON strings (like task lists) are stored as objects
                // in the final backup file, preventing double-encoding.
                dataToSave[key] = JSON.parse(value);
            } catch (e) {
                // If it's not a JSON string (e.g., 'storageMethod'), use the raw string.
                dataToSave[key] = value;
            }
        }
    }
    const fileContent = JSON.stringify(dataToSave, null, 2);
    // --- End of fix ---

    try {
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                    path: '/backup.td',
                    mode: 'overwrite',
                    autorename: false,
                    mute: true
                })
            },
            body: fileContent
        });

        if (response.status === 401 && !isRetry) {
            const newAccessToken = await refreshDropboxToken();
            if (newAccessToken) {
                await saveToDropbox(isAutosave, true); // Retry the save
            } else if (!isAutosave) {
                alert('Your Dropbox session has expired. Please reconnect.');
            }
            return;
        }

        if (response.ok) {
            console.log('Save to Dropbox successful.');
            // FIX: Differentiate between autosave and manual save popups.
            if (isAutosave) {
                showAutosavePopup(); // Show the new passive popup
            } else {
                showAlert('Save Successful', 'Data successfully saved to Dropbox.'); // Show the existing modal
            }
        } else {
            const errorData = await response.json();
            console.error('Failed to save to Dropbox:', errorData);
            if (!isAutosave) {
                // FIX: Replaced the native alert with the custom in-app modal.
                showAlert('Save Failed', 'Could not save data to Dropbox. Check console for details.', 'error');
            }
        }
    } catch (error) {
        console.error('An error occurred during saveToDropbox:', error);
        if (!isAutosave) {
            // FIX: Replaced the native alert with the custom in-app modal.
            showAlert('Save Error', 'An unexpected error occurred. Check console for details.', 'error');
        }
    } finally {
        if (!isAutosave) {
            const saveBtn = document.getElementById('save-to-dropbox-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save to Dropbox';
            }
        }
    }
}