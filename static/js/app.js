var ProseMirror = require("prosemirror/dist/edit").ProseMirror
require("prosemirror/dist/menu/menubar") // Load menubar module

var subjectEditor = new ProseMirror({
  place: document.getElementById("subject"),
});

var bodyEditor = new ProseMirror({
  place: document.getElementById("body"),
});
