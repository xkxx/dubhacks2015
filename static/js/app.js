var PM = require("prosemirror/dist/edit");
var ProseMirror = PM.ProseMirror;
var Keymap = PM.Keymap;
var defaultKeymap = PM.defaultKeymap;
var Pos = require("prosemirror/dist/model").Pos;

var overrideKeymap = function(handler) {
  return new Keymap({
    "Tab": function() {
      handler(true);
    },
    "Shift-Tab": function() {
      handler(false);
    }
  }, {
    fallthrough: defaultKeymap
  });
};

var getLastSent = function(str) {
  // TODO: deal with vs.
  var stop = str.lastIndexOf(".");
  return str.slice(stop + 1);
};

// props: onChange(curSent, pos), on
var ProseMirrorView = React.createClass({
  render: function() {
    var className = this.props.className;
    return (
      <div ref="mirrorNode" className={className}></div>
    );
  },
  componentDidMount: function() {
    var domNode = this.refs.mirrorNode;
    var mirror = new ProseMirror({
      place: domNode
    });
    var doc = mirror.doc;
    var cb = this.props.onChange;

    if (cb) {
      var self = this;
      mirror.on('textInput', function(input) {
        console.info("text input fired", input);
        var range = mirror.selection;
        if (!range.empty) {
          console.error("inputing while selection is not empty!")
        }
        var cursor = range.head;
        // hack: use selection to read last line
        var front = Pos.start(doc, cursor);  // hack!! FIXME: optimize
        var cursor_ = new Pos(cursor.path, cursor.offset - 1);
        var pos = mirror.coordsAtPos(cursor_);
        mirror.setSelection(front, cursor);
        var selected = mirror.selectedDoc;
        var text = selected.type.serializeText(selected).slice(0,-2);
        console.info(text + "===")
        var lastSent = getLastSent(text);
        mirror.setSelection(range);  // restore selection
        var insertBack = function(content) {
          console.info("===" + lastSent.slice(-1) + "===");
          if (lastSent.slice(-1) !== " ") {
            content = " " + content;
          }
          mirror.apply(mirror.tr.insertText(mirror.selection.head, content));
      };
        cb(lastSent, pos, insertBack);
      });
    }
    this.mirror = mirror;
  },
  shouldComponentUpdate: function() {
    return false;
  }
});

// props: show, items, pos, onSelect
var AutoCompletePopup = React.createClass({
  getInitialState: function() {
    return {
      selectedIndex: 0
    };
  },
  render: function() {
    var show = this.props.show;
    var pos = this.props.pos;
    var onSelect = this.props.onSelect;
    var selected = this.state.selectedIndex;

    var itemsList = this.props.items.map(function(item, index) {
      var onClick = function() {
        onSelect(item);
      };
      var classes = (index === selected) ? 'selected' : '';
      return (<li key={item} className={classes} onClick={onClick}>{item}</li>);
    });

    return (
      <div className="popup" style={{
        visibility: show ? "visible" : "hidden",
        left: pos.left + 5,
        top: pos.top + 5
      }}>
        <ul>{itemsList}</ul>
      </div>
    );
  }
});

var MainView = React.createClass({
  getInitialState: function() {
    return {
      showPopup: false,
      pos: {
        left: 0, top: 0
      },
      items: [],
      insertToCurEditor: function(x) {}
    };
  },
  render: function() {
    var self = this;
    var state = this.state;
    return (
    <div id="main">
      <div id="inputarea">
        <span>Subject: </span>
        <ProseMirrorView className="subject"/>
        <p>Body: </p>
        <ProseMirrorView onChange={self.onChange} className="body"/>
      </div>
      <AutoCompletePopup show={state.show} pos={state.pos} items={state.items}
        onSelect={self.onSelect}/>
    </div>);
  },
  onSelect: function(item) {
    console.info("onSelect", item);
    this.state.insertToCurEditor(item); // FIXME
    var newState = this.getInitialState();
    newState.show = false;
    this.setState(newState);
  },
  onChange: function(text, pos, insertBack) {
    var self = this;
    console.info("onChange", text, pos);
    fetch("/api/autocomplete?hint=" + encodeURIComponent(text))
    .then(function(res) {
      return res.json();
    })
    .then(function(json) {
      self.setState({
        show: true,
        pos: pos,
        items: json,
        insertToCurEditor: insertBack
      });
    })
    .catch(function(err) {
      console.error("FETCH", err);
    });
  }
});

ReactDOM.render(
  <MainView />,
  document.body
);
