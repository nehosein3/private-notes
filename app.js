const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");

const editor = document.getElementById("editor");
const app = document.querySelector(".app");

const backBtn = document.getElementById("backBtn");
const doneBtn = document.getElementById("doneBtn");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

const dirBtn = document.getElementById("dirBtn");


// Open editor
function openEditor() {
  app.style.display = "none";
  editor.style.display = "flex";

  titleInput.value = "";
  bodyInput.value = "";

  titleInput.focus();
}


// Close editor
function closeEditor() {
  editor.style.display = "none";
  app.style.display = "";
}


// New Note buttons
newBtn.onclick = openEditor;
emptyNewBtn.onclick = openEditor;


// Back and Done
backBtn.onclick = closeEditor;
doneBtn.onclick = closeEditor;


// Direction
let direction = "auto";

dirBtn.onclick = function () {

  if (direction === "auto") {

    direction = "rtl";
    dirBtn.textContent = "RTL";
    bodyInput.dir = "rtl";

  } else if (direction === "rtl") {

    direction = "ltr";
    dirBtn.textContent = "LTR";
    bodyInput.dir = "ltr";

  } else {

    direction = "auto";
    dirBtn.textContent = "Auto";
    bodyInput.dir = "auto";

  }

};
