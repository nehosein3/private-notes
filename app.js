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


// ==================================================
// Telegram
// ==================================================

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


// ==================================================
// CloudStorage
// ==================================================

const cloudStorage = tg?.CloudStorage || null;

const NOTES_INDEX_KEY = "notes_index";
const NOTE_KEY_PREFIX = "note_";


// ==================================================
// App State
// ==================================================

let notes = [];

let currentNoteId = null;

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

  return new Promise(function (resolve, reject) {

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

        resolve(value || "");

      }
    );

  });

}


function storageSet(key, value) {

  return new Promise(function (resolve, reject) {

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

  });

}


function storageRemove(key) {

  return new Promise(function (resolve, reject) {

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

  });

}


// ==================================================
// Load Notes
// ==================================================

async function loadNotes() {

  try {

    if (!cloudStorage) {

      notes = [];

      renderNotes();

      return;

    }


    const indexValue =
      await storageGet(
        NOTES_INDEX_KEY
      );


    if (!indexValue) {

      notes = [];

      renderNotes();

      return;

    }


    let ids = [];

    try {

      ids = JSON.parse(
        indexValue
      );

    } catch (error) {

      ids = [];

    }


    if (!Array.isArray(ids)) {

      ids = [];

    }


    if (ids.length === 0) {

      notes = [];

      renderNotes();

      return;

    }


    const loadedNotes = [];


    for (const id of ids) {

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

          loadedNotes.push(note);

        }

      } catch (error) {

        console.error(
          "Could not load note:",
          id,
          error
        );

      }

    }


    loadedNotes.sort(
      function (a, b) {

        return (
          (b.updatedAt || 0) -
          (a.updatedAt || 0)
        );

      }
    );


    notes = loadedNotes;

    renderNotes();

  } catch (error) {

    console.error(
      "CloudStorage load error:",
      error
    );

    notes = [];

    renderNotes();

  }

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


  await storageSet(
    NOTES_INDEX_KEY,
    JSON.stringify(ids)
  );

}


// ==================================================
// Save One Note
// ==================================================

async function saveNoteToCloud(note) {

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

  await storageRemove(
    NOTE_KEY_PREFIX + id
  );


  await saveIndex();

}


// ==================================================
// Create New Note Object
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

    createdAt:
      now,

    updatedAt:
      now

  };

}


// ==================================================
// Get Current Editor Data
// ==================================================

function getEditorData() {

  return {

    title:
      titleInput.value.trim(),

    body:
      bodyInput.value.trim(),

    direction:
      direction

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
// Autosave Current Note
// ==================================================

async function autosaveCurrentNote() {

  clearTimeout(
    saveTimer
  );


  const data =
    getEditorData();


  // Do not create an empty note.
  if (
    currentNoteId === null &&
    !data.title &&
    !data.body
  ) {

    savedLabel.textContent =
      "New Note";

    return;

  }


  const myGeneration =
    ++saveGeneration;


  pendingSave = true;


  if (isSaving) {
    return;
  }


  isSaving = true;


  try {

    while (pendingSave) {

      pendingSave = false;


      const currentGeneration =
        saveGeneration;


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


      // ----------------------------------------------
      // New Note
      // ----------------------------------------------

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


      // ----------------------------------------------
      // Existing Note
      // ----------------------------------------------

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


        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }


      // If the user typed again while saving,
      // another save will run with the newest data.
      if (
        currentGeneration !==
        saveGeneration
      ) {

        pendingSave = true;

        continue;

      }


      savedLabel.textContent =
        "Saved";


      renderNotes();

    }

  } catch (error) {

    console.error(
      "Autosave error:",
      error
    );


    savedLabel.textContent =
      "Save failed";

  } finally {

    isSaving = false;

  }

}


// ==================================================
// Open New Note
// ==================================================

function openNewNote() {

  clearTimeout(
    saveTimer
  );


  currentNoteId = null;

  titleInput.value = "";

  bodyInput.value = "";

  direction = "auto";

  dirBtn.textContent =
    "Auto";

  bodyInput.dir =
    "auto";

  deleteBtn.style.display =
    "none";

  savedLabel.textContent =
    "New Note";


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
    "var(--tg-theme-bg-color, #ffffff)";


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
    "var(--tg-theme-bg-color, #ffffff)";


  titleInput.focus();

}


// ==================================================
// Close Editor
// ==================================================

async function closeEditor() {

  clearTimeout(
    saveTimer
  );


  // Save any unsaved changes before leaving.
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
// Save Current Note Immediately
// ==================================================

async function saveCurrentNote() {

  clearTimeout(
    saveTimer
  );


  saveGeneration++;


  const title =
    titleInput.value.trim();


  const body =
    bodyInput.value.trim();


  // Empty note
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


    // ----------------------------------------------
    // New Note
    // ----------------------------------------------

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


    // ----------------------------------------------
    // Existing Note
    // ----------------------------------------------

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


        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }

    }


    savedLabel.textContent =
      "Saved";


    renderNotes();


    if (
      tg?.HapticFeedback
    ) {

      tg.HapticFeedback
        .notificationOccurred(
          "success"
        );

    }


    closeEditorWithoutSave();

  } catch (error) {

    console.error(
      "Save error:",
      error
    );


    savedLabel.textContent =
      "Save failed";


    if (
      tg?.HapticFeedback
    ) {

      tg.HapticFeedback
        .notificationOccurred(
          "error"
        );

    }


    alert(
      "Could not save the note."
    );

  } finally {

    doneBtn.disabled =
      false;

  }

}


// ==================================================
// Close Without Additional Save
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


  saveGeneration++;

  pendingSave = false;


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


    notes =
      notes.filter(
        function (note) {

          return note.id !== id;

        }
      );


    await deleteNoteFromCloud(
      id
    );


    currentNoteId =
      null;


    renderNotes();


    if (
      tg?.HapticFeedback
    ) {

      tg.HapticFeedback
        .notificationOccurred(
          "success"
        );

    }


    closeEditorWithoutSave();

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    alert(
      "Could not delete the note."
    );

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


  countLabel.textContent =
    notes.length === 1
      ? "1 Note"
      : notes.length + " Notes";


  if (
    notes.length === 0
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


  notes.forEach(
    function (note) {

      const item =
        document.createElement(
          "button"
        );


      item.type =
        "button";


      item.className =
        "note-item";


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


      item.appendChild(
        title
      );


      item.appendChild(
        preview
      );


      item.onclick =
        function () {

          openNote(
            note.id
          );

        };


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
// Autosave Input Events
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

loadNotes();
