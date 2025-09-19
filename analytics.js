document.addEventListener('DOMContentLoaded', () => {
    const rangeButtons = document.querySelectorAll('.range-btn');
    const subtitle = document.querySelector('.analytics-subtitle');

    // This is assumed to exist in utils.js, but is included here for clarity.
    function getLocalDayKey(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function findFirstTaskDate() {
        let earliestDate = null;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('calendarTasks-') || key.startsWith('completedRecurring-')) {
                const dateStr = key.substring(key.indexOf('-') + 1);
                const currentDate = new Date(dateStr.replace(/-/g, '/'));
                if (!earliestDate || currentDate < earliestDate) {
                    earliestDate = currentDate;
                }
            }
        }
        return earliestDate || new Date();
    }

    function updateAnalytics(range = 'weekly') {
        const today = new Date();
        let startDate, endDate;
        let subtitleText = '';

        switch (range) {
            case 'monthly':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                subtitleText = `Your progress for the current month`;
                break;
            case 'ytd':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date();
                subtitleText = `Your progress from Jan 1 to today`;
                break;
            case 'yearly':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today.getFullYear(), 11, 31);
                subtitleText = `Your progress for the current year`;
                break;
            case 'all-time':
                startDate = findFirstTaskDate();
                endDate = new Date();
                subtitleText = 'Your progress from all time';
                break;
            case 'weekly':
            default:
                const weekStart = new Date();
                weekStart.setHours(0, 0, 0, 0);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                startDate = weekStart;
                const weekEnd = new Date(startDate);
                weekEnd.setDate(weekEnd.getDate() + 6);
                endDate = weekEnd;
                subtitleText = 'Your progress for the current week (Sun-Sat)';
                break;
        }
        subtitle.textContent = subtitleText;

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const dailyCounts = {};
        let perfectRoutineDays = 0;
        let daysInPeriod = 0;

        // Pre-load all task data once to avoid repeated parsing in the loop
        const recurringTasksData = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        // FIX: Load sustained tasks data.
        const sustainedTasks = JSON.parse(localStorage.getItem('sustainedTasks')) || {};
        // REMOVED: No longer need to load the main unique/deadline lists here.

        let loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            daysInPeriod++;
            const dayKey = getLocalDayKey(loopDate);
            let tasksCompletedOnThisDay = 0;

            // 1. Count completed recurring tasks for this day
            const completedRecurring = JSON.parse(localStorage.getItem(`completedRecurring-${dayKey}`)) || [];
            tasksCompletedOnThisDay += completedRecurring.length;

            // FIX: 2. Count completed unique and deadline tasks from the correct location.
            // These tasks are moved to a 'calendarTasks-{dayKey}' item upon completion.
            const calendarTasksOnThisDay = JSON.parse(localStorage.getItem(`calendarTasks-${dayKey}`)) || [];
            calendarTasksOnThisDay.forEach(task => {
                // FIX: Check for 'isDeadline' property instead of 'type'. This correctly excludes deadlines.
                if (task.completed && !task.isDeadline) {
                    tasksCompletedOnThisDay++;
                }
            });

            // 3. Count completed sustained tasks for this day.
            Object.values(sustainedTasks).forEach(task => {
                if (task.completed && task.completionDate === dayKey) {
                    tasksCompletedOnThisDay++;
                }
            });

            // Store the final, correct total for the day
            if (tasksCompletedOnThisDay > 0) {
                dailyCounts[dayKey] = tasksCompletedOnThisDay;
            }

            // Check for perfect routine days
            const dayName = loopDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const requiredRecurring = recurringTasksData[dayName] || [];
            if (requiredRecurring.length > 0 && requiredRecurring.every(task => completedRecurring.includes(task))) {
                perfectRoutineDays++;
            }

            loopDate.setDate(loopDate.getDate() + 1);
        }

        // Calculate totals from the accurate data
        const totalTasksCompleted = Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
        
        // FIX: Restore and correct the "Deadlines Met" calculation.
        let deadlinesMet = 0;
        let totalDeadlinesInPeriod = 0;

        // Find all deadlines (completed or not) that were DUE in the selected period.
        const uncompletedDeadlines = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        const deadlinesDueInPeriod = Object.values(uncompletedDeadlines).filter(task => {
            const dueDate = new Date(task.deadlineDateKey.replace(/-/g, '/'));
            return dueDate >= startDate && dueDate <= endDate;
        });

        // Also find completed deadlines that were due in the period.
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('calendarTasks-')) {
                const tasksOnDay = JSON.parse(localStorage.getItem(key));
                tasksOnDay.forEach(task => {
                    if (task.isDeadline && task.deadlineDateKey) {
                        const dueDate = new Date(task.deadlineDateKey.replace(/-/g, '/'));
                        if (dueDate >= startDate && dueDate <= endDate) {
                            deadlinesDueInPeriod.push(task);
                        }
                    }
                });
            }
        }
        
        // From that list, count how many are completed.
        deadlinesDueInPeriod.forEach(task => {
            if (task.completed) {
                deadlinesMet++;
            }
        });
        totalDeadlinesInPeriod = deadlinesDueInPeriod.length;


        // --- Update UI ---
        document.getElementById('analytics-recurring-days').textContent = `${perfectRoutineDays}/${daysInPeriod}`;
        // FIX: Restore the UI update for the 'analytics-deadlines-met' element.
        document.getElementById('analytics-deadlines-met').textContent = `${deadlinesMet}/${totalDeadlinesInPeriod}`;
        document.getElementById('analytics-total-tasks').textContent = totalTasksCompleted;

        setTimeout(() => {
            document.getElementById('recurring-bar').style.width = daysInPeriod > 0 ? `${(perfectRoutineDays / daysInPeriod) * 100}%` : '0%';
            // FIX: Restore the UI update for the 'deadlines-bar'.
            document.getElementById('deadlines-bar').style.width = totalDeadlinesInPeriod > 0 ? `${(deadlinesMet / totalDeadlinesInPeriod) * 100}%` : '0%';
            const totalTaskGoal = daysInPeriod * 5;
            document.getElementById('total-tasks-bar').style.width = totalTaskGoal > 0 ? `${Math.min(100, (totalTasksCompleted / totalTaskGoal) * 100)}%` : '0%';
        }, 100);

        const isLongRange = ['ytd', 'yearly', 'all-time'].includes(range);
        if (isLongRange) {
            renderMonthlyActivityGraph(dailyCounts, new Date(startDate), new Date(endDate));
        } else {
            renderDailyActivityGraph(dailyCounts, new Date(startDate), new Date(endDate));
        }
    }

    function renderDailyActivityGraph(dailyCounts, startDate, endDate) {
        const chartContainer = document.getElementById('daily-activity-chart');
        const yAxisContainer = document.getElementById('y-axis');
        chartContainer.innerHTML = '';
        yAxisContainer.innerHTML = '';

        const getNiceMaxValue = (value) => {
            if (value <= 5) return 5;
            if (value <= 10) return 10;
            return Math.ceil(value / 10) * 10;
        };
        const maxCount = getNiceMaxValue(Math.max(...Object.values(dailyCounts), 0));
        yAxisContainer.innerHTML = `<span>${maxCount}</span><span>${Math.round(maxCount / 2)}</span><span>0</span>`;

        let loopDate = new Date(startDate);
        while (loopDate <= endDate) {
            const dayKey = getLocalDayKey(loopDate);
            const count = dailyCounts[dayKey] || 0;
            const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

            const wrapper = document.createElement('div');
            wrapper.className = 'chart-bar-wrapper';
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = '0%';
            setTimeout(() => { bar.style.height = `${barHeight}%`; }, 100);
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = `${count} tasks`;
            bar.appendChild(tooltip);
            const label = document.createElement('span');
            label.className = 'chart-label';
            label.textContent = loopDate.toLocaleDateString('en-US', { weekday: 'short' });
            wrapper.appendChild(bar);
            wrapper.appendChild(label);
            chartContainer.appendChild(wrapper);

            loopDate.setDate(loopDate.getDate() + 1);
        }
    }

    function renderMonthlyActivityGraph(dailyCounts, startDate, endDate) {
        const chartContainer = document.getElementById('daily-activity-chart');
        const yAxisContainer = document.getElementById('y-axis');
        chartContainer.innerHTML = '';
        yAxisContainer.innerHTML = '';

        const monthlyCounts = {};
        for (const dayKey in dailyCounts) {
            const monthKey = dayKey.substring(0, 7);
            monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + dailyCounts[dayKey];
        }

        const getNiceMaxValue = (value) => {
            if (value <= 10) return 10;
            if (value <= 50) return 50;
            return Math.ceil(value / 50) * 50;
        };
        const maxCount = getNiceMaxValue(Math.max(...Object.values(monthlyCounts), 0));
        yAxisContainer.innerHTML = `<span>${maxCount}</span><span>${Math.round(maxCount / 2)}</span><span>0</span>`;

        let loopDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        let finalDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (loopDate <= finalDate) {
            const monthKey = `${loopDate.getFullYear()}-${(loopDate.getMonth() + 1).toString().padStart(2, '0')}`;
            const count = monthlyCounts[monthKey] || 0;
            const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

            const wrapper = document.createElement('div');
            wrapper.className = 'chart-bar-wrapper';
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = '0%';
            setTimeout(() => { bar.style.height = `${barHeight}%`; }, 100);
            const tooltip = document.createElement('span');
            tooltip.className = 'tooltip';
            tooltip.textContent = `${count} tasks`;
            bar.appendChild(tooltip);
            const label = document.createElement('span');
            label.className = 'chart-label';
            label.textContent = loopDate.toLocaleDateString('en-US', { month: 'short' });
            wrapper.appendChild(bar);
            wrapper.appendChild(label);
            chartContainer.appendChild(wrapper);

            loopDate.setMonth(loopDate.getMonth() + 1);
        }
    }

    rangeButtons.forEach(button => {
        button.addEventListener('click', () => {
            rangeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateAnalytics(button.dataset.range);
        });
    });

    updateAnalytics('weekly');

    window.addEventListener('storage', (e) => {
        const key = e.key;
        // FIX: Listen for changes to all relevant task keys.
        if (key && (key.startsWith('completedRecurring-') || key.startsWith('calendarTasks-') || key === 'sustainedTasks')) {
            const activeButton = document.querySelector('.range-btn.active');
            const currentRange = activeButton ? activeButton.dataset.range : 'weekly';
            updateAnalytics(currentRange);
        }
    });
});