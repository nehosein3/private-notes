const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");

const editor = document.getElementById("editor");
const app = document.querySelector(".app");

const backBtn = document.getElementById("backBtn");
const doneBtn = document.getElementById("doneBtn");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

const dirBtn = document.getElementById("dirBtn");


// =========================
// Open Editor
// =========================

function openEditor() {

  app.style.display = "none";

  editor.classList.remove("hidden");

  editor.style.display = "flex";

  editor.style.position = "fixed";
  editor.style.inset = "0";
  editor.style.zIndex = "99999";
  editor.style.background = "white";

  titleInput.value = "";
  bodyInput.value = "";

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
// New Note
// =========================

newBtn.onclick = openEditor;

emptyNewBtn.onclick = openEditor;


// =========================
// Back
// =========================

backBtn.onclick = closeEditor;


// =========================
// Done
// =========================

doneBtn.onclick = closeEditor;


// =========================
// Text Direction
// =========================

let direction = "auto";

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
