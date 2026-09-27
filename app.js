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
// CloudStorage Helpers
// ==================================================

function storageGet(key) {

  return new Promise(function (resolve, reject) {

    if (!cloudStorage) {
      reject(new Error("Telegram CloudStorage is unavailable."));
      return;
    }

    cloudStorage.getItem(key, function (error, value) {

      if (error) {
        reject(error);
        return;
      }

      resolve(value || "");

    });

  });

}


function storageSet(key, value) {

  return new Promise(function (resolve, reject) {

    if (!cloudStorage) {
      reject(new Error("Telegram CloudStorage is unavailable."));
      return;
    }

    cloudStorage.setItem(key, value, function (error, success) {

      if (error) {
        reject(error);
        return;
      }

      resolve(success);

    });

  });

}


function storageRemove(key) {

  return new Promise(function (resolve, reject) {

    if (!cloudStorage) {
      reject(new Error("Telegram CloudStorage is unavailable."));
      return;
    }

    cloudStorage.removeItem(key, function (error, success) {

      if (error) {
        reject(error);
        return;
      }

      resolve(success);

    });

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
      await storageGet(NOTES_INDEX_KEY);


    if (!indexValue) {

      notes = [];

      renderNotes();

      return;
    }


    let ids = [];

    try {

      ids = JSON.parse(indexValue);

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
          await storageGet(NOTE_KEY_PREFIX + id);


        if (!value) {
          continue;
        }


        const note = JSON.parse(value);


        if (note && note.id) {

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


    loadedNotes.sort(function (a, b) {

      return (
        (b.updatedAt || 0) -
        (a.updatedAt || 0)
      );

    });


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

  const ids = notes.map(function (note) {
    return note.id;
  });


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
// Delete One Note From Cloud
// ==================================================

async function deleteNoteFromCloud(id) {

  await storageRemove(
    NOTE_KEY_PREFIX + id
  );


  await saveIndex();

}


// ==================================================
// Open New Note
// ==================================================

function openNewNote() {

  currentNoteId = null;

  titleInput.value = "";

  bodyInput.value = "";

  direction = "auto";

  dirBtn.textContent = "Auto";

  bodyInput.dir = "auto";

  deleteBtn.style.display = "none";

  savedLabel.textContent = "New Note";


  app.style.display = "none";

  editor.classList.remove("hidden");

  editor.style.display = "flex";

  editor.style.position = "fixed";
  editor.style.inset = "0";
  editor.style.zIndex = "99999";
  editor.style.background = "var(--tg-theme-bg-color, #ffffff)";


  titleInput.focus();

}


// ==================================================
// Open Existing Note
// ==================================================

function openNote(id) {

  const note = notes.find(function (item) {

    return item.id === id;

  });


  if (!note) {
    return;
  }


  currentNoteId = id;


  titleInput.value =
    note.title || "";


  bodyInput.value =
    note.body || "";


  direction =
    note.direction || "auto";


  if (direction === "rtl") {

    dirBtn.textContent = "RTL";

  } else if (direction === "ltr") {

    dirBtn.textContent = "LTR";

  } else {

    dirBtn.textContent = "Auto";

  }


  bodyInput.dir = direction;


  deleteBtn.style.display = "block";

  savedLabel.textContent = "Saved";


  app.style.display = "none";

  editor.classList.remove("hidden");

  editor.style.display = "flex";

  editor.style.position = "fixed";
  editor.style.inset = "0";
  editor.style.zIndex = "99999";
  editor.style.background = "var(--tg-theme-bg-color, #ffffff)";


  titleInput.focus();

}


// ==================================================
// Close Editor
// ==================================================

function closeEditor() {

  editor.style.display = "none";

  editor.classList.add("hidden");

  app.style.display = "";

}


// ==================================================
// Save Current Note
// ==================================================

async function saveCurrentNote() {

  const title =
    titleInput.value.trim();


  const body =
    bodyInput.value.trim();


  // Empty note
  if (!title && !body) {

    closeEditor();

    return;

  }


  try {

    doneBtn.disabled = true;

    savedLabel.textContent = "Saving...";


    // ----------------------------------------------
    // New Note
    // ----------------------------------------------

    if (currentNoteId === null) {

      const newNote = {

        id:
          Date.now().toString() +
          "_" +
          Math.random()
            .toString(36)
            .slice(2, 8),

        title:
          title || "Untitled",

        body:
          body,

        direction:
          direction,

        createdAt:
          Date.now(),

        updatedAt:
          Date.now()

      };


      notes.unshift(newNote);

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
        notes.find(function (item) {

          return (
            item.id ===
            currentNoteId
          );

        });


      if (note) {

        note.title =
          title || "Untitled";

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


    if (tg?.HapticFeedback) {

      tg.HapticFeedback
        .notificationOccurred(
          "success"
        );

    }


    closeEditor();

  } catch (error) {

    console.error(
      "Save error:",
      error
    );


    savedLabel.textContent =
      "Save failed";


    if (tg?.HapticFeedback) {

      tg.HapticFeedback
        .notificationOccurred(
          "error"
        );

    }


    alert(
      "Could not save the note."
    );

  } finally {

    doneBtn.disabled = false;

  }

}


// ==================================================
// Delete Note
// ==================================================

async function deleteCurrentNote() {

  if (currentNoteId === null) {
    return;
  }


  const confirmed =
    window.confirm(
      "Delete this note?"
    );


  if (!confirmed) {
    return;
  }


  try {

    deleteBtn.disabled = true;

    savedLabel.textContent =
      "Deleting...";


    const id =
      currentNoteId;


    notes =
      notes.filter(function (note) {

        return note.id !== id;

      });


    await deleteNoteFromCloud(id);


    currentNoteId = null;


    renderNotes();


    if (tg?.HapticFeedback) {

      tg.HapticFeedback
        .notificationOccurred(
          "success"
        );

    }


    closeEditor();

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    alert(
      "Could not delete the note."
    );

  } finally {

    deleteBtn.disabled = false;

  }

}


// ==================================================
// Render Notes
// ==================================================

function renderNotes() {

  notesList.innerHTML = "";


  countLabel.textContent =
    notes.length === 1
      ? "1 Note"
      : notes.length + " Notes";


  if (notes.length === 0) {

    notesList.style.display =
      "none";

    emptyState.classList.remove(
      "hidden"
    );

    return;

  }


  notesList.style.display = "";

  emptyState.classList.add(
    "hidden"
  );


  notes.forEach(function (note) {

    const item =
      document.createElement(
        "button"
      );


    item.type = "button";

    item.className =
      "note-item";


    const title =
      document.createElement(
        "div"
      );


    title.className =
      "note-title";


    title.textContent =
      note.title || "Untitled";


    const preview =
      document.createElement(
        "div"
      );


    preview.className =
      "note-preview";


    preview.textContent =
      note.body ||
      "No additional text";


    item.appendChild(title);

    item.appendChild(preview);


    item.onclick =
      function () {

        openNote(note.id);

      };


    notesList.appendChild(item);

  });


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
// Direction
// ==================================================

dirBtn.onclick =
  function () {

    if (direction === "auto") {

      direction = "rtl";

      dirBtn.textContent =
        "RTL";

      bodyInput.dir =
        "rtl";

    }

    else if (direction === "rtl") {

      direction = "ltr";

      dirBtn.textContent =
        "LTR";

      bodyInput.dir =
        "ltr";

    }

    else {

      direction = "auto";

      dirBtn.textContent =
        "Auto";

      bodyInput.dir =
        "auto";

    }

  };


// ==================================================
// Buttons
// ==================================================

newBtn.onclick =
  openNewNote;


emptyNewBtn.onclick =
  openNewNote;


backBtn.onclick =
  closeEditor;


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
