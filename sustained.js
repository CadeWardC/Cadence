document.addEventListener('DOMContentLoaded', () => {
    const newListInput = document.getElementById('new-list-input');
    const addListBtn = document.getElementById('add-list-btn');
    const listsContainer = document.getElementById('lists-container');

    let lists = {};

    function saveLists() {
        localStorage.setItem('sustainedLists', JSON.stringify(lists));
    }

    function renderItem(listId, item) {
        const li = document.createElement('li');
        li.dataset.itemId = item.id;
        if (item.completed) {
            li.classList.add('completed');
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.completed;
        checkbox.addEventListener('change', () => {
            item.completed = checkbox.checked;
            li.classList.toggle('completed', item.completed);
            saveLists();
        });

        const label = document.createElement('label');
        label.textContent = item.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', () => {
            lists[listId].items = lists[listId].items.filter(i => i.id !== item.id);
            saveLists();
            renderAllLists();
        });

        li.appendChild(checkbox);
        li.appendChild(label);
        li.appendChild(deleteBtn);
        return li;
    }

    function renderList(listId, listData) {
        const listDiv = document.createElement('div');
        listDiv.className = 'todo-list';
        listDiv.dataset.listId = listId;

        // Header
        const header = document.createElement('div');
        header.className = 'todo-list-header';
        const title = document.createElement('h3');
        title.textContent = listData.title;
        const deleteListBtn = document.createElement('button');
        deleteListBtn.innerHTML = '&times;';
        deleteListBtn.className = 'delete-btn';
        deleteListBtn.title = 'Delete this list';
        deleteListBtn.addEventListener('click', () => {
            showConfirm(
                'Delete List',
                `Are you sure you want to delete the "${listData.title}" list? This cannot be undone.`,
                'Delete',
                () => {
                    delete lists[listId];
                    saveLists();
                    renderAllLists();
                }
            );
        });
        header.appendChild(title);
        header.appendChild(deleteListBtn);

        // Item List
        const ul = document.createElement('ul');
        ul.className = 'items-list';
        listData.items.forEach(item => {
            ul.appendChild(renderItem(listId, item));
        });

        // Add Item Form
        const addItemWrapper = document.createElement('div');
        addItemWrapper.className = 'add-item-wrapper';
        const itemInput = document.createElement('input');
        itemInput.type = 'text';
        itemInput.placeholder = 'Add new item...';
        const addItemBtn = document.createElement('button');
        addItemBtn.textContent = 'Add';
        addItemBtn.addEventListener('click', () => {
            const text = itemInput.value.trim();
            if (text) {
                const newItem = {
                    id: `item-${Date.now()}`,
                    text: text,
                    completed: false
                };
                lists[listId].items.push(newItem);
                saveLists();
                ul.appendChild(renderItem(listId, newItem));
                itemInput.value = '';
                itemInput.focus();
            }
        });
        itemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addItemBtn.click();
            }
        });
        addItemWrapper.appendChild(itemInput);
        addItemWrapper.appendChild(addItemBtn);

        listDiv.appendChild(header);
        listDiv.appendChild(ul);
        listDiv.appendChild(addItemWrapper);

        return listDiv;
    }

    function renderAllLists() {
        listsContainer.innerHTML = '';
        for (const listId in lists) {
            listsContainer.appendChild(renderList(listId, lists[listId]));
        }
    }

    function loadLists() {
        const storedLists = localStorage.getItem('sustainedLists');
        if (storedLists) {
            lists = JSON.parse(storedLists);
            renderAllLists();
        }
    }

    addListBtn.addEventListener('click', () => {
        const title = newListInput.value.trim();
        if (title) {
            const newListId = `list-${Date.now()}`;
            lists[newListId] = {
                title: title,
                items: []
            };
            saveLists();
            listsContainer.appendChild(renderList(newListId, lists[newListId]));
            newListInput.value = '';
        }
    });

    newListInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addListBtn.click();
        }
    });

    // Initial Load
    loadLists();
});