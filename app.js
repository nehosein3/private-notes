const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");
const editor = document.getElementById("editor");
const app = document.querySelector(".app");
const backBtn = document.getElementById("backBtn");

function openEditor() {
  app.style.display = "none";
  editor.style.display = "flex";
}

function closeEditor() {
  editor.style.display = "none";
  app.style.display = "block";
}

newBtn.addEventListener("click", openEditor);
emptyNewBtn.addEventListener("click", openEditor);
backBtn.addEventListener("click", closeEditor);
