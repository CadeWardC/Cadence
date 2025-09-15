// script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const dayNameDisplay = document.getElementById('day-name-display');
    const dateDisplay = document.getElementById('date-display');
    const recurringTasksList = document.getElementById('recurring-tasks');
    const deadlineTasksList = document.getElementById('deadline-tasks');
    const dailyTasksList = document.getElementById('daily-tasks');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskBtn = document.getElementById('add-task-btn');

    // --- Constants and Keys ---
    const today = new Date();
    
    // --- Date Display ---
    function updateDateDisplay() {
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
        const dateString = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        dayNameDisplay.textContent = dayName;
        dateDisplay.textContent = dateString;
    }

    // --- Helper Functions ---
    function getLocalDayKey(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    const calendarTaskKey = `calendarTasks-${getLocalDayKey(today)}`;
    const completedRecurringKey = `completedRecurring-${getLocalDayKey(today)}`;

    function formatTime(timeString) {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minutes} ${ampm}`;
    }

    // --- RENDER TASKS (Consolidated Function) ---
    function renderTasks() {
        // --- Render Recurring Tasks ---
        const recurringTasksData = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        const completedRecurringForToday = JSON.parse(localStorage.getItem(completedRecurringKey)) || [];
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = weekdays[today.getDay()].toLowerCase();
        const tasksForToday = recurringTasksData[todayName] || [];
        
        recurringTasksList.innerHTML = ''; 
        if (tasksForToday.length > 0) {
            tasksForToday.forEach(taskText => {
                const isCompleted = completedRecurringForToday.includes(taskText);
                const li = document.createElement('li');
                li.dataset.taskType = 'recurring';
                li.dataset.taskText = taskText; 
                li.className = isCompleted ? 'completed' : '';
                
                li.innerHTML = `
                    <input type="checkbox" ${isCompleted ? 'checked' : ''}>
                    <label>${taskText}</label>
                `;
                recurringTasksList.appendChild(li);
            });
        } else {
            recurringTasksList.innerHTML = '<li class="no-tasks">No recurring tasks for today.</li>';
        }

        // --- Render Deadline Tasks ---
        deadlineTasksList.innerHTML = '';
        const deadlineTasksObject = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        const deadlineTasksArray = Object.values(deadlineTasksObject);
        const todayNorm = new Date();
        todayNorm.setHours(0, 0, 0, 0);

        const openDeadlines = deadlineTasksArray.filter(task => {
            const [year, month, day] = task.deadlineDateKey.split('-').map(Number);
            const deadlineDate = new Date(year, month - 1, day);
            deadlineDate.setHours(23, 59, 59, 999);
            return !task.completed && todayNorm <= deadlineDate;
        }).sort((a, b) => new Date(a.deadlineDateKey) - new Date(b.deadlineDateKey));

        if (openDeadlines.length > 0) {
            openDeadlines.forEach(task => {
                const li = document.createElement('li');
                li.dataset.taskId = task.id;
                li.dataset.taskType = 'deadline';
                li.dataset.deadlineDateKey = task.deadlineDateKey;
                if (task.completed) {
                    li.classList.add('completed');
                }

                const dueDate = new Date(task.deadlineDateKey.replace(/-/g, '/'));
                const formattedDate = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                li.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <label>
                        <span class="task-text">${task.text}</span>
                        <span class="due-date">Due: ${formattedDate}</span>
                    </label>
                    <button class="delete-btn">×</button>
                `;

                if (task.tags && task.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.classList.add('tags-container');
                    task.tags.forEach(tag => {
                        const tagElement = document.createElement('span');
                        tagElement.classList.add('task-tag');
                        tagElement.textContent = tag;
                        tagsContainer.appendChild(tagElement);
                    });
                    li.querySelector('label').appendChild(tagsContainer);
                }

                deadlineTasksList.appendChild(li);
            });
        } else {
            deadlineTasksList.innerHTML = '<li class="no-tasks">No open deadlines.</li>';
        }

        // --- Render Daily (Unique) Tasks ---
        dailyTasksList.innerHTML = '';
        const allDailyTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
        const uniqueDailyTasks = allDailyTasks.filter(task => !task.isDeadline && !task.completed);
        
        uniqueDailyTasks.sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));

        if (uniqueDailyTasks.length > 0) {
            uniqueDailyTasks.forEach(task => {
                const li = document.createElement('li');
                li.dataset.taskId = task.id;
                li.dataset.taskType = 'daily';
                if (task.completed) {
                    li.classList.add('completed');
                }
                const timeDisplay = task.time ? `<span class="task-time">${formatTime(task.time)}</span>` : '';
                li.innerHTML = `
                    <input type="checkbox" ${task.completed ? 'checked' : ''}>
                    <label>
                        ${timeDisplay}
                        <span class="task-text">${task.text}</span>
                    </label>
                    <button class="delete-btn">×</button>
                `;

                if (task.tags && task.tags.length > 0) {
                    const tagsContainer = document.createElement('div');
                    tagsContainer.classList.add('tags-container');
                    task.tags.forEach(tag => {
                        const tagElement = document.createElement('span');
                        tagElement.classList.add('task-tag');
                        tagElement.textContent = tag;
                        tagsContainer.appendChild(tagElement);
                    });
                    li.querySelector('label').appendChild(tagsContainer);
                }

                dailyTasksList.appendChild(li);
            });
        } else {
            dailyTasksList.innerHTML = '<li class="no-tasks">No unique tasks for today.</li>';
        }
    }

    // --- Event Handlers ---
    function addDailyTask() {
        const taskText = newTaskInput.value.trim();
        if (!taskText) return;
        const allCalendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
        const newTask = { id: `task-${Date.now()}`, text: taskText, completed: false, time: null, isDeadline: false, tags: [] };
        allCalendarTasks.push(newTask);
        localStorage.setItem(calendarTaskKey, JSON.stringify(allCalendarTasks));
        newTaskInput.value = '';
        renderTasks();
    }

    function handleTaskClick(e) {
        const li = e.target.closest('li');
        if (!li || !li.dataset.taskType) return;

        const taskType = li.dataset.taskType;

        if (taskType === 'daily') {
            const taskId = li.dataset.taskId;
            if (e.target.matches('.delete-btn')) {
                let calendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
                calendarTasks = calendarTasks.filter(t => t.id !== taskId);
                localStorage.setItem(calendarTaskKey, JSON.stringify(calendarTasks));
                renderTasks();
            } else if (e.target.matches('input[type="checkbox"]')) {
                let calendarTasks = JSON.parse(localStorage.getItem(calendarTaskKey)) || [];
                const task = calendarTasks.find(t => t.id === taskId);
                if (task) {
                    task.completed = e.target.checked;
                }
                localStorage.setItem(calendarTaskKey, JSON.stringify(calendarTasks));
                renderTasks();
            }
        } else if (taskType === 'recurring') {
            if (e.target.matches('input[type="checkbox"]')) {
                const taskText = li.dataset.taskText;
                let completedRecurring = JSON.parse(localStorage.getItem(completedRecurringKey)) || [];
                if (e.target.checked) {
                    if (!completedRecurring.includes(taskText)) {
                        completedRecurring.push(taskText);
                    }
                } else {
                    completedRecurring = completedRecurring.filter(t => t !== taskText);
                }
                localStorage.setItem(completedRecurringKey, JSON.stringify(completedRecurring));
                renderTasks();
            }
        } else if (taskType === 'deadline') {
            const taskId = li.dataset.taskId;
            if (e.target.matches('.delete-btn')) {
                const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
                if (deadlineTasks[taskId]) {
                    const deadlineDateKey = deadlineTasks[taskId].deadlineDateKey;
                    delete deadlineTasks[taskId];
                    localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));

                    const originalTaskKey = `calendarTasks-${deadlineDateKey}`;
                    let originalTasks = JSON.parse(localStorage.getItem(originalTaskKey)) || [];
                    originalTasks = originalTasks.filter(t => t.id !== taskId);
                    localStorage.setItem(originalTaskKey, JSON.stringify(originalTasks));
                }
                renderTasks();
            } else if (e.target.matches('input[type="checkbox"]')) {
                const deadlineDateKey = li.dataset.deadlineDateKey;
                const deadlineTasks = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
                if (deadlineTasks[taskId]) {
                    deadlineTasks[taskId].completed = true;
                    localStorage.setItem('deadlineTasks', JSON.stringify(deadlineTasks));
                }

                const originalTaskKey = `calendarTasks-${deadlineDateKey}`;
                const originalTasks = JSON.parse(localStorage.getItem(originalTaskKey)) || [];
                const originalTask = originalTasks.find(t => t.id === taskId);
                if (originalTask) {
                    originalTask.completed = true;
                    localStorage.setItem(originalTaskKey, JSON.stringify(originalTasks));
                }
                renderTasks();
            }
        }
    }

    // --- Analytics Pop-up Functions ---
    function showWeeklyAnalyticsIfNeeded() {
        const today = new Date();
        // Check if it's Saturday (day 6)
        if (today.getDay() !== 6) {
            return;
        }

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Get last Sunday
        const weekKey = `analyticsShown_${startOfWeek.getFullYear()}-${startOfWeek.getMonth()}-${startOfWeek.getDate()}`;

        // Do not show if it has already been shown for the current week
        if (localStorage.getItem(weekKey)) {
            return;
        }

        calculateAndShowAnalytics();
        localStorage.setItem(weekKey, 'true'); // Mark as shown for this week
    }

    function calculateAndShowAnalytics() {
        const recurringTasksData = JSON.parse(localStorage.getItem('recurringTasks')) || {};
        const deadlineTasksObject = JSON.parse(localStorage.getItem('deadlineTasks')) || {};
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        let perfectRoutineDays = 0;
        let deadlinesMet = 0;
        let totalTasksCompleted = 0;
        let totalDeadlinesInPeriod = 0;

        // Loop through the last 7 days to gather stats
        for (let i = 0; i < 7; i++) {
            const day = new Date();
            day.setDate(day.getDate() - i);
            const dayKey = getLocalDayKey(day);
            const dayName = weekdays[day.getDay()].toLowerCase();

            // 1. Recurring tasks
            const requiredRecurring = recurringTasksData[dayName] || [];
            const completedRecurring = JSON.parse(localStorage.getItem(`completedRecurring-${dayKey}`)) || [];
            if (requiredRecurring.length > 0 && requiredRecurring.every(task => completedRecurring.includes(task))) {
                perfectRoutineDays++;
            }
            totalTasksCompleted += completedRecurring.length;

            // 2. Unique/Calendar tasks
            const dailyTasks = JSON.parse(localStorage.getItem(`calendarTasks-${dayKey}`)) || [];
            totalTasksCompleted += dailyTasks.filter(task => task.completed).length;
        }
        
        // 3. Deadline tasks
        Object.values(deadlineTasksObject).forEach(task => {
            const dueDate = new Date(task.deadlineDateKey.replace(/-/g, '/'));
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            if (dueDate >= oneWeekAgo && dueDate <= new Date()) {
                totalDeadlinesInPeriod++;
                if (task.completed) {
                    deadlinesMet++;
                }
            }
        });

        // Update modal values
        document.getElementById('analytics-recurring-days').textContent = `${perfectRoutineDays}/7`;
        document.getElementById('analytics-deadlines-met').textContent = `${deadlinesMet}`;
        document.getElementById('analytics-total-tasks').textContent = totalTasksCompleted;

        // Update bars
        setTimeout(() => {
            document.getElementById('recurring-bar').style.width = `${(perfectRoutineDays / 7) * 100}%`;
            document.getElementById('deadlines-bar').style.width = totalDeadlinesInPeriod > 0 ? `${(deadlinesMet / totalDeadlinesInPeriod) * 100}%` : '0%';
            const totalTaskGoal = 35; // Example goal of 35 tasks per week
            document.getElementById('total-tasks-bar').style.width = `${Math.min(100, (totalTasksCompleted / totalTaskGoal) * 100)}%`;
        }, 100);

        // Show the modal
        document.getElementById('analytics-modal').classList.remove('hidden');
    }

    // --- Initial Load ---
    function initialize() {
        updateDateDisplay();
        renderTasks();
        showWeeklyAnalyticsIfNeeded(); // Add this call back
    }

    // --- Event Listeners ---
    if(addTaskBtn) addTaskBtn.addEventListener('click', addDailyTask);
    if(newTaskInput) {
        newTaskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addDailyTask();
        });
    }
    document.querySelector('.container').addEventListener('click', handleTaskClick);

    // Add listener for the analytics modal close button
    const closeAnalyticsBtn = document.getElementById('close-analytics-btn');
    if (closeAnalyticsBtn) {
        closeAnalyticsBtn.addEventListener('click', () => {
            document.getElementById('analytics-modal').classList.add('hidden');
        });
    }

    initialize();
});