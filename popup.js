document.addEventListener('DOMContentLoaded', function() {
  loadTasks();

  document.getElementById('addCurrentPage').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const url = tabs[0].url;
      if (url.includes('.atlassian.net')) {
        const ticketCode = url.split('/').pop();
        addTask(ticketCode, url);
      } else {
        alert('La URL actual no es un ticket válido de Jira (.atlassian.net)');
      }
    });
  });

  document.getElementById('downloadCSV').addEventListener('click', downloadCSV);
});

function loadTasks() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const activeTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    renderTaskList('activeTasks', activeTasks);
    renderTaskList('completedTasks', completedTasks);
  });
}

function renderTaskList(containerId, tasks) {
  const container = document.getElementById(containerId);
  container.innerHTML = tasks.length === 0 ?
    '<div class="empty-state">No hay tickets en esta lista</div>' : '';

  tasks.forEach((task, index) => {
    const taskElement = createTaskElement(task, index);
    container.appendChild(taskElement);
  });
}

function createTaskElement(task, index) {
  const div = document.createElement('div');
  div.className = `task-item ${task.completed ? 'completed' : ''}`;

  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = task.title;
  titleInput.readOnly = task.completed;
  if (!task.completed) {
    titleInput.addEventListener('change', () => updateTaskTitle(index, titleInput.value));
  }

  const dateSpan = document.createElement('span');
  dateSpan.className = 'completion-date';
  dateSpan.textContent = task.completionDate ? `Completado: ${task.completionDate}` : '';

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';

  const linkButton = document.createElement('button');
  linkButton.className = 'btn btn-link';
  linkButton.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" width="16" height="16">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
  `;
  linkButton.addEventListener('click', () => {
    chrome.tabs.create({ url: task.url });
  });

  // Solo agregar checkbox a tickets activos
  if (!task.completed) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    checkbox.addEventListener('change', () => updateTaskStatus(index, checkbox.checked));
    div.appendChild(checkbox);
  }

  // Menú de 3 puntos
  const dropdownDiv = document.createElement('div');
  dropdownDiv.className = 'dropdown';

  const dropdownToggle = document.createElement('button');
  dropdownToggle.className = 'dropdown-toggle';
  dropdownToggle.textContent = '⋮';
  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = dropdownToggle.nextElementSibling;
    // Cerrar todos los otros menús abiertos
    document.querySelectorAll('.dropdown-menu.show').forEach(m => {
      if (m !== menu) m.classList.remove('show');
    });
    menu.classList.toggle('show');
  });

  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'dropdown-menu';

  // Cerrar menús al hacer click fuera
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  // Opciones del menú según el estado del ticket
  if (task.completed) {
    const reactivateButton = document.createElement('button');
    reactivateButton.className = 'dropdown-item';
    reactivateButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" width="16" height="16">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
    `;
    reactivateButton.addEventListener('click', () => updateTaskStatus(index, false));
    dropdownMenu.appendChild(reactivateButton);
  }

  const deleteButton = document.createElement('button');
  deleteButton.className = 'dropdown-item danger';
  deleteButton.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" width="16" height="16">
  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
  `;
  deleteButton.addEventListener('click', () => deleteTask(index));
  dropdownMenu.appendChild(deleteButton);

  dropdownDiv.appendChild(dropdownToggle);
  dropdownDiv.appendChild(dropdownMenu);

  contentDiv.appendChild(titleInput);
  if (task.completed) {
    contentDiv.appendChild(dateSpan);
  }

  div.appendChild(contentDiv);
  div.appendChild(actionsDiv);
  actionsDiv.appendChild(linkButton);
  actionsDiv.appendChild(dropdownDiv);

  return div;
}

function addTask(ticketCode, url) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];

    // Verificar si el ticket ya existe
    const ticketExists = tasks.some(task => task.code === ticketCode || task.url === url);

    if (ticketExists) {
      alert('Este ticket ya está en tu lista');
      return;
    }

    tasks.push({
      code: ticketCode,
      url: url,
      title: ticketCode,
      completed: false,
      completionDate: null
    });

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function deleteTask(index) {
  if (confirm('¿Estás seguro de que deseas eliminar este ticket?')) {
    chrome.storage.sync.get(['tasks'], function(result) {
      const tasks = result.tasks;
      tasks.splice(index, 1);
      chrome.storage.sync.set({tasks: tasks}, function() {
        loadTasks();
      });
    });
  }
}

function updateTaskStatus(index, completed) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks;
    tasks[index].completed = completed;
    tasks[index].completionDate = completed ? new Date().toLocaleDateString() : null;

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function updateTaskTitle(index, newTitle) {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks;
    tasks[index].title = newTitle;

    chrome.storage.sync.set({tasks: tasks}, function() {
      loadTasks();
    });
  });
}

function downloadCSV() {
  chrome.storage.sync.get(['tasks'], function(result) {
    const tasks = result.tasks || [];
    const csvContent = [
      ['Código', 'Título', 'URL', 'Estado', 'Fecha de finalización'],
      ...tasks.map(task => [
        task.code,
        task.title,
        task.url,
        task.completed ? 'Finalizado' : 'Activo',
        task.completionDate || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jira_tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}
