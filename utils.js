function getLocalDayKey(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- Global Modal Functions ---
function showAlert(title, message) {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    modal.querySelector('#global-modal-title').textContent = title;
    modal.querySelector('#global-modal-message').textContent = message;

    const confirmBtn = modal.querySelector('#global-modal-confirm-btn');
    const cancelBtn = modal.querySelector('#global-modal-cancel-btn');

    confirmBtn.textContent = 'OK';
    cancelBtn.classList.add('hidden');

    const confirmClickHandler = () => {
        modal.classList.remove('visible');
        confirmBtn.removeEventListener('click', confirmClickHandler);
    };
    confirmBtn.addEventListener('click', confirmClickHandler);

    modal.classList.add('visible');
}

function showConfirm(title, message, confirmText = 'Confirm', onConfirm = () => {}) {
    const modal = document.getElementById('global-modal');
    if (!modal) return;

    modal.querySelector('#global-modal-title').textContent = title;
    modal.querySelector('#global-modal-message').textContent = message;

    const confirmBtn = modal.querySelector('#global-modal-confirm-btn');
    const cancelBtn = modal.querySelector('#global-modal-cancel-btn');

    confirmBtn.textContent = confirmText;
    cancelBtn.classList.remove('hidden');
    cancelBtn.textContent = 'Cancel';

    const confirmClickHandler = () => {
        onConfirm();
        closeModal();
    };

    const cancelClickHandler = () => {
        closeModal();
    };

    const closeModal = () => {
        modal.classList.remove('visible');
        confirmBtn.removeEventListener('click', confirmClickHandler);
        cancelBtn.removeEventListener('click', cancelClickHandler);
    };

    confirmBtn.addEventListener('click', confirmClickHandler);
    cancelBtn.addEventListener('click', cancelClickHandler);

    modal.classList.add('visible');
}