document.addEventListener('DOMContentLoaded', () => {
    // --- Menu Functionality ---
    const menuBtn = document.querySelector('.menu-btn');
    const overlay = document.querySelector('.overlay');
    const body = document.body;

    // FIX: Add event listeners to make the menu work.
    menuBtn.addEventListener('click', () => {
        body.classList.toggle('menu-open');
    });

    overlay.addEventListener('click', () => {
        body.classList.remove('menu-open');
    });
});
