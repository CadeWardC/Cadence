document.addEventListener('DOMContentLoaded', () => {
    const rangeButtons = document.querySelectorAll('.range-btn');
    const subtitle = document.querySelector('.analytics-subtitle');

    // Helper function to find the date of the first task ever created.
    function findFirstTaskDate() {
        let earliestDate = null;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('calendarTasks-')) {
                // Extract the date string 'YYYY-MM-DD' from the key
                const dateStr = key.substring('calendarTasks-'.length);
                const currentDate = new Date(dateStr.replace(/-/g, '/')); // Use '/' for better compatibility

                if (!earliestDate || currentDate < earliestDate) {
                    earliestDate = currentDate;
                }
            }
        }
        // If no tasks are found, default to today.
        return earliestDate || new Date();
    }

    // Main function to calculate and display analytics for a given range
    function updateAnalytics(range = 'weekly') {
        // --- 1. Determine Precise Date Range ---
        const today = new Date();
        let startDate, endDate;
        let subtitleText = '';

        switch (range) {
            case 'monthly':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                subtitleText = `Your progress for the current month`;
                break;
            case 'ytd': // Year to Date
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = today;
                subtitleText = `Your progress from Jan 1 to today`;
                break;
            case 'yearly':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                subtitleText = `Your progress for the current year`;
                break;
            case 'all-time':
                // FIX: Find the actual first task date instead of approximating.
                startDate = findFirstTaskDate();
                endDate = today;
                subtitleText = 'Your progress from all time';
                break;
            case 'weekly':
            default:
                const firstDayOfWeek = today.getDate() - today.getDay(); // Get Sunday's date
                startDate = new Date(today.setDate(firstDayOfWeek));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // Saturday
                subtitleText = 'Your progress for the current week (Sun-Sat)';
                break;
        }
        subtitle.textContent = subtitleText;

        // --- 2. Initialize Counters ---
        const recurringTasksData = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        const deadlineTasksObject = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        let perfectRoutineDays = 0;
        let deadlinesMet = 0;
        let totalTasksCompleted = 0;
        let totalDeadlinesInPeriod = 0;
        let daysInPeriod = 0;

        // --- 3. Loop Through Data and Calculate Stats ---
        // Ensure start and end dates are at the beginning of their respective days for accurate looping
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            daysInPeriod++;
            const dayKey = getLocalDayKey(d);
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

            // Recurring tasks
            const requiredRecurring = recurringTasksData[dayName] || [];
            const completedRecurring = JSON.parse(localStorage.getItem(`completedRecurring-${dayKey}`)) || [];
            if (requiredRecurring.length > 0 && requiredRecurring.every(task => completedRecurring.includes(task))) {
                perfectRoutineDays++;
            }
            totalTasksCompleted += completedRecurring.length;

            // Unique/Calendar tasks
            const dailyTasks = JSON.parse(localStorage.getItem(`calendarTasks-${dayKey}`)) || [];
            totalTasksCompleted += dailyTasks.filter(task => task.completed).length;
        }

        // Deadline tasks
        Object.values(deadlineTasksObject).forEach(task => {
            const dueDate = new Date(task.deadlineDateKey.replace(/-/g, '/'));
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate >= startDate && dueDate <= endDate) {
                totalDeadlinesInPeriod++;
                if (task.completed) {
                    deadlinesMet++;
                }
            }
        });

        // --- 4. Update UI Elements ---
        document.getElementById('analytics-recurring-days').textContent = `${perfectRoutineDays}/${daysInPeriod}`;
        document.getElementById('analytics-deadlines-met').textContent = `${deadlinesMet}`;
        document.getElementById('analytics-total-tasks').textContent = totalTasksCompleted;

        setTimeout(() => {
            document.getElementById('recurring-bar').style.width = daysInPeriod > 0 ? `${(perfectRoutineDays / daysInPeriod) * 100}%` : '0%';
            document.getElementById('deadlines-bar').style.width = totalDeadlinesInPeriod > 0 ? `${(deadlinesMet / totalDeadlinesInPeriod) * 100}%` : '0%';
            const totalTaskGoal = daysInPeriod * 5; // Dynamic goal (e.g., 5 tasks per day)
            document.getElementById('total-tasks-bar').style.width = totalTaskGoal > 0 ? `${Math.min(100, (totalTasksCompleted / totalTaskGoal) * 100)}%` : '0%';
        }, 100);
    }

    // --- 5. Add Event Listeners ---
    rangeButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button style
            rangeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            // Recalculate analytics for the new range
            updateAnalytics(button.dataset.range);
        });
    });

    // Initial load with the default view
    updateAnalytics('weekly');
});