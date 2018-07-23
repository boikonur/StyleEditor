var gl = null;
var shaderProgram = null;
var t = 0.0;

var width;
var height;

var startup_template = "InOutHelper<SimpleClash<Lockup<Blast<Blue,White>,AudioFlicker<Blue,White>>,White>, 300, 800>";

function resizeGL(canvas) {
  // Lookup the size the browser is displaying the canvas.
  var displayWidth = canvas.clientWidth;
  var displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  if (canvas.width != displayWidth ||
    canvas.height != displayHeight) {

    // Make the canvas the same size
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

// Create n textures of about 1MB each.
function initGL() {
  var canvas = document.getElementById("canvas_id");

  width = window.innerWidth;
  height = window.innerHeight;

  if (window.devicePixelRatio !== undefined) {
    dpr = window.devicePixelRatio;
  } else {
    dpr = 1;
  }

  width = width * 2 / 3;
  height /= 2.4;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  gl = canvas.getContext("experimental-webgl", { pixelFormat: "float16", colorSpace: "srgb", antialias: false });

  if (!gl) {
    throw "Unable to fetch WebGL rendering context for Canvas";
  }

  var str = new URL(window.location.href).searchParams.get("S");
  if (!str) {
    str = startup_template;
  }
  document.getElementById("template-in").value = str;

  Run();

  // document.getElementById("color_links").innerHTML = qlinks;
  document.getElementById("effect_links").innerHTML = effect_links;
  document.getElementById("template_links").innerHTML = template_links;

  // Bind a vertex buffer with a single triangle
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  var bufferData = new Float32Array([
    -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]);
  gl.bufferData(gl.ARRAY_BUFFER, bufferData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(shaderProgram.a_position);
  gl.vertexAttribPointer(shaderProgram.a_position, 2, gl.FLOAT, false, 0, 0);

  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Start the event loop.
  tick();
}


function compile() {
  // Create a shader that samples a 2D image.
  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader,
    document.getElementById("vertex-shader").textContent);
  gl.compileShader(vertexShader);

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  var shader_code = document.getElementById("fragment-shader").textContent;

  variables = [];
  //  shader_code = shader_code.replace("$FUNCTION$", current_style.gencode());
  shader_code = shader_code.replace("$VARIABLES$", variables.join("\n"));
  // console.log(shader_code);

  gl.shaderSource(fragmentShader, shader_code);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {

    var v = shader_code.split("\n");
    for (var i = 0; i < v.length; i++) {
      console.log((i + 1) + ": " + v[i]);
    }
    throw "Could not compile shader:\n\n" + gl.getShaderInfoLog(fragmentShader);
  }

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    throw "Could not link the shader program!\n\n" + gl.getProgramInfoLog(shaderProgram);
  }
  gl.useProgram(shaderProgram);

}

var varnum = 0;
var variables = [];
var vartypes = {};

function genvar(t) {
  varnum++;
  var variable = "u_" + varnum;
  variables.push("uniform " + t + " " + variable + ";");
  vartypes[variable] = t;
  return variable;
}

function setvar(variable, val) {
  // console.log(variable + " = " + val);
  if (vartypes[variable] == "float") {
    gl.uniform1f(gl.getUniformLocation(shaderProgram, variable), val);
    return;
  }
  if (vartypes[variable] == "int") {
    gl.uniform1i(gl.getUniformLocation(shaderProgram, variable), val);
    return;
  }
  console.log("SETVAR ERROR " + variable);
}

function Arg(expected_type, arg, default_arg) {
  //console.log(expected_type + " :: " + arg);
  if (arg == undefined) {
    if (default_arg != undefined) {
      // This must copy the argument!
      return default_arg;
    }
    throw "Too few arguments";
  }
  if (expected_type == "INT") {
    if (typeof (arg) != "number") {
      throw "Expected integer";
    }
    return arg;
  }
  if (expected_type == "COLOR" || expected_type == "FireConfig") {
    if (typeof (arg) != "object") {
      throw "Expected a COLOR";
    }
    if (!arg.run && expected_type == "COLOR") {
      throw "Expected a COLOR";
    }
    return arg;
  }

  throw "Not INT or COLOR";
}

function IntArg(arg, def_arg) { return Arg("INT", arg, def_arg); }
function ColorArg(arg, def_arg) { return Arg("COLOR", arg, def_arg); }

var pp_is_url = 0;

var next_id = 102834;
var style_ids = {};


function Copy() {
  var copyText = document.getElementById("template-in");
  copyText.select();
  document.execCommand("copy");
  // alert("Copy to Clipboard" + copyText.value);
  myAlertTop("Copy to Clipboard");
}

class ARG {
  constructor(name, type, comment) {
    this.name = name;
    this.type = type;
    this.comment = comment;
  }
};

class STYLE {
  constructor(comment, args) {
    this.comment = comment;
    if (args) console.log(args);
    this.args = args;
    this.argnum = 0;
    this.argdefs = [];
    this.super_short_desc = false;
    this.ID = next_id;
    next_id++;
  }

  add_arg(name, expected_type, comment, default_value) {
    console.log(name);
    console.log(this.args);
    try {
      this[name] = Arg(expected_type, this.args[this.argnum], default_value);
    } catch (e) {
      if (typeof (e) == "string")
        e = e + "for argument " + (this.argnum + 1) + " (" + name + ")";
      throw e;
    }
    this.argnum++;
    this.argdefs.push(new ARG(name, expected_type, comment));
  }

  get_id() {
    style_ids[this.ID] = this;
    return this.ID;
  }

  DOCOPY() {
    pp_is_url++;
    var url = this.pp();
    pp_is_url--;
    var parser = new Parser(url, classes, identifiers);
    return parser.parse();
  }

  PPURL(name, note) {
    if (this.super_short_desc) return "$";
    pp_is_url++;
    var ret = name;
    var comma = false;
    if (arguments.length > 2) {
      ret += "<";
      for (var i = 2; i < arguments.length; i += 2) {
        if (comma) ret += ",";
        comma = true;
        var arg = arguments[i];
        var note = arguments[i + 1];
        if (typeof (arg) == "number") {
          ret += arg;
        } else {
          ret += arg.pp();
        }
      }
      ret += ">";
    }
    pp_is_url--;

    return ret;
  }

  PP(name, note) {
    if (pp_is_url) {
      return this.PPURL.apply(this, arguments);
    }
    var id = this.get_id();
    var ret = "";
    ret += "<div id=X" + id + " style='border-style:solid;border-width:1px;border-color:gray;' onclick='FocusOn(" + id + ",event)'>\n";
    ret += "<span title='" + note + "'>" + name + "</span>\n";
    ret += "<div style='margin-left:2em'>\n";
    var comma = false;
    for (var i = 2; i < arguments.length; i += 2) {
      if (comma) ret += "<br>";
      comma = true;
      var arg = arguments[i];
      var note = arguments[i + 1];
      if (typeof (arg) == "number") {
        arg = "<span class=\"number\">" + arg + "</span>";
      } else {
        arg = arg.pp();
      }
      if (arg.indexOf("<br>") == -1 && arg.indexOf("<div") == -1) {
        ret += arg + " <span class=\"comment\"> " + note + "</span>\n";
      } else {
        ret += "<span class=\"comment2\"> " + note + "</span><br>\n" + arg;
      }
    }
    ret += "</div><br></div>\n";

    return ret;
  }

  PPshort(name, note) {
    var url = this.PPURL.apply(this, arguments);
    if (pp_is_url) return url;
    var id = this.get_id();
    var ret = "";
    ret += "<div id=X" + id + " style='border-style:solid;border-width:1px;border-color:gray;' onclick='FocusOn(" + id + ",event)'>\n";
    ret += "<span title='" + note + "'>" + name + "</span>\n";

    if (arguments.length > 2) {
      //ret += "&lt;";
      var comma = false;
      for (var i = 2; i < arguments.length; i += 2) {
        if (comma) ret += ",";
        comma = true;
        var arg = arguments[i];
        var note = arguments[i + 1];
        if (typeof (arg) == "number") {
          ret += "<span title='" + note + "'>" + arg + "</span>";
        } else {
          ret += "<span>/* " + note + " */</span><br>\n";
          ret += arg.pp();
        }
      }
      // ret += "&gt;";
    }
    ret += "</div>\n";

    return ret;
  }

  pp() {
    var tmp = [this.constructor.name.replace("Class", ""), this.comment];
    for (var i = 0; i < this.argdefs.length; i++) {
      tmp.push(this[this.argdefs[i].name]);
      tmp.push(this.argdefs[i].comment);
    }
    return this.PP.apply(this, tmp);
  }
}

class CONFIG extends STYLE {
  PP(name, note) {
    if (pp_is_url) {
      return this.PPURL.apply(this, arguments);
    }
    var id = this.get_id();
    var ret = "";
    ret += "<span title='" + note + "'>" + name + "</span>&lt;\n";
    ret += "<div style='margin-left:2em'>\n";
    var comma = false;
    for (var i = 2; i < arguments.length; i += 2) {
      if (comma) ret += ",<br>";
      comma = true;
      var arg = arguments[i];
      var note = arguments[i + 1];
      if (typeof (arg) == "number") {
        arg = "" + arg;
      } else {
        arg = arg.pp();
      }
      if (arg.indexOf("<br>") == -1 && arg.indexOf("<div") == -1) {
        ret += arg + " /* " + note + " */\n";
      } else {
        ret += "/* " + note + " */<br>\n" + arg;
      }
    }
    ret += "</div>&gt;\n";

    return ret;
  }
};

// var qlinks = "<h2>Colors</h2>";
var effect_links = "<h2>Effects</h2>";
var template_links = "<h2>Templates</h2>";
var all_colors = {};
var colorNames = {};

class RgbClass extends STYLE {
  constructor(r, g, b) {
    super();
    this.r = IntArg(r) / 255.0;
    this.g = IntArg(g) / 255.0;
    this.b = IntArg(b) / 255.0;
    this.name = colorNames[r + "," + g + "," + b]
  }
  run(blade) { }
  getColor(led) {
    return this;
  }
  pp() {
    if (this.name) return this.PPshort(this.name, "Color");
    return this.PPshort("Rgb", "RGB Color",
      this.r * 255, "Red component",
      this.g * 255, "Green component",
      this.b * 255, "Blue component");
  }
  mix(other, blend) {
    var ret = new RgbClass(0, 0, 0);
    ret.r = other.r * blend + this.r * (1.0 - blend);
    ret.g = other.g * blend + this.g * (1.0 - blend);
    ret.b = other.b * blend + this.b * (1.0 - blend);
    return ret;
  }
};

function Rgb(r, g, b) {
  return new RgbClass(r, g, b);
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

class Rgb16Class extends STYLE {
  constructor(r, g, b) {
    super();
    this.r = IntArg(r) / 65535.0;
    this.g = IntArg(g) / 65535.0;
    this.b = IntArg(b) / 65535.0;
    this.name = colorNames[r + "," + g + "," + b]
  }
  run(blade) { }
  getColor(led) {
    return this;
  }
  pp() {
    if (this.name) return this.PPshort(this.name, "Color");
    return this.PPshort("Rgb16", "RGB Color",
      this.r * 65535, "Red component",
      this.g * 65535, "Green component",
      this.b * 65535, "Blue component");
  }
  mix(other, blend) {
    var ret = new Rgb16Class(0, 0, 0);
    ret.r = other.r * blend + this.r * (1.0 - blend);
    ret.g = other.g * blend + this.g * (1.0 - blend);
    ret.b = other.b * blend + this.b * (1.0 - blend);
    return ret;
  }
};

function RgbF(r, g, b) {
  return new Rgb16Class(r * 65535, g * 65535, b * 65535);
}


function Rgb16(r, g, b) {
  return new Rgb16Class(r, g, b);
}

function enc(s) {
  return s.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mkbutton(name, type, color, value, columns) {
  return "<input class=\"col col-sm-12 col-md-" + columns + " " + type + "\" type=button style=\"background-color:" + color + ";\" onclick='SetTo(\"" + value + "\")' value='" + enc(name) + "'>\n";
  //  return "<span class=btn onclick='SetTo(\""+name+"\")'>"+enc(name)+"</span>\n";
}
function AddTemplate(name) {
  template_links += mkbutton(name, "template", "#FFF", name, 6);
}
function AddEffect(name, value) {
  effect_links += mkbutton(name, "effect", "#FFF", value, 3);
}
function AddColor(value, r, g, b) {
  colorNames[r + "," + g + "," + b] = value;
  var color = new RgbClass(r, g, b);
  all_colors[value] = color;

  // qlinks += mkbutton("", "color", rgbToHex(r,g,b), value, 1); //name, type, color, value

}

AddTemplate("InOutHelper<SimpleClash<Lockup<Blast<Blue,White>,AudioFlicker<Blue,WHITE>>,White>, 300, 800>");
AddTemplate("InOutHelper<EasyBlade<OnSpark<GREEN>, WHITE>, 300, 800> >");
AddTemplate("StyleNormalPtr<AudioFlicker<YELLOW, WHITE>, BLUE, 300, 800>");
AddTemplate("StyleNormalPtr<AudioFlicker<GREEN, YELLOW>, RED, 300, 800>");
AddTemplate("InOutSparkTip<EasyBlade<MAGENTA, WHITE>, 300, 800> >");
AddTemplate("StyleNormalPtr<Gradient<RED, BLUE>, Gradient<CYAN, YELLOW>, 300, 800>");
AddTemplate("StyleNormalPtr<Pulsing<RED, Rgb<50, 0, 0>, 5000>, WHITE, 300, 800, RED>");
AddTemplate("StyleRainbowPtr<300, 800>");
AddTemplate("StyleStrobePtr<WHITE, Rainbow, 15, 300, 800>");
AddTemplate("StyleFirePtr<RED, YELLOW>");

AddEffect("RGB", "Rgb<255, 255, 255>");
AddEffect("Rainbow", "Rainbow");
AddEffect("OnSpark", "OnSpark<GREEN, WHITE, 200>");
AddEffect("Pulsing", "Pulsing<BLUE, RED, 800>");
AddEffect("Strobe", "Strobe<BLACK, WHITE, 15, 1>");
AddEffect("Gradient", "Gradient<RED, BLUE>");
AddEffect("AudioFlicker", "AudioFlicker<WHITE, BLUE>");
AddEffect("Blast", "Blast<BLUE, WHITE>");
AddEffect("SimpleClash", "SimpleClash<RED, WHITE, 40>");
AddEffect("Lockup", "Lockup<GREEN, RED>");
AddEffect("InOutHelper", "InOutHelper<WHITE, 300, 800, BLACK>");
AddEffect("InOutSparkTip", "InOutSparkTip<RED, 1000, 800, WHITE>");
AddEffect("ColorCycle", "ColorCycle<BLUE,  0, 1, CYAN,  100, 3000, 5000>");
AddEffect("Cylon", "Cylon<RED, 5, 20>");
AddEffect("RandomFlicker", "RandomFlicker<YELLOW, BLUE>");
AddEffect("RandomPerLEDFlicker", "RandomPerLEDFlicker<GREEN, Magenta>");
AddEffect("BrownNoiseFlicker", "BrownNoiseFlicker<GREEN, Magenta, 50>");
AddEffect("HumpFlicker", "HumpFlicker<GREEN, Magenta, 50>");
AddEffect("RgbCycle", "RgbCycle");
AddEffect("StyleFire", "StyleFire<BLUE, CYAN>");

AddColor("AliceBlue", 223, 239, 255);
AddColor("Aqua", 0, 255, 255);
AddColor("Aquamarine", 55, 255, 169);
AddColor("Azure", 223, 255, 255);
AddColor("Bisque", 255, 199, 142);
AddColor("Black", 0, 0, 0);
AddColor("BlanchedAlmond", 255, 213, 157);
AddColor("Blue", 0, 0, 255);
AddColor("Chartreuse", 55, 255, 0);
AddColor("Coral", 255, 55, 19);
AddColor("Cornsilk", 255, 239, 184);
AddColor("Cyan", 0, 255, 255);
AddColor("DarkOrange", 255, 68, 0);
AddColor("DeepPink", 255, 0, 75);
AddColor("DeepSkyBlue", 0, 135, 255);
AddColor("DodgerBlue", 2, 72, 255);
AddColor("FloralWhite", 255, 244, 223);
AddColor("GhostWhite", 239, 239, 255);
AddColor("Green", 0, 255, 0);
AddColor("GreenYellow", 108, 255, 6);
AddColor("HoneyDew", 223, 255, 223);
AddColor("HotPink", 255, 36, 118);
AddColor("Ivory", 255, 255, 223);
AddColor("LavenderBlush", 255, 223, 233);
AddColor("LemonChiffon", 255, 244, 157);
AddColor("LightCyan", 191, 255, 255);
AddColor("LightPink", 255, 121, 138);
AddColor("LightSalmon", 255, 91, 50);
AddColor("LightYellow", 255, 255, 191);
AddColor("Magenta", 255, 0, 255);
AddColor("MintCream", 233, 255, 244);
AddColor("MistyRose", 255, 199, 193);
AddColor("Moccasin", 255, 199, 119);
AddColor("NavajoWhite", 255, 187, 108);
AddColor("Orange", 255, 97, 0);
AddColor("OrangeRed", 255, 14, 0);
AddColor("PapayaWhip", 255, 221, 171);
AddColor("PeachPuff", 255, 180, 125);
AddColor("Pink", 255, 136, 154);
AddColor("Red", 255, 0, 0);
AddColor("SeaShell", 255, 233, 219);
AddColor("Snow", 255, 244, 244);
AddColor("SpringGreen", 0, 255, 55);
AddColor("SteelBlue", 14, 57, 118);
AddColor("Tomato", 255, 31, 15);
AddColor("White", 255, 255, 255);
AddColor("Yellow", 255, 255, 0);

var WHITE = Rgb(255, 255, 255);
var RED = Rgb(255, 0, 0);
var GREEN = Rgb(0, 255, 0);
var BLUE = Rgb(0, 0, 255);
var YELLOW = Rgb(255, 255, 0);
var CYAN = Rgb(0, 255, 255);
var MAGENTA = Rgb(255, 0, 255);
var WHITE = Rgb(255, 255, 255);
var BLACK = Rgb(0, 0, 0);


//--
class RainbowClass extends STYLE {
  constructor() {
    super("Scrolling color rainbow", arguments);
  }
  run(blade) {
    this.m = millis();
  }
  getColor(led) {
    return RgbF(max(0.0, sin((this.m * 3.0 + led * 50.0) % 1024.0 * Math.PI * 2.0 / 1000.0)),
      max(0.0, sin((this.m * 3.0 + led * 50.0 + 1024.0 / 3.0) % 1024.0 * Math.PI * 2.0 / 1000.0)),
      max(0.0, sin((this.m * 3.0 + led * 50.0 + 1024.0 * 2.0 / 3.0) % 1024.0 * Math.PI * 2.0 / 1000.0)));
  }

  pp() { return this.PPshort("Rainbow", "Scrolling color rainbow"); }
};

function Rainbow() {
  return new RainbowClass();
}

var STATE_ON = 0;
var STATE_LOCKUP = 0;
var STATE_CLASH = 0;
var STATE_ROTATE = 0;

class Range {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }
  Size() { return max(0, this.end - this.start); }
  Intersect(other) {
    return new Range(max(this.start, other.start), min(this.end, other.end));
  }
};

// TODO
// Mix

class ColorCycleClass extends STYLE {
  constructor(COLOR, percentage, rpm,
    ON_COLOR, on_percentage, on_rpm,
    fade_time_millis) {
    super();
    this.COLOR = ColorArg(COLOR);
    this.percentage = IntArg(percentage);
    this.rpm = IntArg(rpm);
    this.ON_COLOR = ColorArg(ON_COLOR, COLOR.DOCOPY());
    this.on_percentage = IntArg(on_percentage, percentage);
    this.on_rpm = IntArg(on_rpm, rpm);
    this.fade_time_millis = IntArg(fade_time_millis, 1);
    this.last_micros_ = 0;
    this.fade_ = 0.0;
    this.pos_ = 0.0;
  }
  run(blade) {
    this.COLOR.run(blade);
    this.ON_COLOR.run(blade);
    var now = millis();
    var delta = now - this.last_micros_;
    this.last_micros_ = now;
    if (delta > 1000) delta = 1;
    var fade_delta = delta / this.fade_time_millis;
    if (!blade.is_on()) fade_delta = - fade_delta;
    this.fade_ = Math.max(0.0, Math.min(1.0, this.fade_ + fade_delta));
    var rpm = this.rpm * (1.0 - this.fade_) + this.on_rpm * this.fade_;
    var percentage = this.percentage * (1.0 - this.fade_) + this.on_percentage * this.fade_;
    this.fraction_ = percentage / 100.0;
    this.pos_ = ((this.pos_ + delta / 60000.0 * rpm) % 1.0);
  }
  getColor(led) {
    var led_range = new Range(led / 144.0, (led + 1) / 144.0);
    var black_mix = 0.0;
    if (this.pos_ + this.fraction_ < 1.0) {
      black_mix = new Range(this.pos_, this.pos_ + this.fraction_).Intersect(led_range).Size();
    } else {
      black_mix = new Range(this.pos_, 1.0).Intersect(led_range).Size() +
        new Range(0.0, (this.pos_ + this.fraction_) % 1.0).Intersect(led_range).Size();
    }
    black_mix *= 144.0;
    var c = this.COLOR.getColor(led);
    var on_c = this.ON_COLOR.getColor(led);
    c = c.mix(on_c, this.fade_);
    c = BLACK.mix(c, black_mix);
    return c;
  }
  pp() {
    return this.PP("ColorCycle", "Rotating beam",
      this.COLOR, "beam color",
      this.percentage, "percentage of blade lit",
      this.rpm, "rotation speed",
      this.ON_COLOR, "beam color when on",
      this.on_percentage, "percentage of blade lit when on",
      this.on_rpm, "rotation speed when on",
      this.fade_time_millis, "time to transition to/from on state");
  }
};

function ColorCycle(COLOR, percentage, rpm,
  ON_COLOR, on_percentage, on_rpm,
  fade_time_millis) {
  return new ColorCycleClass(COLOR, percentage, rpm,
    ON_COLOR, on_percentage, on_rpm,
    fade_time_millis);
}


class CylonClass extends STYLE {
  constructor(COLOR, percentage, rpm,
    ON_COLOR, on_percentage, on_rpm,
    fade_time_millis) {
    super();
    this.COLOR = ColorArg(COLOR);
    this.percentage = IntArg(percentage);
    this.rpm = IntArg(rpm);
    this.ON_COLOR = ColorArg(ON_COLOR, COLOR.DOCOPY());
    this.on_percentage = IntArg(on_percentage, percentage);
    this.on_rpm = IntArg(on_rpm, rpm);
    this.fade_time_millis = IntArg(fade_time_millis, 1);
    this.last_micros_ = 0;
    this.fade_ = 0.0;
    this.pos_ = 0.0;
  }
  run(blade) {
    this.COLOR.run(blade);
    this.ON_COLOR.run(blade);
    var now = millis();
    var delta = now - this.last_micros_;
    this.last_micros_ = now;
    if (delta > 1000) delta = 1;
    var fade_delta = delta / this.fade_time_millis;
    if (!blade.is_on()) fade_delta = - fade_delta;
    this.fade_ = Math.max(0.0, Math.min(1.0, this.fade_ + fade_delta));
    // setvar(this.MIX, this.fade_);
    var rpm = this.rpm * (1.0 - this.fade_) + this.on_rpm * this.fade_;
    var percentage = this.percentage * (1.0 - this.fade_) + this.on_percentage * this.fade_;
    this.fraction_ = percentage / 100.0;
    // TODO: FIXME THIS SHOULD BE SIN()
    this.pos_ = (this.pos_ + delta / 60000.0 * rpm) % 1.0;
    this.POS = (Math.sin(this.pos_ * Math.PI * 2.0) + 1.0) * (0.5 - percentage / 200.0);
  }
  getColor(led) {
    var led_range = new Range(led / 144.0, (led + 1) / 144.0);
    var black_mix = new Range(this.POS, this.POS + this.fraction_).Intersect(led_range).Size();
    black_mix *= 144.0;
    var c = this.COLOR.getColor(led);
    var on_c = this.ON_COLOR.getColor(led);
    c = c.mix(on_c, this.fade_);
    c = BLACK.mix(c, black_mix);
    return c;
  }
  pp() {
    return this.PP("Cylon", "Rotating beam",
      this.COLOR, "beam color",
      this.percentage, "percentage of blade lit",
      this.rpm, "rotation speed",
      this.ON_COLOR, "beam color when on",
      this.on_percentage, "percentage of blade lit when on",
      this.on_rpm, "rotation speed when on",
      this.fade_time_millis, "time to transition to/from on state");
  }
};

function Cylon(COLOR, percentage, rpm,
  ON_COLOR, on_percentage, on_rpm,
  fade_time_millis) {
  return new CylonClass(COLOR, percentage, rpm,
    ON_COLOR, on_percentage, on_rpm,
    fade_time_millis);
}

class OnSparkClass extends STYLE {
  constructor(T, SPARK_COLOR, MILLIS) {
    super();
    this.T = ColorArg(T);
    this.SPARK_COLOR = ColorArg(SPARK_COLOR, WHITE);
    this.MILLIS = IntArg(MILLIS, 200);
    this.on_ = false;
    this.on_millis_ = 0;
  }
  run(blade) {
    this.T.run(blade);
    this.SPARK_COLOR.run(blade);

    var m = millis();
    if (blade.is_on() != this.on_) {
      this.on_ = blade.is_on();
      if (this.on_) this.on_millis_ = m;
    }
    var t = m - this.on_millis_;
    if (t < this.MILLIS) {
      this.mix_ = 1.0 - t / this.MILLIS;
    } else {
      this.mix_ = 0.0;
    }
  }
  getColor(led) {
    var ret = this.T.getColor(led);
    var spark = this.SPARK_COLOR.getColor(led);
    return ret.mix(spark, this.mix_);
  }
  pp() {
    return this.PP("OnSpark", "Shows the spark color for 'MILLIS' milliseconds on startup.",
      this.T, "Base color",
      this.SPARK_COLOR, "Spark color",
      this.MILLIS, "MILLIS");
  }
};

function OnSpark(T, SPARK_COLOR, MILLIS) {
  return new OnSparkClass(T, SPARK_COLOR, MILLIS);
}

class PulsingClass extends STYLE {
  constructor(COLOR1, COLOR2, PULSE_MILLIS) {
    console.log(arguments);
    super("Pulses between A and B every M milliseconds", Array.from(arguments));
    this.add_arg("COLOR1", "COLOR", "A");
    this.add_arg("COLOR2", "COLOR", "B");
    this.add_arg("PULSE_MILLIS", "INT", "M");
  }
  run(blade) {
    this.COLOR1.run(blade);
    this.COLOR2.run(blade);
    this.var_ = 0.5 + 0.5 * Math.sin(millis() * 3.1415 * 2.0 / this.PULSE_MILLIS);
  }
  getColor(led) {
    var c = this.COLOR1.getColor(led);
    var c2 = this.COLOR2.getColor(led);
    return c.mix(c2, this.var_);
  }
}

function Pulsing(COLOR1, COLOR2, PULSE_MILLIS) {
  console.log(COLOR1);
  console.log(COLOR2);
  console.log(PULSE_MILLIS);
  console.log(arguments);
  return new PulsingClass(COLOR1, COLOR2, PULSE_MILLIS);
}

class StrobeClass extends STYLE {
  constructor(T, STROBE_COLOR, STROBE_FREQUENCY, STROBE_MILLIS) {
    super();
    this.T = ColorArg(T);
    this.STROBE_COLOR = ColorArg(STROBE_COLOR);
    this.STROBE_FREQUENCY = IntArg(STROBE_FREQUENCY);
    this.STROBE_MILLIS = IntArg(STROBE_MILLIS);
    this.strobe_ = false;
    this.strobe_start_ = 0;
  }
  run(blade) {
    this.T.run(blade);
    this.STROBE_COLOR.run(blade);
    var m = millis();
    var timeout = this.strobe_ ? this.STROBE_MILLIS : (1000 / this.STROBE_FREQUENCY);
    if (m - this.strobe_start_ > timeout) {
      this.strobe_start_ += timeout;
      if (m - this.strobe_start_ > this.STROBE_MILLIS + (1000 / this.STROBE_FREQUENCY))
        this.strobe_start_ = m;
      this.strobe_ = !this.strobe_;
    }
  }
  getColor(led) {
    var c = this.T.getColor(led);
    var strobe_color = this.STROBE_COLOR.getColor(led);
    return c.mix(strobe_color, this.strobe_ ? 1.0 : 0.0);
  }
  pp() {
    return this.PP("Strobe", "Stoboscope effect",
      this.T, "off color",
      this.STROBE_COLOR, "Color",
      this.STROBE_FREQUENCY, "Frequency",
      this.STROBE_MILLIS, "Strobe length in milliseconds");
  }
};

function Strobe(T, STROBE_COLOR, STROBE_FREQUENCY, STROBE_MILLIS) {
  return new StrobeClass(T, STROBE_COLOR, STROBE_FREQUENCY, STROBE_MILLIS);
}

class GradientClass extends STYLE {
  constructor(A, B) {
    super("Color A at base, B at tip, smooth gradient in between.", arguments);
    this.add_arg("A", "COLOR", "A");
    this.add_arg("B", "COLOR", "B");
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
  }
  getColor(led) {
    return this.A.getColor(led).mix(this.B.getColor(led), led / 144.0);
  }
};

function Gradient(A, B) {
  return new GradientClass(A, B);
}

class AudioFlickerClass extends STYLE {
  constructor(A, B) {
    super();
    this.A = ColorArg(A);
    this.B = ColorArg(B);
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
    this.var_ = Math.random() * Math.random();
  }
  getColor(led) {
    return this.A.getColor(led).mix(this.B.getColor(led), this.var_)
  }
  pp() {
    return this.PP("AudioFlicker", "Selects between A and B based on audio. Higher volumes means more B.",
      this.A, "A",
      this.B, "B");
  }
};

function AudioFlicker(A, B) {
  return new AudioFlickerClass(A, B);
}

class RandomFlickerClass extends STYLE {
  constructor(A, B) {
    super();
    this.A = ColorArg(A);
    this.B = ColorArg(B);
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
    this.var_ = Math.random() * Math.random();
  }
  getColor(led) {
    return this.A.getColor(led).mix(this.B.getColor(led), this.var_)
  }
  pp() {
    return this.PP("RandomFlicker", "Selects between A and B randomly.",
      this.A, "A",
      this.B, "B");
  }
};

function RandomFlicker(A, B) {
  return new RandomFlickerClass(A, B);
}

class RandomPerLEDFlickerClass extends STYLE {
  constructor(A, B) {
    super();
    this.A = ColorArg(A);
    this.B = ColorArg(B);
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
  }
  getColor(led) {
    return this.A.getColor(led).mix(this.B.getColor(led), Math.random());
  }
  pp() {
    return this.PP("RandomPerLEDFlicker", "Selects between A and B randomly.",
      this.A, "A",
      this.B, "B");
  }
};

function RandomPerLEDFlicker(A, B) {
  return new RandomPerLEDFlickerClass(A, B);
}

class BrownNoiseFlickerClass extends STYLE {
  constructor(A, B, grade) {
    super();
    this.A = ColorArg(A);
    this.B = ColorArg(B);
    this.grade = IntArg(grade, 50);
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
    this.mix = Math.floor(Math.random() * 255);
  }
  getColor(led) {
    var ret = this.A.getColor(led).mix(this.B.getColor(led), this.mix / 255.0)
    this.mix += Math.floor(Math.random() * (this.grade * 2 + 1)) - this.grade;
    this.mix = max(min(this.mix, 255), 0);
    return ret;
  }
  pp() {
    return this.PP("BrownNoiseFlicker", "Randomly selects between A and B but keeps nearby pixels similar",
      this.A, "A",
      this.B, "B",
      this.grade, "grade"
    );
  }
};

function BrownNoiseFlicker(A, B, grade) {
  return new BrownNoiseFlickerClass(A, B, grade);
}

class HumpFlickerClass extends STYLE {
  constructor(A, B, hump_width) {
    super();
    this.A = ColorArg(A);
    this.B = ColorArg(B);
    this.hump_width = IntArg(hump_width, 50);
  }
  run(blade) {
    this.A.run(blade);
    this.B.run(blade);
    this.pos = Math.floor(Math.random() * blade.num_leds());
  }
  getColor(led) {
    var a = this.A.getColor(led);
    var b = this.B.getColor(led);
    var m = Math.abs(led - this.pos) * 255 / this.hump_width
    m = max(min(m, 255), 0);
    return a.mix(b, m / 255.0);
  }
  pp() {
    return this.PP("HumpFlicker", "Randomly selects between A and B but keeps nearby pixels similar",
      this.A, "A",
      this.B, "B",
      this.hump_width, "hump_width"
    );
  }
};

function HumpFlicker(A, B, hump_width) {
  return new HumpFlickerClass(A, B, hump_width);
}

class FireConfigClass extends CONFIG {
  constructor(INTENSITY_BASE, INTENSITY_RAND, COOLING) {
    super("Fire configuration", Array.from(arguments));
    this.add_arg("intensity_base", "INT", "intensity base");
    this.add_arg("intensity_rand", "INT", "intensity random");
    this.add_arg("cooling", "INT", "cooling");
  }
}

function FireConfig(B, R, C) {
  return new FireConfigClass(B, R, C);
}

const FIRE_STATE_OFF = 0
const FIRE_STATE_ACTIVATING = 1;
const FIRE_STATE_ON = 2;

class StyleFireClass extends STYLE {
  constructor(COLOR1, COLOR2, DELAY, SPEED, NORM, CLASH, LOCK, OFF) {
    super("Too complicated to describe briefly", Array.from(arguments));
    this.add_arg("COLOR1", "COLOR", "Warm color");
    this.add_arg("COLOR2", "COLOR", "Hot color");
    this.add_arg("DELAY", "INT", "Delay", 0);
    this.add_arg("SPEED", "INT", "Seed", 2);
    this.add_arg("NORM", "FireConfig", "Config when on", FireConfig(0, 2000, 5));
    this.add_arg("CLASH", "FireConfig", "Config during clash", FireConfig(3000, 0, 0));
    this.add_arg("LOCK", "FireConfig", "Config during lockup", FireConfig(0, 5000, 10));
    this.add_arg("OFF", "FireConfig", "Config when off", FireConfig(0, 0, this.NORM.cooling));
    this.heat = new Uint16Array(144 + 13);
    this.state = FIRE_STATE_OFF;
    this.last_update = 0;
  }
  On(blade) {
    if (!blade.is_on()) {
      this.state = FIRE_STATE_OFF;
      return false;
    }
    if (this.state == FIRE_STATE_OFF) {
      this.state = FIRE_STATE_ACTIVATING;
      this.on_time = millis();
    }
    if (this.state = FIRE_STATE_ACTIVATING) {
      if (millis() - this.on_time < this.DELAY) return false;
      this.state = FIRE_STATE_ON;
    }
    return true;
  }
  run(blade) {
    this.COLOR1.run(blade);
    this.COLOR2.run(blade);
    var m = millis();
    if (m - this.last_update < 10)
      return;
    if (m - this.last_update < 40) {
      this.last_update += 10;;
    } else {
      this.last_update = m;
    }
    var num_leds = blade.num_leds();
    this.num_leds = num_leds;
    var conf = this.OFF;
    if (STATE_CLASH) {
      conf = this.CLASH;
      STATE_CLASH = 0;
    } else if (this.On(blade)) {
      if (STATE_LOCKUP == 0) {
        conf = this.NORM;
      } else {
        conf = this.LOCK;
      }
    }

    for (var i = 0; i < this.SPEED; i++) {
      this.heat[num_leds + i] = conf.intensity_base +
        random(random(random(conf.intensity_rand)));
    }
    for (var i = 0; i < num_leds; i++) {
      var x = (this.heat[i + this.SPEED - 1] * 3 + this.heat[i + this.SPEED] * 10 + this.heat[i + this.SPEED + 1] * 3) >> 4;
      x -= random(conf.cooling);
      this.heat[i] = max(0, min(x, 65535));
    }
  }
  getColor(led) {
    var h = this.heat[this.num_leds - 1 - led];
    if (h < 256) {
      return BLACK.mix(this.COLOR1.getColor(led), h / 255.0);
    } else if (h < 512) {
      return this.COLOR1.getColor(led).mix(this.COLOR2.getColor(led), (h - 256) / 255.0);
    } else if (h < 768) {
      return this.COLOR2.getColor(led).mix(WHITE, (h - 512) / 255.0);
    } else {
      return WHITE;
    }
  }
};

function StyleFire(COLOR1, COLOR2, DELAY, SPEED, NORM, CLASH, LOCK, OFF) {
  return new StyleFireClass(COLOR1, COLOR2, DELAY, SPEED, NORM, CLASH, LOCK, OFF);
}

class RgbCycleClass extends STYLE {
  constructor() {
    super();
    this.n = 0;
  }
  run(blade) {
    this.n++;
    if (this.n >= 3) this.n = 0;
    if (this.n == 0) this.RET = Rgb(255, 0, 0);
    if (this.n == 1) this.RET = Rgb(0, 255, 0);
    if (this.n == 2) this.RET = Rgb(0, 0, 250);
  }
  getColor(led) {
    return this.RET;
  }
  pp() {
    return this.PP("RgbCycle", "alternates betwen red, green and blue.");
  }
};

function RgbCycle() {
  return new RgbCycleClass();
}

var locations = [0, 0, 0, 0, 0];
var start_times = [0, 0, 0, 0, 0];

function AddBlast() {
  locations.shift();
  start_times.shift();
  locations.push(Math.random() * 0.7 + 0.2);
  start_times.push(millis());
}

class BlastClass extends STYLE {
  constructor(BASE, BLAST) {
    super();
    this.BASE = ColorArg(BASE);
    this.BLAST = ColorArg(BLAST, WHITE);
  }
  run(blade) {
    this.BASE.run(blade);
    this.BLAST.run(blade);
    this.T = millis();
  }
  getColor(led) {
    var base = this.BASE.getColor(led);
    var blast = this.BLAST.getColor(led);
    var b = 0.0;
    for (var i = 0; i < 5; i++) {
      var x = (locations[i] - led / 144.0) * 30.0;
      var T = this.T - start_times[i];
      var t = 0.5 + T / 200.0;
      if (x == 0.0) {
        b += 1.0 / (t * t);
      } else {
        b += sin(x / (t * t)) / x;
      }
    }
    return base.mix(blast, min(b, 1.0));
  }
  pp() {
    return this.PP("Blast", "Implements the blast effect",
      this.BASE, "Base color",
      this.BLAST, "Blast color");
  }
};

function Blast(BASE, BLAST) {
  return new BlastClass(BASE, BLAST);
}

class SimpleClashClass extends STYLE {
  constructor(T, CLASH, CLASH_MILLIS) {
    super();
    this.T = ColorArg(T);
    this.CLASH = ColorArg(CLASH, WHITE);
    this.CLASH_MILLIS = IntArg(CLASH_MILLIS, 40);
    this.clash_start = 0;
  }
  run(blade) {
    this.T.run(blade);
    this.CLASH.run(blade);

    var clashing = 0;
    if (STATE_CLASH) {
      this.clash_start = millis();
      STATE_CLASH = 0;
      clashing = 1;
    }
    if (millis() - this.clash_start < this.CLASH_MILLIS) {
      clashing = 1;
    }
    this._clashing = clashing;
  }
  getColor(led) {
    return this.T.getColor(led).mix(this.CLASH.getColor(led),
      this._clashing ? 1.0 : 0.0);
  }
  pp() {
    return this.PP("SimpleClash", "Implements the clash effect",
      this.T, "Base color",
      this.CLASH, "Clash color",
      this.CLASH_MILLIS, "How many ms to show the clash color for.");
  }
};

function SimpleClash(T, CLASH, MILLIS) {
  return new SimpleClashClass(T, CLASH, MILLIS);
}

class LockupClass extends STYLE {
  constructor(BASE, LOCKUP) {
    super("Implements the lockup and drag effects.", arguments);
    this.add_arg("BASE", "COLOR", "Base color");
    this.add_arg("LOCKUP", "COLOR", "Lockup color");
  }
  run(blade) {
    this.BASE.run(blade);
    this.LOCKUP.run(blade);
    if (STATE_LOCKUP == 0) {
      this.thres = blade.num_leds() * 2;
    } else if (STATE_LOCKUP == 1) {
      this.thres = -1;
    } else if (STATE_LOCKUP == 2) {
      this.thres = blade.num_leds() * 98 / 100;
    }
  }

  getColor(led) {
    if (led >= this.thres) {
      return this.LOCKUP.getColor(led);
    } else {
      return this.BASE.getColor(led);
    }
  }
};


function Lockup(BASE, LOCKUP) {
  return new LockupClass(BASE, LOCKUP);
}

const start_millis = new Date().getTime();
function actual_millis() {
  return new Date().getTime() - start_millis;
}
var current_micros = 0;
function micros() {
  return current_micros;
}

function millis() {
  return current_micros / 1000;
}

var max = Math.max;
var min = Math.min;
var sin = Math.sin;
function random(i) {
  return Math.floor(Math.random() * i);
}

class Blade {
  is_on() {
    return STATE_ON;
  }
  num_leds() {
    return 144;
  }
};

var focus_catcher;

function Focus(T) {
  focus_catcher = T;
  return T;
}

function StylePtr(T) {
  return T;
}
function EasyBlade(color, clash_color, lockup_flicker_color) {
  if (!lockup_flicker_color) {
    lockup_flicker_color = WHITE.DOCOPY();
  }
  return SimpleClash(Lockup(Blast(color, new RgbClass(255, 255, 255)), AudioFlicker(color.DOCOPY(), lockup_flicker_color)), clash_color);
}
function StyleNormalPtr(base_color, clash_color, out_ms, in_ms, lockup_flicker_color, blast_color) {
  if (!lockup_flicker_color) {
    lockup_flicker_color = WHITE.DOCOPY();
  }
  if (!blast_color) {
    blast_color = WHITE.DOCOPY();
  }
  var tmp = AudioFlicker(base_color, lockup_flicker_color);
  var tmp2 = Blast(base_color.DOCOPY(), blast_color);
  tmp = Lockup(tmp2, tmp);
  tmp = SimpleClash(tmp, clash_color);
  return InOutHelper(tmp, out_ms, in_ms);
}

function StyleRainbowPtr(out_ms, in_ms, clash_color, lockup_flicker_color) {
  if (!clash_color) {
    clash_color = WHITE.DOCOPY();
  }
  if (!lockup_flicker_color) {
    lockup_flicker_color = WHITE.DOCOPY();
  }
  var tmp = AudioFlicker(Rainbow(), lockup_flicker_color);
  tmp = Lockup(Rainbow(), tmp);
  tmp = SimpleClash(tmp, clash_color);
  return InOutHelper(tmp, out_ms, in_ms);
}

function StyleStrobePtr(strobe_color, clash_color, frequency, out_ms, in_ms) {
  var strobe = Strobe(BLACK.DOCOPY(), strobe_color, frequency, 1);
  var fast_strobe = Strobe(BLACK.DOCOPY(), strobe_color.DOCOPY(), frequency * 3, 1);
  var tmp = Lockup(strobe, fast_strobe);
  tmp = SimpleClash(tmp, clash_color);
  return InOutHelper(tmp, out_ms, in_ms);
}

function StyleFirePtr(COLOR1, COLOR2,
  BLADE_NUM = 1, DELAY = 0, SPEED = 2,
  NORM_BASE = 0, NORM_RAND = 2000, NORM_COOL = 5,
  CLSH_BASE = 3000, CLSH_RAND = 0, CLSH_COOL = 0,
  LOCK_BASE = 0, LOCK_RAND = 5000, LOCK_COOL = 10,
  OFF_BASE = 0, OFF_RAND = 0, OFF_COOL = 10) {
  // TODO: Fix all the defaults
  return StyleFire(
    COLOR1, COLOR2,
    DELAY, SPEED,
    FireConfig(NORM_BASE, NORM_RAND, NORM_COOL),
    FireConfig(CLSH_BASE, CLSH_RAND, CLSH_COOL),
    FireConfig(LOCK_BASE, LOCK_RAND, LOCK_COOL),
    FireConfig(OFF_BASE, OFF_RAND, OFF_COOL));
}


//--
class InOutHelperClass extends STYLE {
  constructor(T, OUT_MILLIS, IN_MILLIS, OFF_COLOR) {
    super();
    this.T = ColorArg(T);
    this.OUT_MILLIS = IntArg(OUT_MILLIS);
    this.IN_MILLIS = IntArg(IN_MILLIS);
    this.OFF_COLOR = ColorArg(OFF_COLOR, BLACK);
    this.last_micros_ = 0;
    this.extension = 0;
  }
  run(blade) {
    this.T.run(blade);
    this.OFF_COLOR.run(blade);

    var now = micros();
    var delta = now - this.last_micros_;
    this.last_micros_ = now;
    if (blade.is_on()) {
      if (this.extension == 0.0) {
        // We might have been off for a while, so delta might
        // be insanely high.
        this.extension = 0.00001;
      } else {
        this.extension += delta / (this.OUT_MILLIS * 1000.0);
        this.extension = Math.min(this.extension, 1.0);
      }
    } else {
      this.extension -= delta / (this.IN_MILLIS * 1000.0);
      this.extension = Math.max(this.extension, 0.0);
    }
    this.thres = this.extension * (blade.num_leds() + 1) * 256;
  }
  getColor(led) {
    var x = led + 1 - this.thres / 256.0;
    x = min(x, 1.0);
    x = max(x, 0.0);
    var c = this.T.getColor(led);
    var off = this.OFF_COLOR.getColor(led);
    return c.mix(off, x);
  }
  pp() {
    return this.PP("InOutHelper", "Implements extention/retraction",
      this.T, "Base color",
      this.OUT_MILLIS, "Extention length in milliseconds",
      this.IN_MILLIS, "Retraction length in milliseconds",
      this.OFF_COLOR, "Color when retracted");
  }
};

function InOutHelper(T, I, O, OFF) {
  return new InOutHelperClass(T, I, O, OFF);
}

class InOutSparkTipClass extends STYLE {
  constructor(T, OUT_MILLIS, IN_MILLIS, OFF_COLOR) {
    super("Implements extention/retraction", arguments);
    this.add_arg("T", "COLOR", "Base color");
    this.add_arg("OUT_MILLIS", "INT", "Extentions length in ms");
    this.add_arg("IN_MILLIS", "INT", "Retraction length in ms");
    this.add_arg("SPARK_COLOR", "COLOR", "Color of spark tip", WHITE.DOCOPY());
    this.last_micros_ = 0;
    this.extension = 0;
  }
  run(blade) {
    this.T.run(blade);
    this.SPARK_COLOR.run(blade);

    var now = micros();
    var delta = now - this.last_micros_;
    this.last_micros_ = now;
    if (blade.is_on()) {
      if (this.extension == 0.0) {
        // We might have been off for a while, so delta might
        // be insanely high.
        this.extension = 0.00001;
      } else {
        this.extension += delta / (this.OUT_MILLIS * 1000.0);
        this.extension = Math.min(this.extension, 1.0);
      }
    } else {
      this.extension -= delta / (this.IN_MILLIS * 1000.0);
      this.extension = Math.max(this.extension, 0.0);
    }
    var thres = this.extension * (blade.num_leds() + 5) * 256;
    this.thres1 = Math.floor(thres);
    if (blade.is_on()) {
      this.thres2 = Math.floor(thres) - 1024;
    } else {
      this.thres2 = Math.floor(thres) + 1024;
    }
  }
  getColor(led) {
    var x1 = led + 1 - this.thres1 / 256.0;
    x1 = min(x1, 1.0);
    x1 = max(x1, 0.0);
    var x2 = led + 1 - this.thres2 / 256.0;
    x2 = min(x2, 1.0);
    x2 = max(x2, 0.0);
    var c = this.T.getColor(led);
    var spark_color = this.SPARK_COLOR.getColor(led);
    var off = Rgb(0, 0, 0);
    return c.mix(spark_color, x2).mix(off, x1);
  }
};

function InOutSparkTip(T, I, O, S) {
  return new InOutSparkTipClass(T, I, O, S);
}

var start = new Date().getTime();

var current_style = InOutHelper(SimpleClash(Lockup(new BlastClass(BLUE, WHITE), new AudioFlickerClass(BLUE, WHITE)), WHITE, 40), 300, 800);
//var current_style = InOutHelper(SimpleClash(Lockup(new BlastClass(new RainbowClass(), WHITE), new AudioFlickerClass(BLUE, WHITE)), WHITE, 40), 300, 800);

var current_focus;
var current_focus_url;
var style_tree;

function newCall(Cls) {
  return new (Function.prototype.bind.apply(Cls, arguments));
}

class Parser {
  constructor(str, classes, identifiers) {
    console.log("PARSING: " + str);
    this.str = str;
    this.pos = 0;
    this.classes = classes;
    this.identifiers = identifiers;
  }
  peek() {
    if (this.pos >= this.str.length) return ""
    return this.str[this.pos]
  }
  skipspace() {
    while (this.peek() == ' ' || this.peek() == '\t') this.pos++;
  }

  identifier() {
    var ret = "";
    while (true) {
      var c = this.peek();
      if ((c >= 'a' && c <= 'z') ||
        (c >= 'A' && c <= 'Z') ||
        (c >= '0' && c <= '9')) {
        ret += c;
        this.pos++;
      } else {
        return ret;
      }
    }
  }

  // recursive descent parser
  parse() {
    this.skipspace();
    var id = this.identifier();
    if (id == "") {
      throw "Expected identifier or number";
    }
    if (id[0] >= '0' && id[0] <= '9') {
      return parseInt(id);
    }
    this.skipspace();
    var args = 0;
    if (this.peek() == "<") {
      this.pos++;
      this.skipspace();
      args = [null];
      while (true) {
        args.push(this.parse());
        this.skipspace();
        if (this.peek() == '>') {
          this.pos++;
          break;
        }
        if (this.peek() == "") {
          throw "Missing > or ,";
        }
        if (this.peek() != ',') {
          throw "Comma expected";
        }
        this.pos++;
        this.skipspace();
      }
    }
    if (this.identifiers[id]) {
      if (args != 0) {
        throw "Unexpected arguments";
      }
      return this.identifiers[id]();
    }
    if (this.classes[id]) {
      console.log(id);
      console.log(this.classes[id]);
      console.log(args);
      // var ret = new (Function.prototype.bind.apply(this.classes[id], args));
      var ret;
      try {
        ret = classes[id].apply(args[0], args.slice(1));
      } catch (e) {
        if (typeof (e) == "string")
          e = id + ":" + e;
        throw e;
      }
      console.log(ret);
      return ret;
    }
    throw "Unknown identifier: " + id;
  }
};

var blade = new Blade();
var rotate_start;
var last_micros;

function drawScene() {
  last_micros = current_micros;
  current_micros = actual_millis() * 1000;
  current_style.run(blade);
  var pixels = new Uint8Array(144 * 4 * 2);

  resizeGL(gl.canvas);
  for (var i = 0; i < 144; i++) {
    c = current_style.getColor(i);
    pixels[i * 4 + 0] = Math.round(c.r * 255);
    pixels[i * 4 + 1] = Math.round(c.g * 255);
    pixels[i * 4 + 2] = Math.round(c.b * 255);
    pixels[i * 4 + 3] = 255;
  }
  if (last_micros != 0) {
    current_micros += (current_micros - last_micros) / 2;
  }
  current_style.run(blade);
  for (var i = 0; i < 144; i++) {
    c = current_style.getColor(i);
    pixels[i * 4 + 0 + 144 * 4] = Math.round(c.r * 255);
    pixels[i * 4 + 1 + 144 * 4] = Math.round(c.g * 255);
    pixels[i * 4 + 2 + 144 * 4] = Math.round(c.b * 255);
    pixels[i * 4 + 3 + 144 * 4] = 255;
  }
  // TODO: Generate mipmaps, then adjust level based on distance from blade
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,	// level
    gl.RGBA,  // internalFormat
    144, 2,   // width, height
    0,        // border
    gl.RGBA,   // source format
    gl.UNSIGNED_BYTE, // source type
    pixels);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Draw these textures to the screen, offset by 1 pixel increments
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width * dpr, height * dpr);
  gl.clearColor(0.0, 1.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.viewport(0, 0, width * dpr, height * dpr);
  if (STATE_ROTATE) {
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_value"),
      (new Date().getTime() - rotate_start) / 3000.0);
  } else {
    rotate_start = new Date().getTime();
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_value"), 0.0);
  }
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_time"),
    (new Date().getTime() - start) / 1000.0);
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_width"), width);
  gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_height"), height);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  t += 1;
}

function tick() {
  window.requestAnimationFrame(tick);
  drawScene();
}

var classes = {
  StyleNormalPtr: StyleNormalPtr,
  StyleFirePtr: StyleFirePtr,
  StyleFire: StyleFire,
  StyleRainbowPtr: StyleRainbowPtr,
  StyleStrobePtr: StyleStrobePtr,
  EasyBlade: EasyBlade,
  InOutHelper: InOutHelper,
  InOutSparkTip: InOutSparkTip,
  Rgb: Rgb,
  OnSpark: OnSpark,
  Pulsing: Pulsing,
  Strobe: Strobe,
  Gradient: Gradient,
  AudioFlicker: AudioFlicker,
  RandomFlicker: RandomFlicker,
  RandomPerLEDFlicker: RandomPerLEDFlicker,
  BrownNoiseFlicker: BrownNoiseFlicker,
  HumpFlicker: HumpFlicker,
  Blast: Blast,
  SimpleClash: SimpleClash,
  Lockup: Lockup,
  FOCUS: Focus,
  ColorCycle: ColorCycle,
  Cylon: Cylon,
  FireConfig: FireConfig,
};
var identifiers = {
  RgbCycle: RgbCycle,
  Rainbow: Rainbow,
  WHITE: Rgb.bind(null, 255, 255, 255),
  BLACK: Rgb.bind(null, 0, 0, 0),

  RED: Rgb.bind(null, 255, 0, 0),
  GREEN: Rgb.bind(null, 0, 255, 0),
  BLUE: Rgb.bind(null, 0, 0, 255),
  YELLOW: Rgb.bind(null, 255, 255, 0),
  CYAN: Rgb.bind(null, 0, 255, 255),
  MAGENTA: Rgb.bind(null, 255, 0, 255),
  WHITE: Rgb.bind(null, 255, 255, 255),
  BLACK: Rgb.bind(null, 0, 0, 0),

  AliceBlue: Rgb.bind(null, 223, 239, 255),
  Aqua: Rgb.bind(null, 0, 255, 255),
  Aquamarine: Rgb.bind(null, 55, 255, 169),
  Azure: Rgb.bind(null, 223, 255, 255),
  Bisque: Rgb.bind(null, 255, 199, 142),
  Black: Rgb.bind(null, 0, 0, 0),
  BlanchedAlmond: Rgb.bind(null, 255, 213, 157),
  Blue: Rgb.bind(null, 0, 0, 255),
  Chartreuse: Rgb.bind(null, 55, 255, 0),
  Coral: Rgb.bind(null, 255, 55, 19),
  Cornsilk: Rgb.bind(null, 255, 239, 184),
  Cyan: Rgb.bind(null, 0, 255, 255),
  DarkOrange: Rgb.bind(null, 255, 68, 0),
  DeepPink: Rgb.bind(null, 255, 0, 75),
  DeepSkyBlue: Rgb.bind(null, 0, 135, 255),
  DodgerBlue: Rgb.bind(null, 2, 72, 255),
  FloralWhite: Rgb.bind(null, 255, 244, 223),
  Fuchsia: Rgb.bind(null, 255, 0, 255),
  GhostWhite: Rgb.bind(null, 239, 239, 255),
  Green: Rgb.bind(null, 0, 255, 0),
  GreenYellow: Rgb.bind(null, 108, 255, 6),
  HoneyDew: Rgb.bind(null, 223, 255, 223),
  HotPink: Rgb.bind(null, 255, 36, 118),
  Ivory: Rgb.bind(null, 255, 255, 223),
  LavenderBlush: Rgb.bind(null, 255, 223, 233),
  LemonChiffon: Rgb.bind(null, 255, 244, 157),
  LightCyan: Rgb.bind(null, 191, 255, 255),
  LightPink: Rgb.bind(null, 255, 121, 138),
  LightSalmon: Rgb.bind(null, 255, 91, 50),
  LightYellow: Rgb.bind(null, 255, 255, 191),
  Lime: Rgb.bind(null, 0, 255, 0),
  Magenta: Rgb.bind(null, 255, 0, 255),
  MintCream: Rgb.bind(null, 233, 255, 244),
  MistyRose: Rgb.bind(null, 255, 199, 193),
  Moccasin: Rgb.bind(null, 255, 199, 119),
  NavajoWhite: Rgb.bind(null, 255, 187, 108),
  Orange: Rgb.bind(null, 255, 97, 0),
  OrangeRed: Rgb.bind(null, 255, 14, 0),
  PapayaWhip: Rgb.bind(null, 255, 221, 171),
  PeachPuff: Rgb.bind(null, 255, 180, 125),
  Pink: Rgb.bind(null, 255, 136, 154),
  Red: Rgb.bind(null, 255, 0, 0),
  SeaShell: Rgb.bind(null, 255, 233, 219),
  Snow: Rgb.bind(null, 255, 244, 244),
  SpringGreen: Rgb.bind(null, 0, 255, 55),
  SteelBlue: Rgb.bind(null, 14, 57, 118),
  Tomato: Rgb.bind(null, 255, 31, 15),
  White: Rgb.bind(null, 255, 255, 255),
  Yellow: Rgb.bind(null, 255, 255, 0),
};

var overall_string;

function ReplaceCurrentFocus(str) {
  current_focus_url = str;

  if (current_focus) {
    current_focus.super_short_desc = true;
    pp_is_url++;
    var url = style_tree.pp();
    pp_is_url--;
    current_focus.super_short_desc = false;
    str = url.replace("$", "FOCUS<" + str + ">");
  }

  current_focus = 0;
  focus_catcher = 0;
  var parser = new Parser(str, classes, identifiers);
  style_tree = parser.parse();
  document.getElementById("pp").innerHTML = style_tree.pp();
  if (focus_catcher) {
    current_focus = focus_catcher;
    var id = current_focus.get_id();
    var container = document.getElementById("X" + id);
    container.style.backgroundColor = '#202020';
    container.style.color = '#ff5000';
  }
}

function Run() {
  var sty = document.getElementById("template-in");
  var str = sty.value;
  var parser = new Parser(str,
    classes,
    identifiers);
  try {
    current_style = parser.parse();
  }
  catch (e) {
    console.log(e);
    console.log(e.stack);
    console.log(typeof (e));
    if (typeof (e) == "string") {

      myAlertBottom(e);
      sty.focus();
      sty.setSelectionRange(parser.pos, parser.pos);

      parser = new Parser("BLACK",
        classes,
        identifiers);
      current_style = parser.parse();
      compile();
      return;
    } else {
      throw e;
    }
  }
  ReplaceCurrentFocus(str);
  compile();
}

function PopState(event) {
  if (event.state) {
    document.getElementById("template-in").value = event.state;
    Run();
  }
}

function SetTo(str) {
  console.log(str);
  var old = document.getElementById("template-in").value;
  var url = new URL(window.location.href);
  url.searchParams.set("S", str);

  // FIXME: Use pushState and fix back arrow
  window.history.replaceState(old, "Style Editor", window.location.href);
  window.history.pushState(str, "Style Editor", url);
  window.onpopstate = PopState;

  document.getElementById("template-in").value = str;
  Run();
}

function FocusOn(id, event) {
  event.stopPropagation();
  var style = style_ids[id];
  console.log(id);
  console.log(style);
  current_focus = style;
  var container = document.getElementById("X" + id);
  container.style.backgroundColor = '#d0d0d0';
  container.style.color = '#202020';
  pp_is_url++;
  var url = style.pp();
  pp_is_url--;
  console.log(url);
  current_focus_url = url;
  SetTo(url);
  return true;
}
function myAlertTop(str) {

  var notifStr = document.getElementById("info_notif");
  notifStr.innerHTML = str;

  $(".alert-top").show();
  setTimeout(function () {
    $(".alert-top").fadeOut();
  }, 2000);
}

function myAlertBottom(str) {

  var alertStr = document.getElementById("error_notif");
  alertStr.innerHTML = str;

  $(".alert-bottom").show();
  setTimeout(function () {
    $(".alert-bottom").fadeOut();
  }, 1500);
}


$( document ).ready(function() {
console.log( "READY!" );
initGL();
});

