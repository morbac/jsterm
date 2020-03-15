function terminal(options) {
  this.options = $.extend({
    selector: '.terminal',  // terminal container selector
    cmdhandler: undefined,  // command handler

    debug: false,
    lineprefix: "<span class='prefix'>$ </span>",
    cursorofs: 0,
    textline: "",
    history: [],
    historypos: -1,
  }, (options || {}));
  
  var self = this;

  $(document).on('keydown', function(e) {
    if ($(self.options.selector).hasClass('active')) {
      e.stopPropagation();
      e.preventDefault();
    
      self.appendevent(e);
    }
  }).click(function(e) {
    if (self.options.debug) console.log(e.target);
    if ($(e.target).is($(self.options.selector))) {
      $(self.options.selector).addClass('active');
    } else {
      $(self.options.selector).removeClass('active');
    }
  }).ready(function() {
    self.appendevent(undefined); // force redraw
  });
}

// evaluate command
terminal.prototype.evalcmd = function(text) {
  var self = this;

  // split command
  var argv = [];
  $.each(text.split(' '), function() {
    argv.push($.trim(this));
  });

  // manage history
  self.options.history = $.grep(self.options.history, function(val) {
    return val != text;
  });
  self.options.history.splice(0, 0, text);

  // parse command
  self.options.cmdhandler(text, argv, self);
}

terminal.prototype.appendtext = function(text) {
  var self = this;

  var s = $(self.options.selector+' div:last-child').remove();

  // force cast to string
  text = String(text);

  var p = text.indexOf('\n');
  while (p >= 0) {
    $(self.options.selector).append($("<div><span class='text'>"+text.substring(0, p)+"</span></div>"));
    text = text.substring(p + 1);
    p = text.indexOf('\n');
  }
  $(self.options.selector).append($("<div><span class='text'>"+text+"</span></div>"));
  
  if (s) $(self.options.selector).append(s);

  self.appendevent(undefined); // force redraw
}

terminal.prototype.appendevent = function(e) {
  var self = this;

  var s = $(self.options.selector+' div:last-child');
  if (s.length == 0) {
    $(self.options.selector).append("<div></div>");
    s = $(self.options.selector+' div:last-child');
  }
  s = s.get(0);
  if (self.options.debug) console.log(e);

  if (e) {
    switch (e.keyCode) {
      case 8: // backspace
        if (self.options.cursorofs < self.options.textline.length) {
          self.options.textline = self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs - 1) +
                          self.options.textline.substring(self.options.textline.length - self.options.cursorofs);
        }
        break;
      case 46: // delete
        if (self.options.cursorofs > 0) {
          self.options.textline = self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs) +
                          self.options.textline.substring(self.options.textline.length - self.options.cursorofs + 1);
          --self.options.cursorofs;
        }
        break;
      case 13: // return
        s.innerHTML = self.options.lineprefix+self.options.textline;
        $(self.options.selector).append($("<div><span class='input'>"+self.options.lineprefix+"</span></div>"));
        self.evalcmd(self.options.textline);

        s = $(self.options.selector+' div:last-child')[0];
        self.options.textline = "";
        self.options.cursorofs = 0;
        self.options.historypos = -1;
        break;
      case 33: // page up
        var p = self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs);
        var tmp = self.options.history.findIndex(function(val, idx) {
          return self.options.historypos < idx && val.startsWith(p);
        });
        if (tmp >= 0) {
          p = self.options.history[tmp];
          self.options.cursorofs += (p.length - self.options.textline.length);
          self.options.textline = p;
          self.options.historypos = tmp;
        }
        break;
      case 34: // page down
        var p = self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs);
        var commands_inv = self.options.history.slice(0);  // clone array
        commands_inv.reverse();
        var tmp_inv = self.options.history.length - self.options.historypos - 1;
        tmp_inv = commands_inv.findIndex(function(val, idx) {
          return tmp_inv < idx && val.startsWith(p);
        });
        if (tmp_inv >= 0) {
          self.options.historypos = self.options.history.length - tmp_inv - 1;
          p = self.options.history[self.options.historypos];
          self.options.cursorofs += (p.length - self.options.textline.length);
          self.options.textline = p;
        }
        break;
      case 37: // arrow left
        if (self.options.cursorofs < self.options.textline.length) ++self.options.cursorofs;
        break;
      case 38: // arrow up
        if (self.options.historypos < self.options.history.length - 1) {
          self.options.textline = self.options.history[++self.options.historypos];
          self.options.cursorofs = 0;
        }
        break;
      case 39: // arrow right
        if (self.options.cursorofs > 0) --self.options.cursorofs;
        break;
      case 40: // arrow down
        if (self.options.historypos > 0) {
          self.options.textline = self.options.history[--self.options.historypos];
          self.options.cursorofs = 0;
        } else if (self.options.historypos == 0) {
          self.options.textline = "";
          --self.options.historypos;
          self.options.cursorofs = 0;
        }
        break;
      default:
        if (e.key.length == 1) {
          self.options.textline = self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs) + e.key + self.options.textline.substring(self.options.textline.length - self.options.cursorofs);
        }
        break;
    }
  }
    
  // redraw the line
  var line = "<span class='input'>" + self.options.lineprefix + self.options.textline.substring(0, self.options.textline.length - self.options.cursorofs) + "</span>";
  if (self.options.cursorofs == 0) {
    line += "<span class='cursor'>&#160;</span>"
  }
  else {
    line += "<span class='cursor'>" + self.options.textline.substring(self.options.textline.length - self.options.cursorofs, self.options.textline.length - self.options.cursorofs + 1) + "</span>";
    line += "<span class='input'>" + self.options.textline.substring(self.options.textline.length - self.options.cursorofs + 1) + "</span>";
  }
  
  s.innerHTML = line;
  $(self.options.selector).scrollTop($(self.options.selector)[0].scrollHeight);
}