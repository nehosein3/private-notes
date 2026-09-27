const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.ready();
  tg.expand();
}

const STORAGE_KEY = "private_notes_v1";
const CLOUD_KEY = "notes_data_v1";

let notes = [];
let currentNoteId = null;
let currentDirection = "auto";
let searchQuery = "";

const $ = (id) => document.getElementById(id);

const notesList = $("notesList");
const emptyState = $("emptyState");
const notesView = $("notesView");
const editorView = $("editorView");

const titleInput = $("titleInput");
const bodyInput = $("bodyInput");
const searchInput = $("searchInput");
const countLabel = $("countLabel");
const directionButton = $("directionButton");
const savedLabel = $("savedLabel");

function hasCloudStorage() {
  return !!(
    tg &&
    tg.CloudStorage &&
    typeof tg.CloudStorage.getItem === "function"
  );
}

function cloudGet(key) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error("Telegram CloudStorage is not available."));
      return;
    }

    tg.CloudStorage.getItem(key, (error, value) => {
      if (error) {
        reject(error);
      } else {
        resolve(value || "");
      }
    });
  });
}

function cloudSet(key, value) {
  return new Promise((resolve, reject) => {
    if (!hasCloudStorage()) {
      reject(new Error("Telegram CloudStorage is not available."));
      return;
    }

    tg.CloudStorage.setItem(key, value, (error, success) => {
      if (error) {
        reject(error);
      } else {
        resolve(success);
      }
    });
  });
}

function loadLocalNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveLocalNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore local storage errors.
  }
}

async function loadNotes() {
  setSavedStatus("Loading...");

  // When opened inside Telegram, use Telegram CloudStorage.
  if (hasCloudStorage()) {
    try {
      const cloudData = await cloudGet(CLOUD_KEY);

      if (cloudData) {
        const parsed = JSON.parse(cloudData);

        if (Array.isArray(parsed)) {
          notes = parsed;
        } else {
          notes = [];
        }
      } else {
        // First Telegram launch:
        // migrate any notes that were previously stored in localStorage.
        const localNotes = loadLocalNotes();

        if (localNotes.length > 0) {
          notes = localNotes;
          await saveNotes();
        } else {
          notes = [];
        }
      }

      setSavedStatus("Saved");
      renderNotes();
      return;
    } catch (error) {
      console.error("CloudStorage load failed:", error);

      // Keep the app usable if Telegram storage temporarily fails.
      notes = loadLocalNotes();
      setSavedStatus("Offline");
      renderNotes();
      return;
    }
  }

  // Browser/GitHub Pages fallback.
  notes = loadLocalNotes();
  setSavedStatus("Local");
  renderNotes();
}

async function saveNotes() {
  saveLocalNotes();

  if (hasCloudStorage()) {
    try {
      const serialized = JSON.stringify(notes);

      // Telegram CloudStorage values have a 4096-character limit.
      if (serialized.length > 4096) {
        setSavedStatus("Too large");
        alert(
          "This note collection is too large for Telegram CloudStorage. " +
          "Please keep individual notes or the total collection smaller."
        );
        return false;
      }

      await cloudSet(CLOUD_KEY, serialized);
      setSavedStatus("Saved");
      return true;
    } catch (error) {
      console.error("CloudStorage save failed:", error);
      setSavedStatus("Offline");
      return false;
    }
  }

  setSavedStatus("Local");
  return true;
}

function setSavedStatus(text) {
  if (savedLabel) {
    savedLabel.textContent = text;
  }
}

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

function getFilteredNotes() {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return notes;
  }

  return notes.filter((note) => {
    const title = String(note.title || "").toLowerCase();
    const body = String(note.body || "").toLowerCase();

    return title.includes(query) || body.includes(query);
  });
}

function getPreview(note) {
  const body = String(note.body || "")
    .replace(/\s+/g, " ")
    .trim();

  if (body) {
    return body.slice(0, 120);
  }

  return "No additional text";
}

function formatDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function renderNotes() {
  if (!notesList) return;

  const filtered = getFilteredNotes();

  notesList.innerHTML = "";

  if (countLabel) {
    countLabel.textContent =
      notes.length === 1 ? "1 Note" : `${notes.length} Notes`;
  }

  if (emptyState) {
    emptyState.style.display = filtered.length === 0 ? "block" : "none";
  }

  filtered
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((note) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "note-card";

      const title = document.createElement("div");
      title.className = "note-title";
      title.textContent = note.title || "Untitled Note";

      const preview = document.createElement("div");
      preview.className = "note-preview";
      preview.textContent = getPreview(note);

      const date = document.createElement("div");
      date.className = "note-date";
      date.textContent = formatDate(note.updatedAt || note.createdAt);

      card.appendChild(title);
      card.appendChild(preview);
      card.appendChild(date);

      card.addEventListener("click", () => openEditor(note.id));

      notesList.appendChild(card);
    });
}

function openEditor(noteId = null) {
  currentNoteId = noteId;

  const note = notes.find((item) => item.id === noteId);

  if (note) {
    titleInput.value = note.title || "";
    bodyInput.value = note.body || "";
    currentDirection = note.direction || "auto";
  } else {
    titleInput.value = "";
    bodyInput.value = "";
    currentDirection = "auto";
  }

  updateDirection();

  notesView.style.display = "none";
  editorView.style.display = "flex";

  if (tg?.BackButton) {
    tg.BackButton.show();
  }

  setTimeout(() => {
    if (note) {
      bodyInput.focus();
    } else {
      titleInput.focus();
    }
  }, 100);
}

function closeEditor() {
  currentNoteId = null;

  notesView.style.display = "";
  editorView.style.display = "none";

  if (tg?.BackButton) {
    tg.BackButton.hide();
  }

  renderNotes();
}

async function saveCurrentNote() {
  const title = titleInput.value.trim();
  const body = bodyInput.value;

  // Don't create completely empty notes.
  if (!title && !body.trim()) {
    closeEditor();
    return;
  }

  const now = Date.now();

  if (currentNoteId) {
    const index = notes.findIndex(
      (note) => note.id === currentNoteId
    );

    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        title,
        body,
        direction: currentDirection,
        updatedAt: now
      };
    }
  } else {
    notes.push({
      id: generateId(),
      title,
      body,
      direction: currentDirection,
      createdAt: now,
      updatedAt: now
    });
  }

  await saveNotes();
  closeEditor();
}

async function deleteCurrentNote() {
  if (!currentNoteId) {
    closeEditor();
    return;
  }

  const confirmed = confirm("Delete this note?");

  if (!confirmed) {
    return;
  }

  notes = notes.filter(
    (note) => note.id !== currentNoteId
  );

  await saveNotes();
  closeEditor();
}

function updateDirection() {
  if (!bodyInput) return;

  bodyInput.dir =
    currentDirection === "rtl"
      ? "rtl"
      : currentDirection === "ltr"
      ? "ltr"
      : "auto";

  if (directionButton) {
    const labels = {
      auto: "Auto",
      rtl: "RTL",
      ltr: "LTR"
    };

    directionButton.textContent =
      labels[currentDirection] || "Auto";
  }
}

function cycleDirection() {
  if (currentDirection === "auto") {
    currentDirection = "rtl";
  } else if (currentDirection === "rtl") {
    currentDirection = "ltr";
  } else {
    currentDirection = "auto";
  }

  updateDirection();
}

function setupEvents() {
  const newButton =
    $("newNoteButton") ||
    $("newNoteBtn") ||
    $("newNote");

  const doneButton =
    $("doneButton") ||
    $("doneBtn");

  const backButton =
    $("backButton") ||
    $("backBtn");

  const deleteButton =
    $("deleteButton") ||
    $("deleteBtn") ||
    $("deleteNoteButton");

  if (newButton) {
    newButton.addEventListener("click", () => {
      openEditor();
    });
  }

  if (doneButton) {
    doneButton.addEventListener("click", saveCurrentNote);
  }

  if (backButton) {
    backButton.addEventListener("click", closeEditor);
  }

  if (deleteButton) {
    deleteButton.addEventListener("click", deleteCurrentNote);
  }

  if (directionButton) {
    directionButton.addEventListener("click", cycleDirection);
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value;
      renderNotes();
    });
  }

  if (tg?.BackButton) {
    tg.BackButton.onClick(closeEditor);
  }
}

function applyTelegramTheme() {
  if (!tg) return;

  if (typeof tg.setHeaderColor === "function") {
    tg.setHeaderColor("bg_color");
  }

  if (typeof tg.setBackgroundColor === "function") {
    tg.setBackgroundColor("bg_color");
  }
}

async function initialize() {
  applyTelegramTheme();
  setupEvents();

  if (editorView) {
    editorView.style.display = "none";
  }

  await loadNotes();
}

initialize();
