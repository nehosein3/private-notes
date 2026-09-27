const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");

const editor = document.getElementById("editor");
const app = document.querySelector(".app");

const notesList = document.getElementById("notesList");
const emptyState = document.getElementById("emptyState");
const countLabel = document.getElementById("countLabel");
const searchInput = document.getElementById("searchInput");

const backBtn = document.getElementById("backBtn");
const doneBtn = document.getElementById("doneBtn");
const deleteBtn = document.getElementById("deleteBtn");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

const dirBtn = document.getElementById("dirBtn");
const savedLabel = document.getElementById("savedLabel");

const foldersList =
  document.getElementById("foldersList");

const allNotesFolder =
  document.getElementById("allNotesFolder");

const newFolderBtn =
  document.getElementById("newFolderBtn");

const folderSelect =
  document.getElementById("folderSelect");


// ==================================================
// Telegram
// ==================================================

const tg =
  window.Telegram?.WebApp;

if (tg) {

  tg.ready();

  tg.expand();

}


// ==================================================
// CloudStorage
// ==================================================

const cloudStorage =
  tg?.CloudStorage || null;


const NOTES_INDEX_KEY =
  "notes_index";

const NOTE_KEY_PREFIX =
  "note_";

const FOLDERS_KEY =
  "folders";


// ==================================================
// Offline Cache
// ==================================================

const LOCAL_NOTES_KEY =
  "private_notes_cache";

const LOCAL_FOLDERS_KEY =
  "private_folders_cache";


function saveNotesToLocal() {

  try {

    localStorage.setItem(
      LOCAL_NOTES_KEY,
      JSON.stringify(notes)
    );

  } catch (error) {

    console.error(
      "Local notes cache error:",
      error
    );

  }

}


function loadNotesFromLocal() {

  try {

    const value =
      localStorage.getItem(
        LOCAL_NOTES_KEY
      );


    if (!value) {
      return [];
    }


    const cached =
      JSON.parse(value);


    return Array.isArray(cached)
      ? cached
      : [];

  } catch (error) {

    console.error(
      "Local notes cache read error:",
      error
    );

    return [];

  }

}


function saveFoldersToLocal() {

  try {

    localStorage.setItem(
      LOCAL_FOLDERS_KEY,
      JSON.stringify(folders)
    );

  } catch (error) {

    console.error(
      "Local folders cache error:",
      error
    );

  }

}


function loadFoldersFromLocal() {

  try {

    const value =
      localStorage.getItem(
        LOCAL_FOLDERS_KEY
      );


    if (!value) {
      return [];
    }


    const cached =
      JSON.parse(value);


    return Array.isArray(cached)
      ? cached
      : [];

  } catch (error) {

    console.error(
      "Local folders cache read error:",
      error
    );

    return [];

  }

}


// ==================================================
// App State
// ==================================================

let notes = [];

let folders = [];

let currentNoteId = null;

let currentFolderId = null;

let direction = "auto";


// ==================================================
// Autosave State
// ==================================================

let saveTimer = null;

let saveGeneration = 0;

let isSaving = false;

let pendingSave = false;


// ==================================================
// CloudStorage Helpers
// ==================================================

function storageGet(key) {

  return new Promise(
    function (resolve, reject) {

      if (!cloudStorage) {

        reject(
          new Error(
            "Telegram CloudStorage is unavailable."
          )
        );

        return;

      }


      cloudStorage.getItem(
        key,
        function (error, value) {

          if (error) {

            reject(error);

            return;

          }


          resolve(
            value || ""
          );

        }
      );

    }
  );

}


function storageSet(key, value) {

  return new Promise(
    function (resolve, reject) {

      if (!cloudStorage) {

        reject(
          new Error(
            "Telegram CloudStorage is unavailable."
          )
        );

        return;

      }


      cloudStorage.setItem(
        key,
        value,
        function (error, success) {

          if (error) {

            reject(error);

            return;

          }


          resolve(success);

        }
      );

    }
  );

}


function storageRemove(key) {

  return new Promise(
    function (resolve, reject) {

      if (!cloudStorage) {

        reject(
          new Error(
            "Telegram CloudStorage is unavailable."
          )
        );

        return;

      }


      cloudStorage.removeItem(
        key,
        function (error, success) {

          if (error) {

            reject(error);

            return;

          }


          resolve(success);

        }
      );

    }
  );

}


// ==================================================
// Load Notes
// ==================================================

async function loadNotes() {

  const localNotes =
    loadNotesFromLocal();


  // ----------------------------------------------
  // Show local cache immediately if available
  // ----------------------------------------------

  if (
    localNotes.length > 0
  ) {

    sortNotes(
      localNotes
    );

    notes =
      localNotes;

    renderNotes();

  }


  // ----------------------------------------------
  // No Telegram CloudStorage
  // ----------------------------------------------

  if (!cloudStorage) {

    notes =
      localNotes;

    sortNotes(
      notes
    );

    renderNotes();

    return;

  }


  // ----------------------------------------------
  // Try CloudStorage
  // ----------------------------------------------

  try {

    const indexValue =
      await storageGet(
        NOTES_INDEX_KEY
      );


    // CloudStorage successfully responded
    // and says there are no notes.

    if (!indexValue) {

      notes = [];

      saveNotesToLocal();

      renderNotes();

      return;

    }


    let ids = [];

    try {

      ids =
        JSON.parse(
          indexValue
        );

    } catch (error) {

      ids = [];

    }


    if (!Array.isArray(ids)) {

      ids = [];

    }


    const loadedNotes = [];


    for (
      const id of ids
    ) {

      try {

        const value =
          await storageGet(
            NOTE_KEY_PREFIX + id
          );


        if (!value) {
          continue;
        }


        const note =
          JSON.parse(value);


        if (
          note &&
          note.id
        ) {

          loadedNotes.push(
            note
          );

        }

      } catch (error) {

        console.error(
          "Could not load note:",
          id,
          error
        );

      }

    }


    sortNotes(
      loadedNotes
    );


    notes =
      loadedNotes;


    // Cloud version is now cached locally.
    saveNotesToLocal();


    renderNotes();

  } catch (error) {

    // CloudStorage failed.
    // Keep the local cache.

    console.warn(
      "CloudStorage unavailable. Using local notes cache.",
      error
    );


    notes =
      localNotes;


    sortNotes(
      notes
    );


    renderNotes();

  }

}


// ==================================================
// Load Folders
// ==================================================

async function loadFolders() {

  const localFolders =
    loadFoldersFromLocal();


  // ----------------------------------------------
  // Show local folders immediately
  // ----------------------------------------------

  if (
    localFolders.length > 0
  ) {

    folders =
      localFolders;

    renderFolders();

    renderFolderSelect();

  }


  // ----------------------------------------------
  // No Telegram CloudStorage
  // ----------------------------------------------

  if (!cloudStorage) {

    folders =
      localFolders;

    renderFolders();

    renderFolderSelect();

    return;

  }


  // ----------------------------------------------
  // Try CloudStorage
  // ----------------------------------------------

  try {

    const value =
      await storageGet(
        FOLDERS_KEY
      );


    // CloudStorage successfully responded
    // and says there are no folders.

    if (!value) {

      folders = [];

      saveFoldersToLocal();

      renderFolders();

      renderFolderSelect();

      return;

    }


    let loadedFolders = [];


    try {

      loadedFolders =
        JSON.parse(value);

    } catch (error) {

      loadedFolders = [];

    }


    if (
      !Array.isArray(
        loadedFolders
      )
    ) {

      loadedFolders = [];

    }


    folders =
      loadedFolders;


    // Cloud version is now cached locally.
    saveFoldersToLocal();


    renderFolders();

    renderFolderSelect();

  } catch (error) {

    // CloudStorage failed.
    // Keep the local cache.

    console.warn(
      "CloudStorage unavailable. Using local folders cache.",
      error
    );


    folders =
      localFolders;


    renderFolders();

    renderFolderSelect();

  }

}


// ==================================================
// Save Folders
// ==================================================

async function saveFolders() {

  // Always save locally first.
  saveFoldersToLocal();


  // If CloudStorage is unavailable,
  // local copy is still preserved.

  if (!cloudStorage) {

    return;

  }


  // Try cloud save.

  await storageSet(
    FOLDERS_KEY,
    JSON.stringify(folders)
  );

}


// ==================================================
// Sort Notes
// ==================================================

function sortNotes(list) {

  list.sort(
    function (a, b) {

      if (
        Boolean(a.pinned) !==
        Boolean(b.pinned)
      ) {

        return a.pinned
          ? -1
          : 1;

      }


      return (
        (b.updatedAt || 0) -
        (a.updatedAt || 0)
      );

    }
  );

}


// ==================================================
// Save Index
// ==================================================

async function saveIndex() {

  const ids =
    notes.map(
      function (note) {

        return note.id;

      }
    );


  if (!cloudStorage) {

    return;

  }


  await storageSet(
    NOTES_INDEX_KEY,
    JSON.stringify(ids)
  );

}


// ==================================================
// Save One Note
// ==================================================

async function saveNoteToCloud(note) {

  // Always update local state first.

  notes =
    notes.map(
      function (item) {

        return item.id === note.id
          ? note
          : item;

      }
    );


  // Always save local cache first.

  saveNotesToLocal();


  // If CloudStorage is unavailable,
  // keep the local copy and stop here.

  if (!cloudStorage) {

    return;

  }


  // Save to Telegram CloudStorage.

  await storageSet(
    NOTE_KEY_PREFIX + note.id,
    JSON.stringify(note)
  );


  await saveIndex();

}


// ==================================================
// Delete One Note
// ==================================================

async function deleteNoteFromCloud(id) {

  // Remove locally first.

  notes =
    notes.filter(
      function (note) {

        return note.id !== id;

      }
    );


  saveNotesToLocal();


  // If offline, local deletion is enough
  // for the current device.

  if (!cloudStorage) {

    return;

  }


  await storageRemove(
    NOTE_KEY_PREFIX + id
  );


  await saveIndex();

}


// ==================================================
// Create Folder
// ==================================================

async function createFolder() {

  const name =
    window.prompt(
      "Folder name:"
    );


  if (!name) {
    return;
  }


  const cleanName =
    name.trim();


  if (!cleanName) {
    return;
  }


  const duplicate =
    folders.some(
      function (folder) {

        return (
          folder.name
            .toLowerCase() ===
          cleanName.toLowerCase()
        );

      }
    );


  if (duplicate) {

    alert(
      "A folder with this name already exists."
    );

    return;

  }


  const folder = {

    id:
      Date.now().toString() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 7),

    name:
      cleanName

  };


  folders.push(
    folder
  );


  try {

    await saveFolders();

    renderFolders();

    renderFolderSelect();

    selectFolder(
      folder.id
    );

  } catch (error) {

    console.error(
      "Create folder error:",
      error
    );


    folders =
      folders.filter(
        function (item) {

          return (
            item.id !==
            folder.id
          );

        }
      );


    saveFoldersToLocal();


    alert(
      "Could not save the folder to Telegram CloudStorage. The local copy was kept."
    );

  }

}


// ==================================================
// Delete Folder
// ==================================================

async function deleteFolder(id) {

  const folder =
    folders.find(
      function (item) {

        return item.id === id;

      }
    );


  if (!folder) {
    return;
  }


  const confirmed =
    window.confirm(
      'Delete folder "' +
      folder.name +
      '"? Notes will not be deleted.'
    );


  if (!confirmed) {
    return;
  }


  try {

    // Remove folder reference from notes.

    for (
      const note of notes
    ) {

      if (
        note.folderId === id
      ) {

        note.folderId =
          null;

        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }

    }


    folders =
      folders.filter(
        function (item) {

          return item.id !== id;

        }
      );


    await saveFolders();


    if (
      currentFolderId === id
    ) {

      currentFolderId =
        null;

    }


    renderFolders();

    renderFolderSelect();

    renderNotes();

  } catch (error) {

    console.error(
      "Delete folder error:",
      error
    );


    alert(
      "Could not update the folder."
    );

  }

}


// ==================================================
// Render Folders
// ==================================================

function renderFolders() {

  foldersList.innerHTML =
    "";


  foldersList.appendChild(
    allNotesFolder
  );


  allNotesFolder.classList.toggle(
    "active",
    currentFolderId === null
  );


  folders.forEach(
    function (folder) {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "folder-item";


      button.classList.toggle(
        "active",
        currentFolderId === folder.id
      );


      const icon =
        document.createElement(
          "span"
        );


      icon.className =
        "folder-icon";


      icon.textContent =
        "📁";


      const label =
        document.createElement(
          "span"
        );


      label.textContent =
        folder.name;


      button.appendChild(
        icon
      );


      button.appendChild(
        label
      );


      button.onclick =
        function () {

          selectFolder(
            folder.id
          );

        };


      // Long press / right click
      // currently opens folder deletion.

      button.oncontextmenu =
        function (event) {

          event.preventDefault();

          deleteFolder(
            folder.id
          );

        };


      foldersList.appendChild(
        button
      );

    }
  );

}


// ==================================================
// Select Folder
// ==================================================

function selectFolder(id) {

  currentFolderId =
    id;


  renderFolders();

  renderNotes();

}


// ==================================================
// Render Folder Select
// ==================================================

function renderFolderSelect() {

  folderSelect.innerHTML =
    "";


  const noFolderOption =
    document.createElement(
      "option"
    );


  noFolderOption.value =
    "";


  noFolderOption.textContent =
    "No Folder";


  folderSelect.appendChild(
    noFolderOption
  );


  folders.forEach(
    function (folder) {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        folder.id;


      option.textContent =
        folder.name;


      folderSelect.appendChild(
        option
      );

    }
  );


  if (
    currentNoteId !== null
  ) {

    const note =
      notes.find(
        function (item) {

          return (
            item.id ===
            currentNoteId
          );

        }
      );


    if (note) {

      folderSelect.value =
        note.folderId || "";

    }

  }

}


// ==================================================
// Create New Note
// ==================================================

function createNewNote() {

  const now =
    Date.now();


  return {

    id:
      now.toString() +
      "_" +
      Math.random()
        .toString(36)
        .slice(2, 8),

    title:
      titleInput.value.trim() ||
      "Untitled",

    body:
      bodyInput.value.trim(),

    direction:
      direction,

    pinned:
      false,

    folderId:
      folderSelect.value ||
      null,

    createdAt:
      now,

    updatedAt:
      now

  };

}


// ==================================================
// Get Editor Data
// ==================================================

function getEditorData() {

  return {

    title:
      titleInput.value.trim(),

    body:
      bodyInput.value.trim(),

    direction:
      direction,

    folderId:
      folderSelect.value ||
      null

  };

}


// ==================================================
// Autosave Scheduling
// ==================================================

function scheduleAutosave() {

  clearTimeout(
    saveTimer
  );


  saveTimer =
    setTimeout(
      function () {

        autosaveCurrentNote();

      },
      1000
    );

}


// ==================================================
// Autosave
// ==================================================

async function autosaveCurrentNote() {

  clearTimeout(
    saveTimer
  );


  const data =
    getEditorData();


  if (
    currentNoteId === null &&
    !data.title &&
    !data.body
  ) {

    savedLabel.textContent =
      "New Note";


    return;

  }


  saveGeneration++;

  pendingSave =
    true;


  if (isSaving) {
    return;
  }


  isSaving =
    true;


  try {

    while (
      pendingSave
    ) {

      pendingSave =
        false;


      const latestData =
        getEditorData();


      if (
        currentNoteId === null &&
        !latestData.title &&
        !latestData.body
      ) {

        savedLabel.textContent =
          "New Note";


        continue;

      }


      savedLabel.textContent =
        "Saving...";


      if (
        currentNoteId === null
      ) {

        const newNote =
          createNewNote();


        notes.unshift(
          newNote
        );


        currentNoteId =
          newNote.id;


        await saveNoteToCloud(
          newNote
        );

      }

      else {

        const note =
          notes.find(
            function (item) {

              return (
                item.id ===
                currentNoteId
              );

            }
          );


        if (!note) {
          continue;
        }


        const latest =
          getEditorData();


        note.title =
          latest.title ||
          "Untitled";


        note.body =
          latest.body;


        note.direction =
          latest.direction;


        note.folderId =
          latest.folderId;


        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }


      sortNotes(
        notes
      );


      savedLabel.textContent =
        "Saved";


      renderNotes();

    }

  } catch (error) {

    console.error(
      "Autosave error:",
      error
    );


    // Local cache was already saved
    // before CloudStorage was attempted.

    savedLabel.textContent =
      "Saved locally";

  } finally {

    isSaving =
      false;

  }

}


// ==================================================
// Open New Note
// ==================================================

function openNewNote() {

  clearTimeout(
    saveTimer
  );


  currentNoteId =
    null;


  titleInput.value =
    "";


  bodyInput.value =
    "";


  direction =
    "auto";


  dirBtn.textContent =
    "Auto";


  bodyInput.dir =
    "auto";


  deleteBtn.style.display =
    "none";


  savedLabel.textContent =
    "New Note";


  folderSelect.value =
    currentFolderId || "";


  app.style.display =
    "none";


  editor.classList.remove(
    "hidden"
  );


  editor.style.display =
    "flex";


  editor.style.position =
    "fixed";


  editor.style.inset =
    "0";


  editor.style.zIndex =
    "99999";


  editor.style.background =
    "var(--card)";


  titleInput.focus();

}


// ==================================================
// Open Existing Note
// ==================================================

function openNote(id) {

  clearTimeout(
    saveTimer
  );


  const note =
    notes.find(
      function (item) {

        return item.id === id;

      }
    );


  if (!note) {
    return;
  }


  currentNoteId =
    id;


  titleInput.value =
    note.title || "";


  bodyInput.value =
    note.body || "";


  direction =
    note.direction ||
    "auto";


  if (
    direction === "rtl"
  ) {

    dirBtn.textContent =
      "RTL";

  }

  else if (
    direction === "ltr"
  ) {

    dirBtn.textContent =
      "LTR";

  }

  else {

    dirBtn.textContent =
      "Auto";

  }


  bodyInput.dir =
    direction;


  deleteBtn.style.display =
    "block";


  savedLabel.textContent =
    "Saved";


  renderFolderSelect();


  app.style.display =
    "none";


  editor.classList.remove(
    "hidden"
  );


  editor.style.display =
    "flex";


  editor.style.position =
    "fixed";


  editor.style.inset =
    "0";


  editor.style.zIndex =
    "99999";


  editor.style.background =
    "var(--card)";


  titleInput.focus();

}


// ==================================================
// Close Editor
// ==================================================

async function closeEditor() {

  clearTimeout(
    saveTimer
  );


  if (
    currentNoteId !== null ||
    titleInput.value.trim() ||
    bodyInput.value.trim()
  ) {

    await autosaveCurrentNote();

  }


  editor.style.display =
    "none";


  editor.classList.add(
    "hidden"
  );


  app.style.display =
    "";

}


// ==================================================
// Close Without Save
// ==================================================

function closeEditorWithoutSave() {

  clearTimeout(
    saveTimer
  );


  editor.style.display =
    "none";


  editor.classList.add(
    "hidden"
  );


  app.style.display =
    "";

}


// ==================================================
// Save Current Note
// ==================================================

async function saveCurrentNote() {

  clearTimeout(
    saveTimer
  );


  saveGeneration++;

  pendingSave =
    false;


  const title =
    titleInput.value.trim();


  const body =
    bodyInput.value.trim();


  if (
    !title &&
    !body
  ) {

    closeEditorWithoutSave();

    return;

  }


  try {

    doneBtn.disabled =
      true;


    savedLabel.textContent =
      "Saving...";


    if (
      currentNoteId === null
    ) {

      const newNote =
        createNewNote();


      notes.unshift(
        newNote
      );


      currentNoteId =
        newNote.id;


      await saveNoteToCloud(
        newNote
      );

    }

    else {

      const note =
        notes.find(
          function (item) {

            return (
              item.id ===
              currentNoteId
            );

          }
        );


      if (note) {

        note.title =
          title ||
          "Untitled";


        note.body =
          body;


        note.direction =
          direction;


        note.folderId =
          folderSelect.value ||
          null;


        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }

    }


    sortNotes(
      notes
    );


    savedLabel.textContent =
      "Saved";


    renderNotes();


    closeEditorWithoutSave();

  } catch (error) {

    console.error(
      "Save error:",
      error
    );


    // The local cache was already updated.

    savedLabel.textContent =
      "Saved locally";


    renderNotes();

    closeEditorWithoutSave();

  } finally {

    doneBtn.disabled =
      false;

  }

}


// ==================================================
// Folder Change
// ==================================================

folderSelect.addEventListener(
  "change",
  function () {

    scheduleAutosave();

  }
);


// ==================================================
// Toggle Pin
// ==================================================

async function togglePin(id) {

  const note =
    notes.find(
      function (item) {

        return item.id === id;

      }
    );


  if (!note) {
    return;
  }


  const previous =
    Boolean(note.pinned);


  try {

    note.pinned =
      !previous;


    note.updatedAt =
      Date.now();


    await saveNoteToCloud(
      note
    );


    sortNotes(
      notes
    );


    renderNotes();

  } catch (error) {

    console.error(
      "Pin error:",
      error
    );


    // Keep the local change.

    saveNotesToLocal();

    sortNotes(
      notes
    );

    renderNotes();

  }

}


// ==================================================
// Delete Note
// ==================================================

async function deleteCurrentNote() {

  if (
    currentNoteId === null
  ) {

    return;

  }


  clearTimeout(
    saveTimer
  );


  pendingSave =
    false;


  const confirmed =
    window.confirm(
      "Delete this note?"
    );


  if (!confirmed) {
    return;
  }


  try {

    deleteBtn.disabled =
      true;


    savedLabel.textContent =
      "Deleting...";


    const id =
      currentNoteId;


    await deleteNoteFromCloud(
      id
    );


    currentNoteId =
      null;


    renderNotes();


    closeEditorWithoutSave();

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    // Local deletion has already happened.

    currentNoteId =
      null;


    renderNotes();


    closeEditorWithoutSave();

  } finally {

    deleteBtn.disabled =
      false;

  }

}


// ==================================================
// Render Notes
// ==================================================

function renderNotes() {

  notesList.innerHTML =
    "";


  const visibleNotes =
    notes.filter(
      function (note) {

        if (
          currentFolderId === null
        ) {

          return true;

        }


        return (
          note.folderId ===
          currentFolderId
        );

      }
    );


  countLabel.textContent =
    visibleNotes.length === 1
      ? "1 Note"
      : visibleNotes.length +
        " Notes";


  if (
    visibleNotes.length === 0
  ) {

    notesList.style.display =
      "none";


    emptyState.classList.remove(
      "hidden"
    );


    return;

  }


  notesList.style.display =
    "";


  emptyState.classList.add(
    "hidden"
  );


  visibleNotes.forEach(
    function (note) {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "note-item";


      const content =
        document.createElement(
          "button"
        );


      content.type =
        "button";


      content.className =
        "note-content";


      const title =
        document.createElement(
          "div"
        );


      title.className =
        "note-title";


      title.textContent =
        note.title ||
        "Untitled";


      const preview =
        document.createElement(
          "div"
        );


      preview.className =
        "note-preview";


      preview.textContent =
        note.body ||
        "No additional text";


      content.appendChild(
        title
      );


      content.appendChild(
        preview
      );


      content.onclick =
        function () {

          openNote(
            note.id
          );

        };


      const pinButton =
        document.createElement(
          "button"
        );


      pinButton.type =
        "button";


      pinButton.className =
        "pin-button";


      pinButton.textContent =
        note.pinned
          ? "Pinned"
          : "Pin";


      pinButton.onclick =
        function (event) {

          event.stopPropagation();


          togglePin(
            note.id
          );

        };


      item.appendChild(
        content
      );


      item.appendChild(
        pinButton
      );


      notesList.appendChild(
        item
      );

    }
  );


  applySearch();

}


// ==================================================
// Search
// ==================================================

function applySearch() {

  const query =
    searchInput.value
      .trim()
      .toLowerCase();


  const items =
    notesList.querySelectorAll(
      ".note-item"
    );


  items.forEach(
    function (item) {

      const text =
        item.textContent
          .toLowerCase();


      item.style.display =
        text.includes(query)
          ? ""
          : "none";

    }
  );

}


searchInput.addEventListener(
  "input",
  applySearch
);


// ==================================================
// Input Autosave
// ==================================================

titleInput.addEventListener(
  "input",
  function () {

    scheduleAutosave();

  }
);


bodyInput.addEventListener(
  "input",
  function () {

    scheduleAutosave();

  }
);


// ==================================================
// Direction
// ==================================================

dirBtn.onclick =
  function () {

    if (
      direction === "auto"
    ) {

      direction =
        "rtl";


      dirBtn.textContent =
        "RTL";


      bodyInput.dir =
        "rtl";

    }

    else if (
      direction === "rtl"
    ) {

      direction =
        "ltr";


      dirBtn.textContent =
        "LTR";


      bodyInput.dir =
        "ltr";

    }

    else {

      direction =
        "auto";


      dirBtn.textContent =
        "Auto";


      bodyInput.dir =
        "auto";

    }


    scheduleAutosave();

  };


// ==================================================
// Buttons
// ==================================================

newBtn.onclick =
  openNewNote;


emptyNewBtn.onclick =
  openNewNote;


newFolderBtn.onclick =
  createFolder;


allNotesFolder.onclick =
  function () {

    selectFolder(
      null
    );

  };


backBtn.onclick =
  function () {

    closeEditor();

  };


doneBtn.onclick =
  saveCurrentNote;


deleteBtn.onclick =
  deleteCurrentNote;


// ==================================================
// Initial State
// ==================================================

deleteBtn.style.display =
  "none";


// ==================================================
// Start App
// ==================================================

async function startApp() {

  // Load local/cloud folders first.
  await loadFolders();

  renderFolderSelect();

  // Then load local/cloud notes.
  await loadNotes();

  renderFolders();

  renderNotes();

}


startApp();
