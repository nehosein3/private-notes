const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");
const editor = document.getElementById("editor");
const app = document.querySelector(".app");
const backBtn = document.getElementById("backBtn");

function openEditor() {
  app.classList.add("hidden");
  editor.classList.remove("hidden");
}

function closeEditor() {
  editor.classList.add("hidden");
  app.classList.remove("hidden");
}

newBtn.addEventListener("click", openEditor);
emptyNewBtn.addEventListener("click", openEditor);
backBtn.addEventListener("click", closeEditor);
