(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var PM = require("prosemirror/dist/edit");
var ProseMirror = PM.ProseMirror;
var Keymap = PM.Keymap;
var defaultKeymap = PM.defaultKeymap;
var Pos = require("prosemirror/dist/model").Pos;

var specialTokens = new Map([["/NE/", "Insert Name"], ["/blank/", "..."], [". . .", "..."], ["/time/", new Date().toDateString()], ["/name/", "Person Name"]]);

var overrideKeymap = function overrideKeymap(handler) {
  return new Keymap({
    "Tab": function Tab() {
      handler(true);
    },
    "Shift-Tab": function ShiftTab() {
      handler(false);
    }
  }, {
    fallthrough: defaultKeymap
  });
};

var getLastSent = function getLastSent(str) {
  // TODO: deal with vs.
  var stop = str.lastIndexOf(".");
  return str.slice(stop + 1);
};

// props: onChange(curSent, pos), onChoose()
var ProseMirrorView = React.createClass({
  displayName: "ProseMirrorView",

  render: function render() {
    var className = this.props.className;
    return React.createElement("div", { ref: "mirrorNode", className: className });
  },
  componentDidMount: function componentDidMount() {
    var domNode = this.refs.mirrorNode;
    var mirror = new ProseMirror({
      place: domNode
    });
    var doc = mirror.doc;
    var cb = this.props.onChange;

    if (cb) {
      var self = this;
      mirror.on('textInput', function (input) {
        console.info("text input fired", input);
        var range = mirror.selection;
        if (!range.empty) {
          console.error("inputing while selection is not empty!");
        }
        var cursor = range.head;
        // hack: use selection to read last line
        var front = Pos.start(doc, cursor); // hack!! FIXME: optimize
        var cursor_ = new Pos(cursor.path, cursor.offset - 1);
        var pos = mirror.coordsAtPos(cursor_);
        mirror.setSelection(front, cursor);
        var selected = mirror.selectedDoc;
        var text = selected.type.serializeText(selected).slice(0, -2);
        console.info(text + "===");
        var lastSent = getLastSent(text);
        mirror.setSelection(range); // restore selection
        var insertBack = function insertBack(content) {
          console.info("===" + lastSent.slice(-1) + "===");
          if (lastSent.slice(-1) !== " ") {
            content = " " + content;
          }
          var highlight = null;
          specialTokens.forEach(function (placeholder, token) {
            var index = content.indexOf(token);
            if (index !== -1) {
              content = content.replace(token, placeholder);
              highlight = [index, index + placeholder.length];
            }
          });
          mirror.apply(mirror.tr.insertText(cursor, content));
          if (highlight) {
            mirror.setSelection(new Pos(cursor.path, cursor.offset + highlight[0]), new Pos(cursor.path, cursor.offset + highlight[1]));
          }
          mirror.focus();
        };
        cb(lastSent, pos, insertBack);
      });
    }
    this.mirror = mirror;
  },
  shouldComponentUpdate: function shouldComponentUpdate() {
    return false;
  }
});

// props: show, items, pos, onSelect
var AutoCompletePopup = React.createClass({
  displayName: "AutoCompletePopup",

  getInitialState: function getInitialState() {
    return {
      selectedIndex: 0
    };
  },
  render: function render() {
    var show = this.props.show;
    var pos = this.props.pos;
    var onSelect = this.props.onSelect;
    var selected = this.state.selectedIndex;

    var itemsList = this.props.items.map(function (item, index) {
      var onClick = function onClick() {
        onSelect(item);
      };
      var classes = index === selected ? 'selected' : '';
      return React.createElement(
        "li",
        { key: item + pos.toString(),
          className: classes, onClick: onClick },
        item
      );
    });

    return React.createElement(
      "div",
      { className: "popup", style: {
          visibility: show ? "visible" : "hidden",
          left: pos.left + 10,
          top: pos.top + 15
        } },
      React.createElement(
        "ul",
        null,
        itemsList
      )
    );
  }
});

var MainView = React.createClass({
  displayName: "MainView",

  getInitialState: function getInitialState() {
    return {
      showPopup: false,
      pos: {
        left: 0, top: 0
      },
      items: [],
      insertToCurEditor: function insertToCurEditor(x) {}
    };
  },
  render: function render() {
    var self = this;
    var state = this.state;
    return React.createElement(
      "div",
      { id: "main" },
      React.createElement(
        "div",
        { id: "inputarea" },
        React.createElement(
          "span",
          null,
          "Subject: "
        ),
        React.createElement(ProseMirrorView, { onChange: self.onChange, className: "subject" }),
        React.createElement(
          "p",
          null,
          "Body: "
        ),
        React.createElement(ProseMirrorView, { onChange: self.onChange, className: "body" })
      ),
      React.createElement(AutoCompletePopup, { show: state.show, pos: state.pos, items: state.items,
        onSelect: self.onSelect })
    );
  },
  onSelect: function onSelect(item) {
    console.info("onSelect", item);
    this.state.insertToCurEditor(item); // FIXME
    var newState = this.getInitialState();
    newState.show = false;
    this.setState(newState);
  },
  onChange: function onChange(text, pos, insertBack) {
    var self = this;
    console.info("onChange", text, pos);
    fetch("/api/autocomplete?hint=" + encodeURIComponent(text)).then(function (res) {
      return res.json();
    }).then(function (json) {
      if (json.length === 0) {
        return;
      }
      self.setState({
        show: true,
        pos: pos,
        items: json,
        insertToCurEditor: insertBack
      });
    })["catch"](function (err) {
      console.error("FETCH", err);
    });
  }
});

ReactDOM.render(React.createElement(MainView, null), document.body);

},{"prosemirror/dist/edit":12,"prosemirror/dist/model":22}],2:[function(require,module,exports){
var inserted = {};

module.exports = function (css, options) {
    if (inserted[css]) return;
    inserted[css] = true;
    
    var elem = document.createElement('style');
    elem.setAttribute('type', 'text/css');

    if ('textContent' in elem) {
      elem.textContent = css;
    } else {
      elem.styleSheet.cssText = css;
    }
    
    var head = document.getElementsByTagName('head')[0];
    if (options && options.prepend) {
        head.insertBefore(elem, head.childNodes[0]);
    } else {
        head.appendChild(elem);
    }
};

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.elt = elt;
exports.requestAnimationFrame = requestAnimationFrame;
exports.rmClass = rmClass;
exports.addClass = addClass;
exports.contains = contains;

function elt(tag, attrs) {
  var result = document.createElement(tag);
  if (attrs) for (var _name in attrs) {
    if (_name == "style") result.style.cssText = attrs[_name];else if (attrs[_name] != null) result.setAttribute(_name, attrs[_name]);
  }

  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  for (var i = 0; i < args.length; i++) {
    add(args[i], result);
  }return result;
}

function add(value, target) {
  if (typeof value == "string") value = document.createTextNode(value);
  if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      add(value[i], target);
    }
  } else {
    target.appendChild(value);
  }
}

var reqFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function requestAnimationFrame(f) {
  if (reqFrame) reqFrame(f);else setTimeout(f, 10);
}

var ie_upto10 = /MSIE \d/.test(navigator.userAgent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);

var browser = {
  mac: /Mac/.test(navigator.platform),
  ie_upto10: ie_upto10,
  ie_11up: ie_11up,
  ie: ie_upto10 || ie_11up,
  gecko: /gecko\/\d/i.test(navigator.userAgent)
};

exports.browser = browser;
function classTest(cls) {
  return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*");
}

function rmClass(node, cls) {
  var current = node.className;
  var match = classTest(cls).exec(current);
  if (match) {
    var after = current.slice(match.index + match[0].length);
    node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
  }
}

function addClass(node, cls) {
  var current = node.className;
  if (!classTest(cls).test(current)) node.className += (current ? " " : "") + cls;
}

function contains(parent, child) {
  // Android browser and IE will return false if child is a text node.
  if (child.nodeType != 1) child = child.parentNode;
  return child && parent.contains(child);
}
},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isWordChar = isWordChar;
exports.charCategory = charCategory;
var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;

function isWordChar(ch) {
  return (/\w/.test(ch) || ch > "\x80" && (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
  );
}

function charCategory(ch) {
  return (/\s/.test(ch) ? "space" : isWordChar(ch) ? "word" : "other"
  );
}
},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.registerCommand = registerCommand;
exports.execCommand = execCommand;

var _model = require("../model");

var _transform = require("../transform");

var _char = require("./char");

var commands = Object.create(null);

function registerCommand(name, func) {
  commands[name] = func;
}

function execCommand(pm, name) {
  if (pm.signalHandleable("command_" + name) !== false) return true;
  var base = commands[name];
  return !!(base && base(pm) !== false);
}

function clearSel(pm) {
  var sel = pm.selection,
      tr = pm.tr;
  if (!sel.empty) tr["delete"](sel.from, sel.to);
  return tr;
}

commands.insertHardBreak = function (pm) {
  pm.scrollIntoView();
  var tr = clearSel(pm),
      pos = pm.selection.from;
  if (pm.doc.path(pos.path).type == pm.schema.nodes.code_block) tr.insertText(pos, "\n");else tr.insert(pos, pm.schema.node("hard_break"));
  pm.apply(tr);
};

commands.setStrong = function (pm) {
  return pm.setStyle(pm.schema.style("strong"), true);
};
commands.unsetStrong = function (pm) {
  return pm.setStyle(pm.schema.style("strong"), false);
};
commands.toggleStrong = function (pm) {
  return pm.setStyle(pm.schema.style("strong"), null);
};

commands.setEm = function (pm) {
  return pm.setStyle(pm.schema.style("em"), true);
};
commands.unsetEm = function (pm) {
  return pm.setStyle(pm.schema.style("em"), false);
};
commands.toggleEm = function (pm) {
  return pm.setStyle(pm.schema.style("em"), null);
};

commands.setCode = function (pm) {
  return pm.setStyle(pm.schema.style("code"), true);
};
commands.unsetCode = function (pm) {
  return pm.setStyle(pm.schema.style("code"), false);
};
commands.toggleCode = function (pm) {
  return pm.setStyle(pm.schema.style("code"), null);
};

function blockBefore(pos) {
  for (var i = pos.path.length - 1; i >= 0; i--) {
    var offset = pos.path[i] - 1;
    if (offset >= 0) return new _model.Pos(pos.path.slice(0, i), offset);
  }
}

function delBlockBackward(pm, tr, pos) {
  if (pos.depth == 1) {
    // Top level block, join with block above
    var iBefore = _model.Pos.before(pm.doc, new _model.Pos([], pos.path[0]));
    var bBefore = blockBefore(pos);
    if (iBefore && bBefore) {
      if (iBefore.cmp(bBefore) > 0) bBefore = null;else iBefore = null;
    }
    if (iBefore) {
      tr["delete"](iBefore, pos);
      var joinable = (0, _transform.joinPoint)(tr.doc, tr.map(pos).pos, 1);
      if (joinable) tr.join(joinable);
    } else if (bBefore) {
      tr["delete"](bBefore, bBefore.shift(1));
    }
  } else {
    var last = pos.depth - 1;
    var _parent = pm.doc.path(pos.path.slice(0, last));
    var offset = pos.path[last];
    // Top of list item below other list item
    // Join with the one above
    if (_parent.type == pm.schema.nodes.list_item && offset == 0 && pos.path[last - 1] > 0) {
      tr.join((0, _transform.joinPoint)(pm.doc, pos));
      // Any other nested block, lift up
    } else {
        tr.lift(pos, pos);
      }
  }
}

function moveBackward(parent, offset, by) {
  if (by == "char") return offset - 1;
  if (by == "word") {
    var _spanAtOrBefore = (0, _model.spanAtOrBefore)(parent, offset);

    var nodeOffset = _spanAtOrBefore.offset;
    var innerOffset = _spanAtOrBefore.innerOffset;

    var cat = null,
        counted = 0;
    for (; nodeOffset >= 0; nodeOffset--, innerOffset = null) {
      var child = parent.child(nodeOffset),
          size = child.offset;
      if (!child.isText) return cat ? offset : offset - 1;

      for (var i = innerOffset == null ? size : innerOffset; i > 0; i--) {
        var nextCharCat = (0, _char.charCategory)(child.text.charAt(i - 1));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return offset;
        offset--;
        counted++;
      }
    }
    return offset;
  }
  throw new Error("Unknown motion unit: " + by);
}

function delBackward(pm, by) {
  pm.scrollIntoView();

  var tr = pm.tr,
      sel = pm.selection,
      from = sel.from;
  if (!sel.empty) tr["delete"](from, sel.to);else if (from.offset == 0) delBlockBackward(pm, tr, from);else tr["delete"](new _model.Pos(from.path, moveBackward(pm.doc.path(from.path), from.offset, by)), from);
  pm.apply(tr);
}

commands.delBackward = function (pm) {
  return delBackward(pm, "char");
};

commands.delWordBackward = function (pm) {
  return delBackward(pm, "word");
};

function blockAfter(doc, pos) {
  var path = pos.path;
  while (path.length > 0) {
    var end = path.length - 1;
    var offset = path[end] + 1;
    path = path.slice(0, end);
    var node = doc.path(path);
    if (offset < node.length) return new _model.Pos(path, offset);
  }
}

function delBlockForward(pm, tr, pos) {
  var lst = pos.depth - 1;
  var iAfter = _model.Pos.after(pm.doc, new _model.Pos(pos.path.slice(0, lst), pos.path[lst] + 1));
  var bAfter = blockAfter(pm.doc, pos);
  if (iAfter && bAfter) {
    if (iAfter.cmp(bAfter.shift(1)) < 0) bAfter = null;else iAfter = null;
  }

  if (iAfter) {
    tr["delete"](pos, iAfter);
  } else if (bAfter) {
    tr["delete"](bAfter, bAfter.shift(1));
  }
}

function moveForward(parent, offset, by) {
  if (by == "char") return offset + 1;
  if (by == "word") {
    var _spanAtOrBefore2 = (0, _model.spanAtOrBefore)(parent, offset);

    var nodeOffset = _spanAtOrBefore2.offset;
    var innerOffset = _spanAtOrBefore2.innerOffset;

    var cat = null,
        counted = 0;
    for (; nodeOffset < parent.length; nodeOffset++, innerOffset = 0) {
      var child = parent.child(nodeOffset),
          size = child.offset;
      if (!child.isText) return cat ? offset : offset + 1;

      for (var i = innerOffset; i < size; i++) {
        var nextCharCat = (0, _char.charCategory)(child.text.charAt(i));
        if (cat == null || counted == 1 && cat == "space") cat = nextCharCat;else if (cat != nextCharCat) return offset;
        offset++;
        counted++;
      }
    }
    return offset;
  }
  throw new Error("Unknown motion unit: " + by);
}

function delForward(pm, by) {
  pm.scrollIntoView();
  var tr = pm.tr,
      sel = pm.selection,
      from = sel.from;
  if (!sel.empty) {
    tr["delete"](from, sel.to);
  } else {
    var _parent2 = pm.doc.path(from.path);
    if (from.offset == _parent2.maxOffset) delBlockForward(pm, tr, from);else tr["delete"](from, new _model.Pos(from.path, moveForward(_parent2, from.offset, by)));
  }
  pm.apply(tr);
}

commands.delForward = function (pm) {
  return delForward(pm, "char");
};

commands.delWordForward = function (pm) {
  return delForward(pm, "word");
};

function scrollAnd(pm, value) {
  pm.scrollIntoView();
  return value;
}

commands.undo = function (pm) {
  return scrollAnd(pm, pm.history.undo());
};
commands.redo = function (pm) {
  return scrollAnd(pm, pm.history.redo());
};

commands.join = function (pm) {
  var point = (0, _transform.joinPoint)(pm.doc, pm.selection.head);
  if (!point) return false;
  return pm.apply(pm.tr.join(point));
};

commands.lift = function (pm) {
  var sel = pm.selection;
  var result = pm.apply(pm.tr.lift(sel.from, sel.to));
  if (result !== false) pm.scrollIntoView();
  return result;
};

function wrap(pm, type) {
  var sel = pm.selection;
  pm.scrollIntoView();
  return pm.apply(pm.tr.wrap(sel.from, sel.to, pm.schema.node(type)));
}

commands.wrapBulletList = function (pm) {
  return wrap(pm, "bullet_list");
};
commands.wrapOrderedList = function (pm) {
  return wrap(pm, "ordered_list");
};
commands.wrapBlockquote = function (pm) {
  return wrap(pm, "blockquote");
};

commands.endBlock = function (pm) {
  pm.scrollIntoView();
  var pos = pm.selection.from;
  var tr = clearSel(pm);
  var block = pm.doc.path(pos.path);
  if (pos.depth > 1 && block.length == 0 && tr.lift(pos).steps.length) {
    // Lift
  } else if (block.type == pm.schema.nodes.code_block && pos.offset < block.maxOffset) {
      tr.insertText(pos, "\n");
    } else {
      var end = pos.depth - 1;
      var isList = end > 0 && pos.path[end] == 0 && pm.doc.path(pos.path.slice(0, end)).type == pm.schema.nodes.list_item;
      var type = pos.offset == block.maxOffset ? pm.schema.node("paragraph") : null;
      tr.split(pos, isList ? 2 : 1, type);
    }
  return pm.apply(tr);
};

function setType(pm, type, attrs) {
  var sel = pm.selection;
  pm.scrollIntoView();
  return pm.apply(pm.tr.setBlockType(sel.from, sel.to, pm.schema.node(type, attrs)));
}

commands.makeH1 = function (pm) {
  return setType(pm, "heading", { level: 1 });
};
commands.makeH2 = function (pm) {
  return setType(pm, "heading", { level: 2 });
};
commands.makeH3 = function (pm) {
  return setType(pm, "heading", { level: 3 });
};
commands.makeH4 = function (pm) {
  return setType(pm, "heading", { level: 4 });
};
commands.makeH5 = function (pm) {
  return setType(pm, "heading", { level: 5 });
};
commands.makeH6 = function (pm) {
  return setType(pm, "heading", { level: 6 });
};

commands.makeParagraph = function (pm) {
  return setType(pm, "paragraph");
};
commands.makeCodeBlock = function (pm) {
  return setType(pm, "code_block");
};

function insertOpaqueBlock(pm, type, attrs) {
  type = pm.schema.nodeType(type);
  pm.scrollIntoView();
  var pos = pm.selection.from;
  var tr = clearSel(pm);
  var parent = tr.doc.path(pos.shorten().path);
  if (!parent.type.canContain(type)) return false;
  var off = 0;
  if (pos.offset) {
    tr.split(pos);
    off = 1;
  }
  return pm.apply(tr.insert(pos.shorten(null, off), pm.schema.node(type, attrs)));
}

commands.insertRule = function (pm) {
  return insertOpaqueBlock(pm, "horizontal_rule");
};
},{"../model":22,"../transform":36,"./char":4}],6:[function(require,module,exports){
"use strict";

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _insertCss = require("insert-css");

var _insertCss2 = _interopRequireDefault(_insertCss);

(0, _insertCss2["default"])("\n\n.ProseMirror {\n  border: 1px solid silver;\n  position: relative;\n}\n\n.ProseMirror-content {\n  padding: 4px 8px 4px 14px;\n  white-space: pre-wrap;\n  line-height: 1.2;\n}\n\n.ProseMirror-content ul.tight p, .ProseMirror-content ol.tight p {\n  margin: 0;\n}\n\n.ProseMirror-content ul, .ProseMirror-content ol {\n  padding-left: 2em;\n}\n\n.ProseMirror-content blockquote {\n  padding-left: 1em;\n  border-left: 3px solid #eee;\n  margin-left: 0; margin-right: 0;\n}\n\n.ProseMirror-content pre {\n  white-space: pre-wrap;\n}\n\n.ProseMirror-content p:first-child,\n.ProseMirror-content h1:first-child,\n.ProseMirror-content h2:first-child,\n.ProseMirror-content h3:first-child,\n.ProseMirror-content h4:first-child,\n.ProseMirror-content h5:first-child,\n.ProseMirror-content h6:first-child {\n  margin-top: .3em;\n}\n\n");
},{"insert-css":2}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ref;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _keys = require("./keys");

var _dom = require("../dom");

var mod = _dom.browser.mac ? "Cmd-" : "Ctrl-";

var defaultKeymap = new _keys.Keymap((_ref = {
  "Enter": "endBlock"
}, _defineProperty(_ref, mod + "Enter", "insertHardBreak"), _defineProperty(_ref, "Shift-Enter", "insertHardBreak"), _defineProperty(_ref, "Backspace", "delBackward"), _defineProperty(_ref, "Delete", "delForward"), _defineProperty(_ref, mod + "B", "toggleStrong"), _defineProperty(_ref, mod + "I", "toggleEm"), _defineProperty(_ref, mod + "`", "toggleCode"), _defineProperty(_ref, mod + "Backspace", "delWordBackward"), _defineProperty(_ref, mod + "Delete", "delWordForward"), _defineProperty(_ref, mod + "Z", "undo"), _defineProperty(_ref, mod + "Y", "redo"), _defineProperty(_ref, "Shift-" + mod + "Z", "redo"), _defineProperty(_ref, "Alt-Up", "join"), _defineProperty(_ref, "Alt-Left", "lift"), _defineProperty(_ref, "Alt-Right '*'", "wrapBulletList"), _defineProperty(_ref, "Alt-Right '1'", "wrapOrderedList"), _defineProperty(_ref, "Alt-Right '>'", "wrapBlockquote"), _defineProperty(_ref, mod + "H '1'", "makeH1"), _defineProperty(_ref, mod + "H '2'", "makeH2"), _defineProperty(_ref, mod + "H '3'", "makeH3"), _defineProperty(_ref, mod + "H '4'", "makeH4"), _defineProperty(_ref, mod + "H '5'", "makeH5"), _defineProperty(_ref, mod + "H '6'", "makeH6"), _defineProperty(_ref, mod + "P", "makeParagraph"), _defineProperty(_ref, mod + "\\", "makeCodeBlock"), _defineProperty(_ref, mod + "Space", "insertRule"), _ref));

exports.defaultKeymap = defaultKeymap;
function add(key, val) {
  defaultKeymap.addBinding(key, val);
}

if (_dom.browser.mac) {
  add("Ctrl-D", "delForward");
  add("Ctrl-H", "delBackward");
  add("Ctrl-Alt-Backspace", "delWordForward");
  add("Alt-D", "delWordForward");
  add("Alt-Delete", "delWordForward");
  add("Alt-Backspace", "delWordBackward");
}
},{"../dom":3,"./keys":14}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.applyDOMChange = applyDOMChange;
exports.textContext = textContext;
exports.textInContext = textInContext;

var _model = require("../model");

var _parseDom = require("../parse/dom");

var _transformTree = require("../transform/tree");

var _selection = require("./selection");

function isAtEnd(node, pos, depth) {
  for (var i = depth || 0; i < pos.path.length; i++) {
    var n = pos.path[depth];
    if (n < node.length - 1) return false;
    node = node.child(n);
  }
  return pos.offset == node.maxOffset;
}
function isAtStart(pos, depth) {
  if (pos.offset > 0) return false;
  for (var i = depth || 0; i < pos.path.length; i++) {
    if (pos.path[depth] > 0) return false;
  }return true;
}

function parseNearSelection(pm) {
  var dom = pm.content,
      node = pm.doc;
  var from = pm.selection.from,
      to = pm.selection.to;
  for (var depth = 0;; depth++) {
    var toNode = node.child(to.path[depth]);
    var fromStart = isAtStart(from, depth + 1);
    var toEnd = isAtEnd(toNode, to, depth + 1);
    if (fromStart || toEnd || from.path[depth] != to.path[depth] || toNode.isTextblock) {
      var startOffset = depth == from.depth ? from.offset : from.path[depth];
      if (fromStart && startOffset > 0) startOffset--;
      var endOffset = depth == to.depth ? to.offset : to.path[depth] + 1;
      if (toEnd && endOffset < node.length - 1) endOffset++;
      var parsed = (0, _parseDom.fromDOM)(pm.schema, dom, { topNode: node.copy(),
        from: startOffset,
        to: dom.childNodes.length - (node.length - endOffset) });
      parsed = parsed.copy(node.slice(0, startOffset).concat(parsed.children).concat(node.slice(endOffset)));
      for (var i = depth - 1; i >= 0; i--) {
        var wrap = pm.doc.path(from.path.slice(0, i));
        parsed = wrap.splice(from.path[i], from.path[i] + 1, [parsed]);
      }
      return parsed;
    }
    node = toNode;
    dom = (0, _selection.findByPath)(dom, from.path[depth], false);
  }
}

function applyDOMChange(pm) {
  var updated = parseNearSelection(pm);
  var changeStart = (0, _model.findDiffStart)(pm.doc, updated);
  if (changeStart) {
    var changeEnd = findDiffEndConstrained(pm.doc, updated, changeStart);
    pm.apply(pm.tr.replace(changeStart.a, changeEnd.a, updated, changeStart.b, changeEnd.b));
    pm.operation.fullRedraw = true;
    return true;
  } else {
    return false;
  }
}

function offsetBy(first, second, pos) {
  var same = (0, _transformTree.samePathDepth)(first, second);
  var firstEnd = same == first.depth,
      secondEnd = same == second.depth;
  var off = (secondEnd ? second.offset : second.path[same]) - (firstEnd ? first.offset : first.path[same]);
  var shorter = firstEnd ? pos.shift(off) : pos.shorten(same, off);
  if (secondEnd) return shorter;else return shorter.extend(new _model.Pos(second.path.slice(same), second.offset));
}

function findDiffEndConstrained(a, b, start) {
  var end = (0, _model.findDiffEnd)(a, b);
  if (!end) return end;
  if (end.a.cmp(start.a) < 0) return { a: start.a, b: offsetBy(end.a, start.a, end.b) };
  if (end.b.cmp(start.b) < 0) return { a: offsetBy(end.b, start.b, end.a), b: start.b };
  return end;
}

// Text-only queries for composition events

function textContext(data) {
  var range = getSelection().getRangeAt(0);
  var start = range.startContainer,
      end = range.endContainer;
  if (start == end && start.nodeType == 3) {
    var value = start.nodeValue,
        lead = range.startOffset,
        _end = range.endOffset;
    if (data && _end >= data.length && value.slice(_end - data.length, _end) == data) lead = _end - data.length;
    return { inside: start, lead: lead, trail: value.length - _end };
  }

  var sizeBefore = null,
      sizeAfter = null;
  var before = start.childNodes[range.startOffset - 1] || nodeBefore(start);
  while (before.lastChild) before = before.lastChild;
  if (before && before.nodeType == 3) {
    var value = before.nodeValue;
    sizeBefore = value.length;
    if (data && value.slice(value.length - data.length) == data) sizeBefore -= data.length;
  }
  var after = end.childNodes[range.endOffset] || nodeAfter(end);
  while (after.firstChild) after = after.firstChild;
  if (after && after.nodeType == 3) sizeAfter = after.nodeValue.length;

  return { before: before, sizeBefore: sizeBefore,
    after: after, sizeAfter: sizeAfter };
}

function textInContext(context, deflt) {
  if (context.inside) {
    var _val = context.inside.nodeValue;
    return _val.slice(context.lead, _val.length - context.trail);
  } else {
    var before = context.before,
        after = context.after,
        val = "";
    if (!before) return deflt;
    if (before.nodeType == 3) val = before.nodeValue.slice(context.sizeBefore);
    var scan = scanText(before, after);
    if (scan == null) return deflt;
    val += scan;
    if (after && after.nodeType == 3) {
      var valAfter = after.nodeValue;
      val += valAfter.slice(0, valAfter.length - context.sizeAfter);
    }
    return val;
  }
}

function nodeAfter(node) {
  for (;;) {
    var next = node.nextSibling;
    if (next) {
      while (next.firstChild) next = next.firstChild;
      return next;
    }
    if (!(node = node.parentElement)) return null;
  }
}

function nodeBefore(node) {
  for (;;) {
    var prev = node.previousSibling;
    if (prev) {
      while (prev.lastChild) prev = prev.lastChild;
      return prev;
    }
    if (!(node = node.parentElement)) return null;
  }
}

function scanText(start, end) {
  var text = "",
      cur = start;
  for (;;) {
    if (cur == end) return text;
    if (!cur) return null;
    if (cur.nodeType == 3) text += cur.nodeValue;
    cur = cur.firstChild || nodeAfter(cur);
  }
}
},{"../model":22,"../parse/dom":29,"../transform/tree":44,"./selection":19}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.draw = draw;
exports.redraw = redraw;

var _model = require("../model");

var _serializeDom = require("../serialize/dom");

var _dom = require("../dom");

var nonEditable = { html_block: true, html_tag: true, horizontal_rule: true };

function options(path, ranges) {
  return {
    onRender: function onRender(node, dom, offset) {
      if (node.kind != "inline" && offset != null) dom.setAttribute("pm-path", offset);
      if (nonEditable.hasOwnProperty(node.type.name)) dom.contentEditable = false;
      return dom;
    },
    renderInlineFlat: function renderInlineFlat(node, dom, offset) {
      ranges.advanceTo(new _model.Pos(path, offset));
      var end = new _model.Pos(path, offset + node.offset);
      var nextCut = ranges.nextChangeBefore(end);

      var inner = dom,
          wrapped = undefined;
      for (var i = 0; i < node.styles.length; i++) {
        inner = inner.firstChild;
      }if (dom.nodeType != 1) {
        dom = (0, _dom.elt)("span", null, dom);
        if (!nextCut) wrapped = dom;
      }
      if (!wrapped && (nextCut || ranges.current.length)) {
        wrapped = inner == dom ? dom = (0, _dom.elt)("span", null, inner) : inner.parentNode.appendChild((0, _dom.elt)("span", null, inner));
      }

      dom.setAttribute("pm-span", offset + "-" + end.offset);
      if (!node.isText) dom.setAttribute("pm-span-atom", "true");

      var inlineOffset = 0;
      while (nextCut) {
        var size = nextCut - offset;
        var split = splitSpan(wrapped, size);
        if (ranges.current.length) split.className = ranges.current.join(" ");
        split.setAttribute("pm-span-offset", inlineOffset);
        inlineOffset += size;
        offset += size;
        ranges.advanceTo(new _model.Pos(path, offset));
        if (!(nextCut = ranges.nextChangeBefore(end))) wrapped.setAttribute("pm-span-offset", inlineOffset);
      }

      if (ranges.current.length) wrapped.className = ranges.current.join(" ");
      return dom;
    },
    document: document,
    path: path
  };
}

function splitSpan(span, at) {
  var textNode = span.firstChild,
      text = textNode.nodeValue;
  var newNode = span.parentNode.insertBefore((0, _dom.elt)("span", null, text.slice(0, at)), span);
  textNode.nodeValue = text.slice(at);
  return newNode;
}

function draw(pm, doc) {
  pm.content.textContent = "";
  pm.content.appendChild((0, _serializeDom.toDOM)(doc, options([], pm.ranges.activeRangeTracker())));
}

function deleteNextNodes(parent, at, amount) {
  for (var i = 0; i < amount; i++) {
    var prev = at;
    at = at.nextSibling;
    parent.removeChild(prev);
  }
  return at;
}

function redraw(pm, dirty, doc, prev) {
  var ranges = pm.ranges.activeRangeTracker();
  var path = [];

  function scan(dom, node, prev) {
    var status = [],
        inPrev = [],
        inNode = [];
    for (var i = 0, _j = 0; i < prev.length && _j < node.width; i++) {
      var cur = prev.child(i),
          dirtyStatus = dirty.get(cur);
      status.push(dirtyStatus);
      var matching = dirtyStatus ? -1 : node.children.indexOf(cur, _j);
      if (matching > -1) {
        inNode[i] = matching;
        inPrev[matching] = i;
        _j = matching + 1;
      }
    }

    if (node.isTextblock) {
      var needsBR = node.length == 0 || node.lastChild.type == node.type.schema.nodes.hard_break;
      var last = dom.lastChild,
          hasBR = last && last.nodeType == 1 && last.hasAttribute("pm-force-br");
      if (needsBR && !hasBR) dom.appendChild((0, _dom.elt)("br", { "pm-force-br": "true" }));else if (!needsBR && hasBR) dom.removeChild(last);
    }

    var domPos = dom.firstChild,
        j = 0;
    var block = node.isTextblock;
    for (var i = 0, offset = 0; i < node.length; i++) {
      var child = node.child(i);
      if (!block) path.push(i);
      var found = inPrev[i];
      var nodeLeft = true;
      if (found > -1) {
        domPos = deleteNextNodes(dom, domPos, found - j);
        j = found;
      } else if (!block && j < prev.length && inNode[j] == null && status[j] != 2 && child.sameMarkup(prev.child(j))) {
        scan(domPos, child, prev.child(j));
      } else {
        dom.insertBefore((0, _serializeDom.renderNodeToDOM)(child, options(path, ranges), block ? offset : i), domPos);
        nodeLeft = false;
      }
      if (nodeLeft) {
        if (block) domPos.setAttribute("pm-span", offset + "-" + (offset + child.offset));else domPos.setAttribute("pm-path", i);
        domPos = domPos.nextSibling;
        j++;
      }
      if (block) offset += child.offset;else path.pop();
    }
    deleteNextNodes(dom, domPos, prev.length - j);
  }
  scan(pm.content, doc, prev);
}
},{"../dom":3,"../model":22,"../serialize/dom":32}],10:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventMixin = eventMixin;
var methods = {
  on: function on(type, f) {
    var map = this._handlers || (this._handlers = {});
    var arr = map[type] || (map[type] = []);
    arr.push(f);
  },

  off: function off(type, f) {
    var arr = this._handlers && this._handlers[type];
    if (arr) for (var i = 0; i < arr.length; ++i) {
      if (arr[i] == f) {
        arr.splice(i, 1);break;
      }
    }
  },

  signal: function signal(type) {
    var arr = this._handlers && this._handlers[type];

    for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      values[_key - 1] = arguments[_key];
    }

    if (arr) for (var i = 0; i < arr.length; ++i) {
      arr[i].apply(arr, values);
    }
  },

  signalHandleable: function signalHandleable(type) {
    var arr = this._handlers && this._handlers[type];
    if (arr) {
      for (var _len2 = arguments.length, values = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        values[_key2 - 1] = arguments[_key2];
      }

      for (var i = 0; i < arr.length; ++i) {
        var result = arr[i].apply(arr, values);
        if (result !== false) return result;
      }
    }return false;
  },

  hasHandler: function hasHandler(type) {
    var arr = this._handlers && this._handlers[type];
    return arr && arr.length > 0;
  }
};

// Add event-related methods to a constructor's prototype, to make
// registering events on such objects more convenient.

function eventMixin(ctor) {
  var proto = ctor.prototype;
  for (var prop in methods) if (methods.hasOwnProperty(prop)) proto[prop] = methods[prop];
}
},{}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _transform = require("../transform");

var InvertedStep = function InvertedStep(step, version, id) {
  _classCallCheck(this, InvertedStep);

  this.step = step;
  this.version = version;
  this.id = id;
};

var BranchRemapping = (function () {
  function BranchRemapping(branch) {
    _classCallCheck(this, BranchRemapping);

    this.branch = branch;
    this.remap = new _transform.Remapping();
    this.version = branch.version;
    this.mirrorBuffer = Object.create(null);
  }

  _createClass(BranchRemapping, [{
    key: "moveToVersion",
    value: function moveToVersion(version) {
      while (this.version > version) this.addNextMap();
    }
  }, {
    key: "addNextMap",
    value: function addNextMap() {
      var found = this.branch.mirror[this.version];
      var mapOffset = this.branch.maps.length - (this.branch.version - this.version) - 1;
      var id = this.remap.addToFront(this.branch.maps[mapOffset], this.mirrorBuffer[this.version]);
      --this.version;
      if (found != null) this.mirrorBuffer[found] = id;
      return id;
    }
  }, {
    key: "movePastStep",
    value: function movePastStep(result) {
      var id = this.addNextMap();
      if (result) this.remap.addToBack(result.map, id);
    }
  }]);

  return BranchRemapping;
})();

var workTime = 100,
    pauseTime = 150;

var CompressionWorker = (function () {
  function CompressionWorker(doc, branch, callback) {
    _classCallCheck(this, CompressionWorker);

    this.branch = branch;
    this.callback = callback;
    this.remap = new BranchRemapping(branch);

    this.doc = doc;
    this.events = [];
    this.maps = [];
    this.version = this.startVersion = branch.version;

    this.i = branch.events.length;
    this.timeout = null;
    this.aborted = false;
  }

  _createClass(CompressionWorker, [{
    key: "work",
    value: function work() {
      var _this = this;

      if (this.aborted) return;

      var endTime = Date.now() + workTime;

      for (;;) {
        if (this.i == 0) return this.finish();
        var _event = this.branch.events[--this.i],
            outEvent = [];
        for (var j = _event.length - 1; j >= 0; j--) {
          var _event$j = _event[j];
          var step = _event$j.step;
          var stepVersion = _event$j.version;
          var stepID = _event$j.id;

          this.remap.moveToVersion(stepVersion);

          var mappedStep = (0, _transform.mapStep)(step, this.remap.remap);
          if (mappedStep && isDelStep(step)) {
            var extra = 0,
                start = step.from;
            while (j > 0) {
              var next = _event[j - 1];
              if (next.version != stepVersion - 1 || !isDelStep(next.step) || start.cmp(next.step.to)) break;
              extra += next.step.to.offset - next.step.from.offset;
              start = next.step.from;
              stepVersion--;
              j--;
              this.remap.addNextMap();
            }
            if (extra > 0) {
              var _start = mappedStep.from.shift(-extra);
              mappedStep = new _transform.Step("replace", _start, mappedStep.to, _start, { nodes: [], openLeft: 0, openRight: 0 });
            }
          }
          var result = mappedStep && mappedStep.apply(this.doc);
          if (result) {
            this.doc = result.doc;
            this.maps.push(result.map.invert());
            outEvent.push(new InvertedStep(mappedStep, this.version, stepID));
            this.version--;
          }
          this.remap.movePastStep(result);
        }
        if (outEvent.length) {
          outEvent.reverse();
          this.events.push(outEvent);
        }
        if (Date.now() > endTime) {
          this.timeout = window.setTimeout(function () {
            return _this.work();
          }, pauseTime);
          return;
        }
      }
    }
  }, {
    key: "finish",
    value: function finish() {
      if (this.aborted) return;

      this.events.reverse();
      this.maps.reverse();
      this.callback(this.maps.concat(this.branch.maps.slice(this.branch.maps.length - (this.branch.version - this.startVersion))), this.events);
    }
  }, {
    key: "abort",
    value: function abort() {
      this.aborted = true;
      window.clearTimeout(this.timeout);
    }
  }]);

  return CompressionWorker;
})();

function isDelStep(step) {
  return step.name == "replace" && step.from.offset < step.to.offset && _model.Pos.samePath(step.from.path, step.to.path) && step.param.nodes.length == 0;
}

var compressStepCount = 150;

var Branch = (function () {
  function Branch(maxDepth) {
    _classCallCheck(this, Branch);

    this.maxDepth = maxDepth;
    this.version = 0;
    this.nextStepID = 1;

    this.maps = [];
    this.mirror = Object.create(null);
    this.events = [];

    this.stepsSinceCompress = 0;
    this.compressing = null;
    this.compressTimeout = null;
  }

  _createClass(Branch, [{
    key: "clear",
    value: function clear(force) {
      if (force || !this.empty()) {
        this.maps.length = this.events.length = this.stepsSinceCompress = 0;
        this.mirror = Object.create(null);
        this.abortCompression();
      }
    }
  }, {
    key: "newEvent",
    value: function newEvent() {
      this.abortCompression();
      this.events.push([]);
      while (this.events.length > this.maxDepth) this.events.shift();
    }
  }, {
    key: "addMap",
    value: function addMap(map) {
      if (!this.empty()) {
        this.maps.push(map);
        this.version++;
        this.stepsSinceCompress++;
        return true;
      }
    }
  }, {
    key: "empty",
    value: function empty() {
      return this.events.length == 0;
    }
  }, {
    key: "addStep",
    value: function addStep(step, map, id) {
      this.addMap(map);
      if (id == null) id = this.nextStepID++;
      this.events[this.events.length - 1].push(new InvertedStep(step, this.version, id));
    }
  }, {
    key: "addTransform",
    value: function addTransform(transform, ids) {
      this.abortCompression();
      for (var i = 0; i < transform.steps.length; i++) {
        var inverted = transform.steps[i].invert(transform.docs[i], transform.maps[i]);
        this.addStep(inverted, transform.maps[i], ids && ids[i]);
      }
    }
  }, {
    key: "popEvent",
    value: function popEvent(doc, allowCollapsing) {
      this.abortCompression();
      var event = this.events.pop();
      if (!event) return null;

      var remap = new BranchRemapping(this),
          collapsing = allowCollapsing;
      var tr = new _transform.Transform(doc);
      var ids = [];

      for (var i = event.length - 1; i >= 0; i--) {
        var invertedStep = event[i],
            step = invertedStep.step;
        if (!collapsing || invertedStep.version != remap.version) {
          collapsing = false;
          remap.moveToVersion(invertedStep.version);

          step = (0, _transform.mapStep)(step, remap.remap);
          var result = step && tr.step(step);
          if (result) {
            ids.push(invertedStep.id);
            if (this.addMap(result.map)) this.mirror[this.version] = invertedStep.version;
          }

          if (i > 0) remap.movePastStep(result);
        } else {
          this.version--;
          delete this.mirror[this.version];
          this.maps.pop();
          tr.step(step);
          ids.push(invertedStep.id);
          --remap.version;
        }
      }
      if (this.empty()) this.clear(true);
      return { transform: tr, ids: ids };
    }
  }, {
    key: "getVersion",
    value: function getVersion() {
      return { id: this.nextStepID, version: this.version };
    }
  }, {
    key: "findVersion",
    value: function findVersion(version) {
      for (var i = this.events.length - 1; i >= 0; i--) {
        var _event2 = this.events[i];
        for (var j = _event2.length - 1; j >= 0; j--) {
          var step = _event2[j];
          if (step.id == version.id) return { event: i, step: j };else if (step.id < version.id) return { event: i, step: j + 1 };
        }
      }
    }
  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      if (this.empty()) return;
      this.abortCompression();

      var startVersion = this.version - positions.length;

      // Update and clean up the events
      out: for (var i = this.events.length - 1; i >= 0; i--) {
        var _event3 = this.events[i];
        for (var j = _event3.length - 1; j >= 0; j--) {
          var step = _event3[j];
          if (step.version <= startVersion) break out;
          var off = positions[step.version - startVersion - 1];
          if (off == -1) {
            _event3.splice(j--, 1);
          } else {
            var inv = rebasedTransform.steps[off].invert(rebasedTransform.docs[off], rebasedTransform.maps[off]);
            _event3[j] = new InvertedStep(inv, startVersion + newMaps.length + off + 1, step.id);
          }
        }
      }

      // Sync the array of maps
      if (this.maps.length > positions.length) this.maps = this.maps.slice(0, this.maps.length - positions.length).concat(newMaps).concat(rebasedTransform.maps);else this.maps = rebasedTransform.maps.slice();

      this.version = startVersion + newMaps.length + rebasedTransform.maps.length;

      this.stepsSinceCompress += newMaps.length + rebasedTransform.steps.length - positions.length;
    }
  }, {
    key: "abortCompression",
    value: function abortCompression() {
      if (this.compressing) {
        this.compressing.abort();
        this.compressing = null;
      }
    }
  }, {
    key: "needsCompression",
    value: function needsCompression() {
      return this.stepsSinceCompress > compressStepCount && !this.compressing;
    }
  }, {
    key: "startCompression",
    value: function startCompression(doc) {
      var _this2 = this;

      this.compressing = new CompressionWorker(doc, this, function (maps, events) {
        _this2.maps = maps;
        _this2.events = events;
        _this2.mirror = Object.create(null);
        _this2.compressing = null;
        _this2.stepsSinceCompress = 0;
      });
      this.compressing.work();
    }
  }]);

  return Branch;
})();

var compressDelay = 750;

var History = (function () {
  function History(pm) {
    var _this3 = this;

    _classCallCheck(this, History);

    this.pm = pm;

    this.done = new Branch(pm.options.historyDepth);
    this.undone = new Branch(pm.options.historyDepth);

    this.lastAddedAt = 0;
    this.ignoreTransform = false;

    this.allowCollapsing = true;

    pm.on("transform", function (transform, options) {
      return _this3.recordTransform(transform, options);
    });
  }

  _createClass(History, [{
    key: "recordTransform",
    value: function recordTransform(transform, options) {
      if (this.ignoreTransform) return;

      if (options.addToHistory == false) {
        for (var i = 0; i < transform.maps.length; i++) {
          var map = transform.maps[i];
          this.done.addMap(map);
          this.undone.addMap(map);
        }
      } else {
        this.undone.clear();
        var now = Date.now();
        if (now > this.lastAddedAt + this.pm.options.historyEventDelay) this.done.newEvent();

        this.done.addTransform(transform);
        this.lastAddedAt = now;
      }
      this.maybeScheduleCompression();
    }
  }, {
    key: "undo",
    value: function undo() {
      return this.shift(this.done, this.undone);
    }
  }, {
    key: "redo",
    value: function redo() {
      return this.shift(this.undone, this.done);
    }
  }, {
    key: "canUndo",
    value: function canUndo() {
      return this.done.events.length > 0;
    }
  }, {
    key: "canRedo",
    value: function canRedo() {
      return this.undone.events.length > 0;
    }
  }, {
    key: "shift",
    value: function shift(from, to) {
      var event = from.popEvent(this.pm.doc, this.allowCollapsing);
      if (!event) return false;
      var transform = event.transform;
      var ids = event.ids;

      this.ignoreTransform = true;
      this.pm.apply(transform);
      this.ignoreTransform = false;

      if (!transform.steps.length) return this.shift(from, to);

      if (to) {
        to.newEvent();
        to.addTransform(transform, ids);
      }
      this.lastAddedAt = 0;

      return true;
    }
  }, {
    key: "getVersion",
    value: function getVersion() {
      return this.done.getVersion();
    }
  }, {
    key: "backToVersion",
    value: function backToVersion(version) {
      var found = this.done.findVersion(version);
      if (!found) return false;
      var event = this.done.events[found.event];
      var combined = this.done.events.slice(found.event + 1).reduce(function (comb, arr) {
        return comb.concat(arr);
      }, event.slice(found.step));
      this.done.events.length = found.event + ((event.length = found.step) ? 1 : 0);
      this.done.events.push(combined);

      this.shift(this.done);
    }
  }, {
    key: "rebased",
    value: function rebased(newMaps, rebasedTransform, positions) {
      this.done.rebased(newMaps, rebasedTransform, positions);
      this.undone.rebased(newMaps, rebasedTransform, positions);
      this.maybeScheduleCompression();
    }
  }, {
    key: "maybeScheduleCompression",
    value: function maybeScheduleCompression() {
      this.maybeScheduleCompressionForBranch(this.done);
      this.maybeScheduleCompressionForBranch(this.undone);
    }
  }, {
    key: "maybeScheduleCompressionForBranch",
    value: function maybeScheduleCompressionForBranch(branch) {
      var _this4 = this;

      window.clearTimeout(branch.compressTimeout);
      if (branch.needsCompression()) branch.compressTimeout = window.setTimeout(function () {
        if (branch.needsCompression()) branch.startCompression(_this4.pm.doc);
      }, compressDelay);
    }
  }]);

  return History;
})();

exports.History = History;
},{"../model":22,"../transform":36}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _main = require("./main");

Object.defineProperty(exports, "ProseMirror", {
  enumerable: true,
  get: function get() {
    return _main.ProseMirror;
  }
});

var _options = require("./options");

Object.defineProperty(exports, "defineOption", {
  enumerable: true,
  get: function get() {
    return _options.defineOption;
  }
});

var _selection = require("./selection");

Object.defineProperty(exports, "Range", {
  enumerable: true,
  get: function get() {
    return _selection.Range;
  }
});

var _event = require("./event");

Object.defineProperty(exports, "eventMixin", {
  enumerable: true,
  get: function get() {
    return _event.eventMixin;
  }
});

var _keys = require("./keys");

Object.defineProperty(exports, "Keymap", {
  enumerable: true,
  get: function get() {
    return _keys.Keymap;
  }
});

var _range = require("./range");

Object.defineProperty(exports, "MarkedRange", {
  enumerable: true,
  get: function get() {
    return _range.MarkedRange;
  }
});

var _defaultkeymap = require("./defaultkeymap");

Object.defineProperty(exports, "defaultKeymap", {
  enumerable: true,
  get: function get() {
    return _defaultkeymap.defaultKeymap;
  }
});

var _commands = require("./commands");

Object.defineProperty(exports, "registerCommand", {
  enumerable: true,
  get: function get() {
    return _commands.registerCommand;
  }
});
},{"./commands":5,"./defaultkeymap":7,"./event":10,"./keys":14,"./main":15,"./options":17,"./range":18,"./selection":19}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.dispatchKey = dispatchKey;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _parseDom = require("../parse/dom");

var _serializeDom = require("../serialize/dom");

var _serializeText = require("../serialize/text");

var _parse = require("../parse");

var _keys = require("./keys");

var _dom = require("../dom");

var _commands = require("./commands");

var _domchange = require("./domchange");

var _selection = require("./selection");

var stopSeq = null;
var handlers = {};

var Input = (function () {
  function Input(pm) {
    var _this = this;

    _classCallCheck(this, Input);

    this.pm = pm;

    this.keySeq = null;
    this.composing = null;
    this.shiftKey = this.updatingComposition = false;
    this.skipInput = 0;

    this.draggingFrom = false;

    this.keymaps = [];

    this.storedStyles = null;

    var _loop = function (_event) {
      var handler = handlers[_event];
      pm.content.addEventListener(_event, function (e) {
        return handler(pm, e);
      });
    };

    for (var _event in handlers) {
      _loop(_event);
    }

    pm.on("selectionChange", function () {
      return _this.storedStyles = null;
    });
  }

  _createClass(Input, [{
    key: "maybeAbortComposition",
    value: function maybeAbortComposition() {
      if (this.composing && !this.updatingComposition) {
        if (this.composing.finished) {
          finishComposing(this.pm);
        } else {
          // Toggle selection to force end of composition
          this.composing = null;
          this.skipInput++;
          var sel = getSelection();
          if (sel.rangeCount) {
            var range = sel.getRangeAt(0);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        return true;
      }
    }
  }]);

  return Input;
})();

exports.Input = Input;

function dispatchKey(pm, name, e) {
  var seq = pm.input.keySeq;
  if (seq) {
    if ((0, _keys.isModifierKey)(name)) return true;
    clearTimeout(stopSeq);
    stopSeq = setTimeout(function () {
      if (pm.input.keySeq == seq) pm.input.keySeq = null;
    }, 50);
    name = seq + " " + name;
  }

  var handle = function handle(bound) {
    var result = typeof bound == "string" ? (0, _commands.execCommand)(pm, bound) : bound(pm);
    return result !== false;
  };

  var result = undefined;
  for (var i = pm.input.keymaps.length - 1; !result && i >= 0; i--) {
    result = (0, _keys.lookupKey)(name, pm.input.keymaps[i], handle, pm);
  }if (!result) result = (0, _keys.lookupKey)(name, pm.options.keymap, handle, pm);

  if (result == "multi") pm.input.keySeq = name;

  if (result == "handled" || result == "multi") e.preventDefault();

  if (seq && !result && /\'$/.test(name)) {
    e.preventDefault();
    return true;
  }
  return !!result;
}

handlers.keydown = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = true;
  if (pm.input.composing) return;
  var name = (0, _keys.keyName)(e);
  if (name) dispatchKey(pm, name, e);
};

handlers.keyup = function (pm, e) {
  if (e.keyCode == 16) pm.input.shiftKey = false;
};

function inputText(pm, range, text) {
  if (range.empty && !text) return false;
  var styles = pm.input.storedStyles || (0, _model.spanStylesAt)(pm.doc, range.from);
  var tr = pm.tr;
  if (!range.empty) tr["delete"](range.from, range.to);
  pm.apply(tr.insert(range.from, pm.schema.text(text, styles)));
  pm.signal("textInput", text);
  pm.scrollIntoView();
}

handlers.keypress = function (pm, e) {
  if (pm.input.composing || !e.charCode || e.ctrlKey && !e.altKey || _dom.browser.mac && e.metaKey) return;
  var ch = String.fromCharCode(e.charCode);
  if (dispatchKey(pm, "'" + ch + "'", e)) return;
  inputText(pm, pm.selection, ch);
  e.preventDefault();
};

var Composing = function Composing(pm, data) {
  _classCallCheck(this, Composing);

  this.finished = false;
  this.context = (0, _domchange.textContext)(data);
  this.data = data;
  this.endData = null;
  var range = pm.selection;
  if (data) {
    var path = range.head.path,
        line = pm.doc.path(path).textContent;
    var found = line.indexOf(data, range.head.offset - data.length);
    if (found > -1 && found <= range.head.offset + data.length) range = new _selection.Range(new _model.Pos(path, found), new _model.Pos(path, found + data.length));
  }
  this.range = range;
};

handlers.compositionstart = function (pm, e) {
  if (pm.input.maybeAbortComposition()) return;

  pm.flush();
  pm.input.composing = new Composing(pm, e.data);
};

handlers.compositionupdate = function (pm, e) {
  var info = pm.input.composing;
  if (info && info.data != e.data) {
    info.data = e.data;
    pm.input.updatingComposition = true;
    inputText(pm, info.range, info.data);
    pm.input.updatingComposition = false;
    info.range = new _selection.Range(info.range.from, info.range.from.shift(info.data.length));
  }
};

handlers.compositionend = function (pm, e) {
  var info = pm.input.composing;
  if (info) {
    pm.input.composing.finished = true;
    pm.input.composing.endData = e.data;
    setTimeout(function () {
      if (pm.input.composing == info) finishComposing(pm);
    }, 20);
  }
};

function finishComposing(pm) {
  var info = pm.input.composing;
  var text = (0, _domchange.textInContext)(info.context, info.endData);
  if (text != info.data) pm.ensureOperation();
  pm.input.composing = null;
  if (text != info.data) inputText(pm, info.range, text);
}

handlers.input = function (pm) {
  if (pm.input.skipInput) return --pm.input.skipInput;

  if (pm.input.composing) {
    if (pm.input.composing.finished) finishComposing(pm);
    return;
  }

  pm.input.suppressPolling = true;
  (0, _domchange.applyDOMChange)(pm);
  pm.input.suppressPolling = false;
  pm.sel.poll(true);
  pm.scrollIntoView();
};

var lastCopied = null;

handlers.copy = handlers.cut = function (pm, e) {
  var sel = pm.selection;
  if (sel.empty) return;
  var fragment = pm.selectedDoc;
  lastCopied = { doc: pm.doc, from: sel.from, to: sel.to,
    html: (0, _serializeDom.toHTML)(fragment, { document: document }),
    text: (0, _serializeText.toText)(fragment) };

  if (e.clipboardData) {
    e.preventDefault();
    e.clipboardData.clearData();
    e.clipboardData.setData("text/html", lastCopied.html);
    e.clipboardData.setData("text/plain", lastCopied.text);
    if (e.type == "cut" && !sel.empty) pm.apply(pm.tr["delete"](sel.from, sel.to));
  }
};

handlers.paste = function (pm, e) {
  if (!e.clipboardData) return;
  var sel = pm.selection;
  var txt = e.clipboardData.getData("text/plain");
  var html = e.clipboardData.getData("text/html");
  if (html || txt) {
    e.preventDefault();
    var doc = undefined,
        from = undefined,
        to = undefined;
    if (pm.input.shiftKey && txt) {
      (function () {
        var paragraphs = txt.split(/[\r\n]+/);
        var styles = (0, _model.spanStylesAt)(pm.doc, sel.from);
        doc = pm.schema.node("doc", null, paragraphs.map(function (s) {
          return pm.schema.node("paragraph", null, [pm.schema.text(s, styles)]);
        }));
      })();
    } else if (lastCopied && (lastCopied.html == html || lastCopied.text == txt)) {
      ;var _lastCopied = lastCopied;
      doc = _lastCopied.doc;
      from = _lastCopied.from;
      to = _lastCopied.to;
    } else if (html) {
      doc = (0, _parseDom.fromHTML)(pm.schema, html, { document: document });
    } else {
      doc = (0, _parse.convertFrom)(pm.schema, txt, (0, _parse.knownSource)("markdown") ? "markdown" : "text");
    }
    pm.apply(pm.tr.replace(sel.from, sel.to, doc, from || _model.Pos.start(doc), to || _model.Pos.end(doc)));
    pm.scrollIntoView();
  }
};

handlers.dragstart = function (pm, e) {
  if (!e.dataTransfer) return;

  var fragment = pm.selectedDoc;

  e.dataTransfer.setData("text/html", (0, _serializeDom.toHTML)(fragment, { document: document }));
  e.dataTransfer.setData("text/plain", (0, _serializeText.toText)(fragment) + "??");
  pm.input.draggingFrom = true;
};

handlers.dragend = function (pm) {
  return window.setTimeout(function () {
    return pm.input.dragginFrom = false;
  }, 50);
};

handlers.dragover = handlers.dragenter = function (_, e) {
  return e.preventDefault();
};

handlers.drop = function (pm, e) {
  if (!e.dataTransfer) return;

  var html = undefined,
      txt = undefined,
      doc = undefined;
  if (html = e.dataTransfer.getData("text/html")) doc = (0, _parseDom.fromHTML)(pm.schema, html, { document: document });else if (txt = e.dataTransfer.getData("text/plain")) doc = (0, _parse.convertFrom)(pm.schema, txt, (0, _parse.knownSource)("markdown") ? "markdown" : "text");

  if (doc) {
    e.preventDefault();
    var insertPos = pm.posAtCoords({ left: e.clientX, top: e.clientY });
    var tr = pm.tr;
    if (pm.input.draggingFrom && !e.ctrlKey) {
      var sel = pm.selection;
      tr["delete"](sel.from, sel.to);
      insertPos = tr.map(insertPos).pos;
    }
    tr.replace(insertPos, insertPos, doc, _model.Pos.start(doc), _model.Pos.end(doc));
    pm.apply(tr);
    pm.setSelection(new _selection.Range(insertPos, tr.map(insertPos).pos));
    pm.focus();
  }
};

handlers.focus = function (pm) {
  (0, _dom.addClass)(pm.wrapper, "ProseMirror-focused");
  pm.signal("focus");
};

handlers.blur = function (pm) {
  (0, _dom.rmClass)(pm.wrapper, "ProseMirror-focused");
  pm.signal("blur");
};
},{"../dom":3,"../model":22,"../parse":30,"../parse/dom":29,"../serialize/dom":32,"../serialize/text":34,"./commands":5,"./domchange":8,"./keys":14,"./selection":19}],14:[function(require,module,exports){
// From CodeMirror, should be factored into its own NPM module

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.keyName = keyName;
exports.isModifierKey = isModifierKey;
exports.lookupKey = lookupKey;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var names = {
  3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
  46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
  106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete",
  173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
  221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
  63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
};

exports.names = names;
// Number keys
for (var i = 0; i < 10; i++) {
  names[i + 48] = names[i + 96] = String(i);
} // Alphabetic keys
for (var i = 65; i <= 90; i++) {
  names[i] = String.fromCharCode(i);
} // Function keys
for (var i = 1; i <= 12; i++) {
  names[i + 111] = names[i + 63235] = "F" + i;
}
function keyName(event, noShift) {
  var base = names[event.keyCode],
      name = base;
  if (name == null || event.altGraphKey) return false;

  if (event.altKey && base != "Alt") name = "Alt-" + name;
  if (event.ctrlKey && base != "Ctrl") name = "Ctrl-" + name;
  if (event.metaKey && base != "Cmd") name = "Cmd-" + name;
  if (!noShift && event.shiftKey && base != "Shift") name = "Shift-" + name;
  return name;
}

function isModifierKey(value) {
  var name = typeof value == "string" ? value : names[value.keyCode];
  return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
}

function normalizeKeyName(fullName) {
  var parts = fullName.split(/-(?!$)/),
      name = parts[parts.length - 1];
  var alt = undefined,
      ctrl = undefined,
      shift = undefined,
      cmd = undefined;
  for (var i = 0; i < parts.length - 1; i++) {
    var mod = parts[i];
    if (/^(cmd|meta|m)$/i.test(mod)) cmd = true;else if (/^a(lt)?$/i.test(mod)) alt = true;else if (/^(c|ctrl|control)$/i.test(mod)) ctrl = true;else if (/^s(hift)$/i.test(mod)) shift = true;else throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt) name = "Alt-" + name;
  if (ctrl) name = "Ctrl-" + name;
  if (cmd) name = "Cmd-" + name;
  if (shift) name = "Shift-" + name;
  return name;
}

var Keymap = (function () {
  function Keymap(keys, options) {
    _classCallCheck(this, Keymap);

    this.options = options || {};
    this.bindings = Object.create(null);
    if (keys) for (var keyname in keys) {
      if (Object.prototype.hasOwnProperty.call(keys, keyname)) this.addBinding(keyname, keys[keyname]);
    }
  }

  _createClass(Keymap, [{
    key: "addBinding",
    value: function addBinding(keyname, value) {
      var keys = keyname.split(" ").map(normalizeKeyName);
      for (var i = 0; i < keys.length; i++) {
        var _name = keys.slice(0, i + 1).join(" ");
        var val = i == keys.length - 1 ? value : "...";
        var prev = this.bindings[_name];
        if (!prev) this.bindings[_name] = val;else if (prev != val) throw new Error("Inconsistent bindings for " + _name);
      }
    }
  }, {
    key: "removeBinding",
    value: function removeBinding(keyname) {
      var keys = keyname.split(" ").map(normalizeKeyName);
      for (var i = keys.length - 1; i >= 0; i--) {
        var _name2 = keys.slice(0, i).join(" ");
        var val = this.bindings[_name2];
        if (val == "..." && !this.unusedMulti(_name2)) break;else if (val) delete this.bindings[_name2];
      }
    }
  }, {
    key: "unusedMulti",
    value: function unusedMulti(name) {
      for (var binding in this.bindings) {
        if (binding.length > name && binding.indexOf(name) == 0 && binding.charAt(name.length) == " ") return false;
      }return true;
    }
  }]);

  return Keymap;
})();

exports.Keymap = Keymap;

function lookupKey(_x, _x2, _x3, _x4) {
  var _again = true;

  _function: while (_again) {
    var key = _x,
        map = _x2,
        handle = _x3,
        context = _x4;
    found = fall = i = result = undefined;
    _again = false;

    var found = map.options.call ? map.options.call(key, context) : map.bindings[key];
    if (found === false) return "nothing";
    if (found === "...") return "multi";
    if (found != null && handle(found)) return "handled";

    var fall = map.options.fallthrough;
    if (fall) {
      if (!Array.isArray(fall)) {
        _x = key;
        _x2 = fall;
        _x3 = handle;
        _x4 = context;
        _again = true;
        continue _function;
      }
      for (var i = 0; i < fall.length; i++) {
        var result = lookupKey(key, fall[i], handle, context);
        if (result) return result;
      }
    }
  }
}
},{}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require("./css");

var _model = require("../model");

var _transform = require("../transform");

var _options = require("./options");

var _selection = require("./selection");

var _dom = require("../dom");

var _draw = require("./draw");

var _input = require("./input");

var _history = require("./history");

var _event = require("./event");

var _serializeText = require("../serialize/text");

require("../parse/text");

var _parse = require("../parse");

var _serialize = require("../serialize");

var _commands = require("./commands");

var _range = require("./range");

var ProseMirror = (function () {
  function ProseMirror(opts) {
    _classCallCheck(this, ProseMirror);

    opts = this.options = (0, _options.parseOptions)(opts);
    this.schema = opts.schema;
    if (opts.doc == null) opts.doc = this.schema.node("doc", null, [this.schema.node("paragraph")]);
    this.content = (0, _dom.elt)("div", { "class": "ProseMirror-content" });
    this.wrapper = (0, _dom.elt)("div", { "class": "ProseMirror" }, this.content);
    this.wrapper.ProseMirror = this;

    if (opts.place && opts.place.appendChild) opts.place.appendChild(this.wrapper);else if (opts.place) opts.place(this.wrapper);

    this.setDocInner(opts.docFormat ? (0, _parse.convertFrom)(this.schema, opts.doc, opts.docFormat, { document: document }) : opts.doc);
    (0, _draw.draw)(this, this.doc);
    this.content.contentEditable = true;

    this.mod = Object.create(null);
    this.operation = null;
    this.flushScheduled = false;

    this.sel = new _selection.Selection(this);
    this.input = new _input.Input(this);

    (0, _options.initOptions)(this);
  }

  _createClass(ProseMirror, [{
    key: "apply",
    value: function apply(transform) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? nullOptions : arguments[1];

      if (transform.doc == this.doc) return false;
      if (transform.docs[0] != this.doc && (0, _model.findDiffStart)(transform.docs[0], this.doc)) throw new Error("Applying a transform that does not start with the current document");

      this.updateDoc(transform.doc, transform);
      this.signal("transform", transform, options);
      return transform;
    }
  }, {
    key: "setContent",
    value: function setContent(value, format) {
      if (format) value = (0, _parse.convertFrom)(this.schema, value, format);
      this.setDoc(value);
    }
  }, {
    key: "getContent",
    value: function getContent(format) {
      return format ? (0, _serialize.convertTo)(this.doc, format) : this.doc;
    }
  }, {
    key: "setDocInner",
    value: function setDocInner(doc) {
      if (doc.type != this.schema.nodes.doc) throw new Error("Trying to set a document with a different schema");
      this.doc = doc;
      this.ranges = new _range.RangeStore(this);
      this.history = new _history.History(this);
    }
  }, {
    key: "setDoc",
    value: function setDoc(doc, sel) {
      if (!sel) {
        var start = _model.Pos.start(doc);
        sel = new _selection.Range(start, start);
      }
      this.signal("beforeSetDoc", doc, sel);
      this.ensureOperation();
      this.setDocInner(doc);
      this.sel.set(sel, true);
      this.signal("setDoc", doc, sel);
    }
  }, {
    key: "updateDoc",
    value: function updateDoc(doc, mapping) {
      this.ensureOperation();
      this.input.maybeAbortComposition();
      this.ranges.transform(mapping);
      this.doc = doc;
      var range = this.sel.range;
      this.sel.setAndSignal(new _selection.Range(mapping.map(range.anchor).pos, mapping.map(range.head).pos));
      this.signal("change");
    }
  }, {
    key: "checkPos",
    value: function checkPos(pos, block) {
      if (!this.doc.isValidPos(pos, block)) throw new Error("Position " + pos + " is not valid in current document");
    }
  }, {
    key: "setSelection",
    value: function setSelection(rangeOrAnchor, head) {
      var range = rangeOrAnchor;
      if (!(range instanceof _selection.Range)) range = new _selection.Range(rangeOrAnchor, head || rangeOrAnchor);
      this.checkPos(range.head, true);
      this.checkPos(range.anchor, true);
      this.ensureOperation();
      this.input.maybeAbortComposition();
      if (range.head.cmp(this.sel.range.head) || range.anchor.cmp(this.sel.range.anchor)) this.sel.setAndSignal(range);
    }
  }, {
    key: "ensureOperation",
    value: function ensureOperation() {
      var _this = this;

      if (!this.operation) {
        if (!this.input.suppressPolling) this.sel.poll();
        this.operation = new Operation(this);
      }
      if (!this.flushScheduled) {
        (0, _dom.requestAnimationFrame)(function () {
          _this.flushScheduled = false;
          _this.flush();
        });
        this.flushScheduled = true;
      }
      return this.operation;
    }
  }, {
    key: "flush",
    value: function flush() {
      var op = this.operation;
      if (!op || !document.body.contains(this.wrapper)) return;
      this.operation = null;

      var docChanged = op.doc != this.doc || this.ranges.dirty.size;
      if (docChanged && !this.input.composing) {
        if (op.fullRedraw) (0, _draw.draw)(this, this.doc); // FIXME only redraw target block composition
        else (0, _draw.redraw)(this, this.ranges.dirty, this.doc, op.doc);
        this.ranges.resetDirty();
      }
      if ((docChanged || op.sel.anchor.cmp(this.sel.range.anchor) || op.sel.head.cmp(this.sel.range.head)) && !this.input.composing) this.sel.toDOM(docChanged, op.focus);
      if (op.scrollIntoView !== false) (0, _selection.scrollIntoView)(this, op.scrollIntoView);
      if (docChanged) this.signal("draw");
      this.signal("flush");
    }
  }, {
    key: "setOption",
    value: function setOption(name, value) {
      (0, _options.setOption)(this, name, value);
    }
  }, {
    key: "getOption",
    value: function getOption(name) {
      return this.options[name];
    }
  }, {
    key: "addKeymap",
    value: function addKeymap(map, bottom) {
      this.input.keymaps[bottom ? "push" : "unshift"](map);
    }
  }, {
    key: "removeKeymap",
    value: function removeKeymap(map) {
      var maps = this.input.keymaps;
      for (var i = 0; i < maps.length; ++i) {
        if (maps[i] == map || maps[i].options.name == map) {
          maps.splice(i, 1);
          return true;
        }
      }
    }
  }, {
    key: "markRange",
    value: function markRange(from, to, options) {
      this.checkPos(from);
      this.checkPos(to);
      var range = new _range.MarkedRange(from, to, options);
      this.ranges.addRange(range);
      return range;
    }
  }, {
    key: "removeRange",
    value: function removeRange(range) {
      this.ranges.removeRange(range);
    }
  }, {
    key: "setStyle",
    value: function setStyle(st, to) {
      var sel = this.selection;
      if (sel.empty) {
        var styles = this.activeStyles();
        if (to == null) to = !(0, _model.containsStyle)(styles, st.type);
        this.input.storedStyles = to ? st.addToSet(styles) : (0, _model.removeStyle)(styles, st.type);
        this.signal("activeStyleChange");
      } else {
        if (to != null ? to : !(0, _model.rangeHasStyle)(this.doc, sel.from, sel.to, st.type)) this.apply(this.tr.addStyle(sel.from, sel.to, st));else this.apply(this.tr.removeStyle(sel.from, sel.to, st.type));
      }
    }
  }, {
    key: "activeStyles",
    value: function activeStyles() {
      return this.input.storedStyles || (0, _model.spanStylesAt)(this.doc, this.selection.head);
    }
  }, {
    key: "focus",
    value: function focus() {
      if (this.operation) this.operation.focus = true;else this.sel.toDOM(false, true);
    }
  }, {
    key: "hasFocus",
    value: function hasFocus() {
      return (0, _selection.hasFocus)(this);
    }
  }, {
    key: "posAtCoords",
    value: function posAtCoords(coords) {
      return (0, _selection.posAtCoords)(this, coords);
    }
  }, {
    key: "coordsAtPos",
    value: function coordsAtPos(pos) {
      this.checkPos(pos);
      return (0, _selection.coordsAtPos)(this, pos);
    }
  }, {
    key: "scrollIntoView",
    value: function scrollIntoView() {
      var pos = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      if (pos) this.checkPos(pos);
      this.ensureOperation();
      this.operation.scrollIntoView = pos;
    }
  }, {
    key: "execCommand",
    value: function execCommand(name) {
      (0, _commands.execCommand)(this, name);
    }
  }, {
    key: "selection",
    get: function get() {
      this.ensureOperation();
      return this.sel.range;
    }
  }, {
    key: "selectedDoc",
    get: function get() {
      var sel = this.selection;
      return (0, _model.sliceBetween)(this.doc, sel.from, sel.to);
    }
  }, {
    key: "selectedText",
    get: function get() {
      return (0, _serializeText.toText)(this.selectedDoc);
    }
  }, {
    key: "tr",
    get: function get() {
      return new _transform.Transform(this.doc);
    }
  }]);

  return ProseMirror;
})();

exports.ProseMirror = ProseMirror;

var nullOptions = {};

(0, _event.eventMixin)(ProseMirror);

var Operation = function Operation(pm) {
  _classCallCheck(this, Operation);

  this.doc = pm.doc;
  this.sel = pm.sel.range;
  this.scrollIntoView = false;
  this.focus = false;
  this.fullRedraw = !!pm.input.composing;
};
},{"../dom":3,"../model":22,"../parse":30,"../parse/text":31,"../serialize":33,"../serialize/text":34,"../transform":36,"./commands":5,"./css":6,"./draw":9,"./event":10,"./history":11,"./input":13,"./options":17,"./range":18,"./selection":19}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Map = window.Map || (function () {
  function _class() {
    _classCallCheck(this, _class);

    this.content = [];
  }

  _createClass(_class, [{
    key: "set",
    value: function set(key, value) {
      var found = this.find(key);
      if (found > -1) this.content[found + 1] = value;else this.content.push(key, value);
    }
  }, {
    key: "get",
    value: function get(key) {
      var found = this.find(key);
      return found == -1 ? undefined : this.content[found + 1];
    }
  }, {
    key: "has",
    value: function has(key) {
      return this.find(key) > -1;
    }
  }, {
    key: "find",
    value: function find(key) {
      for (var i = 0; i < this.content.length; i += 2) {
        if (this.content[i] === key) return i;
      }
    }
  }, {
    key: "size",
    get: function get() {
      return this.content.length / 2;
    }
  }]);

  return _class;
})();
exports.Map = Map;
},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defineOption = defineOption;
exports.parseOptions = parseOptions;
exports.initOptions = initOptions;
exports.setOption = setOption;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _defaultkeymap = require("./defaultkeymap");

var Option = function Option(defaultValue, update, updateOnInit) {
  _classCallCheck(this, Option);

  this.defaultValue = defaultValue;
  this.update = update;
  this.updateOnInit = updateOnInit !== false;
};

var options = {
  __proto__: null,

  schema: new Option(_model.defaultSchema, false, false),

  doc: new Option(null, function (pm, value) {
    pm.setDoc(value);
  }, false),

  docFormat: new Option(null),

  place: new Option(null),

  keymap: new Option(_defaultkeymap.defaultKeymap),

  historyDepth: new Option(50),

  historyEventDelay: new Option(500)
};

function defineOption(name, defaultValue, update, updateOnInit) {
  options[name] = new Option(defaultValue, update, updateOnInit);
}

function parseOptions(obj) {
  var result = Object.create(null);
  var given = obj ? [obj].concat(obj.use || []) : [];
  outer: for (var opt in options) {
    for (var i = 0; i < given.length; i++) {
      if (opt in given[i]) {
        result[opt] = given[i][opt];
        continue outer;
      }
    }
    result[opt] = options[opt].defaultValue;
  }
  return result;
}

function initOptions(pm) {
  for (var opt in options) {
    var desc = options[opt];
    if (desc.update && desc.updateOnInit) desc.update(pm, pm.options[opt], null, true);
  }
}

function setOption(pm, name, value) {
  var desc = options[name];
  if (desc.update === false) throw new Error("Option '" + name + "' can not be changed");
  var old = pm.options[name];
  pm.options[name] = value;
  if (desc.update) desc.update(pm, value, old, false);
}
},{"../model":22,"./defaultkeymap":7}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _map = require("./map");

var _event = require("./event");

var MarkedRange = (function () {
  function MarkedRange(from, to, options) {
    _classCallCheck(this, MarkedRange);

    this.options = options || {};
    this.from = from;
    this.to = to;
  }

  _createClass(MarkedRange, [{
    key: "clear",
    value: function clear() {
      this.signal("removed", this.from);
      this.from = this.to = null;
    }
  }]);

  return MarkedRange;
})();

exports.MarkedRange = MarkedRange;

(0, _event.eventMixin)(MarkedRange);

var RangeSorter = (function () {
  function RangeSorter() {
    _classCallCheck(this, RangeSorter);

    this.sorted = [];
  }

  _createClass(RangeSorter, [{
    key: "find",
    value: function find(at) {
      var min = 0,
          max = this.sorted.length;
      for (;;) {
        if (max < min + 10) {
          for (var i = min; i < max; i++) {
            if (this.sorted[i].at.cmp(at) >= 0) return i;
          }return max;
        }
        var mid = min + max >> 1;
        if (this.sorted[mid].at.cmp(at) > 0) max = mid;else min = mid;
      }
    }
  }, {
    key: "insert",
    value: function insert(obj) {
      this.sorted.splice(this.find(obj.at), 0, obj);
    }
  }, {
    key: "remove",
    value: function remove(at, range) {
      var pos = this.find(at);
      for (var dist = 0;; dist++) {
        var leftPos = pos - dist - 1,
            rightPos = pos + dist;
        if (leftPos >= 0 && this.sorted[leftPos].range == range) {
          this.sorted.splice(leftPos, 1);
          return;
        } else if (rightPos < this.sorted.length && this.sorted[rightPos].range == range) {
          this.sorted.splice(rightPos, 1);
          return;
        }
      }
    }
  }, {
    key: "resort",
    value: function resort() {
      for (var i = 0; i < this.sorted.length; i++) {
        var cur = this.sorted[i];
        var at = cur.at = cur.type == "open" ? cur.range.from : cur.range.to;
        var pos = i;
        while (pos > 0 && this.sorted[pos - 1].at.cmp(at) > 0) {
          this.sorted[pos] = this.sorted[pos - 1];
          this.sorted[--pos] = cur;
        }
      }
    }
  }]);

  return RangeSorter;
})();

var RangeStore = (function () {
  function RangeStore(pm) {
    _classCallCheck(this, RangeStore);

    this.pm = pm;
    this.ranges = [];
    this.sorted = new RangeSorter();
    this.resetDirty();
  }

  _createClass(RangeStore, [{
    key: "resetDirty",
    value: function resetDirty() {
      this.dirty = new _map.Map();
    }
  }, {
    key: "addRange",
    value: function addRange(range) {
      this.ranges.push(range);
      this.sorted.insert({ type: "open", at: range.from, range: range });
      this.sorted.insert({ type: "close", at: range.to, range: range });
      this.markDisplayDirty(range);
    }
  }, {
    key: "removeRange",
    value: function removeRange(range) {
      var found = this.ranges.indexOf(range);
      if (found > -1) {
        this.ranges.splice(found, 1);
        this.sorted.remove(range.from, range);
        this.sorted.remove(range.to, range);
        this.markDisplayDirty(range);
        range.clear();
      }
    }
  }, {
    key: "transform",
    value: function transform(mapping) {
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this.ranges[i];
        range.from = mapping.map(range.from, range.options.inclusiveLeft ? -1 : 1).pos;
        range.to = mapping.map(range.to, range.options.inclusiveRight ? 1 : -1).pos;
        var diff = range.from.cmp(range.to);
        if (range.options.clearWhenEmpty !== false && diff >= 0) {
          this.removeRange(range);
          i--;
        } else if (diff > 0) {
          range.to = range.from;
        }
      }
      this.sorted.resort();
    }
  }, {
    key: "markDisplayDirty",
    value: function markDisplayDirty(range) {
      this.pm.ensureOperation();
      var dirty = this.dirty;
      var from = range.from,
          to = range.to;
      for (var depth = 0, node = this.pm.doc;; depth++) {
        var fromEnd = depth == from.depth,
            toEnd = depth == to.depth;
        if (!fromEnd && !toEnd && from.path[depth] == to.path[depth]) {
          var child = node.child(from.path[depth]);
          if (!dirty.has(child)) dirty.set(child, 1);
          node = child;
        } else {
          var start = fromEnd ? from.offset : from.path[depth];
          var end = toEnd ? to.offset : to.path[depth] + 1;
          if (node.isTextblock) {
            for (var offset = 0, i = 0; offset < end; i++) {
              var child = node.child(i);
              offset += child.offset;
              if (offset > start) dirty.set(child, 2);
            }
          } else {
            for (var i = start; i < end; i++) {
              dirty.set(node.child(i), 2);
            }
          }
          break;
        }
      }
    }
  }, {
    key: "activeRangeTracker",
    value: function activeRangeTracker() {
      return new RangeTracker(this.sorted.sorted);
    }
  }]);

  return RangeStore;
})();

exports.RangeStore = RangeStore;

var RangeTracker = (function () {
  function RangeTracker(sorted) {
    _classCallCheck(this, RangeTracker);

    this.sorted = sorted;
    this.pos = 0;
    this.current = [];
  }

  _createClass(RangeTracker, [{
    key: "advanceTo",
    value: function advanceTo(pos) {
      var next = undefined;
      while (this.pos < this.sorted.length && (next = this.sorted[this.pos]).at.cmp(pos) <= 0) {
        var className = next.range.options.className;
        if (!className) continue;
        if (next.type == "open") this.current.push(className);else this.current.splice(this.current.indexOf(className), 1);
        this.pos++;
      }
    }
  }, {
    key: "nextChangeBefore",
    value: function nextChangeBefore(pos) {
      for (;;) {
        if (this.pos == this.sorted.length) return null;
        var next = this.sorted[this.pos];
        if (!next.range.options.className) this.pos++;else if (next.at.cmp(pos) >= 0) return null;else return next.at.offset;
      }
    }
  }]);

  return RangeTracker;
})();
},{"./event":10,"./map":16}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.findByPath = findByPath;
exports.resolvePath = resolvePath;
exports.hasFocus = hasFocus;
exports.posAtCoords = posAtCoords;
exports.coordsAtPos = coordsAtPos;
exports.scrollIntoView = scrollIntoView;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _dom = require("../dom");

var Selection = (function () {
  function Selection(pm) {
    var _this = this;

    _classCallCheck(this, Selection);

    this.pm = pm;
    this.polling = null;
    this.lastAnchorNode = this.lastHeadNode = this.lastAnchorOffset = this.lastHeadOffset = null;
    var start = _model.Pos.start(pm.doc);
    this.range = new Range(start, start);
    pm.content.addEventListener("focus", function () {
      return _this.receivedFocus();
    });
  }

  _createClass(Selection, [{
    key: "setAndSignal",
    value: function setAndSignal(range, clearLast) {
      this.set(range, clearLast);
      this.pm.signal("selectionChange");
    }
  }, {
    key: "set",
    value: function set(range, clearLast) {
      this.range = range;
      if (clearLast !== false) this.lastAnchorNode = null;
    }
  }, {
    key: "poll",
    value: function poll(force) {
      if (this.pm.input.composing || !hasFocus(this.pm)) return;
      var sel = getSelection();
      if (force || sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastHeadNode || sel.focusOffset != this.lastHeadOffset) {
        var _posFromDOM = posFromDOM(this.pm, sel.anchorNode, sel.anchorOffset, force);

        var anchor = _posFromDOM.pos;
        var anchorInline = _posFromDOM.inline;

        var _posFromDOM2 = posFromDOM(this.pm, sel.focusNode, sel.focusOffset, force);

        var head = _posFromDOM2.pos;
        var headInline = _posFromDOM2.inline;

        this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
        this.lastHeadNode = sel.focusNode;this.lastHeadOffset = sel.focusOffset;
        this.pm.sel.setAndSignal(new Range(anchorInline ? anchor : moveInline(this.pm.doc, anchor, this.range.anchor), headInline ? head : moveInline(this.pm.doc, head, this.range.head)), false);
        if (this.range.anchor.cmp(anchor) || this.range.head.cmp(head)) this.toDOM(true);
        return true;
      }
    }
  }, {
    key: "toDOM",
    value: function toDOM(force, takeFocus) {
      var sel = window.getSelection();
      if (!hasFocus(this.pm)) {
        if (!takeFocus) return;
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=921444
        else if (_dom.browser.gecko) this.pm.content.focus();
      }
      if (!force && sel.anchorNode == this.lastAnchorNode && sel.anchorOffset == this.lastAnchorOffset && sel.focusNode == this.lastHeadNode && sel.focusOffset == this.lastHeadOffset) return;

      var range = document.createRange();
      var content = this.pm.content;
      var anchor = DOMFromPos(content, this.range.anchor);
      var head = DOMFromPos(content, this.range.head);

      if (sel.extend) {
        range.setEnd(anchor.node, anchor.offset);
        range.collapse(false);
      } else {
        if (this.range.anchor.cmp(this.range.head) > 0) {
          var tmp = anchor;anchor = head;head = tmp;
        }
        range.setEnd(head.node, head.offset);
        range.setStart(anchor.node, anchor.offset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      if (sel.extend) sel.extend(head.node, head.offset);

      this.lastAnchorNode = anchor.node;this.lastAnchorOffset = anchor.offset;
      this.lastHeadNode = head.node;this.lastHeadOffset = head.offset;
    }
  }, {
    key: "receivedFocus",
    value: function receivedFocus() {
      var _this2 = this;

      var poll = function poll() {
        if (document.activeElement == _this2.pm.content) {
          if (!_this2.pm.operation) _this2.poll();
          clearTimeout(_this2.polling);
          _this2.polling = setTimeout(poll, 50);
        }
      };
      this.polling = setTimeout(poll, 20);
    }
  }]);

  return Selection;
})();

exports.Selection = Selection;

function windowRect() {
  return { left: 0, right: window.innerWidth,
    top: 0, bottom: window.innerHeight };
}

var Range = (function () {
  function Range(anchor, head) {
    _classCallCheck(this, Range);

    this.anchor = anchor;
    this.head = head;
  }

  _createClass(Range, [{
    key: "inverted",
    get: function get() {
      return this.anchor.cmp(this.head) > 0;
    }
  }, {
    key: "from",
    get: function get() {
      return this.inverted ? this.head : this.anchor;
    }
  }, {
    key: "to",
    get: function get() {
      return this.inverted ? this.anchor : this.head;
    }
  }, {
    key: "empty",
    get: function get() {
      return this.anchor.cmp(this.head) == 0;
    }
  }]);

  return Range;
})();

exports.Range = Range;

function attr(node, name) {
  return node.nodeType == 1 && node.getAttribute(name);
}

function scanOffset(node, parent) {
  for (var scan = node ? node.previousSibling : parent.lastChild; scan; scan = scan.previousSibling) {
    var tag = undefined,
        range = undefined;
    if (tag = attr(scan, "pm-path")) return +tag + 1;else if (range = attr(scan, "pm-span")) return +/-(\d+)/.exec(range)[1];
  }
  return 0;
}

function posFromDOM(pm, node, domOffset, force) {
  if (!force && pm.operation && pm.doc != pm.operation.doc) throw new Error("Fetching a position from an outdated DOM structure");

  var path = [],
      inText = false,
      offset = null,
      inline = false,
      prev = undefined;

  if (node.nodeType == 3) {
    inText = true;
    prev = node;
    node = node.parentNode;
  } else {
    prev = node.childNodes[domOffset];
  }

  for (var cur = node; cur != pm.content; prev = cur, cur = cur.parentNode) {
    var tag = undefined,
        range = undefined;
    if (tag = cur.getAttribute("pm-path")) {
      path.unshift(+tag);
      if (offset == null) offset = scanOffset(prev, cur);
    } else if (range = cur.getAttribute("pm-span")) {
      var _dD$exec = /(\d+)-(\d+)/.exec(range);

      var _dD$exec2 = _slicedToArray(_dD$exec, 3);

      var _ = _dD$exec2[0];
      var from = _dD$exec2[1];
      var to = _dD$exec2[2];

      if (inText) offset = +from + domOffset;else offset = domOffset ? +to : +from;
      inline = true;
    } else if (inText && (tag = cur.getAttribute("pm-span-offset"))) {
      domOffset += +tag;
    }
  }
  if (offset == null) offset = scanOffset(prev, node);
  return { pos: new _model.Pos(path, offset), inline: inline };
}

function moveInline(doc, pos, from) {
  var dir = pos.cmp(from);
  var found = dir < 0 ? _model.Pos.before(doc, pos) : _model.Pos.after(doc, pos);
  if (!found) found = dir >= 0 ? _model.Pos.before(doc, pos) : _model.Pos.after(doc, pos);
  return found;
}

function findByPath(node, n, fromEnd) {
  for (var ch = fromEnd ? node.lastChild : node.firstChild; ch; ch = fromEnd ? ch.previousSibling : ch.nextSibling) {
    if (ch.nodeType != 1) continue;
    var path = ch.getAttribute("pm-path");
    if (!path) {
      var found = findByPath(ch, n);
      if (found) return found;
    } else if (+path == n) {
      return ch;
    }
  }
}

function resolvePath(parent, path) {
  var node = parent;
  for (var i = 0; i < path.length; i++) {
    node = findByPath(node, path[i]);
    if (!node) throw new Error("Failed to resolve path " + path.join("/"));
  }
  return node;
}

function findByOffset(node, offset) {
  function search(node, domOffset) {
    if (node.nodeType != 1) return;
    var range = node.getAttribute("pm-span");
    if (range) {
      var _dD$exec3 = /(\d+)-(\d+)/.exec(range);

      var _dD$exec32 = _slicedToArray(_dD$exec3, 3);

      var _ = _dD$exec32[0];
      var from = _dD$exec32[1];
      var to = _dD$exec32[2];

      if (+to >= offset) return { node: node, parent: node.parentNode, offset: domOffset,
        innerOffset: offset - +from };
    } else {
      for (var ch = node.firstChild, i = 0; ch; ch = ch.nextSibling, i++) {
        var result = search(ch, i);
        if (result) return result;
      }
    }
  }
  return search(node);
}

function leafAt(node, offset) {
  for (;;) {
    var child = node.firstChild;
    if (!child) return { node: node, offset: offset };
    if (child.nodeType != 1) return { node: child, offset: offset };
    if (child.hasAttribute("pm-span-offset")) {
      var nodeOffset = 0;
      for (;;) {
        var nextSib = child.nextSibling,
            nextOffset = undefined;
        if (!nextSib || (nextOffset = +nextSib.getAttribute("pm-span-offset")) >= offset) break;
        child = nextSib;
        nodeOffset = nextOffset;
      }
      offset -= nodeOffset;
    }
    node = child;
  }
}

function DOMFromPos(parent, pos) {
  var node = resolvePath(parent, pos.path);
  var found = findByOffset(node, pos.offset),
      inner = undefined;
  if (!found) return { node: node, offset: 0 };
  if (found.node.hasAttribute("pm-span-atom") || !(inner = leafAt(found.node, found.innerOffset))) return { node: found.parent, offset: found.offset + (found.innerOffset ? 1 : 0) };else return inner;
}

function hasFocus(pm) {
  var sel = window.getSelection();
  return sel.rangeCount && (0, _dom.contains)(pm.content, sel.anchorNode);
}

function posAtCoords(pm, coords) {
  var element = document.elementFromPoint(coords.left, coords.top + 1);
  if (!(0, _dom.contains)(pm.content, element)) return _model.Pos.start(pm.doc);

  var offset = undefined;
  if (element.childNodes.length == 1 && element.firstChild.nodeType == 3) {
    element = element.firstChild;
    offset = offsetInTextNode(element, coords);
  } else {
    offset = offsetInElement(element, coords);
  }

  var _posFromDOM3 = posFromDOM(pm, element, offset);

  var pos = _posFromDOM3.pos;
  var inline = _posFromDOM3.inline;

  return inline ? pos : moveInline(pm.doc, pos, pos);
}

function coordsAtPos(pm, pos) {
  var _DOMFromPos = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos.node;
  var offset = _DOMFromPos.offset;

  var rect = undefined;
  if (node.nodeType == 3 && node.nodeValue) {
    var range = document.createRange();
    range.setEnd(node, offset ? offset : offset + 1);
    range.setStart(node, offset ? offset - 1 : offset);
    rect = range.getBoundingClientRect();
  } else if (node.nodeType == 1 && node.firstChild) {
    rect = node.childNodes[offset ? offset - 1 : offset].getBoundingClientRect();
    // BR nodes are likely to return a useless empty rectangle. Try
    // the node on the other side in that case.
    if (rect.left == rect.right && offset && offset < node.childNodes.length) {
      var otherRect = node.childNodes[offset].getBoundingClientRect();
      if (otherRect.left != otherRect.right) rect = { top: otherRect.top, bottom: otherRect.bottom, right: otherRect.left };
    }
  } else {
    rect = node.getBoundingClientRect();
  }
  var x = offset ? rect.right : rect.left;
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}

var scrollMargin = 5;

function scrollIntoView(pm, pos) {
  if (!pos) pos = pm.sel.range.head;
  var coords = coordsAtPos(pm, pos);
  for (var _parent = pm.content;; _parent = _parent.parentNode) {
    var atBody = _parent == document.body;
    var rect = atBody ? windowRect() : _parent.getBoundingClientRect();
    if (coords.top < rect.top) _parent.scrollTop -= rect.top - coords.top + scrollMargin;else if (coords.bottom > rect.bottom) _parent.scrollTop += coords.bottom - rect.bottom + scrollMargin;
    if (coords.left < rect.left) _parent.scrollLeft -= rect.left - coords.left + scrollMargin;else if (coords.right > rect.right) _parent.scrollLeft += coords.right - rect.right + scrollMargin;
    if (atBody) break;
  }
}

function offsetInRects(coords, rects) {
  var y = coords.top;
  var x = coords.left;

  var minY = 1e5,
      minX = 1e5,
      offset = 0;
  for (var i = 0; i < rects.length; i++) {
    var rect = rects[i];
    if (!rect || rect.top == 0 && rect.bottom == 0) continue;
    var dY = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (dY > minY) continue;
    if (dY < minY) {
      minY = dY;minX = 1e5;
    }
    var dX = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    if (dX < minX) {
      minX = dX;
      offset = Math.abs(x - rect.left) < Math.abs(x - rect.right) ? i : i + 1;
    }
  }
  return offset;
}

function offsetInTextNode(text, coords) {
  var len = text.nodeValue.length;
  var range = document.createRange();
  var rects = [];
  for (var i = 0; i < len; i++) {
    range.setEnd(text, i + 1);
    range.setStart(text, i);
    rects.push(range.getBoundingClientRect());
  }
  return offsetInRects(coords, rects);
}

function offsetInElement(element, coords) {
  var rects = [];
  for (var child = element.firstChild; child; child = child.nextSibling) {
    rects.push(child.getBoundingClientRect());
  }return offsetInRects(coords, rects);
}
},{"../dom":3,"../model":22}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _schema = require("./schema");

var Doc = (function (_Block) {
  _inherits(Doc, _Block);

  function Doc() {
    _classCallCheck(this, Doc);

    _get(Object.getPrototypeOf(Doc.prototype), "constructor", this).apply(this, arguments);
  }

  return Doc;
})(_schema.Block);

exports.Doc = Doc;

var BlockQuote = (function (_Block2) {
  _inherits(BlockQuote, _Block2);

  function BlockQuote() {
    _classCallCheck(this, BlockQuote);

    _get(Object.getPrototypeOf(BlockQuote.prototype), "constructor", this).apply(this, arguments);
  }

  return BlockQuote;
})(_schema.Block);

exports.BlockQuote = BlockQuote;

var OrderedList = (function (_Block3) {
  _inherits(OrderedList, _Block3);

  function OrderedList() {
    _classCallCheck(this, OrderedList);

    _get(Object.getPrototypeOf(OrderedList.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(OrderedList, null, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }]);

  return OrderedList;
})(_schema.Block);

exports.OrderedList = OrderedList;

OrderedList.attributes = { order: new _schema.Attribute("1") };

var BulletList = (function (_Block4) {
  _inherits(BulletList, _Block4);

  function BulletList() {
    _classCallCheck(this, BulletList);

    _get(Object.getPrototypeOf(BulletList.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(BulletList, null, [{
    key: "contains",
    get: function get() {
      return "list_item";
    }
  }]);

  return BulletList;
})(_schema.Block);

exports.BulletList = BulletList;

var ListItem = (function (_Block5) {
  _inherits(ListItem, _Block5);

  function ListItem() {
    _classCallCheck(this, ListItem);

    _get(Object.getPrototypeOf(ListItem.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(ListItem, null, [{
    key: "category",
    get: function get() {
      return "list_item";
    }
  }]);

  return ListItem;
})(_schema.Block);

exports.ListItem = ListItem;

var HorizontalRule = (function (_Block6) {
  _inherits(HorizontalRule, _Block6);

  function HorizontalRule() {
    _classCallCheck(this, HorizontalRule);

    _get(Object.getPrototypeOf(HorizontalRule.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(HorizontalRule, null, [{
    key: "contains",
    get: function get() {
      return null;
    }
  }]);

  return HorizontalRule;
})(_schema.Block);

exports.HorizontalRule = HorizontalRule;

var Heading = (function (_Textblock) {
  _inherits(Heading, _Textblock);

  function Heading() {
    _classCallCheck(this, Heading);

    _get(Object.getPrototypeOf(Heading.prototype), "constructor", this).apply(this, arguments);
  }

  return Heading;
})(_schema.Textblock);

exports.Heading = Heading;

Heading.attributes = { level: new _schema.Attribute("1") };

var CodeBlock = (function (_Textblock2) {
  _inherits(CodeBlock, _Textblock2);

  function CodeBlock() {
    _classCallCheck(this, CodeBlock);

    _get(Object.getPrototypeOf(CodeBlock.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(CodeBlock, [{
    key: "plainText",
    get: function get() {
      return true;
    }
  }]);

  return CodeBlock;
})(_schema.Textblock);

exports.CodeBlock = CodeBlock;

var Paragraph = (function (_Textblock3) {
  _inherits(Paragraph, _Textblock3);

  function Paragraph() {
    _classCallCheck(this, Paragraph);

    _get(Object.getPrototypeOf(Paragraph.prototype), "constructor", this).apply(this, arguments);
  }

  return Paragraph;
})(_schema.Textblock);

exports.Paragraph = Paragraph;

var Image = (function (_Inline) {
  _inherits(Image, _Inline);

  function Image() {
    _classCallCheck(this, Image);

    _get(Object.getPrototypeOf(Image.prototype), "constructor", this).apply(this, arguments);
  }

  return Image;
})(_schema.Inline);

exports.Image = Image;

Image.attributes = {
  src: new _schema.Attribute(),
  title: new _schema.Attribute(""),
  alt: new _schema.Attribute("")
};

var HardBreak = (function (_Inline2) {
  _inherits(HardBreak, _Inline2);

  function HardBreak() {
    _classCallCheck(this, HardBreak);

    _get(Object.getPrototypeOf(HardBreak.prototype), "constructor", this).apply(this, arguments);
  }

  // Style types

  return HardBreak;
})(_schema.Inline);

exports.HardBreak = HardBreak;

var EmStyle = (function (_StyleType) {
  _inherits(EmStyle, _StyleType);

  function EmStyle() {
    _classCallCheck(this, EmStyle);

    _get(Object.getPrototypeOf(EmStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(EmStyle, null, [{
    key: "rank",
    get: function get() {
      return 51;
    }
  }]);

  return EmStyle;
})(_schema.StyleType);

exports.EmStyle = EmStyle;

var StrongStyle = (function (_StyleType2) {
  _inherits(StrongStyle, _StyleType2);

  function StrongStyle() {
    _classCallCheck(this, StrongStyle);

    _get(Object.getPrototypeOf(StrongStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(StrongStyle, null, [{
    key: "rank",
    get: function get() {
      return 52;
    }
  }]);

  return StrongStyle;
})(_schema.StyleType);

exports.StrongStyle = StrongStyle;

var LinkStyle = (function (_StyleType3) {
  _inherits(LinkStyle, _StyleType3);

  function LinkStyle() {
    _classCallCheck(this, LinkStyle);

    _get(Object.getPrototypeOf(LinkStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(LinkStyle, null, [{
    key: "rank",
    get: function get() {
      return 53;
    }
  }]);

  return LinkStyle;
})(_schema.StyleType);

exports.LinkStyle = LinkStyle;

LinkStyle.attributes = {
  href: new _schema.Attribute(),
  title: new _schema.Attribute("")
};

var CodeStyle = (function (_StyleType4) {
  _inherits(CodeStyle, _StyleType4);

  function CodeStyle() {
    _classCallCheck(this, CodeStyle);

    _get(Object.getPrototypeOf(CodeStyle.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(CodeStyle, null, [{
    key: "rank",
    get: function get() {
      return 101;
    }
  }]);

  return CodeStyle;
})(_schema.StyleType);

exports.CodeStyle = CodeStyle;

var defaultSpec = new _schema.SchemaSpec({
  doc: Doc,
  blockquote: BlockQuote,
  ordered_list: OrderedList,
  bullet_list: BulletList,
  list_item: ListItem,
  horizontal_rule: HorizontalRule,

  paragraph: Paragraph,
  heading: Heading,
  code_block: CodeBlock,

  text: _schema.Text,
  image: Image,
  hard_break: HardBreak
}, {
  em: EmStyle,
  strong: StrongStyle,
  link: LinkStyle,
  code: CodeStyle
});

var defaultSchema = new _schema.Schema(defaultSpec);
exports.defaultSchema = defaultSchema;
},{"./schema":26}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findDiffStart = findDiffStart;
exports.findDiffEnd = findDiffEnd;

var _pos = require("./pos");

var _style = require("./style");

function findDiffStart(a, b) {
  var pathA = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var pathB = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  var offset = 0;
  for (var i = 0;; i++) {
    if (i == a.length || i == b.length) {
      if (a.length == b.length) return null;
      break;
    }
    var childA = a.child(i),
        childB = b.child(i);
    if (childA == childB) {
      offset += a.isTextblock ? childA.offset : 1;
      continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (a.isTextblock) {
      if (!(0, _style.sameStyles)(childA.styles, childB.styles)) break;
      if (childA.type.name == "text" && childA.text != childB.text) {
        for (var j = 0; childA.text[j] == childB.text[j]; j++) {
          offset++;
        }break;
      }
      offset += childA.offset;
    } else {
      var inner = findDiffStart(childA, childB, pathA.concat(i), pathB.concat(i));
      if (inner) return inner;
      offset++;
    }
  }
  return { a: new _pos.Pos(pathA, offset), b: new _pos.Pos(pathB, offset) };
}

function findDiffEnd(a, b) {
  var pathA = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];
  var pathB = arguments.length <= 3 || arguments[3] === undefined ? [] : arguments[3];

  var iA = a.length,
      iB = b.length;
  var offset = 0;

  for (;; iA--, iB--) {
    if (iA == 0 || iB == 0) {
      if (iA == iB) return null;
      break;
    }
    var childA = a.child(iA - 1),
        childB = b.child(iB - 1);
    if (childA == childB) {
      offset += a.isTextblock ? childA.text.length : 1;
      continue;
    }

    if (!childA.sameMarkup(childB)) break;

    if (a.isTextblock) {
      if (!(0, _style.sameStyles)(childA.styles, childB.styles)) break;

      if (childA.text != childB.text) {
        var same = 0,
            minSize = Math.min(childA.text.length, childB.text.length);
        while (same < minSize && childA.text[childA.text.length - same - 1] == childB.text[childB.text.length - same - 1]) {
          same++;
          offset++;
        }
        break;
      }
      offset += childA.text.length;
    } else {
      var inner = findDiffEnd(childA, childB, pathA.concat(iA - 1), pathB.concat(iB - 1));
      if (inner) return inner;
      offset++;
    }
  }
  return { a: new _pos.Pos(pathA, a.maxOffset - offset),
    b: new _pos.Pos(pathB, b.maxOffset - offset) };
}
},{"./pos":25,"./style":28}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
        value: true
});

var _node = require("./node");

Object.defineProperty(exports, "compareMarkup", {
        enumerable: true,
        get: function get() {
                return _node.compareMarkup;
        }
});

var _style = require("./style");

Object.defineProperty(exports, "removeStyle", {
        enumerable: true,
        get: function get() {
                return _style.removeStyle;
        }
});
Object.defineProperty(exports, "sameStyles", {
        enumerable: true,
        get: function get() {
                return _style.sameStyles;
        }
});
Object.defineProperty(exports, "containsStyle", {
        enumerable: true,
        get: function get() {
                return _style.containsStyle;
        }
});

var _schema = require("./schema");

Object.defineProperty(exports, "SchemaSpec", {
        enumerable: true,
        get: function get() {
                return _schema.SchemaSpec;
        }
});
Object.defineProperty(exports, "Schema", {
        enumerable: true,
        get: function get() {
                return _schema.Schema;
        }
});
Object.defineProperty(exports, "SchemaError", {
        enumerable: true,
        get: function get() {
                return _schema.SchemaError;
        }
});
Object.defineProperty(exports, "NodeType", {
        enumerable: true,
        get: function get() {
                return _schema.NodeType;
        }
});
Object.defineProperty(exports, "Block", {
        enumerable: true,
        get: function get() {
                return _schema.Block;
        }
});
Object.defineProperty(exports, "Textblock", {
        enumerable: true,
        get: function get() {
                return _schema.Textblock;
        }
});
Object.defineProperty(exports, "Inline", {
        enumerable: true,
        get: function get() {
                return _schema.Inline;
        }
});
Object.defineProperty(exports, "Text", {
        enumerable: true,
        get: function get() {
                return _schema.Text;
        }
});
Object.defineProperty(exports, "StyleType", {
        enumerable: true,
        get: function get() {
                return _schema.StyleType;
        }
});
Object.defineProperty(exports, "Attribute", {
        enumerable: true,
        get: function get() {
                return _schema.Attribute;
        }
});

var _defaultschema = require("./defaultschema");

Object.defineProperty(exports, "defaultSchema", {
        enumerable: true,
        get: function get() {
                return _defaultschema.defaultSchema;
        }
});
Object.defineProperty(exports, "Doc", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Doc;
        }
});
Object.defineProperty(exports, "BlockQuote", {
        enumerable: true,
        get: function get() {
                return _defaultschema.BlockQuote;
        }
});
Object.defineProperty(exports, "OrderedList", {
        enumerable: true,
        get: function get() {
                return _defaultschema.OrderedList;
        }
});
Object.defineProperty(exports, "BulletList", {
        enumerable: true,
        get: function get() {
                return _defaultschema.BulletList;
        }
});
Object.defineProperty(exports, "ListItem", {
        enumerable: true,
        get: function get() {
                return _defaultschema.ListItem;
        }
});
Object.defineProperty(exports, "HorizontalRule", {
        enumerable: true,
        get: function get() {
                return _defaultschema.HorizontalRule;
        }
});
Object.defineProperty(exports, "Paragraph", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Paragraph;
        }
});
Object.defineProperty(exports, "Heading", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Heading;
        }
});
Object.defineProperty(exports, "CodeBlock", {
        enumerable: true,
        get: function get() {
                return _defaultschema.CodeBlock;
        }
});
Object.defineProperty(exports, "Image", {
        enumerable: true,
        get: function get() {
                return _defaultschema.Image;
        }
});
Object.defineProperty(exports, "HardBreak", {
        enumerable: true,
        get: function get() {
                return _defaultschema.HardBreak;
        }
});
Object.defineProperty(exports, "CodeStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.CodeStyle;
        }
});
Object.defineProperty(exports, "EmStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.EmStyle;
        }
});
Object.defineProperty(exports, "StrongStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.StrongStyle;
        }
});
Object.defineProperty(exports, "LinkStyle", {
        enumerable: true,
        get: function get() {
                return _defaultschema.LinkStyle;
        }
});

var _pos = require("./pos");

Object.defineProperty(exports, "Pos", {
        enumerable: true,
        get: function get() {
                return _pos.Pos;
        }
});

var _slice = require("./slice");

Object.defineProperty(exports, "sliceBefore", {
        enumerable: true,
        get: function get() {
                return _slice.sliceBefore;
        }
});
Object.defineProperty(exports, "sliceAfter", {
        enumerable: true,
        get: function get() {
                return _slice.sliceAfter;
        }
});
Object.defineProperty(exports, "sliceBetween", {
        enumerable: true,
        get: function get() {
                return _slice.sliceBetween;
        }
});

var _inline = require("./inline");

Object.defineProperty(exports, "spanAtOrBefore", {
        enumerable: true,
        get: function get() {
                return _inline.spanAtOrBefore;
        }
});
Object.defineProperty(exports, "getSpan", {
        enumerable: true,
        get: function get() {
                return _inline.getSpan;
        }
});
Object.defineProperty(exports, "spanStylesAt", {
        enumerable: true,
        get: function get() {
                return _inline.spanStylesAt;
        }
});
Object.defineProperty(exports, "rangeHasStyle", {
        enumerable: true,
        get: function get() {
                return _inline.rangeHasStyle;
        }
});

var _diff = require("./diff");

Object.defineProperty(exports, "findDiffStart", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffStart;
        }
});
Object.defineProperty(exports, "findDiffEnd", {
        enumerable: true,
        get: function get() {
                return _diff.findDiffEnd;
        }
});
},{"./defaultschema":20,"./diff":21,"./inline":23,"./node":24,"./pos":25,"./schema":26,"./slice":27,"./style":28}],23:[function(require,module,exports){
// Primitive operations on inline content

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getSpan = getSpan;
exports.spanAtOrBefore = spanAtOrBefore;
exports.spanStylesAt = spanStylesAt;
exports.rangeHasStyle = rangeHasStyle;

var _style = require("./style");

function getSpan(doc, pos) {
  return spanAtOrBefore(doc.path(pos.path), pos.offset).node;
}

function spanAtOrBefore(parent, offset) {
  for (var i = 0; i < parent.length; i++) {
    var child = parent.child(i);
    offset -= child.offset;
    if (offset <= 0) return { node: child, offset: i, innerOffset: offset + child.offset };
  }
  return { node: null, offset: 0, innerOffset: 0 };
}

var empty = [];

function spanStylesAt(doc, pos) {
  var _spanAtOrBefore = spanAtOrBefore(doc.path(pos.path), pos.offset);

  var node = _spanAtOrBefore.node;

  return node ? node.styles : empty;
}

function rangeHasStyle(doc, from, to, type) {
  function scan(_x, _x2, _x3, _x4, _x5) {
    var _left;

    var _again = true;

    _function: while (_again) {
      var node = _x,
          from = _x2,
          to = _x3,
          type = _x4,
          depth = _x5;
      start = end = i = offset = child = size = start = end = found = i = undefined;
      _again = false;

      if (node.isTextblock) {
        var start = from ? from.offset : 0;
        var end = to ? to.offset : 1e5;
        for (var i = 0, offset = 0; i < node.length; i++) {
          var child = node.child(i),
              size = child.offset;
          if (offset < end && offset + size > start && (0, _style.containsStyle)(child.styles, type)) return true;
          offset += size;
        }
      } else if (node.length) {
        var start = from ? from.path[depth] : 0;
        var end = to ? to.path[depth] : node.length - 1;
        if (start == end) {
          _x = node.child(start);
          _x2 = from;
          _x3 = to;
          _x4 = type;
          _x5 = depth + 1;
          _again = true;
          continue _function;
        } else {
          var found = scan(node.child(start), from, null, type, depth + 1);
          for (var i = start + 1; i < end && !found; i++) {
            found = scan(node.child(i), null, null, type, depth + 1);
          }
          if (_left = found) {
            return _left;
          }

          _x = node.child(end);
          _x2 = null;
          _x3 = to;
          _x4 = type;
          _x5 = depth + 1;
          _again = true;
          continue _function;
        }
      }
    }
  }
  return scan(doc, from, to, type, 0);
}
},{"./style":28}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x7, _x8, _x9) { var _again = true; _function: while (_again) { var object = _x7, property = _x8, receiver = _x9; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x7 = parent; _x8 = property; _x9 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.compareMarkup = compareMarkup;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _style = require("./style");

var emptyArray = [];

var Node = (function () {
  function Node(type, attrs) {
    _classCallCheck(this, Node);

    this.type = type;
    this.attrs = attrs;
  }

  _createClass(Node, [{
    key: "sameMarkup",
    value: function sameMarkup(other) {
      return compareMarkup(this.type, other.type, this.attrs, other.attrs);
    }
  }, {
    key: "child",
    value: function child(_) {
      throw new Error("Trying to index non-block node " + this);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = { type: this.type.name };
      for (var _ in this.attrs) {
        obj.attrs = this.attrs;
        return obj;
      }
      return obj;
    }
  }, {
    key: "length",
    get: function get() {
      return 0;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return false;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }
  }, {
    key: "isInline",
    get: function get() {
      return false;
    }
  }, {
    key: "isText",
    get: function get() {
      return false;
    }
  }]);

  return Node;
})();

exports.Node = Node;

var BlockNode = (function (_Node) {
  _inherits(BlockNode, _Node);

  function BlockNode(type, attrs, content, styles) {
    _classCallCheck(this, BlockNode);

    if (styles) throw new Error("Constructing a block node with styles");
    _get(Object.getPrototypeOf(BlockNode.prototype), "constructor", this).call(this, type, attrs);
    this.content = content || (type.contains ? [] : emptyArray);
  }

  _createClass(BlockNode, [{
    key: "toString",
    value: function toString() {
      return this.type.name + "(" + this.content.join(", ") + ")";
    }
  }, {
    key: "copy",
    value: function copy() {
      var content = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

      return new this.constructor(this.type, this.attrs, content);
    }
  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.length : arguments[1];

      return this.content.slice(from, to);
    }

    // FIXME maybe slice and splice returning different things is going to confuse
  }, {
    key: "splice",
    value: function splice(from, to, replace) {
      return new this.constructor(this.type, this.attrs, this.content.slice(0, from).concat(replace).concat(this.content.slice(to)));
    }
  }, {
    key: "replace",
    value: function replace(pos, node) {
      var content = this.content.slice();
      content[pos] = node;
      return this.copy(content);
    }
  }, {
    key: "replaceDeep",
    value: function replaceDeep(path, node) {
      var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (depth == path.length) return node;
      var pos = path[depth];
      return this.replace(pos, this.child(pos).replaceDeep(path, node, depth + 1));
    }
  }, {
    key: "append",
    value: function append(nodes) {
      var joinDepth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (!nodes.length) return this;
      if (!this.length) return this.copy(nodes);

      var last = this.length - 1,
          content = this.content.slice(0, last);
      var before = this.content[last],
          after = nodes[0];
      if (joinDepth && before.sameMarkup(after)) {
        content.push(before.append(after.content, joinDepth - 1));
      } else {
        content.push(before, after);
      }
      for (var i = 1; i < nodes.length; i++) {
        content.push(nodes[i]);
      }return this.copy(content);
    }
  }, {
    key: "child",
    value: function child(i) {
      if (i < 0 || i > this.length) throw new Error("Index " + i + " out of range in " + this);
      return this.content[i];
    }
  }, {
    key: "path",
    value: function path(_path) {
      for (var i = 0, node = this; i < _path.length; node = node.content[_path[i]], i++) {}
      return node;
    }
  }, {
    key: "isValidPos",
    value: function isValidPos(pos, requireInBlock) {
      for (var i = 0, node = this;; i++) {
        if (i == pos.path.length) {
          if (requireInBlock && !node.isTextblock) return false;
          return pos.offset <= node.maxOffset;
        } else {
          var n = pos.path[i];
          if (n >= node.length || node.isTextblock) return false;
          node = node.child(n);
        }
      }
    }
  }, {
    key: "pathNodes",
    value: function pathNodes(path) {
      var nodes = [];
      for (var i = 0, node = this;; i++) {
        nodes.push(node);
        if (i == path.length) break;
        node = node.child(path[i]);
      }
      return nodes;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(BlockNode.prototype), "toJSON", this).call(this);
      obj.content = this.content.map(function (n) {
        return n.toJSON();
      });
      return obj;
    }
  }, {
    key: "maxOffset",
    get: function get() {
      return this.length;
    }
  }, {
    key: "textContent",
    get: function get() {
      var text = "";
      for (var i = 0; i < this.length; i++) {
        text += this.child(i).textContent;
      }return text;
    }
  }, {
    key: "firstChild",
    get: function get() {
      return this.content[0] || null;
    }
  }, {
    key: "lastChild",
    get: function get() {
      return this.content[this.length - 1] || null;
    }
  }, {
    key: "length",
    get: function get() {
      return this.content.length;
    }
  }, {
    key: "children",
    get: function get() {
      return this.content;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return true;
    }
  }]);

  return BlockNode;
})(Node);

exports.BlockNode = BlockNode;

var TextblockNode = (function (_BlockNode) {
  _inherits(TextblockNode, _BlockNode);

  function TextblockNode() {
    _classCallCheck(this, TextblockNode);

    _get(Object.getPrototypeOf(TextblockNode.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(TextblockNode, [{
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.maxOffset : arguments[1];

      var result = [];
      if (from == to) return result;
      for (var i = 0, offset = 0;; i++) {
        var child = this.child(i),
            size = child.offset,
            end = offset + size;
        if (offset + size > from) result.push(offset >= from && end <= to ? child : child.slice(Math.max(0, from - offset), Math.min(size, to - offset)));
        if (end >= to) return result;
        offset = end;
      }
    }
  }, {
    key: "append",
    value: function append(nodes) {
      if (!nodes.length) return this;
      if (!this.length) return this.copy(nodes);

      var content = this.content.concat(nodes),
          last = this.length - 1,
          merged = undefined;
      if (merged = content[last].maybeMerge(content[last + 1])) content.splice(last, 2, merged);
      return this.copy(content);
    }
  }, {
    key: "maxOffset",
    get: function get() {
      var sum = 0;
      for (var i = 0; i < this.length; i++) {
        sum += this.child(i).offset;
      }return sum;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return true;
    }
  }]);

  return TextblockNode;
})(BlockNode);

exports.TextblockNode = TextblockNode;

var InlineNode = (function (_Node2) {
  _inherits(InlineNode, _Node2);

  function InlineNode(type, attrs, content, styles) {
    _classCallCheck(this, InlineNode);

    if (content) throw new Error("Can't create a span node with content");
    _get(Object.getPrototypeOf(InlineNode.prototype), "constructor", this).call(this, type, attrs);
    this.styles = styles || emptyArray;
  }

  _createClass(InlineNode, [{
    key: "styled",
    value: function styled(styles) {
      return new this.constructor(this.type, this.attrs, this.text, styles);
    }
  }, {
    key: "maybeMerge",
    value: function maybeMerge(_) {
      return null;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(InlineNode.prototype), "toJSON", this).call(this);
      if (this.styles.length) obj.styles = this.styles;
      return obj;
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.type.name;
    }
  }, {
    key: "offset",
    get: function get() {
      return 1;
    }
  }, {
    key: "textContent",
    get: function get() {
      return "";
    }
  }, {
    key: "isInline",
    get: function get() {
      return true;
    }
  }]);

  return InlineNode;
})(Node);

exports.InlineNode = InlineNode;

var TextNode = (function (_InlineNode) {
  _inherits(TextNode, _InlineNode);

  function TextNode(type, attrs, content, styles) {
    _classCallCheck(this, TextNode);

    if (typeof content != "string") throw new Error("Passing non-string as text node content");
    _get(Object.getPrototypeOf(TextNode.prototype), "constructor", this).call(this, type, attrs, null, styles);
    this.text = content;
  }

  _createClass(TextNode, [{
    key: "maybeMerge",
    value: function maybeMerge(other) {
      if (other.type == this.type && (0, _style.sameStyles)(this.styles, other.styles)) return new TextNode(this.type, this.attrs, this.text + other.text, this.styles);
    }
  }, {
    key: "slice",
    value: function slice(from) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? this.offset : arguments[1];

      return new TextNode(this.type, this.attrs, this.text.slice(from, to), this.styles);
    }
  }, {
    key: "toString",
    value: function toString() {
      var text = JSON.stringify(this.text);
      for (var i = 0; i < this.styles.length; i++) {
        text = this.styles[i].type.name + "(" + text + ")";
      }return text;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var obj = _get(Object.getPrototypeOf(TextNode.prototype), "toJSON", this).call(this);
      obj.text = this.text;
      return obj;
    }
  }, {
    key: "offset",
    get: function get() {
      return this.text.length;
    }
  }, {
    key: "textContent",
    get: function get() {
      return this.text;
    }
  }, {
    key: "isText",
    get: function get() {
      return true;
    }
  }]);

  return TextNode;
})(InlineNode);

exports.TextNode = TextNode;

function compareMarkup(typeA, typeB, attrsA, attrsB) {
  if (typeA != typeB) return false;
  for (var prop in attrsA) if (attrsB[prop] !== attrsA[prop]) return false;
  return true;
}
},{"./style":28}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Pos = (function () {
  function Pos(path, offset) {
    _classCallCheck(this, Pos);

    this.path = path;
    this.offset = offset;
  }

  _createClass(Pos, [{
    key: "toString",
    value: function toString() {
      return this.path.join("/") + ":" + this.offset;
    }
  }, {
    key: "cmp",
    value: function cmp(other) {
      return Pos.cmp(this.path, this.offset, other.path, other.offset);
    }
  }, {
    key: "shorten",
    value: function shorten() {
      var to = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
      var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      if (to >= this.depth) return this;
      return Pos.shorten(this.path, to, offset);
    }
  }, {
    key: "shift",
    value: function shift(by) {
      return new Pos(this.path, this.offset + by);
    }
  }, {
    key: "extend",
    value: function extend(pos) {
      var path = this.path.slice(),
          add = this.offset;
      for (var i = 0; i < pos.path.length; i++) {
        path.push(pos.path[i] + add);
        add = 0;
      }
      return new Pos(path, pos.offset + add);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return this;
    }
  }, {
    key: "depth",
    get: function get() {
      return this.path.length;
    }
  }], [{
    key: "cmp",
    value: function cmp(pathA, offsetA, pathB, offsetB) {
      var lenA = pathA.length,
          lenB = pathB.length;
      for (var i = 0, end = Math.min(lenA, lenB); i < end; i++) {
        var diff = pathA[i] - pathB[i];
        if (diff != 0) return diff;
      }
      if (lenA > lenB) return offsetB <= pathA[i] ? 1 : -1;else if (lenB > lenA) return offsetA <= pathB[i] ? -1 : 1;else return offsetA - offsetB;
    }
  }, {
    key: "samePath",
    value: function samePath(pathA, pathB) {
      if (pathA.length != pathB.length) return false;
      for (var i = 0; i < pathA.length; i++) {
        if (pathA[i] !== pathB[i]) return false;
      }return true;
    }
  }, {
    key: "shorten",
    value: function shorten(path) {
      var to = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var offset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

      if (to == null) to = path.length - 1;
      return new Pos(path.slice(0, to), path[to] + offset);
    }
  }, {
    key: "fromJSON",
    value: function fromJSON(json) {
      return new Pos(json.path, json.offset);
    }
  }, {
    key: "after",
    value: function after(node, pos) {
      return findAfter(node, pos, []);
    }
  }, {
    key: "start",
    value: function start(node) {
      return findLeft(node, []);
    }
  }, {
    key: "before",
    value: function before(node, pos) {
      return findBefore(node, pos, []);
    }
  }, {
    key: "end",
    value: function end(node) {
      return findRight(node, []);
    }
  }, {
    key: "near",
    value: function near(node, pos) {
      return Pos.after(node, pos) || Pos.before(node, pos);
    }
  }]);

  return Pos;
})();

exports.Pos = Pos;

function findLeft(node, path) {
  if (node.isTextblock) return new Pos(path, 0);
  for (var i = 0; i < node.length; i++) {
    path.push(i);
    var found = findLeft(node.child(i), path);
    if (found) return found;
    path.pop();
  }
}

function findAfter(node, pos, path) {
  if (node.isTextblock) return pos;
  var atEnd = path.length == pos.path.length;
  var start = atEnd ? pos.offset : pos.path[path.length];
  for (var i = start; i < node.length; i++) {
    path.push(i);
    var child = node.child(i);
    var found = i == start && !atEnd ? findAfter(child, pos, path) : findLeft(child, path);
    if (found) return found;
    path.pop();
  }
}

function findRight(node, path) {
  if (node.isTextblock) return new Pos(path, node.maxOffset);
  for (var i = node.length - 1; i >= 0; i--) {
    path.push(i);
    var found = findRight(node.child(i), path);
    if (found) return found;
    path.pop();
  }
}

function findBefore(node, pos, path) {
  if (node.isTextblock) return pos;
  var atEnd = pos.path.length == path.length;
  var end = atEnd ? pos.offset - 1 : pos.path[path.length];
  for (var i = end; i >= 0; i--) {
    path.push(i);
    var child = node.child(i);
    var found = i == end && !atEnd ? findBefore(child, pos, path) : findRight(child, path);
    if (found) return found;
    path.pop();
  }
}
},{}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _node = require("./node");

var _style = require("./style");

var _utilError = require("../util/error");

var SchemaError = (function (_ProseMirrorError) {
  _inherits(SchemaError, _ProseMirrorError);

  function SchemaError() {
    _classCallCheck(this, SchemaError);

    _get(Object.getPrototypeOf(SchemaError.prototype), "constructor", this).apply(this, arguments);
  }

  return SchemaError;
})(_utilError.ProseMirrorError);

exports.SchemaError = SchemaError;

var NodeType = (function () {
  function NodeType(name, contains, categories, attrs, schema) {
    _classCallCheck(this, NodeType);

    this.name = name;
    this.contains = contains;
    this.categories = categories;
    this.attrs = attrs;
    this.schema = schema;
    this.defaultAttrs = null;
  }

  _createClass(NodeType, [{
    key: "canContain",
    value: function canContain(type) {
      return type.categories.indexOf(this.contains) > -1;
    }
  }, {
    key: "findConnection",
    value: function findConnection(other) {
      if (this.canContain(other)) return [];

      var seen = Object.create(null);
      var active = [{ from: this, via: [] }];
      while (active.length) {
        var current = active.shift();
        for (var _name in this.schema.nodes) {
          var type = this.schema.nodeType(_name);
          if (!(type.contains in seen) && current.from.canContain(type)) {
            var via = current.via.concat(type);
            if (type.canContain(other)) return via;
            active.push({ from: type, via: via });
            seen[type.contains] = true;
          }
        }
      }
    }
  }, {
    key: "buildAttrs",
    value: (function (_buildAttrs) {
      function buildAttrs(_x, _x2) {
        return _buildAttrs.apply(this, arguments);
      }

      buildAttrs.toString = function () {
        return _buildAttrs.toString();
      };

      return buildAttrs;
    })(function (attrs, content) {
      if (!attrs && this.defaultAttrs) return this.defaultAttrs;else return buildAttrs(this.attrs, attrs, this, content);
    })
  }, {
    key: "create",
    value: function create(attrs, content, styles) {
      return new this.instance(this, this.buildAttrs(attrs, content), content, styles);
    }
  }, {
    key: "plainText",
    get: function get() {
      return false;
    }
  }, {
    key: "configurable",
    get: function get() {
      return true;
    }
  }, {
    key: "textblock",
    get: function get() {
      return false;
    }
  }], [{
    key: "compile",
    value: function compile(types, schema) {
      var result = Object.create(null);
      var categoriesSeen = Object.create(null);
      for (var _name2 in types) {
        var info = types[_name2];
        var type = info.type || SchemaError.raise("Missing node type for " + _name2);
        var categories = (info.category || type.category).split(" ");
        categories.forEach(function (n) {
          return categoriesSeen[n] = true;
        });
        var contains = "contains" in info ? info.contains : type.contains;
        result[_name2] = new type(_name2, contains, categories, info.attributes || type.attributes, schema);
      }
      for (var _name3 in result) {
        var contains = result[_name3].contains;
        if (contains && !(contains in categoriesSeen)) SchemaError.raise("Node type " + _name3 + " is specified to contain non-existing category " + contains);
      }
      if (!result.doc) SchemaError.raise("Every schema needs a 'doc' type");
      if (!result.text) SchemaError.raise("Every schema needs a 'text' type");

      for (var _name4 in types) {
        types[_name4].defaultAttrs = getDefaultAttrs(types[_name4].attrs);
      }return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }]);

  return NodeType;
})();

exports.NodeType = NodeType;

NodeType.attributes = {};

var Block = (function (_NodeType) {
  _inherits(Block, _NodeType);

  function Block() {
    _classCallCheck(this, Block);

    _get(Object.getPrototypeOf(Block.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Block, [{
    key: "instance",
    get: function get() {
      return _node.BlockNode;
    }
  }], [{
    key: "contains",
    get: function get() {
      return "block";
    }
  }, {
    key: "category",
    get: function get() {
      return "block";
    }
  }]);

  return Block;
})(NodeType);

exports.Block = Block;

var Textblock = (function (_Block) {
  _inherits(Textblock, _Block);

  function Textblock() {
    _classCallCheck(this, Textblock);

    _get(Object.getPrototypeOf(Textblock.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Textblock, [{
    key: "instance",
    get: function get() {
      return _node.TextblockNode;
    }
  }, {
    key: "textblock",
    get: function get() {
      return true;
    }
  }], [{
    key: "contains",
    get: function get() {
      return "inline";
    }
  }]);

  return Textblock;
})(Block);

exports.Textblock = Textblock;

var Inline = (function (_NodeType2) {
  _inherits(Inline, _NodeType2);

  function Inline() {
    _classCallCheck(this, Inline);

    _get(Object.getPrototypeOf(Inline.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Inline, [{
    key: "instance",
    get: function get() {
      return _node.InlineNode;
    }
  }], [{
    key: "contains",
    get: function get() {
      return null;
    }
  }, {
    key: "category",
    get: function get() {
      return "inline";
    }
  }]);

  return Inline;
})(NodeType);

exports.Inline = Inline;

var Text = (function (_Inline) {
  _inherits(Text, _Inline);

  function Text() {
    _classCallCheck(this, Text);

    _get(Object.getPrototypeOf(Text.prototype), "constructor", this).apply(this, arguments);
  }

  // Attribute descriptors

  _createClass(Text, [{
    key: "instance",
    get: function get() {
      return _node.TextNode;
    }
  }]);

  return Text;
})(Inline);

exports.Text = Text;

var Attribute = function Attribute(deflt, compute) {
  _classCallCheck(this, Attribute);

  this["default"] = deflt;
  this.compute = compute;
}

// Styles

;

exports.Attribute = Attribute;

var StyleType = (function () {
  function StyleType(name, attrs, rank) {
    _classCallCheck(this, StyleType);

    this.name = name;
    this.attrs = attrs;
    this.rank = rank;
    var defaults = getDefaultAttrs(this.attrs);
    this.instance = defaults && new _style.StyleMarker(this, defaults);
  }

  _createClass(StyleType, [{
    key: "create",
    value: function create(attrs) {
      if (!attrs && this.instance) return this.instance;
      return new _style.StyleMarker(this, buildAttrs(this.attrs, attrs, this));
    }
  }], [{
    key: "getOrder",
    value: function getOrder(styles) {
      var sorted = [];
      for (var _name5 in styles) {
        sorted.push({ name: _name5, rank: styles[_name5].type.rank });
      }sorted.sort(function (a, b) {
        return a.rank - b.rank;
      });
      var ranks = Object.create(null);
      for (var i = 0; i < sorted.length; i++) {
        ranks[sorted[i].name] = i;
      }return ranks;
    }
  }, {
    key: "compile",
    value: function compile(styles) {
      var order = this.getOrder(styles);
      var result = Object.create(null);
      for (var _name6 in styles) {
        var info = styles[_name6];
        var attrs = info.attributes || info.type.attributes;
        result[_name6] = new info.type(_name6, attrs, order[_name6]);
      }
      return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }, {
    key: "rank",
    get: function get() {
      return 50;
    }
  }]);

  return StyleType;
})();

exports.StyleType = StyleType;

StyleType.attributes = {};

// Schema specifications are data structures that specify a schema --
// a set of node types, their names, attributes, and nesting behavior.

function copyObj(obj, f) {
  var result = Object.create(null);
  for (var prop in obj) {
    result[prop] = f ? f(obj[prop]) : obj[prop];
  }return result;
}

function ensureWrapped(obj) {
  return obj instanceof Function ? { type: obj } : obj;
}

function overlayObj(obj, overlay) {
  var copy = copyObj(obj);
  for (var _name7 in overlay) {
    var info = ensureWrapped(overlay[_name7]);
    if (info == null) {
      delete copy[_name7];
    } else if (info.type) {
      copy[_name7] = info;
    } else {
      var existing = copy[_name7] = copyObj(copy[_name7]);
      for (var prop in info) {
        existing[prop] = info[prop];
      }
    }
  }
  return copy;
}

var SchemaSpec = (function () {
  function SchemaSpec(nodes, styles) {
    _classCallCheck(this, SchemaSpec);

    this.nodes = copyObj(nodes, ensureWrapped);
    this.styles = copyObj(styles, ensureWrapped);
  }

  // For node types where all attrs have a default value (or which don't
  // have any attributes), build up a single reusable default attribute
  // object, and use it for all nodes that don't specify specific
  // attributes.

  _createClass(SchemaSpec, [{
    key: "updateNodes",
    value: function updateNodes(nodes) {
      return new SchemaSpec(overlayObj(this.nodes, nodes), this.styles);
    }
  }, {
    key: "updateStyles",
    value: function updateStyles(styles) {
      return new SchemaSpec(this.nodes, overlayObj(this.styles, styles));
    }
  }, {
    key: "addAttribute",
    value: function addAttribute(filter, attrName, attrInfo) {
      var copy = copyObj(this.nodes);
      for (var _name8 in copy) {
        if (typeof filter == "string" ? filter == _name8 : filter(_name8, copy[_name8])) {
          var info = copy[_name8] = copyObj(copy[_name8]);
          if (!info.attributes) info.attributes = copyObj(info.type.attributes);
          info.attributes[attrName] = attrInfo;
        }
      }
    }
  }]);

  return SchemaSpec;
})();

exports.SchemaSpec = SchemaSpec;
function getDefaultAttrs(attrs) {
  var defaults = Object.create(null);
  for (var attrName in attrs) {
    var attr = attrs[attrName];
    if (attr["default"] == null) return null;
    defaults[attrName] = attr["default"];
  }
  return defaults;
}

function buildAttrs(attrSpec, attrs, arg1, arg2) {
  var built = Object.create(null);
  for (var _name9 in attrSpec) {
    var value = attrs && attrs[_name9];
    if (value == null) {
      var attr = attrSpec[_name9];
      if (attr["default"] != null) value = attr["default"];else if (attr.compute) value = attr.compute(arg1, arg2);else SchemaError.raise("No value supplied for attribute " + _name9);
    }
    built[_name9] = value;
  }
  return built;
}

var Schema = (function () {
  function Schema(spec) {
    _classCallCheck(this, Schema);

    this.spec = spec;
    this.nodes = NodeType.compile(spec.nodes, this);
    this.styles = StyleType.compile(spec.styles);
    this.cached = Object.create(null);

    this.node = this.node.bind(this);
    this.text = this.text.bind(this);
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.styleFromJSON = this.styleFromJSON.bind(this);
  }

  _createClass(Schema, [{
    key: "node",
    value: function node(type, attrs, content, styles) {
      if (typeof type == "string") type = this.nodeType(type);else if (!(type instanceof NodeType)) SchemaError.raise("Invalid node type: " + type);else if (type.schema != this) SchemaError.raise("Node type from different schema used (" + type.name + ")");

      return type.create(attrs, content, styles);
    }
  }, {
    key: "text",
    value: function text(_text, styles) {
      return this.nodes.text.create(null, _text, styles);
    }
  }, {
    key: "style",
    value: function style(name, attrs) {
      var spec = this.styles[name] || SchemaError.raise("No style named " + name);
      return spec.create(attrs);
    }
  }, {
    key: "nodeFromJSON",
    value: function nodeFromJSON(json) {
      var type = this.nodeType(json.type);
      return type.create(json.attrs, json.text || json.content && json.content.map(this.nodeFromJSON), json.styles && json.styles.map(this.styleFromJSON));
    }
  }, {
    key: "styleFromJSON",
    value: function styleFromJSON(json) {
      if (typeof json == "string") return this.style(json);
      return this.style(json._name, json);
    }
  }, {
    key: "nodeType",
    value: function nodeType(name) {
      return this.nodes[name] || SchemaError.raise("Unknown node type: " + name);
    }
  }]);

  return Schema;
})();

exports.Schema = Schema;
},{"../util/error":45,"./node":24,"./style":28}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sliceBefore = sliceBefore;
exports.sliceAfter = sliceAfter;
exports.sliceBetween = sliceBetween;

function sliceBefore(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  var content = undefined;
  if (depth < pos.depth) {
    var n = pos.path[depth];
    content = node.slice(0, n);
    content.push(sliceBefore(node.child(n), pos, depth + 1));
  } else {
    content = node.slice(0, pos.offset);
  }
  return node.copy(content);
}

function sliceAfter(node, pos) {
  var depth = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

  var content = undefined;
  if (depth < pos.depth) {
    var n = pos.path[depth];
    content = node.slice(n + 1);
    content.unshift(sliceAfter(node.child(n), pos, depth + 1));
  } else {
    content = node.slice(pos.offset);
  }
  return node.copy(content);
}

function sliceBetween(node, from, to) {
  var collapse = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
  var depth = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

  if (depth < from.depth && depth < to.depth && from.path[depth] == to.path[depth]) {
    var inner = sliceBetween(node.child(from.path[depth]), from, to, collapse, depth + 1);
    if (!collapse) return node.copy([inner]);
    if (node.type.name != "doc") return inner;
    var conn = node.type.findConnection(inner.type);
    for (var i = conn.length - 1; i >= 0; i--) {
      inner = node.type.schema.node(conn[i], null, [inner]);
    }return node.copy([inner]);
  } else {
    var content = undefined;
    if (depth == from.depth && depth == to.depth && node.isTextblock) {
      content = node.slice(from.offset, to.offset);
    } else {
      content = [];
      var start = undefined;
      if (depth < from.depth) {
        start = from.path[depth] + 1;
        content.push(sliceAfter(node.child(start - 1), from, depth + 1));
      } else {
        start = from.offset;
      }
      var end = depth < to.depth ? to.path[depth] : to.offset;
      var between = node.slice(start, end);
      for (var i = 0; i < between.length; i++) {
        content.push(between[i]);
      }if (depth < to.depth) content.push(sliceBefore(node.child(end), to, depth + 1));
    }
    return node.copy(content);
  }
}
},{}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.removeStyle = removeStyle;
exports.sameStyles = sameStyles;
exports.containsStyle = containsStyle;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleMarker = (function () {
  function StyleMarker(type, attrs) {
    _classCallCheck(this, StyleMarker);

    this.type = type;
    this.attrs = attrs;
  }

  _createClass(StyleMarker, [{
    key: "toJSON",
    value: function toJSON() {
      if (this.type.instance) return this.type.name;
      var obj = { _name: this.type.name };
      for (var attr in this.attrs) {
        obj[attr] = this.attrs[attr];
      }
    }
  }, {
    key: "addToSet",
    value: function addToSet(set) {
      for (var i = 0; i < set.length; i++) {
        var other = set[i];
        if (other.type == this.type) {
          if (this.eq(other)) return set;else return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i + 1)));
        }
        if (other.type.rank > this.type.rank) return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i)));
      }
      return set.concat(this);
    }
  }, {
    key: "removeFromSet",
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) if (this.eq(set[i])) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
      return set;
    }
  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return true;
      }return false;
    }
  }, {
    key: "eq",
    value: function eq(other) {
      if (this.type != other.type) return false;
      for (var attr in this.attrs) {
        if (other.attrs[attr] != this.attrs[attr]) return false;
      }return true;
    }
  }]);

  return StyleMarker;
})();

exports.StyleMarker = StyleMarker;

function removeStyle(set, type) {
  for (var i = 0; i < set.length; i++) if (set[i].type == type) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
  return set;
}

function sameStyles(a, b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!a[i].eq(b[i])) return false;
  }return true;
}

function containsStyle(set, type) {
  for (var i = 0; i < set.length; i++) {
    if (set[i].type == type) return set[i];
  }return false;
}
},{}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.fromDOM = fromDOM;
exports.fromHTML = fromHTML;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _index = require("./index");

function fromDOM(schema, dom, options) {
  if (!options) options = {};
  var context = new Context(schema, options.topNode || schema.node("doc"));
  var start = options.from ? dom.childNodes[options.from] : dom.firstChild;
  var end = options.to != null && dom.childNodes[options.to] || null;
  context.addAll(start, end, true);
  var doc = undefined;
  while (context.stack.length) doc = context.leave();
  if (!_model.Pos.start(doc)) doc = doc.splice(0, 0, [schema.node("paragraph")]);
  return doc;
}

(0, _index.defineSource)("dom", fromDOM);

function fromHTML(schema, html, options) {
  var wrap = options.document.createElement("div");
  wrap.innerHTML = html;
  return fromDOM(schema, wrap, options);
}

(0, _index.defineSource)("html", fromHTML);

var blockElements = {
  address: true, article: true, aside: true, blockquote: true, canvas: true,
  dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true,
  footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true,
  h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true,
  output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true
};

var Context = (function () {
  function Context(schema, topNode) {
    _classCallCheck(this, Context);

    this.schema = schema;
    this.stack = [];
    this.styles = [];
    this.closing = false;
    this.enter(topNode.type, topNode.attrs);
    this.nodeInfo = nodeInfo(schema);
  }

  _createClass(Context, [{
    key: "addDOM",
    value: function addDOM(dom) {
      if (dom.nodeType == 3) {
        var value = dom.nodeValue;
        var _top = this.top,
            block = _top.isTextblock,
            last = undefined;
        if (/\S/.test(value) || block) {
          value = value.replace(/\s+/g, " ");
          if (/^\s/.test(value) && (last = _top.content[_top.content.length - 1]) && last.type.name == "text" && /\s$/.test(last.text)) value = value.slice(1);
          this.insert(this.schema.text(value, this.styles));
        }
      } else if (dom.nodeType != 1) {
        // Ignore non-text non-element nodes
      } else if (!this.parseNodeType(dom)) {
          this.addAll(dom.firstChild, null);
          var _name = dom.nodeName.toLowerCase();
          if (blockElements.hasOwnProperty(_name) && this.top.type == this.schema.nodes.paragraph) this.closing = true;
        }
    }
  }, {
    key: "tryParsers",
    value: function tryParsers(parsers, dom) {
      if (parsers) for (var i = 0; i < parsers.length; i++) {
        var parser = parsers[i];
        if (parser.parse(dom, this, parser.type) !== false) return true;
      }
    }
  }, {
    key: "parseNodeType",
    value: function parseNodeType(dom) {
      return this.tryParsers(this.nodeInfo[dom.nodeName.toLowerCase()], dom) || this.tryParsers(this.nodeInfo._, dom);
    }
  }, {
    key: "addAll",
    value: function addAll(from, to, sync) {
      var stack = sync && this.stack.slice();
      for (var dom = from; dom != to; dom = dom.nextSibling) {
        this.addDOM(dom);
        if (sync && blockElements.hasOwnProperty(dom.nodeName.toLowerCase())) this.sync(stack);
      }
    }
  }, {
    key: "doClose",
    value: function doClose() {
      if (!this.closing || this.stack.length < 2) return;
      var left = this.leave();
      this.enter(left.type, left.attrs);
      this.closing = false;
    }
  }, {
    key: "insert",
    value: function insert(node) {
      if (this.top.type.canContain(node.type)) {
        this.doClose();
      } else {
        for (var i = this.stack.length - 1; i >= 0; i--) {
          var route = this.stack[i].type.findConnection(node.type);
          if (!route) continue;
          if (i == this.stack.length - 1) {
            this.doClose();
          } else {
            while (this.stack.length > i + 1) this.leave();
          }
          for (var j = 0; j < route.length; j++) {
            this.enter(route[j]);
          }if (this.styles.length) this.styles = [];
          break;
        }
      }
      this.top.content.push(node);
    }
  }, {
    key: "enter",
    value: function enter(type, attrs) {
      if (this.styles.length) this.styles = [];
      this.stack.push({ type: type, attrs: attrs, content: [] });
    }
  }, {
    key: "leave",
    value: function leave() {
      var top = this.stack.pop();
      var node = top.type.create(top.attrs, top.content);
      if (this.stack.length) this.insert(node);
      return node;
    }
  }, {
    key: "sync",
    value: function sync(stack) {
      while (this.stack.length > stack.length) this.leave();
      for (;;) {
        var n = this.stack.length - 1,
            one = this.stack[n],
            two = stack[n];
        if ((0, _model.compareMarkup)(one.type, two.type, one.attrs, two.attrs)) break;
        this.leave();
      }
      while (stack.length > this.stack.length) {
        var add = stack[this.stack.length];
        this.enter(add.type, add.attrs);
      }
      if (this.styles.length) this.styles = [];
      this.closing = false;
    }
  }, {
    key: "top",
    get: function get() {
      return this.stack[this.stack.length - 1];
    }
  }]);

  return Context;
})();

function nodeInfo(schema) {
  return schema.cached.parseDOMNodes || (schema.cached.parseDOMNodes = summarizeNodeInfo(schema));
}

function summarizeNodeInfo(schema) {
  var tags = Object.create(null);
  tags._ = [];
  function read(value) {
    var info = value.parseDOM;
    if (!info) return;
    info.forEach(function (info) {
      var tag = info.tag || "_";(tags[tag] || (tags[tag] = [])).push({
        type: value,
        rank: info.rank == null ? 50 : info.rank,
        parse: info.parse
      });
    });
  }

  for (var _name2 in schema.nodes) {
    read(schema.nodes[_name2]);
  }for (var _name3 in schema.styles) {
    read(schema.styles[_name3]);
  }for (var tag in tags) {
    tags[tag].sort(function (a, b) {
      return a.rank - b.rank;
    });
  }return tags;
}

function wrap(dom, context, type, attrs) {
  context.enter(type, attrs);
  context.addAll(dom.firstChild, null, true);
  context.leave();
}

_model.Paragraph.register("parseDOM", { tag: "p", parse: wrap });

_model.BlockQuote.register("parseDOM", { tag: "blockquote", parse: wrap });

var _loop = function (i) {
  _model.Heading.register("parseDOM", {
    tag: "h" + i,
    parse: function parse(dom, context, type) {
      return wrap(dom, context, type, { level: i });
    }
  });
};

for (var i = 1; i <= 6; i++) {
  _loop(i);
}_model.HorizontalRule.register("parseDOM", { tag: "hr", parse: wrap });

_model.CodeBlock.register("parseDOM", { tag: "pre", parse: function parse(dom, context, type) {
    var params = dom.firstChild && /^code$/i.test(dom.firstChild.nodeName) && dom.firstChild.getAttribute("class");
    if (params && /fence/.test(params)) {
      var found = [],
          re = /(?:^|\s)lang-(\S+)/g,
          m = undefined;
      while (m = re.test(params)) found.push(m[1]);
      params = found.join(" ");
    } else {
      params = null;
    }
    context.insert(type.create({ params: params }, [context.schema.text(dom.textContent)]));
  } });

_model.BulletList.register("parseDOM", { tag: "ul", parse: wrap });

_model.OrderedList.register("parseDOM", { tag: "ol", parse: function parse(dom, context, type) {
    var attrs = { order: dom.getAttribute("start") || 1 };
    wrap(dom, context, type, attrs);
  } });

_model.ListItem.register("parseDOM", { tag: "li", parse: wrap });

_model.HardBreak.register("parseDOM", { tag: "br", parse: function parse(dom, context, type) {
    if (!dom.hasAttribute("pm-force-br")) context.insert(type.create(null, null, context.styles));
  } });

_model.Image.register("parseDOM", { tag: "img", parse: function parse(dom, context, type) {
    context.insert(type.create({
      src: dom.getAttribute("src"),
      title: dom.getAttribute("title") || null,
      alt: dom.getAttribute("alt") || null
    }));
  } });

// Inline style tokens

function inline(dom, context, style) {
  var old = context.styles;
  context.styles = (style.instance || style).addToSet(old);
  context.addAll(dom.firstChild, null);
  context.styles = old;
}

_model.LinkStyle.register("parseDOM", { tag: "a", parse: function parse(dom, context, style) {
    inline(dom, context, style.create({
      href: dom.getAttribute("href"),
      title: dom.getAttribute("title")
    }));
  } });

_model.EmStyle.register("parseDOM", { tag: "i", parse: inline });
_model.EmStyle.register("parseDOM", { tag: "em", parse: inline });

_model.StrongStyle.register("parseDOM", { tag: "b", parse: inline });
_model.StrongStyle.register("parseDOM", { tag: "strong", parse: inline });

_model.CodeStyle.register("parseDOM", { tag: "code", parse: inline });
},{"../model":22,"./index":30}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertFrom = convertFrom;
exports.knownSource = knownSource;
exports.defineSource = defineSource;
var parsers = Object.create(null);

function convertFrom(schema, value, format, arg) {
  var converter = parsers[format];
  if (!converter) throw new Error("Source format " + format + " not defined");
  return converter(schema, value, arg);
}

function knownSource(format) {
  return !!parsers[format];
}

function defineSource(format, func) {
  parsers[format] = func;
}

defineSource("json", function (schema, json) {
  return schema.nodeFromJSON(json);
});
},{}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromText = fromText;

var _index = require("./index");

// FIXME is it meaningful to try and attach text-parsing information
// to node types?

function fromText(schema, text) {
  var blocks = text.trim().split("\n\n");
  var nodes = [];
  for (var i = 0; i < blocks.length; i++) {
    var spans = [];
    var parts = blocks[i].split("\n");
    for (var j = 0; j < parts.length; j++) {
      if (j) spans.push(schema.node("hard_break"));
      spans.push(schema.text(parts[j]));
    }
    nodes.push(schema.node("paragraph", null, spans));
  }
  if (!nodes.length) nodes.push(schema.node("paragraph"));
  return schema.node("doc", null, nodes);
}

(0, _index.defineSource)("text", fromText);
},{"./index":30}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toDOM = toDOM;
exports.toHTML = toHTML;
exports.renderNodeToDOM = renderNodeToDOM;

var _model = require("../model");

var _index = require("./index");

var doc = null;

// declare_global: window

function toDOM(node, options) {
  doc = options && options.document || window.document;
  return renderNodes(node.children, options);
}

(0, _index.defineTarget)("dom", toDOM);

function toHTML(node, options) {
  var wrap = options.document.createElement("div");
  wrap.appendChild(toDOM(node, options));
  return wrap.innerHTML;
}

(0, _index.defineTarget)("html", toHTML);

function renderNodeToDOM(node, options, offset) {
  var dom = renderNode(node, options, offset);
  if (options.renderInlineFlat && node.isInline) {
    dom = wrapInlineFlat(node, dom);
    dom = options.renderInlineFlat(node, dom, offset) || dom;
  }
  return dom;
}

function elt(name) {
  var dom = doc.createElement(name);

  for (var _len = arguments.length, children = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    children[_key - 1] = arguments[_key];
  }

  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    dom.appendChild(typeof child == "string" ? doc.createTextNode(child) : child);
  }
  return dom;
}

function wrap(node, options, type) {
  var dom = elt(type || node.type.name);
  if (!node.isTextblock) renderNodesInto(node.children, dom, options);else if (options.renderInlineFlat) renderInlineContentFlat(node.children, dom, options);else renderInlineContent(node.children, dom, options);
  return dom;
}

function wrapIn(type) {
  return function (node, options) {
    return wrap(node, options, type);
  };
}

function renderNodes(nodes, options) {
  var frag = doc.createDocumentFragment();
  renderNodesInto(nodes, frag, options);
  return frag;
}

function renderNode(node, options, offset) {
  var dom = node.type.serializeDOM(node, options);
  if (options.onRender && node.isBlock) dom = options.onRender(node, dom, offset) || dom;
  return dom;
}

function renderNodesInto(nodes, where, options) {
  for (var i = 0; i < nodes.length; i++) {
    if (options.path) options.path.push(i);
    where.appendChild(renderNode(nodes[i], options, i));
    if (options.path) options.path.pop();
  }
}

function renderInlineContent(nodes, where, options) {
  var top = where;
  var active = [];
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i],
        styles = node.styles;
    var keep = 0;
    for (; keep < Math.min(active.length, styles.length); ++keep) if (!styles[keep].eq(active[keep])) break;
    while (keep < active.length) {
      active.pop();
      top = top.parentNode;
    }
    while (active.length < styles.length) {
      var add = styles[active.length];
      active.push(add);
      top = top.appendChild(add.type.serializeDOM(add));
    }
    top.appendChild(renderNode(node, options, i));
  }
}

function wrapInlineFlat(node, dom) {
  var styles = node.styles;
  for (var i = styles.length - 1; i >= 0; i--) {
    var _wrap = styles[i].type.serializeDOM(styles[i]);
    _wrap.appendChild(dom);
    dom = _wrap;
  }
  return dom;
}

function renderInlineContentFlat(nodes, where, options) {
  var offset = 0;
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var dom = wrapInlineFlat(node, renderNode(node, options, i));
    dom = options.renderInlineFlat(node, dom, offset) || dom;
    where.appendChild(dom);
    offset += node.offset;
  }
  if (!nodes.length || nodes[nodes.length - 1].type.name == "hard_break") where.appendChild(elt("br")).setAttribute("pm-force-br", "true");
}

// Block nodes

function def(cls, method) {
  cls.prototype.serializeDOM = method;
}

def(_model.BlockQuote, wrapIn("blockquote"));

def(_model.BulletList, wrapIn("ul"));

def(_model.OrderedList, function (node, options) {
  var dom = wrap(node, options, "ol");
  if (node.attrs.order > 1) dom.setAttribute("start", node.attrs.order);
  return dom;
});

def(_model.ListItem, wrapIn("li"));

def(_model.HorizontalRule, function () {
  return elt("hr");
});

def(_model.Paragraph, wrapIn("p"));

def(_model.Heading, function (node, options) {
  return wrap(node, options, "h" + node.attrs.level);
});

def(_model.CodeBlock, function (node, options) {
  var code = wrap(node, options, "code");
  if (node.attrs.params != null) code.className = "fence " + node.attrs.params.replace(/(^|\s+)/g, "$&lang-");
  return elt("pre", code);
});

// Inline content

def(_model.Text, function (node) {
  return doc.createTextNode(node.text);
});

def(_model.Image, function (node) {
  var dom = elt("img");
  dom.setAttribute("src", node.attrs.src);
  if (node.attrs.title) dom.setAttribute("title", node.attrs.title);
  if (node.attrs.alt) dom.setAttribute("alt", node.attrs.alt);
  return dom;
});

def(_model.HardBreak, function () {
  return elt("br");
});

// Inline styles

def(_model.EmStyle, function () {
  return elt("em");
});

def(_model.StrongStyle, function () {
  return elt("strong");
});

def(_model.CodeStyle, function () {
  return elt("code");
});

def(_model.LinkStyle, function (style) {
  var dom = elt("a");
  dom.setAttribute("href", style.attrs.href);
  if (style.attrs.title) dom.setAttribute("title", style.attrs.title);
  return dom;
});
},{"../model":22,"./index":33}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.convertTo = convertTo;
exports.knownTarget = knownTarget;
exports.defineTarget = defineTarget;
var serializers = Object.create(null);

function convertTo(doc, format, arg) {
  var converter = serializers[format];
  if (!converter) throw new Error("Target format " + format + " not defined");
  return converter(doc, arg);
}

function knownTarget(format) {
  return !!serializers[format];
}

function defineTarget(format, func) {
  serializers[format] = func;
}

defineTarget("json", function (doc) {
  return doc.toJSON();
});
},{}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toText = toText;

var _model = require("../model");

var _index = require("./index");

_model.Block.prototype.serializeText = function (node) {
  var accum = "";
  for (var i = 0; i < node.length; i++) {
    var child = node.child(i);
    accum += child.type.serializeText(child);
  }
  return accum;
};

_model.Textblock.prototype.serializeText = function (node) {
  var text = _model.Block.prototype.serializeText(node);
  return text && text + "\n\n";
};

_model.Inline.prototype.serializeText = function () {
  return "";
};

_model.HardBreak.prototype.serializeText = function () {
  return "\n";
};

_model.Text.prototype.serializeText = function (node) {
  return node.text;
};

function toText(doc) {
  return doc.type.serializeText(doc).trim();
}

(0, _index.defineTarget)("text", toText);
},{"../model":22,"./index":33}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.canLift = canLift;
exports.canWrap = canWrap;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _tree = require("./tree");

var _map = require("./map");

(0, _step.defineStep)("ancestor", {
  apply: function apply(doc, step) {
    var from = step.from,
        to = step.to;
    if (!(0, _tree.isFlatRange)(from, to)) return null;
    var toParent = from.path,
        start = from.offset,
        end = to.offset;
    var depth = step.param.depth || 0,
        wrappers = step.param.wrappers || [];
    if (!depth && wrappers.length == 0) return null;
    for (var i = 0; i < depth; i++) {
      if (start > 0 || end < doc.path(toParent).maxOffset || toParent.length == 0) return null;
      start = toParent[toParent.length - 1];
      end = start + 1;
      toParent = toParent.slice(0, toParent.length - 1);
    }

    var parent = doc.path(toParent),
        inner = doc.path(from.path),
        newParent = undefined;
    var parentSize = parent.length;
    if (wrappers.length) {
      var lastWrapper = wrappers[wrappers.length - 1];
      if (!parent.type.canContain(wrappers[0].type) || lastWrapper.type.contains != inner.type.contains || lastWrapper.type.plainText && !(0, _tree.isPlainText)(inner)) return null;
      var node = null;
      for (var i = wrappers.length - 1; i >= 0; i--) {
        node = wrappers[i].copy(node ? [node] : inner.slice(from.offset, to.offset));
      }newParent = parent.splice(start, end, [node]);
    } else {
      if (parent.type.contains != inner.type.contains) return null;
      newParent = parent.splice(start, end, inner.children);
    }
    var copy = doc.replaceDeep(toParent, newParent);

    var toInner = toParent.slice();
    for (var i = 0; i < wrappers.length; i++) {
      toInner.push(i ? 0 : start);
    }var startOfInner = new _model.Pos(toInner, wrappers.length ? 0 : start);
    var replaced = null;
    var insertedSize = wrappers.length ? 1 : to.offset - from.offset;
    if (depth != wrappers.length || depth > 1 || wrappers.length > 1) {
      var posBefore = new _model.Pos(toParent, start);
      var posAfter1 = new _model.Pos(toParent, end),
          posAfter2 = new _model.Pos(toParent, start + insertedSize);
      var endOfInner = new _model.Pos(toInner, startOfInner.offset + (to.offset - from.offset));
      replaced = [new _map.ReplacedRange(posBefore, from, posBefore, startOfInner), new _map.ReplacedRange(to, posAfter1, endOfInner, posAfter2, posAfter1, posAfter2)];
    }
    var moved = [new _map.MovedRange(from, to.offset - from.offset, startOfInner)];
    if (end - start != insertedSize) moved.push(new _map.MovedRange(new _model.Pos(toParent, end), parentSize - end, new _model.Pos(toParent, start + insertedSize)));
    return new _transform.TransformResult(copy, new _map.PosMap(moved, replaced));
  },
  invert: function invert(step, oldDoc, map) {
    var wrappers = [];
    if (step.param.depth) for (var i = 0; i < step.param.depth; i++) {
      var _parent = oldDoc.path(step.from.path.slice(0, step.from.path.length - i));
      wrappers.unshift(_parent.copy());
    }
    var newFrom = map.map(step.from).pos;
    var newTo = step.from.cmp(step.to) ? map.map(step.to, -1).pos : newFrom;
    return new _step.Step("ancestor", newFrom, newTo, null, { depth: step.param.wrappers ? step.param.wrappers.length : 0,
      wrappers: wrappers });
  },
  paramToJSON: function paramToJSON(param) {
    return { depth: param.depth,
      wrappers: param.wrappers && param.wrappers.map(function (n) {
        return n.toJSON();
      }) };
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return { depth: json.depth,
      wrappers: json.wrappers && json.wrappers.map(schema.nodeFromJSON) };
  }
});

function canUnwrap(container, from, to) {
  var type = container.child(from).type.contains;
  for (var i = from + 1; i < to; i++) {
    if (container.child(i).type.contains != type) return false;
  }return type;
}

function canBeLifted(doc, range) {
  var container = doc.path(range.path);
  var parentDepth = undefined,
      unwrap = false,
      innerType = container.type.contains;
  for (;;) {
    parentDepth = -1;
    for (var node = doc, i = 0; i < range.path.length; i++) {
      if (node.type.contains == innerType) parentDepth = i;
      node = node.child(range.path[i]);
    }
    if (parentDepth > -1) return { path: range.path.slice(0, parentDepth),
      unwrap: unwrap };
    if (unwrap || !(innerType = canUnwrap(container, range.from, range.to))) return null;
    unwrap = true;
  }
}

function canLift(doc, from, to) {
  var range = (0, _tree.selectedSiblings)(doc, from, to || from);
  var found = canBeLifted(doc, range);
  if (found) return { found: found, range: range };
}

_transform.Transform.prototype.lift = function (from) {
  var to = arguments.length <= 1 || arguments[1] === undefined ? from : arguments[1];
  return (function () {
    var can = canLift(this.doc, from, to);
    if (!can) return this;
    var found = can.found;
    var range = can.range;

    var depth = range.path.length - found.path.length;
    var rangeNode = found.unwrap && this.doc.path(range.path);

    for (var d = 0, pos = new _model.Pos(range.path, range.to);; d++) {
      if (pos.offset < this.doc.path(pos.path).length) {
        this.split(pos, depth);
        break;
      }
      if (d == depth - 1) break;
      pos = pos.shorten(null, 1);
    }
    for (var d = 0, pos = new _model.Pos(range.path, range.from);; d++) {
      if (pos.offset > 0) {
        this.split(pos, depth - d);
        var cut = range.path.length - depth,
            path = pos.path.slice(0, cut).concat(pos.path[cut] + 1);
        while (path.length < range.path.length) path.push(0);
        range = { path: path, from: 0, to: range.to - range.from };
        break;
      }
      if (d == depth - 1) break;
      pos = pos.shorten();
    }
    if (found.unwrap) {
      for (var i = range.to - 1; i > range.from; i--) {
        this.join(new _model.Pos(range.path, i));
      }var size = 0;
      for (var i = range.from; i < range.to; i++) {
        size += rangeNode.child(i).length;
      }range = { path: range.path.concat(range.from), from: 0, to: size };
      ++depth;
    }
    this.step("ancestor", new _model.Pos(range.path, range.from), new _model.Pos(range.path, range.to), null, { depth: depth });
    return this;
  }).apply(this, arguments);
};

function canWrap(doc, from, to, node) {
  var range = (0, _tree.selectedSiblings)(doc, from, to || from);
  if (range.from == range.to) return null;
  var parent = doc.path(range.path);
  var around = parent.type.findConnection(node.type);
  var inside = node.type.findConnection(parent.child(range.from).type);
  if (around && inside) return { range: range, around: around, inside: inside };
}

_transform.Transform.prototype.wrap = function (from, to, node) {
  var can = canWrap(this.doc, from, to, node);
  if (!can) return this;
  var range = can.range;
  var around = can.around;
  var inside = can.inside;

  var wrappers = around.map(function (t) {
    return node.type.schema.node(t);
  }).concat(node).concat(inside.map(function (t) {
    return node.type.schema.node(t);
  }));
  this.step("ancestor", new _model.Pos(range.path, range.from), new _model.Pos(range.path, range.to), null, { wrappers: wrappers });
  if (inside.length) {
    var toInner = range.path.slice();
    for (var i = 0; i < around.length + inside.length + 1; i++) {
      toInner.push(i ? 0 : range.from);
    }for (var i = range.to - 1 - range.from; i > 0; i--) {
      this.split(new _model.Pos(toInner, i), inside.length);
    }
  }
  return this;
};

_transform.Transform.prototype.setBlockType = function (from, to, wrapNode) {
  var _this = this;

  (0, _tree.blocksBetween)(this.doc, from, to || from, function (node, path) {
    path = path.slice();
    if (wrapNode.type.plainText && !(0, _tree.isPlainText)(node)) _this.clearMarkup(new _model.Pos(path, 0), new _model.Pos(path, node.maxOffset));
    _this.step("ancestor", new _model.Pos(path, 0), new _model.Pos(path, node.maxOffset), null, { depth: 1, wrappers: [wrapNode] });
  });
  return this;
};
},{"../model":22,"./map":38,"./step":41,"./transform":43,"./tree":44}],36:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("./style");

require("./split");

require("./replace");

var _transform = require("./transform");

Object.defineProperty(exports, "TransformResult", {
  enumerable: true,
  get: function get() {
    return _transform.TransformResult;
  }
});
Object.defineProperty(exports, "Transform", {
  enumerable: true,
  get: function get() {
    return _transform.Transform;
  }
});

var _step = require("./step");

Object.defineProperty(exports, "Step", {
  enumerable: true,
  get: function get() {
    return _step.Step;
  }
});

var _ancestor = require("./ancestor");

Object.defineProperty(exports, "canLift", {
  enumerable: true,
  get: function get() {
    return _ancestor.canLift;
  }
});
Object.defineProperty(exports, "canWrap", {
  enumerable: true,
  get: function get() {
    return _ancestor.canWrap;
  }
});

var _join = require("./join");

Object.defineProperty(exports, "joinPoint", {
  enumerable: true,
  get: function get() {
    return _join.joinPoint;
  }
});

var _map = require("./map");

Object.defineProperty(exports, "PosMap", {
  enumerable: true,
  get: function get() {
    return _map.PosMap;
  }
});
Object.defineProperty(exports, "MapResult", {
  enumerable: true,
  get: function get() {
    return _map.MapResult;
  }
});
Object.defineProperty(exports, "mapStep", {
  enumerable: true,
  get: function get() {
    return _map.mapStep;
  }
});
Object.defineProperty(exports, "Remapping", {
  enumerable: true,
  get: function get() {
    return _map.Remapping;
  }
});
},{"./ancestor":35,"./join":37,"./map":38,"./replace":39,"./split":40,"./step":41,"./style":42,"./transform":43}],37:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.joinPoint = joinPoint;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

(0, _step.defineStep)("join", {
  apply: function apply(doc, step) {
    var before = doc.path(step.from.path);
    var after = doc.path(step.to.path);
    if (step.from.offset < before.maxOffset || step.to.offset > 0 || before.type.contains != after.type.contains) return null;
    var pFrom = step.from.path,
        pTo = step.to.path;
    var last = pFrom.length - 1,
        offset = pFrom[last] + 1;
    if (pFrom.length != pTo.length || pFrom.length == 0 || offset != pTo[last]) return null;
    for (var i = 0; i < last; i++) {
      if (pFrom[i] != pTo[i]) return null;
    }var targetPath = pFrom.slice(0, last);
    var target = doc.path(targetPath),
        oldSize = target.length;
    var joined = before.append(after.children);
    var copy = doc.replaceDeep(targetPath, target.splice(offset - 1, offset + 1, [joined]));

    var map = new _map.PosMap([new _map.MovedRange(step.to, after.maxOffset, step.from), new _map.MovedRange(new _model.Pos(targetPath, offset + 1), oldSize - offset - 1, new _model.Pos(targetPath, offset))], [new _map.ReplacedRange(step.from, step.to, step.from, step.from, step.to.shorten())]);
    return new _transform.TransformResult(copy, map);
  },
  invert: function invert(step, oldDoc) {
    return new _step.Step("split", null, null, step.from, oldDoc.path(step.to.path).copy());
  }
});

function joinPoint(doc, pos) {
  var dir = arguments.length <= 2 || arguments[2] === undefined ? -1 : arguments[2];

  var joinDepth = -1;
  for (var i = 0, _parent = doc; i < pos.path.length; i++) {
    var index = pos.path[i];
    var type = _parent.child(index).type;
    if (!type.block && (dir == -1 ? index > 0 && _parent.child(index - 1).type == type : index < _parent.length - 1 && _parent.child(index + 1).type == type)) joinDepth = i;
    _parent = _parent.child(index);
  }
  if (joinDepth > -1) return pos.shorten(joinDepth, dir == -1 ? 0 : 1);
}

_transform.Transform.prototype.join = function (at) {
  var parent = this.doc.path(at.path);
  if (at.offset == 0 || at.offset == parent.length || parent.type.block) return this;
  this.step("join", new _model.Pos(at.path.concat(at.offset - 1), parent.child(at.offset - 1).maxOffset), new _model.Pos(at.path.concat(at.offset), 0));
  return this;
};
},{"../model":22,"./map":38,"./step":41,"./transform":43}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.mapStep = mapStep;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _step = require("./step");

var MovedRange = (function () {
  function MovedRange(start, size) {
    var dest = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

    _classCallCheck(this, MovedRange);

    this.start = start;
    this.size = size;
    this.dest = dest;
  }

  _createClass(MovedRange, [{
    key: "toString",
    value: function toString() {
      return "[moved " + this.start + "+" + this.size + " to " + this.dest + "]";
    }
  }, {
    key: "end",
    get: function get() {
      return new _model.Pos(this.start.path, this.start.offset + this.size);
    }
  }]);

  return MovedRange;
})();

exports.MovedRange = MovedRange;

var Side = function Side(from, to, ref) {
  _classCallCheck(this, Side);

  this.from = from;
  this.to = to;
  this.ref = ref;
};

var ReplacedRange = (function () {
  function ReplacedRange(from, to, newFrom, newTo) {
    var ref = arguments.length <= 4 || arguments[4] === undefined ? from : arguments[4];
    var newRef = arguments.length <= 5 || arguments[5] === undefined ? newFrom : arguments[5];
    return (function () {
      _classCallCheck(this, ReplacedRange);

      this.before = new Side(from, to, ref);
      this.after = new Side(newFrom, newTo, newRef);
    }).apply(this, arguments);
  }

  _createClass(ReplacedRange, [{
    key: "toString",
    value: function toString() {
      return "[replaced " + this.before.from + "-" + this.before.to + " with " + this.after.from + "-" + this.after.to + "]";
    }
  }]);

  return ReplacedRange;
})();

exports.ReplacedRange = ReplacedRange;

var empty = [];

var MapResult = function MapResult(pos) {
  var deleted = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
  var recover = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  _classCallCheck(this, MapResult);

  this.pos = pos;
  this.deleted = deleted;
  this.recover = recover;
};

exports.MapResult = MapResult;

function offsetFrom(base, pos) {
  if (pos.path.length > base.path.length) {
    var path = [pos.path[base.path.length] - base.offset];
    for (var i = base.path.length + 1; i < pos.path.length; i++) {
      path.push(pos.path[i]);
    }return new _model.Pos(path, pos.offset);
  } else {
    return new _model.Pos([], pos.offset - base.offset);
  }
}

function mapThrough(map, pos, bias, back) {
  if (bias === undefined) bias = 1;

  for (var i = 0; i < map.replaced.length; i++) {
    var range = map.replaced[i],
        side = back ? range.after : range.before;
    var left = undefined,
        right = undefined;
    if ((left = pos.cmp(side.from)) >= 0 && (right = pos.cmp(side.to)) <= 0) {
      var other = back ? range.before : range.after;
      return new MapResult(bias < 0 ? other.from : other.to, !!(left && right), { rangeID: i, offset: offsetFrom(side.ref, pos) });
    }
  }

  for (var i = 0; i < map.moved.length; i++) {
    var range = map.moved[i];
    var start = back ? range.dest : range.start;
    if (pos.cmp(start) >= 0 && _model.Pos.cmp(pos.path, pos.offset, start.path, start.offset + range.size) <= 0) {
      var dest = back ? range.start : range.dest;
      var depth = start.depth;
      if (pos.depth > depth) {
        var offset = dest.offset + (pos.path[depth] - start.offset);
        return new MapResult(new _model.Pos(dest.path.concat(offset).concat(pos.path.slice(depth + 1)), pos.offset));
      } else {
        return new MapResult(new _model.Pos(dest.path, dest.offset + (pos.offset - start.offset)));
      }
    }
  }

  return new MapResult(pos);
}

var PosMap = (function () {
  function PosMap(moved, replaced) {
    _classCallCheck(this, PosMap);

    this.moved = moved || empty;
    this.replaced = replaced || empty;
  }

  _createClass(PosMap, [{
    key: "recover",
    value: function recover(offset) {
      return this.replaced[offset.rangeID].after.ref.extend(offset.offset);
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      return mapThrough(this, pos, bias, false);
    }
  }, {
    key: "invert",
    value: function invert() {
      return new InvertedPosMap(this);
    }
  }, {
    key: "toString",
    value: function toString() {
      return this.moved.concat(this.replaced).join(" ");
    }
  }]);

  return PosMap;
})();

exports.PosMap = PosMap;

var InvertedPosMap = (function () {
  function InvertedPosMap(map) {
    _classCallCheck(this, InvertedPosMap);

    this.inner = map;
  }

  _createClass(InvertedPosMap, [{
    key: "recover",
    value: function recover(offset) {
      return this.inner.replaced[offset.rangeID].before.ref.extend(offset.offset);
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      return mapThrough(this.inner, pos, bias, true);
    }
  }, {
    key: "invert",
    value: function invert() {
      return this.inner;
    }
  }, {
    key: "toString",
    value: function toString() {
      return "-" + this.inner;
    }
  }]);

  return InvertedPosMap;
})();

var nullMap = new PosMap();

exports.nullMap = nullMap;

var Remapping = (function () {
  function Remapping() {
    var head = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];
    var tail = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];
    var mirror = arguments.length <= 2 || arguments[2] === undefined ? Object.create(null) : arguments[2];

    _classCallCheck(this, Remapping);

    this.head = head;
    this.tail = tail;
    this.mirror = mirror;
  }

  _createClass(Remapping, [{
    key: "addToFront",
    value: function addToFront(map, corr) {
      this.head.push(map);
      var id = -this.head.length;
      if (corr != null) this.mirror[id] = corr;
      return id;
    }
  }, {
    key: "addToBack",
    value: function addToBack(map, corr) {
      this.tail.push(map);
      var id = this.tail.length - 1;
      if (corr != null) this.mirror[corr] = id;
      return id;
    }
  }, {
    key: "get",
    value: function get(id) {
      return id < 0 ? this.head[-id - 1] : this.tail[id];
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      var deleted = false;

      for (var i = -this.head.length; i < this.tail.length; i++) {
        var map = this.get(i);
        var result = map.map(pos, bias);
        if (result.recover) {
          var corr = this.mirror[i];
          if (corr != null) {
            i = corr;
            pos = this.get(corr).recover(result.recover);
            continue;
          }
        }
        if (result.deleted) deleted = true;
        pos = result.pos;
      }

      return new MapResult(pos, deleted);
    }
  }]);

  return Remapping;
})();

exports.Remapping = Remapping;

function maxPos(a, b) {
  return a.cmp(b) > 0 ? a : b;
}

function mapStep(step, remapping) {
  var allDeleted = true;
  var from = null,
      to = null,
      pos = null;

  if (step.from) {
    var result = remapping.map(step.from, 1);
    from = result.pos;
    if (!result.deleted) allDeleted = false;
  }
  if (step.to) {
    if (step.to.cmp(step.from) == 0) {
      to = from;
    } else {
      var result = remapping.map(step.to, -1);
      to = maxPos(result.pos, from);
      if (!result.deleted) allDeleted = false;
    }
  }
  if (step.pos) {
    if (from && step.pos.cmp(step.from) == 0) {
      pos = from;
    } else if (to && step.pos.cmp(step.to) == 0) {
      pos = to;
    } else {
      var result = remapping.map(step.pos, 1);
      pos = result.pos;
      if (!result.deleted) allDeleted = false;
    }
  }
  if (!allDeleted) return new _step.Step(step.name, from, to, pos, step.param);
}
},{"../model":22,"./step":41}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replace = replace;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

var _tree = require("./tree");

function findMovedChunks(oldNode, oldPath, newNode, startDepth) {
  var moved = [];
  var newPath = oldPath.path.slice(0, startDepth);

  for (var depth = startDepth;; depth++) {
    var joined = depth == oldPath.depth ? 0 : 1;
    var cut = depth == oldPath.depth ? oldPath.offset : oldPath.path[depth];
    var afterCut = oldNode.maxOffset - cut;
    var newOffset = newNode.maxOffset - afterCut;

    var from = oldPath.shorten(depth, joined);
    var to = new _model.Pos(newPath, newOffset + joined);
    if (from.cmp(to)) moved.push(new _map.MovedRange(from, afterCut - joined, to));

    if (!joined) return moved;

    oldNode = oldNode.child(cut);
    newNode = newNode.child(newOffset);
    newPath = newPath.concat(newOffset);
  }
}

function replace(node, from, to, root, repl) {
  var depth = arguments.length <= 5 || arguments[5] === undefined ? 0 : arguments[5];

  if (depth == root.length) {
    var before = (0, _model.sliceBefore)(node, from, depth);
    var after = (0, _model.sliceAfter)(node, to, depth),
        result = undefined;
    if (repl.nodes.length) result = before.append(repl.nodes, Math.min(repl.openLeft, from.depth - depth)).append(after.children, Math.min(repl.openRight, to.depth - depth));else result = before.append(after.children, Math.min(to.depth, from.depth) - depth);
    return { doc: result, moved: findMovedChunks(node, to, result, depth) };
  } else {
    var pos = root[depth];

    var _replace = replace(node.child(pos), from, to, root, repl, depth + 1);

    var doc = _replace.doc;
    var moved = _replace.moved;

    return { doc: node.replace(pos, doc), moved: moved };
  }
}

var nullRepl = { nodes: [], openLeft: 0, openRight: 0 };

(0, _step.defineStep)("replace", {
  apply: function apply(doc, step) {
    var rootPos = step.pos,
        root = rootPos.path;
    if (step.from.depth < root.length || step.to.depth < root.length) return null;
    for (var i = 0; i < root.length; i++) {
      if (step.from.path[i] != root[i] || step.to.path[i] != root[i]) return null;
    }var result = replace(doc, step.from, step.to, rootPos.path, step.param || nullRepl);
    if (!result) return null;
    var out = result.doc;
    var moved = result.moved;

    var end = moved.length ? moved[moved.length - 1].dest : step.to;
    var replaced = new _map.ReplacedRange(step.from, step.to, step.from, end, rootPos, rootPos);
    return new _transform.TransformResult(out, new _map.PosMap(moved, [replaced]));
  },
  invert: function invert(step, oldDoc, map) {
    var depth = step.pos.depth;
    var between = (0, _model.sliceBetween)(oldDoc, step.from, step.to, false);
    for (var i = 0; i < depth; i++) {
      between = between.firstChild;
    }return new _step.Step("replace", step.from, map.map(step.to).pos, step.from.shorten(depth), {
      nodes: between.children,
      openLeft: step.from.depth - depth,
      openRight: step.to.depth - depth
    });
  },
  paramToJSON: function paramToJSON(param) {
    return param && { nodes: param.nodes && param.nodes.map(function (n) {
        return n.toJSON();
      }),
      openLeft: param.openLeft, openRight: param.openRight };
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return json && { nodes: json.nodes && json.nodes.map(schema.nodeFromJSON),
      openLeft: json.openLeft, openRight: json.openRight };
  }
});

function shiftFromStack(stack, depth) {
  var shifted = stack[depth] = stack[depth].splice(0, 1, []);
  for (var i = depth - 1; i >= 0; i--) {
    shifted = stack[i] = stack[i].replace(0, shifted);
  }
}

// FIXME find a not so horribly confusing way to express this
function buildInserted(nodesLeft, source, start, end) {
  var sliced = (0, _model.sliceBetween)(source, start, end, false);
  var nodesRight = [];
  for (var node = sliced, i = 0; i <= start.path.length; i++, node = node.firstChild) {
    nodesRight.push(node);
  }var same = (0, _tree.samePathDepth)(start, end);
  var searchLeft = nodesLeft.length - 1,
      searchRight = nodesRight.length - 1;
  var result = null;

  var inner = nodesRight[searchRight];
  if (inner.isTextblock && inner.length && nodesLeft[searchLeft].isTextblock) {
    result = nodesLeft[searchLeft--].copy(inner.children);
    --searchRight;
    shiftFromStack(nodesRight, searchRight);
  }

  for (;;) {
    var node = nodesRight[searchRight],
        type = node.type,
        matched = null;
    var outside = searchRight <= same;
    for (var i = searchLeft; i >= 0; i--) {
      var left = nodesLeft[i];
      if (outside ? left.type.contains == type.contains : left.type == type) {
        matched = i;
        break;
      }
    }
    if (matched != null) {
      if (!result) {
        result = nodesLeft[matched].copy(node.children);
        searchLeft = matched - 1;
      } else {
        while (searchLeft >= matched) {
          result = nodesLeft[searchLeft].copy(searchLeft == matched ? [result].concat(node.children) : [result]);
          searchLeft--;
        }
      }
    }
    if (matched != null || node.length == 0) {
      if (outside) break;
      if (searchRight) shiftFromStack(nodesRight, searchRight - 1);
    }
    searchRight--;
  }

  var repl = { nodes: result ? result.children : [],
    openLeft: start.depth - searchRight,
    openRight: end.depth - searchRight };
  return { repl: repl, depth: searchLeft + 1 };
}

function moveText(tr, doc, before, after) {
  var root = (0, _tree.samePathDepth)(before, after);
  var cutAt = after.shorten(null, 1);
  while (cutAt.path.length > root && doc.path(cutAt.path).length == 1) cutAt = cutAt.shorten(null, 1);
  tr.split(cutAt, cutAt.path.length - root);
  var start = after,
      end = new _model.Pos(start.path, doc.path(start.path).maxOffset);
  var parent = doc.path(start.path.slice(0, root));
  var wanted = parent.pathNodes(before.path.slice(root));
  var existing = parent.pathNodes(start.path.slice(root));
  while (wanted.length && existing.length && wanted[0].sameMarkup(existing[0])) {
    wanted.shift();
    existing.shift();
  }
  if (existing.length || wanted.length) tr.step("ancestor", start, end, null, {
    depth: existing.length,
    wrappers: wanted.map(function (n) {
      return n.copy();
    })
  });
  for (var i = root; i < before.path.length; i++) {
    tr.join(before.shorten(i, 1));
  }
}

_transform.Transform.prototype["delete"] = function (from, to) {
  return this.replace(from, to);
};

_transform.Transform.prototype.replace = function (from, to, source, start, end) {
  var repl = undefined,
      depth = undefined,
      doc = this.doc,
      maxDepth = (0, _tree.samePathDepth)(from, to);
  if (source) {
    ;
    var _buildInserted = buildInserted(doc.pathNodes(from.path), source, start, end);

    repl = _buildInserted.repl;
    depth = _buildInserted.depth;

    while (depth > maxDepth) {
      if (repl.nodes.length) repl = { nodes: [doc.path(from.path.slice(0, depth)).copy(repl.nodes)],
        openLeft: repl.openLeft + 1, openRight: repl.openRight + 1 };
      depth--;
    }
  } else {
    repl = nullRepl;
    depth = maxDepth;
  }
  var root = from.shorten(depth),
      docAfter = doc,
      after = to;
  if (repl.nodes.length || (0, _tree.replaceHasEffect)(doc, from, to)) {
    var result = this.step("replace", from, to, root, repl);
    docAfter = result.doc;
    after = result.map.map(to).pos;
  }

  // If no text nodes before or after end of replacement, don't glue text
  if (!doc.path(to.path).isTextblock) return this;
  if (!(repl.nodes.length ? source.path(end.path).isTextblock : doc.path(from.path).isTextblock)) return this;

  var nodesAfter = doc.path(root.path).pathNodes(to.path.slice(depth)).slice(1);
  var nodesBefore = undefined;
  if (repl.nodes.length) {
    var inserted = repl.nodes;
    nodesBefore = [];
    for (var i = 0; i < repl.openRight; i++) {
      var last = inserted[inserted.length - 1];
      nodesBefore.push(last);
      inserted = last.children;
    }
  } else {
    nodesBefore = doc.path(root.path).pathNodes(from.path.slice(depth)).slice(1);
  }
  if (nodesAfter.length != nodesBefore.length || !nodesAfter.every(function (n, i) {
    return n.sameMarkup(nodesBefore[i]);
  })) {
    var before = _model.Pos.before(docAfter, after.shorten(null, 0));
    moveText(this, docAfter, before, after);
  }
  return this;
};

_transform.Transform.prototype.insert = function (pos, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  this.step("replace", pos, pos, pos, { nodes: nodes, openLeft: 0, openRight: 0 });
  return this;
};

_transform.Transform.prototype.insertInline = function (pos, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  var styles = (0, _model.spanStylesAt)(this.doc, pos);
  nodes = nodes.map(function (n) {
    return n.styled(styles);
  });
  return this.insert(pos, nodes);
};

_transform.Transform.prototype.insertText = function (pos, text) {
  return this.insertInline(pos, this.doc.type.schema.text(text));
};
},{"../model":22,"./map":38,"./step":41,"./transform":43,"./tree":44}],40:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

(0, _step.defineStep)("split", {
  apply: function apply(doc, step) {
    var pos = step.pos;
    if (pos.depth == 0) return null;

    var last = pos.depth - 1,
        parentPath = pos.path.slice(0, last);
    var offset = pos.path[last],
        parent = doc.path(parentPath);
    var target = parent.child(offset),
        targetSize = target.maxOffset;

    var splitAt = pos.offset;
    var newParent = parent.splice(offset, offset + 1, [target.copy(target.slice(0, splitAt)), (step.param || target).copy(target.slice(splitAt))]);
    var copy = doc.replaceDeep(parentPath, newParent);

    var dest = new _model.Pos(parentPath.concat(offset + 1), 0);
    var map = new _map.PosMap([new _map.MovedRange(pos, targetSize - pos.offset, dest), new _map.MovedRange(new _model.Pos(parentPath, offset + 1), newParent.length - 2 - offset, new _model.Pos(parentPath, offset + 2))], [new _map.ReplacedRange(pos, pos, pos, dest, pos, pos.shorten(null, 1))]);
    return new _transform.TransformResult(copy, map);
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("join", step.pos, map.map(step.pos).pos);
  },
  paramToJSON: function paramToJSON(param) {
    return param && param.toJSON();
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return json && schema.nodeFromJSON(json);
  }
});

_transform.Transform.prototype.split = function (pos) {
  var depth = arguments.length <= 1 || arguments[1] === undefined ? 1 : arguments[1];
  var nodeAfter = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  if (depth == 0) return this;
  for (var i = 0;; i++) {
    this.step("split", null, null, pos, nodeAfter);
    if (i == depth - 1) return this;
    nodeAfter = null;
    pos = pos.shorten(null, 1);
  }
};
},{"../model":22,"./map":38,"./step":41,"./transform":43}],41:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.defineStep = defineStep;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var Step = (function () {
  function Step(name, from, to, pos) {
    var param = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

    _classCallCheck(this, Step);

    if (!(name in steps)) throw new Error("Unknown step type: " + name);
    this.name = name;
    this.from = from;
    this.to = to;
    this.pos = pos;
    this.param = param;
  }

  _createClass(Step, [{
    key: "apply",
    value: function apply(doc) {
      return steps[this.name].apply(doc, this);
    }
  }, {
    key: "invert",
    value: function invert(oldDoc, map) {
      return steps[this.name].invert(this, oldDoc, map);
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      var impl = steps[this.name];
      return {
        name: this.name,
        from: this.from,
        to: this.to,
        pos: this.pos,
        param: impl.paramToJSON ? impl.paramToJSON(this.param) : this.param
      };
    }
  }], [{
    key: "fromJSON",
    value: function fromJSON(schema, json) {
      var impl = steps[json.name];
      return new Step(json.name, json.from && _model.Pos.fromJSON(json.from), json.to && _model.Pos.fromJSON(json.to), json.pos && _model.Pos.fromJSON(json.pos), impl.paramFromJSON ? impl.paramFromJSON(schema, json.param) : json.param);
    }
  }]);

  return Step;
})();

exports.Step = Step;

var steps = Object.create(null);

function defineStep(name, impl) {
  steps[name] = impl;
}
},{"../model":22}],42:[function(require,module,exports){
"use strict";

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _tree = require("./tree");

(0, _step.defineStep)("addStyle", {
  apply: function apply(doc, step) {
    return new _transform.TransformResult((0, _tree.copyStructure)(doc, step.from, step.to, function (node, from, to) {
      if (node.type.plainText) return node;
      return (0, _tree.copyInline)(node, from, to, function (node) {
        return node.styled(step.param.addToSet(node.styles));
      });
    }));
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("removeStyle", step.from, map.map(step.to).pos, null, step.param);
  }
});

_transform.Transform.prototype.addStyle = function (from, to, st) {
  var _this = this;

  var removed = [],
      added = [],
      removing = null,
      adding = null;
  (0, _tree.forSpansBetween)(this.doc, from, to, function (span, path, start, end) {
    if (st.isInSet(span.styles)) {
      adding = removing = null;
    } else {
      path = path.slice();
      var rm = (0, _model.containsStyle)(span.styles, st.type);
      if (rm) {
        if (removing && removing.param.eq(rm)) {
          removing.to = new _model.Pos(path, end);
        } else {
          removing = new _step.Step("removeStyle", new _model.Pos(path, start), new _model.Pos(path, end), null, rm);
          removed.push(removing);
        }
      } else if (removing) {
        removing = null;
      }
      if (adding) {
        adding.to = new _model.Pos(path, end);
      } else {
        adding = new _step.Step("addStyle", new _model.Pos(path, start), new _model.Pos(path, end), null, st);
        added.push(adding);
      }
    }
  });
  removed.forEach(function (s) {
    return _this.step(s);
  });
  added.forEach(function (s) {
    return _this.step(s);
  });
  return this;
};

(0, _step.defineStep)("removeStyle", {
  apply: function apply(doc, step) {
    return new _transform.TransformResult((0, _tree.copyStructure)(doc, step.from, step.to, function (node, from, to) {
      return (0, _tree.copyInline)(node, from, to, function (node) {
        return node.styled(step.param.removeFromSet(node.styles));
      });
    }));
  },
  invert: function invert(step, _oldDoc, map) {
    return new _step.Step("addStyle", step.from, map.map(step.to).pos, null, step.param);
  }
});

_transform.Transform.prototype.removeStyle = function (from, to) {
  var _this2 = this;

  var st = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

  var matched = [],
      step = 0;
  (0, _tree.forSpansBetween)(this.doc, from, to, function (span, path, start, end) {
    step++;
    var toRemove = null;
    if (st instanceof _model.StyleType) {
      var found = (0, _model.containsStyle)(span.styles, st);
      if (found) toRemove = [found];
    } else if (st) {
      if (st.isInSet(span.styles)) toRemove = [st];
    } else {
      toRemove = span.styles;
    }
    if (toRemove && toRemove.length) {
      path = path.slice();
      for (var i = 0; i < toRemove.length; i++) {
        var rm = toRemove[i],
            found = undefined;
        for (var j = 0; j < matched.length; j++) {
          var m = matched[j];
          if (m.step == step - 1 && rm.eq(matched[j].style)) found = m;
        }
        if (found) {
          found.to = new _model.Pos(path, end);
          found.step = step;
        } else {
          matched.push({ style: rm, from: new _model.Pos(path, start), to: new _model.Pos(path, end), step: step });
        }
      }
    }
  });
  matched.forEach(function (m) {
    return _this2.step("removeStyle", m.from, m.to, null, m.style);
  });
  return this;
};

_transform.Transform.prototype.clearMarkup = function (from, to) {
  var _this3 = this;

  var steps = [];
  (0, _tree.forSpansBetween)(this.doc, from, to, function (span, path, start, end) {
    if (!span.isText) {
      path = path.slice();
      var _from = new _model.Pos(path, start);
      steps.unshift(new _step.Step("replace", _from, new _model.Pos(path, end), _from));
    }
  });
  this.removeStyle(from.to);
  steps.forEach(function (s) {
    return _this3.step(s);
  });
  return this;
};
},{"../model":22,"./step":41,"./transform":43,"./tree":44}],43:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _step2 = require("./step");

var _map = require("./map");

var TransformResult = function TransformResult(doc) {
  var map = arguments.length <= 1 || arguments[1] === undefined ? _map.nullMap : arguments[1];

  _classCallCheck(this, TransformResult);

  this.doc = doc;
  this.map = map;
};

exports.TransformResult = TransformResult;

var Transform = (function () {
  function Transform(doc) {
    _classCallCheck(this, Transform);

    this.docs = [doc];
    this.steps = [];
    this.maps = [];
  }

  _createClass(Transform, [{
    key: "step",
    value: function step(_step, from, to, pos, param) {
      if (typeof _step == "string") _step = new _step2.Step(_step, from, to, pos, param);
      var result = _step.apply(this.doc);
      if (result) {
        this.steps.push(_step);
        this.maps.push(result.map);
        this.docs.push(result.doc);
      }
      return result;
    }
  }, {
    key: "map",
    value: function map(pos, bias) {
      var deleted = false;
      for (var i = 0; i < this.maps.length; i++) {
        var result = this.maps[i].map(pos, bias);
        pos = result.pos;
        if (result.deleted) deleted = true;
      }
      return new _map.MapResult(pos, deleted);
    }
  }, {
    key: "doc",
    get: function get() {
      return this.docs[this.docs.length - 1];
    }
  }, {
    key: "before",
    get: function get() {
      return this.docs[0];
    }
  }]);

  return Transform;
})();

exports.Transform = Transform;
},{"./map":38,"./step":41}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.copyStructure = copyStructure;
exports.copyInline = copyInline;
exports.forSpansBetween = forSpansBetween;
exports.isFlatRange = isFlatRange;
exports.selectedSiblings = selectedSiblings;
exports.blocksBetween = blocksBetween;
exports.isPlainText = isPlainText;
exports.replaceHasEffect = replaceHasEffect;
exports.samePathDepth = samePathDepth;

function copyStructure(node, from, to, f) {
  var depth = arguments.length <= 4 || arguments[4] === undefined ? 0 : arguments[4];

  if (node.isTextblock) {
    return f(node, from, to);
  } else {
    if (!node.length) return node;
    var start = from ? from.path[depth] : 0;
    var end = to ? to.path[depth] : node.length - 1;
    var content = node.slice(0, start);
    if (start == end) {
      content.push(copyStructure(node.child(start), from, to, f, depth + 1));
    } else {
      content.push(copyStructure(node.child(start), from, null, f, depth + 1));
      for (var i = start + 1; i < end; i++) {
        content.push(copyStructure(node.child(i), null, null, f, depth + 1));
      }content.push(copyStructure(node.child(end), null, to, f, depth + 1));
    }
    for (var i = end + 1; i < node.length; i++) {
      content.push(node.child(i));
    }return node.copy(content);
  }
}

function copyInline(node, from, to, f) {
  var start = from ? from.offset : 0;
  var end = to ? to.offset : node.maxOffset;
  var copied = node.slice(0, start).concat(node.slice(start, end).map(f)).concat(node.slice(end));
  for (var i = copied.length - 2; i >= 0; i--) {
    var merged = copied[i].maybeMerge(copied[i + 1]);
    if (merged) copied.splice(i, 2, merged);
  }
  return node.copy(copied);
}

function forSpansBetween(doc, from, to, f) {
  var path = [];
  function scan(node, from, to) {
    if (node.isTextblock) {
      var startOffset = from ? from.offset : 0;
      var endOffset = to ? to.offset : node.maxOffset;
      for (var i = 0, offset = 0; offset < endOffset; i++) {
        var child = node.child(i),
            size = child.offset;
        offset += size;
        if (offset > startOffset) f(child, path, Math.max(offset - child.offset, startOffset), Math.min(offset, endOffset));
      }
    } else if (node.length) {
      var start = from ? from.path[path.length] : 0;
      var end = to ? to.path[path.length] + 1 : node.length;
      for (var i = start; i < end; i++) {
        path.push(i);
        scan(node.child(i), i == start && from, i == end - 1 && to);
        path.pop();
      }
    }
  }
  scan(doc, from, to);
}

function isFlatRange(from, to) {
  if (from.path.length != to.path.length) return false;
  for (var i = 0; i < from.path.length; i++) {
    if (from.path[i] != to.path[i]) return false;
  }return from.offset <= to.offset;
}

function selectedSiblings(doc, from, to) {
  for (var i = 0, node = doc;; i++) {
    if (node.isTextblock) return { path: from.path.slice(0, i - 1), from: from.path[i - 1], to: from.path[i - 1] + 1 };
    var fromEnd = i == from.path.length,
        toEnd = i == to.path.length;
    var left = fromEnd ? from.offset : from.path[i];
    var right = toEnd ? to.offset : to.path[i];
    if (fromEnd || toEnd || left != right) return { path: from.path.slice(0, i), from: left, to: right + (toEnd ? 0 : 1) };
    node = node.child(left);
  }
}

function blocksBetween(doc, from, to, f) {
  var path = [];
  function scan(node, from, to) {
    if (node.isTextblock) {
      f(node, path);
    } else {
      var fromMore = from && from.path.length > path.length;
      var toMore = to && to.path.length > path.length;
      var start = !from ? 0 : fromMore ? from.path[path.length] : from.offset;
      var end = !to ? node.length : toMore ? to.path[path.length] + 1 : to.offset;
      for (var i = start; i < end; i++) {
        path.push(i);
        scan(node.child(i), fromMore && i == start ? from : null, toMore && i == end - 1 ? to : null);
        path.pop();
      }
    }
  }
  scan(doc, from, to);
}

function isPlainText(node) {
  if (node.length == 0) return true;
  var child = node.firstChild;
  return node.length == 1 && child.isText && child.styles.length == 0;
}

function canBeJoined(node, offset, depth) {
  if (!depth || offset == 0 || offset == node.length) return false;
  var left = node.child(offset - 1),
      right = node.child(offset);
  return left.sameMarkup(right);
}

function replaceHasEffect(doc, from, to) {
  for (var depth = 0, node = doc;; depth++) {
    var fromEnd = depth == from.depth,
        toEnd = depth == to.depth;
    if (fromEnd || toEnd || from.path[depth] != to.path[depth]) {
      var gapStart = undefined,
          gapEnd = undefined;
      if (fromEnd) {
        gapStart = from.offset;
      } else {
        gapStart = from.path[depth] + 1;
        for (var i = depth + 1, n = node.child(gapStart - 1); i <= from.path.length; i++) {
          if (i == from.path.length) {
            if (from.offset < n.maxOffset) return true;
          } else {
            if (from.path[i] + 1 < n.maxOffset) return true;
            n = n.child(from.path[i]);
          }
        }
      }
      if (toEnd) {
        gapEnd = to.offset;
      } else {
        gapEnd = to.path[depth];
        for (var i = depth + 1; i <= to.path.length; i++) {
          if ((i == to.path.length ? to.offset : to.path[i]) > 0) return true;
        }
      }
      if (gapStart != gapEnd) return true;
      return canBeJoined(node, gapStart, Math.min(from.depth, to.depth) - depth);
    } else {
      node = node.child(from.path[depth]);
    }
  }
}

function samePathDepth(a, b) {
  for (var i = 0;; i++) {
    if (i == a.path.length || i == b.path.length || a.path[i] != b.path[i]) return i;
  }
}
},{}],45:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ProseMirrorError = (function (_Error) {
  _inherits(ProseMirrorError, _Error);

  function ProseMirrorError(message) {
    _classCallCheck(this, ProseMirrorError);

    _get(Object.getPrototypeOf(ProseMirrorError.prototype), "constructor", this).call(this, message);
    if (this.message != message) {
      this.message = message;
      if (Error.captureStackTrace) Error.captureStackTrace(this, this.name);else this.stack = new Error(message).stack;
    }
  }

  _createClass(ProseMirrorError, [{
    key: "name",
    get: function get() {
      return this.constructor.name || functionName(this.constructor) || "ProseMirrorError";
    }
  }], [{
    key: "raise",
    value: function raise(message) {
      throw new this(message);
    }
  }]);

  return ProseMirrorError;
})(Error);

exports.ProseMirrorError = ProseMirrorError;

function functionName(f) {
  var match = /^function (\w+)/.exec(f.toString());
  return match && match[1];
}
},{}]},{},[1]);
