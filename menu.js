// Apply accent color on page load
(function() {
    const savedColor = localStorage.getItem('accentColor');
    if (savedColor) {
        document.documentElement.style.setProperty('--accent-color', savedColor);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.querySelector('.menu-btn');
    const sideMenu = document.querySelector('.side-menu');
    const overlay = document.querySelector('.overlay');

    // FIX: Standardize the menu button's HTML to ensure it's styled correctly everywhere.
    function buildMenuButton() {
        if (menuBtn) {
            menuBtn.innerHTML = '<span></span>'; // Ensure the span for the hamburger icon exists.
        }
    }

    const menuItems = [
        { name: 'Home', url: 'index.html' },
        { name: 'Recurring', url: 'recurring.html' },
        { name: 'Calendar', url: 'calendar.html' },
        { name: 'Sustained', url: 'sustained.html' },
        { name: 'Analytics', url: 'analytics.html' },
        { name: 'Settings', url: 'settings.html' }
    ];

    function populateMenu() {
        // FIX: Clear the entire menu container to ensure a clean slate on every page.
        sideMenu.innerHTML = '';

        // Populate the menu with buttons directly, without a list structure.
        menuItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.name;
            button.className = 'menu-nav-btn'; // Use the existing class for styling
            
            // Set an onclick event to navigate to the page
            button.onclick = () => {
                window.location.href = item.url;
            };

            // Append the button directly to the side menu container.
            sideMenu.appendChild(button);
        });
    }

    // Initial setup
    buildMenuButton();
    populateMenu();

    // --- Menu Functionality ---
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            document.body.classList.toggle('menu-open');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            document.body.classList.remove('menu-open');
        });
    }
});
