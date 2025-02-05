document.addEventListener('DOMContentLoaded', function() {
  initializeProjectSystem();
  loadTasks();

  const modal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettings");
  const newProjectBtn = document.getElementById("newProjectBtn");

  document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', function() {
      const modal = this.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Cerrar modales al hacer click fuera
  window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });

  // Actualizar el resetDatabase
  document.getElementById('resetDatabase').addEventListener('click', resetDatabase);

  // Eventos para gestión de proyectos
  document.getElementById('switchProject').addEventListener('click', () => {
    document.getElementById('projectsModal').style.display = 'flex';
    loadProjectsList();
  });

  document.getElementById('exportProject').addEventListener('click', () => {
    chrome.storage.sync.get(['currentProject'], function(result) {
      exportProject(result.currentProject);
    });
  });

  document.getElementById('importProjectBtn').addEventListener('click', () => {
    document.getElementById('importProject').click();
  });

  document.getElementById('importProject').addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      importProject(e.target.files[0]);
      e.target.value = ''; // Resetear input
    }
    loadProjectsList();
  });

  newProjectBtn.addEventListener('click', () => {
    const projectsContainer = document.getElementById('projectsList');
    // TODO: Es necesario mejorar la forma en como se muestra el formulario de nuevo proyecto
    projectsContainer.innerHTML = '';
    projectsContainer.appendChild(document.getElementById("newProjectForm"));
  })

  document.getElementById('newProjectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const title = document.getElementById('projectTitle').value;
    const description = document.getElementById('projectDescription').value;

    const newProject = {
      id: 'project_' + Date.now(),
      title: title,
      description: description,
      tasks: []
    };

    chrome.storage.sync.get(['projects'], function(result) {
      const projects = result.projects || [];
      projects.push(newProject);

      chrome.storage.sync.set({
        projects: projects,
        currentProject: newProject.id
      }, function() {
        document.getElementById('newProjectModal').style.display = 'none';
        document.getElementById('projectTitle').value = '';
        document.getElementById('projectDescription').value = '';
        loadTasks();
      });
    });
  });

  openSettingsBtn.addEventListener("click", function() {
    modal.style.display = "flex";
  });

  window.addEventListener("click", function(event) {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  })

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

function loadProjectsList() {
  chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
    const projectsContainer = document.getElementById('projectsList');
    projectsContainer.innerHTML = '';

    result.projects.forEach(project => {
      const projectCard = document.createElement('div');
      projectCard.className = `project-card ${project.id === result.currentProject ? 'active' : ''}`;

      const title = document.createElement('h3');
      title.textContent = project.title;

      const description = document.createElement('p');
      description.textContent = project.description || '';

      projectCard.appendChild(title);
      projectCard.appendChild(description);

      projectCard.addEventListener('click', () => {
        chrome.storage.sync.set({ currentProject: project.id }, () => {
          document.getElementById('projectsModal').style.display = 'none';
          loadTasks();
        });
      });

      projectsContainer.appendChild(projectCard);
    });
  });
}

function resetDatabase() {
  if (confirm("¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.")) {
    chrome.storage.sync.set({
      projects: [{
        id: 'default',
        title: 'Proyecto Principal',
        description: 'Proyecto por defecto',
        tasks: []
      }],
      currentProject: 'default'
    }, function() {
      loadTasks();
      document.getElementById('settingsModal').style.display = 'none';
      alert("Todos los datos han sido borrados.");
    });
  }
}

function loadTasks() {
  chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
    const currentProject = result.projects.find(p => p.id === result.currentProject);
    if (!currentProject) return;

    document.getElementById('currentProjectTitle').textContent = currentProject.title;
    document.getElementById('currentProjectDescription').textContent = currentProject.description || '';

    const activeTasks = currentProject.tasks.filter(task => !task.completed);
    const completedTasks = currentProject.tasks.filter(task => task.completed);

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

  const codeHiddenInput = document.createElement("input");
  codeHiddenInput.type = "hidden";
  codeHiddenInput.name = "code";
  codeHiddenInput.value = task.code;
  codeHiddenInput.readOnly = true;
  codeHiddenInput.id = "code_" + task.code;

  const codeDiv = document.createElement("div");
  codeDiv.className = "task-code";
  codeDiv.textContent = task.code;
  codeDiv.title = task.code;

  const titleDiv = document.createElement('div');
  titleDiv.className = 'task-title';
  titleDiv.textContent = task.title;
  titleDiv.title = task.title;

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
    checkbox.setAttribute("data-reference-id", "code_" + task.code);
    checkbox.addEventListener('change', () => updateTaskStatus(task.code, checkbox.checked));
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
    reactivateButton.addEventListener('click', () => updateTaskStatus(task.code, false));
    dropdownMenu.appendChild(reactivateButton);
  }

  const deleteButton = document.createElement('button');
  deleteButton.className = 'dropdown-item danger';
  deleteButton.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" width="16" height="16">
  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
  `;
  deleteButton.addEventListener('click', () => deleteTask(task.code));
  dropdownMenu.appendChild(deleteButton);

  dropdownDiv.appendChild(dropdownToggle);
  dropdownDiv.appendChild(dropdownMenu);

  contentDiv.appendChild(codeHiddenInput);
  contentDiv.appendChild(codeDiv);
  contentDiv.appendChild(titleDiv);
  if (task.completed) {
    contentDiv.appendChild(dateSpan);
  }

  div.appendChild(contentDiv);
  div.appendChild(actionsDiv);
  actionsDiv.appendChild(linkButton);
  actionsDiv.appendChild(dropdownDiv);

  return div;
}

async function extractTitleFromJiraPage(ticketCode) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const title = await new Promise((resolve) => {
      console.log("tab.id", tab.id);
      chrome.tabs.sendMessage(tab.id, { action: "getH1" }, (response) => {
        if (response === undefined) {
          resolve(null);
          return;
        }
        resolve(response.content);
      });
    });

    if (title === null || title === 'Jira') {
      return null;
    }
    return title.replace(`[${ticketCode}] `, '').split(' - ')[0].trim();
  } catch (error) {
    console.error("Error al extraer el título del ticket de Jira:", error);
    return null;
  }
}

async function addTask(ticketCode, url) {
  chrome.storage.sync.get(['projects', 'currentProject'], async function(result) {
    const projectIndex = result.projects.findIndex(p => p.id === result.currentProject);
    if (projectIndex === -1) return;

    const project = result.projects[projectIndex];

    // Verificar si el ticket ya existe en el proyecto actual
    const ticketExists = project.tasks.some(task => task.code === ticketCode || task.url === url);

    if (ticketExists) {
      alert('Este ticket ya está en tu lista');
      return;
    }

    try {
      const pageTitle = await extractTitleFromJiraPage(ticketCode) || ticketCode;

      project.tasks.push({
        code: ticketCode,
        url: url,
        title: pageTitle,
        completed: false,
        completionDate: null
      });

      result.projects[projectIndex] = project;
      chrome.storage.sync.set({ projects: result.projects }, function() {
        loadTasks();
      });
    } catch (error) {
      console.error('Error al agregar el ticket:', error);
      alert('No se pudo obtener el título del ticket. Se usará el código como título.');
    }
  });
}

function deleteTask(ticketCode) {
  if (confirm('¿Estás seguro de que deseas eliminar este ticket?')) {
    chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
      const projectIndex = result.projects.findIndex(p => p.id === result.currentProject);
      if (projectIndex === -1) return;
      const project = result.projects[projectIndex];

      for (let i = 0; i < project.tasks.length; i++) {
        if (project.tasks[i].code === ticketCode) {
          project.tasks.splice(i, 1);
          break;
        }
      }

      result.projects[projectIndex] = project;
      chrome.storage.sync.set({ projects: result.projects }, function() {
        loadTasks();
      });
    });
  }
}

function updateTaskStatus(taskCode, completed) {
  chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
    const projectIndex = result.projects.findIndex(p => p.id === result.currentProject);
    if (projectIndex === -1) return;

    const project = result.projects[projectIndex];
    for (let i = 0; i < project.tasks.length; i++) {
      if (project.tasks[i].code === taskCode) {
        project.tasks[i].completed = completed;
        project.tasks[i].completionDate = completed ? new Date().toLocaleDateString() : null;
        break;
      }
    }

    result.projects[projectIndex] = project;
    chrome.storage.sync.set({ projects: result.projects }, function() {
      loadTasks();
    });
  });
}

function downloadCSV() {
  chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
    const projectIndex = result.projects.findIndex(p => p.id === result.currentProject);
    if (projectIndex === -1) return;
    const project = result.projects[projectIndex];
    const tasks = project.tasks || [];
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

function initializeProjectSystem() {
  chrome.storage.sync.get(['projects', 'currentProject'], function(result) {
    if (!result.projects) {
      const defaultProject = {
        id: 'default',
        title: 'Proyecto Principal',
        description: 'Proyecto por defecto',
        tasks: []
      };
      chrome.storage.sync.set({
        projects: [defaultProject],
        currentProject: 'default'
      });
    }
  });
}

function createNewProject(title, description = '') {
  return {
    id: 'project_' + Date.now(),
    title,
    description,
    tasks: []
  };
}

function saveProject(project) {
  chrome.storage.sync.get(['projects'], function(result) {
    const projects = result.projects || [];

    if (!project.id) {
      project.id = 'project_' + Date.now();
    }

    let updatedProjects;
    try {
      const existingIndex = projects.findIndex(p => p.id === project.id);
      if (existingIndex >= 0) {
        updatedProjects = [...projects.slice(0, existingIndex), ...projects.slice(existingIndex + 1)];
      } else {
        updatedProjects = [project, ...projects];
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("An unexpected error occurred while trying to save the project. Please try again.");
      return;
    }

    chrome.storage.sync.set({ projects: projects }, function() {
      loadTasks(); // Recargar la vista
    });
  });
}

function exportProject(projectId) {
  chrome.storage.sync.get(['projects'], function(result) {
    const project = result.projects.find(p => p.id === projectId);
    if (project) {
      const projectData = JSON.stringify(project, null, 2);
      const blob = new Blob([projectData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

function importProject(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const project = JSON.parse(e.target.result);
      if (project.id && project.title && Array.isArray(project.tasks)) {
        project.id = 'project_' + Date.now(); // Generar nuevo ID para evitar conflictos
        saveProject(project);
        alert('El proyecto ha sido importado correctamente.');
      } else {
        alert('El archivo no tiene el formato correcto de un proyecto.');
      }
    } catch (error) {
      alert('Error al importar el proyecto: ' + error.message);
    }
  };
  reader.readAsText(file);
}
