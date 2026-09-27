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


    sortNotes(
      loadedNotes
    );


    notes =
      loadedNotes;


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
// Sort Notes
// ==================================================

function sortNotes(list) {

  list.sort(
    function (a, b) {

      // Pinned notes first
      if (
        Boolean(a.pinned) !==
        Boolean(b.pinned)
      ) {

        return a.pinned
          ? -1
          : 1;

      }


      // Then newest first
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

  pendingSave = true;


  if (isSaving) {
    return;
  }


  isSaving = true;


  try {

    while (pendingSave) {

      pendingSave = false;


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


        note.updatedAt =
          Date.now();


        await saveNoteToCloud(
          note
        );

      }


      savedLabel.textContent =
        "Saved";


      sortNotes(
        notes
      );


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
// Save Current Note Immediately
// ==================================================

async function saveCurrentNote() {

  clearTimeout(
    saveTimer
  );


  saveGeneration++;

  pendingSave = false;


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


  try {

    note.pinned =
      !Boolean(note.pinned);


    note.updatedAt =
      Date.now();


    await saveNoteToCloud(
      note
    );


    sortNotes(
      notes
    );


    renderNotes();


    if (
      tg?.HapticFeedback
    ) {

      tg.HapticFeedback
        .impactOccurred(
          "light"
        );

    }

  } catch (error) {

    console.error(
      "Pin error:",
      error
    );


    // Revert if saving failed
    note.pinned =
      !Boolean(note.pinned);


    alert(
      "Could not update the note."
    );

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


      pinButton.setAttribute(
        "aria-label",
        note.pinned
          ? "Unpin note"
          : "Pin note"
      );


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
