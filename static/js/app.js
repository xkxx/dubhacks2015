var ProseMirror = require("prosemirror/dist/edit").ProseMirror

var subjectEditor = new ProseMirror({
  place: document.getElementById("subject"),
});

var bodyEditor = new ProseMirror({
  place: document.getElementById("body"),
});
