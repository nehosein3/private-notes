```javascript
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
const editor = $("editor");

const newBtn = $("newBtn");
const emptyNewBtn = $("emptyNewBtn");
const backBtn = $("backBtn");
const doneBtn = $("doneBtn");
const dirBtn = $("dirBtn");
const deleteBtn = $("deleteBtn");

const titleInput = $("titleInput");
const bodyInput = $("bodyInput");
const searchInput = $("searchInput");
const countLabel = $("countLabel");
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
    tg.CloudStorage.getItem(key, (error, value) => {
      if (error) reject(error);
      else resolve(value || "");
    });
  });
}

function cloudSet(key, value) {
  return new Promise((resolve, reject) => {
    tg.CloudStorage.setItem(key, value, (error, success) => {
      if (error) reject(error);
      else resolve(success);
    });
  });
}

function loadLocalNotes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {}
}

async function loadNotes() {
  setSavedStatus("Loading...");

  if (hasCloudStorage()) {
    try {
      const data = await cloudGet(CLOUD_KEY);

      if (data) {
        const parsed = JSON.parse(data);
        notes = Array.isArray(parsed) ? parsed : [];
      } else {
        notes = loadLocalNotes();

        if (notes.length > 0) {
          await saveNotes();
        }
      }

      setSavedStatus("Saved");
      renderNotes();
      return;
    } catch (error) {
      console.error("CloudStorage load error:", error);

      notes = loadLocalNotes();
      setSavedStatus("Offline");
      renderNotes();
      return;
    }
  }

  notes = loadLocalNotes();
  setSavedStatus("Local");
  renderNotes();
}

async function saveNotes() {
  saveLocalNotes();

  if (!hasCloudStorage()) {
    setSavedStatus("Local");
    return true;
  }

  try {
    const serialized = JSON.stringify(notes);

    if (serialized.length > 4096) {
      setSavedStatus("Too large");

      alert(
        "The notes are too large for Telegram CloudStorage."
      );

      return false;
    }

    await cloudSet(CLOUD_KEY, serialized);

    setSavedStatus("Saved");
    return true;
  } catch (error) {
    console.error("CloudStorage save error:", error);

    setSavedStatus("Offline");
    return false;
  }
}

function setSavedStatus(text) {
  if (savedLabel) {
    savedLabel.textContent = text;
  }
}

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 8)
  );
}

function getFilteredNotes() {
  const query = searchQuery.trim().toLowerCase();

  if (!query) {
    return [...notes];
  }

  return notes.filter((note) => {
    const title = String(note.title || "").toLowerCase();
    const body = String(note.body || "").toLowerCase();

    return title.includes(query) || body.includes(query);
  });
}

function getPreview(note) {
  const text = String(note.body || "")
    .replace(/\s+/g, " ")
    .trim();

  return text ? text.substring(0, 120) : "No additional text";
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function renderNotes() {
  notesList.innerHTML = "";

  const filtered = getFilteredNotes().sort(
    (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
  );

  countLabel.textContent =
    notes.length === 1
      ? "1 Note"
      : `${notes.length} Notes`;

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }

  filtered.forEach((note) => {
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
    date.textContent = formatDate(
      note.updatedAt || note.createdAt
    );

    card.appendChild(title);
    card.appendChild(preview);
    card.appendChild(date);

    card.addEventListener("click", () => {
      openEditor(note.id);
    });

    notesList.appendChild(card);
  });
}

function openEditor(noteId = null) {
  currentNoteId = noteId;

  const note = notes.find(
    (item) => item.id === noteId
  );

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

  document.querySelector(".app").style.display = "none";
  editor.classList.remove("hidden");

  if (tg?.BackButton) {
    tg.BackButton.show();
  }

  if (note) {
    bodyInput.focus();
  } else {
    titleInput.focus();
  }
}

function closeEditor() {
  currentNoteId = null;

  editor.classList.add("hidden");
  document.querySelector(".app").style.display = "";

  if (tg?.BackButton) {
    tg.BackButton.hide();
  }

  renderNotes();
}

async function saveCurrentNote() {
  const title = titleInput.value.trim();
  const body = bodyInput.value;

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

  if (!confirm("Delete this note?")) {
    return;
  }

  notes = notes.filter(
    (note) => note.id !== currentNoteId
  );

  await saveNotes();
  closeEditor();
}

function updateDirection() {
  if (currentDirection === "rtl") {
    bodyInput.dir = "rtl";
    dirBtn.textContent = "RTL";
  } else if (currentDirection === "ltr") {
    bodyInput.dir = "ltr";
    dirBtn.textContent = "LTR";
  } else {
    bodyInput.dir = "auto";
    dirBtn.textContent = "Auto";
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

newBtn.addEventListener("click", () => {
  openEditor();
});

emptyNewBtn.addEventListener("click", () => {
  openEditor();
});

backBtn.addEventListener("click", () => {
  closeEditor();
});

doneBtn.addEventListener("click", () => {
  saveCurrentNote();
});

dirBtn.addEventListener("click", () => {
  cycleDirection();
});

deleteBtn.addEventListener("click", () => {
  deleteCurrentNote();
});

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  renderNotes();
});

if (tg?.BackButton) {
  tg.BackButton.onClick(() => {
    closeEditor();
  });
}

if (tg) {
  if (typeof tg.setHeaderColor === "function") {
    tg.setHeaderColor("bg_color");
  }

  if (typeof tg.setBackgroundColor === "function") {
    tg.setBackgroundColor("bg_color");
  }
}

loadNotes();
```
