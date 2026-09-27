const newBtn = document.getElementById("newBtn");
const emptyNewBtn = document.getElementById("emptyNewBtn");

const editor = document.getElementById("editor");
const app = document.querySelector(".app");

const backBtn = document.getElementById("backBtn");
const doneBtn = document.getElementById("doneBtn");

const titleInput = document.getElementById("titleInput");
const bodyInput = document.getElementById("bodyInput");

const dirBtn = document.getElementById("dirBtn");


function openEditor() {
  app.style.display = "none";
  editor.style.display = "flex";

  titleInput.value = "";
  bodyInput.value = "";

  titleInput.focus();
}


function closeEditor() {
  editor.style.display = "none";
  app.style.display = "";
}


newBtn.addEventListener("click", openEditor);

emptyNewBtn.addEventListener("click", openEditor);

backBtn.addEventListener("click", closeEditor);

doneBtn.addEventListener("click", closeEditor);


let direction = "auto";


dirBtn.addEventListener("click", function () {

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

});
