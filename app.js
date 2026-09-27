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


// =========================
// Notes
// =========================

let notes = [];

let currentNoteId = null;

let direction = "auto";


// =========================
// Telegram
// =========================

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}


// =========================
// Open New Note
// =========================

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
  editor.style.background = "white";

  titleInput.focus();
}


// =========================
// Open Existing Note
// =========================

function openNote(id) {

  const note = notes.find(function (item) {
    return item.id === id;
  });

  if (!note) {
    return;
  }

  currentNoteId = id;

  titleInput.value = note.title;
  bodyInput.value = note.body;

  direction = note.direction || "auto";

  dirBtn.textContent =
    direction === "rtl"
      ? "RTL"
      : direction === "ltr"
        ? "LTR"
        : "Auto";

  bodyInput.dir = direction;

  deleteBtn.style.display = "block";

  savedLabel.textContent = "Saved";

  app.style.display = "none";

  editor.classList.remove("hidden");

  editor.style.display = "flex";

  editor.style.position = "fixed";
  editor.style.inset = "0";
  editor.style.zIndex = "99999";
  editor.style.background = "white";

  titleInput.focus();
}


// =========================
// Close Editor
// =========================

function closeEditor() {

  editor.style.display = "none";

  editor.classList.add("hidden");

  app.style.display = "";
}


// =========================
// Save Note
// =========================

function saveNote() {

  const title = titleInput.value.trim();

  const body = bodyInput.value.trim();

  if (!title && !body) {

    closeEditor();

    return;
  }


  if (currentNoteId === null) {

    const newNote = {

      id: Date.now().toString(),

      title: title || "Untitled",

      body: body,

      direction: direction,

      createdAt: Date.now(),

      updatedAt: Date.now()

    };

    notes.unshift(newNote);

    currentNoteId = newNote.id;

  }

  else {

    const note = notes.find(function (item) {
      return item.id === currentNoteId;
    });

    if (note) {

      note.title = title || "Untitled";

      note.body = body;

      note.direction = direction;

      note.updatedAt = Date.now();

    }

  }


  renderNotes();

  savedLabel.textContent = "Saved";

  closeEditor();
}


// =========================
// Delete Note
// =========================

function deleteNote() {

  if (currentNoteId === null) {
    return;
  }

  notes = notes.filter(function (note) {
    return note.id !== currentNoteId;
  });

  currentNoteId = null;

  renderNotes();

  closeEditor();
}


// =========================
// Render Notes
// =========================

function renderNotes() {

  notesList.innerHTML = "";

  countLabel.textContent =
    notes.length === 1
      ? "1 Note"
      : notes.length + " Notes";


  if (notes.length === 0) {

    notesList.style.display = "none";

    emptyState.classList.remove("hidden");

    return;
  }


  notesList.style.display = "";

  emptyState.classList.add("hidden");


  notes.forEach(function (note) {

    const item = document.createElement("button");

    item.type = "button";

    item.className = "note-item";


    const title = document.createElement("div");

    title.className = "note-title";

    title.textContent = note.title;


    const preview = document.createElement("div");

    preview.className = "note-preview";

    preview.textContent =
      note.body || "No additional text";


    item.appendChild(title);

    item.appendChild(preview);


    item.onclick = function () {
      openNote(note.id);
    };


    notesList.appendChild(item);

  });
}


// =========================
// Search
// =========================

searchInput.addEventListener("input", function () {

  const query =
    searchInput.value.trim().toLowerCase();


  const items =
    notesList.querySelectorAll(".note-item");


  items.forEach(function (item) {

    const text =
      item.textContent.toLowerCase();

    item.style.display =
      text.includes(query)
        ? ""
        : "none";

  });

});


// =========================
// Direction
// =========================

dirBtn.onclick = function () {

  if (direction === "auto") {

    direction = "rtl";

    dirBtn.textContent = "RTL";

    bodyInput.dir = "rtl";

  }

  else if (direction === "rtl") {

    direction = "ltr";

    dirBtn.textContent = "LTR";

    bodyInput.dir = "ltr";

  }

  else {

    direction = "auto";

    dirBtn.textContent = "Auto";

    bodyInput.dir = "auto";

  }

};


// =========================
// Buttons
// =========================

newBtn.onclick = openNewNote;

emptyNewBtn.onclick = openNewNote;

backBtn.onclick = closeEditor;

doneBtn.onclick = saveNote;

deleteBtn.onclick = deleteNote;


// =========================
// Initial Render
// =========================

deleteBtn.style.display = "none";

renderNotes();
