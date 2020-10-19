// localStorage key for the tasks list
const STORAGE_LOCATION = "tasks";

// references to HTML elements
const userGuideLink = document.getElementById("userGuideLink");
const userGuideSection = document.getElementById("userGuide");
const overdueTasksSection = document.getElementById("overdueTasks");
const currentTasksSection = document.getElementById("currentTasks");
const laterTasksSection = document.getElementById("laterTasks");
const addTaskButton = document.getElementById("addTask");
const taskNameInput = document.getElementById("taskNameInput");
const doDateInput = document.getElementById("doDateInput");
const dueDateInput = document.getElementById("dueDateInput");
const laterTasksToggle = document.getElementById("laterTasksToggle");

// tasks list
const tasks = [];

// if the user is currently in keyboard navigation mode
let keyboardNavigationMode = false;

// the input element of the task attribute that is being currently edited
let currentlyEditing;

/**
 * Initialize the UI components of the application.
 */
(function initUI() {
    checkEnableDarkMode();

    setDefaultDates();

    bindTaskCreationActions();
    bindUserGuideToggle();
    bindKeyboardShortcuts();

    fetchTasks();
})();

/**
 * Listen for keyboard navigation shortcuts.
 */
function bindKeyboardShortcuts()
{
    document.onkeydown = e => {
        const allTasks = [...document.querySelectorAll(".task")];

        // if there are tasks, select the first task
        if (e.key == "ArrowDown")
        {
            // stop normal keypress behavior
            e.preventDefault();

            // if there are no tasks, the following code is not relevant
            if (allTasks.length == 0) return;

            // select the first task if there are no other tasks selected
            const currentlySelected = document.querySelector(".task.selected");
            if (!currentlySelected)
            {
                selectTask(0);
            }
            else
            {
                selectTask(allTasks.indexOf(currentlySelected) + 1);
            }
        }
        else if (e.key == "ArrowUp")
        {
            // stop normal keypress behavior
            e.preventDefault();

            // if there are no tasks, the following code is not relevant
            if (allTasks.length == 0) return;

            // select the first task if there are no other tasks selected
            const currentlySelected = document.querySelector(".task.selected");
            if (!currentlySelected)
            {
                selectTask(allTasks.length - 1);
            }
            else
            {
                selectTask(allTasks.indexOf(currentlySelected) - 1);
            }
        }
        else if (e.key == "Escape")
        {
            deselectTasks();
        }
        // if trying to delete a task
        else if (e.key == "d")
        {
            if (confirm("are you sure you want to delete this task?"))
            {
                // get all tasks and the currently active task
                const currentlySelected = document.querySelector(".task.selected");

                // remove the task
                tasks.splice(allTasks.indexOf(currentlySelected), 1);

                // commit to memory the latest action
                saveTasks();
 
                // re-render tasks
                renderTasks();
            }
        }
        // if trying to focus editing to new task name input
        else if (e.key == "n")
        {
            e.preventDefault();
            
            deselectTasks();
                
            taskNameInput.focus();
        }
        // if trying to edit a task attribute
        else if (e.key == "1" || e.key == "2" || e.key == "3") {
            e.preventDefault();

            const currentlySelected = document.querySelector(".task.selected");
            const currentTask = tasks[allTasks.indexOf(currentlySelected)];

            let el;

            if (e.key == "1") {
                el = currentlySelected.querySelector(`h3[for="name"]`);
                enableEditingOnClick(el, "text", "name", currentTask);
            }
            else if (e.key == "2") {
                el = currentlySelected.querySelector(`span[for="doDate"]`);
                enableEditingOnClick(el, "date", "doDate", currentTask);
            }
            else if (e.key == "3") {
                el = currentlySelected.querySelector(`span[for="dueDate"]`);
                enableEditingOnClick(el, "date", "dueDate", currentTask);
            }

            el.click();
        }
    }
}

/**
 * Check to see if dark mode should be enabled or disabled on the page.
 */
function checkEnableDarkMode()
{
    // from: https://github.com/nickdeny/darkmode-js/blob/master/darkmode.js
    const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

    // get favicon data
    const faviconEl = document.querySelector("link[rel*='icon']");
    const currentFavicon = faviconEl.href;
    const newFavicon = isDarkMode ? "img/dark-mode-favicon.png" : "img/light-mode-favicon.png";
    
    if (isDarkMode)
    {
        // from: https://dev.to/jamiepo/go-dark-mode-with-css-filter-2p6p
        document.body.style.filter = "invert(100%) hue-rotate(180deg)";
        document.body.style.backgroundColor = "black";
    }
    else
    {
        document.body.style.filter = "";
        document.body.style.backgroundColor = "white";
    }

    // change the favicon only if the mode has switchec
    if (currentFavicon != newFavicon)
    {
        document.head.removeChild(faviconEl);

        const newFaviconEl = document.createElement("link");
        newFaviconEl.rel = "shortcut icon";
        newFaviconEl.href = newFavicon;

        document.head.appendChild(newFaviconEl);
    }
}

/**
 * Bind the onclick action to the user guide link to toggle visibility of help text.
 */
function bindUserGuideToggle() 
{
    userGuideLink.onclick = () => {
        if (userGuideSection.style.display == "none")
        {
            userGuideSection.style.display = "";
        }
        else
        {
            userGuideSection.style.display = "none";
        }
    }
}

/**
 * Add the onclick function to the task creation button UI component.
 */
function bindTaskCreationActions() 
{
    addTaskButton.onclick = createTask;

    // move the due date along with the do date if is is increasing by a small interval (i.e. not being a chosen date from the datepicker)
    let oldDoDate = doDateInput.value;
    doDateInput.onchange = () => {
        // if the date is moved by an interval of one day (i.e. via the arrow keys)
        if (new Date(formatDate(doDateInput.value)).getTime() - new Date(formatDate(oldDoDate)).getTime() == 1000 * 60 * 60 * 24) 
        {
            dueDateInput.value = new Date(new Date(formatDate(dueDateInput.value)).getTime() + 1000 * 60 * 60 * 24).toLocaleDateString("en-CA");
        }

        oldDoDate = doDateInput.value;
    }

    // prevent due date from being set to a date before the do date
    let oldDueDate = dueDateInput.value;
    dueDateInput.onchange = e => {
        if (new Date(formatDate(dueDateInput.value)).getTime() < new Date(formatDate(doDateInput.value)).getTime()) 
        {
            dueDateInput.value = oldDueDate;
        }
        else
        {
            oldDueDate = dueDateInput.value;
        }
    }

    // exit any element that may be currently edited when trying to create a new task
    taskNameInput.onclick = () => exitOtherEditing(null);
    doDateInput.onclick = () => exitOtherEditing(null);
    dueDateInput.onclick = () => exitOtherEditing(null);

    // allow the user to press enter in the task name field to create a new task to speed up task creation
    taskNameInput.onkeydown = e => {
        e.stopPropagation();
        
        if (e.key == "Enter")
        {
            createTask();
        }
    }

    // allow the user to press enter in the task do date field to create a new task to speed up task creation
    doDateInput.onkeydown = e => {
        if (e.key == "Enter")
        {
            createTask();
        }
    }

    // allow the user to press enter in the task due date field to create a new task to speed up task creation
    dueDateInput.onkeydown = e => {
        if (e.key == "Enter")
        {
            createTask();
        }
    }
}

/**
 * Create a new task, save it to storage, and display it on screen.
 */
function createTask()
{
    // get task data to create
    const name    = taskNameInput.value;
    const doDate  = formatDate(doDateInput.value);
    const dueDate = formatDate(dueDateInput.value);

    // do not allow blank named tasks
    if (name == "") return;

    // create task object
    const newTask = {
        name: name,
        doDate: doDate,
        dueDate: dueDate
    };

    // add to tasks list
    tasks.push(newTask);

    // re-render tasks
    renderTasks();

    // save tasks to localStorage
    saveTasks();

    // reset name input
    taskNameInput.value = "";

    // reset date inputs
    setDefaultDates();
}

/**
 * Create an HTML representation of the task data and add to the end of 
 * the tasks section.
 * @param {Object} task 
 */
function appendTask(task)
{
    const taskDiv = document.createElement("div");
    taskDiv.className = "task";

    taskDiv.onclick = () => {
        // get all tasks
        const allTasks = [...document.querySelectorAll(".task")];

        selectTask(allTasks.indexOf(taskDiv));
    }
    
    const nameHeaderEl = document.createElement("h3");
    nameHeaderEl.setAttribute("for", "name");
    enableEditingOnClick(nameHeaderEl, "text", "name", task);
    
    const doDateEl = document.createElement("p");
    doDateEl.innerHTML = `<b>do date: </b>`;

    const doDateSpan = document.createElement("span");
    doDateSpan.setAttribute("for", "doDate");
    enableEditingOnClick(doDateSpan, "date", "doDate", task);
    
    doDateEl.appendChild(doDateSpan);

    const dueDateEl = document.createElement("p");
    dueDateEl.innerHTML = `<b>due date: </b>`;

    const dueDateSpan = document.createElement("span");
    dueDateSpan.setAttribute("for", "dueDate");
    enableEditingOnClick(dueDateSpan, "date", "dueDate", task);

    dueDateEl.appendChild(dueDateSpan);

    // create a button that deletes the task when done
    const doneButton = document.createElement("button");
    doneButton.innerText = "i finished!";
    doneButton.onclick = () => {
        // remove the task
        tasks.splice(tasks.indexOf(task), 1);

        // commit to memory the latest action
        saveTasks();

        // re-render tasks
        renderTasks();
    }
    
    // add information components to task div
    taskDiv.appendChild(nameHeaderEl);
    taskDiv.appendChild(doDateEl);
    taskDiv.appendChild(dueDateEl);
    taskDiv.appendChild(doneButton);
    
    // if a task's due date is before today, it is overdue
    const today = formatDate(new Date().toLocaleDateString("en-CA"));
    if (new Date(task.doDate).getTime() < new Date(today).getTime())
    {
        document.getElementById("overdue").style.display = "";
        overdueTasksSection.appendChild(taskDiv);
    }
    // if the task's do date is today, put it in the currentTasksSection
    else if (task.doDate == today)
    {
        currentTasksSection.appendChild(taskDiv);
    }
    // if task's do date is not today, then put it in the laterTasksSection
    else 
    {
        laterTasksSection.appendChild(taskDiv);
    }
}

/**
 * Add the selected class to a task that allows for it to be interacted with other keyboard shortcuts.
 * @param {Number} index 
 */
function selectTask(index)
{
    // get all tasks
    const allTasks = [...document.querySelectorAll(".task")];

    // if task index is valid, select the task div
    if (index >= 0 && index < allTasks.length)
    {
        // deselect previous task
        deselectTasks();

        // select the next task
        allTasks[index].classList.add("selected");
    }
}

/**
 * Deselect any previously selected task.
 */
function deselectTasks()
{
    // de-select the currently selected task
    const currentlySelected = document.querySelector(".task.selected");
    if (currentlySelected)
    {
        currentlySelected.classList.remove("selected");
    }
}

/**
 * When you click the element, it will replace it with an input element that allows you to
 * manually edit the value.
 * @param {HTMLElement} el 
 * @param {String} inputType
 * @param {String} key 
 * @param {*} initialValue 
 * @param {Object} task 
 */
function enableEditingOnClick(el, inputType, key, task)
{
    // set the initial text of the element
    el.innerText = task[key];

    el.onclick = e => {
        // clicks are also captured at the task div level, but we don't want input clicks to register as task clicks
        e.stopPropagation();

        // clear the nameHeader to make room for the input element to edit the name
        el.innerHTML = "";

        // create input element that auto-populates with an initial value to edit
        const inputEl = document.createElement("input");
        inputEl.type = inputType;

        // format value for date input, set as raw data else
        if (inputType == "date")
        {
            inputEl.value = new Date(task[key]).toLocaleDateString("en-CA") ;
        }
        else
        {
            inputEl.value = task[key];
        }

        // prevent user from editing multiple elements at the same time
        exitOtherEditing(inputEl);
        
        // stop propagation in order to prevent nameHeader clicks to be captured when the input element is on the page
        inputEl.onclick = e => e.stopPropagation();
        inputEl.onkeydown = e => {
            // stop keys from being captured at the global level
            e.stopPropagation();

            // when the user presses enter, save the new name
            if (e.key == "Enter") {
                if (inputType == "date")
                {
                    // update the element on screen
                    el.innerText = formatDate(inputEl.value);

                    // update the task attribute in memory
                    task[key] = formatDate(inputEl.value);
                }
                else 
                {
                    // update the element on screen
                    el.innerText = inputEl.value;

                    // update the task attribute in memory
                    task[key] = inputEl.value;
                }
               
                // save the changes to the task that we just made
                saveTasks();

                // re-render the tasks to be updated
                renderTasks();

                // clear out currently editing since we manually reverted input element
                currentlyEditing = null;
            }
            else if (e.key == "Escape") {
                // revert the element back to its initial value
                el.innerText = task[key];

                // clear out currently editing since we manually reverted input element
                currentlyEditing = null;
            }
        }

        // add the input element to the parent and focus on the input to start
        el.appendChild(inputEl);
        inputEl.focus();
    }
}

/**
 * If we are currently editing another input, revert back to text.
 * @param {HTMLElement} inputEl 
 */
function exitOtherEditing(inputEl)
{
    // if we are currently editing another element, revert it back to text
    if (currentlyEditing)
    {
        if (currentlyEditing.type == "date")
        {
            currentlyEditing.parentNode.innerText = formatDate(currentlyEditing.value);
        }
        else
        {
            currentlyEditing.parentNode.innerText = currentlyEditing.value;
        }
    }
 
    currentlyEditing = inputEl;
}

/**
 * Add tasks to the screen into their appropriate section.
 */
function renderTasks()
{
    // clear out previous task HTML
    overdueTasksSection.innerHTML = "";
    currentTasksSection.innerHTML = "";
    laterTasksSection.innerHTML = "";

    // everything is being re-rendered so this input won't exist anymore
    currentlyEditing = null;

    // sort tasks in by date then alphabetically and add to the screen
    tasks
        .sort((a, b) => {
            const aDate = new Date(a.doDate).getTime();
            const bDate = new Date(b.doDate).getTime();
            
            if (aDate == bDate) 
            {
                return a.name.localeCompare(b.name);
            }
            else
            {
                return aDate - bDate;
            }
        })
        .forEach(task => appendTask(task));

    // check if there are no tasks for today
    checkIfAllTasksDone();
}

/**
 * Check if there are any tasks that are to do today, if not, show the done message.
 */
function checkIfAllTasksDone()
{
    const today = formatDate(new Date().toLocaleDateString("en-CA"));
    
    // hide the overdue section if no tasks are overdue
    if (tasks.filter(x => new Date(x.doDate).getTime() < new Date(today).getTime()).length == 0
        && tasks.filter(x => new Date(x.dueDate).getTime() < new Date(today).getTime()).length == 0)
    {
        document.getElementById("overdue").style.display = "none";
    }

    // if there are no tasks to do today
    if (tasks.filter(x => x.doDate == today).length == 0) 
    {
        currentTasksSection.innerHTML += `
            <div class="message" id="doneAllCurrentTasks">
                <h4 style="margin-top: 0; margin-bottom: 0">you have no more tasks for today :)</h4>
            </div>
        `;
    }
    else
    {
        const allTasksDoneEl = document.getElementById("doneAllCurrentTasks");

        if (allTasksDoneEl)
        {
            currentTasksSection.removeChild(allTasksDoneEl);
        }
    }

    // if there are no tasks to do later
    if (tasks.filter(x => new Date(x.doDate).getTime() > new Date().getTime()).length == 0) 
    {
        laterTasksSection.innerHTML += `
            <div class="message" id="doneAllLaterTasks">
                <h4 style="margin-top: 0; margin-bottom: 0">you have no more tasks for the foreseeable future :)</h4>
            </div>
        `;
    }
    else
    {
        const allTasksDoneEl = document.getElementById("doneAllLaterTasks");

        if (allTasksDoneEl)
        {
            laterTasksSection.removeChild(allTasksDoneEl);
        }
    }
}

/**
 * Set the default dates for do and due date inputs.
 */
function setDefaultDates() 
{
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 1000 * 60 * 60 * 24);

    doDateInput.value = today.toLocaleDateString("en-CA");
    dueDateInput.value = tomorrow.toLocaleDateString("en-CA");
}

/**
 * Save the tasks list to localStorage.
 */
function saveTasks()
{
    localStorage.setItem(STORAGE_LOCATION, JSON.stringify(tasks));
}

/**
 * Get saved tasks from localStorage and renders them.
 */
function fetchTasks()
{
    // if the user has tasks saved
    if (localStorage.getItem(STORAGE_LOCATION))
    {
        // retrieve tasks from localStorage and add to tasks list
        tasks.push(...JSON.parse(localStorage.getItem(STORAGE_LOCATION)));
    }

    // render tasks that have just been pulled from storage
    renderTasks();
}

/**
 * Take the date format from the date input and transform it into MM/DD/YYYY as a more stable serializable 
 * date format, as well as being the preferred format of Americans.
 * @param {String} dateString 
 * @return {String} formattedDateString
 */
function formatDate(dateString)
{
    const components = dateString.split("-");

    // take year from beginning and put at end
    components.push(components.shift());

    return components.join("/");
}