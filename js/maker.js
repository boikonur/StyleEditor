var layers;
var used;

function show(id) {
  if (layers[id].style.display == "inline") {
    layers["Error"].style.display = "inline";
  } else {
    layers[id].style.display = "inline";
  }
}

function use(pin) {
  if (used[pin] == "used") {
    show("Error");
  } else {
    used[pin] = "used";
  }
}

function conf(val) {
  var blade1 = document.getElementById("blade1");
  var blade2 = document.getElementById("blade2");
  var blade3 = document.getElementById("blade3");
  var button1 = document.getElementById("button1");
  var button2 = document.getElementById("button2");
  var button3 = document.getElementById("button3");
  var pli = document.getElementById("pli");
  var ble = document.getElementById("ble");
  var diagram = document.getElementById("diagram");
  var config = document.getElementById("ConfigFile").innerHTML;
  var board = document.getElementById("board");

  var x;
  layers = {};
  used = {};
  var i;
  var svg = diagram.children[0];

  diagram.style.width = "100%";
  diagram.style.height = "auto";
  svg.style.width = "100%";
  svg.style.height = "auto";

  for (i = 0; i < diagram.children[0].children.length; i++) {
    var x =svg.children[i];
    if (x.tagName != "g") continue;
    var name = x.attributes["inkscape:label"].value;
    layers[name] = x;
    x.style.display = "none";
  }
  var buttons = [];
  var blades = [];
  var presets = [];
  var presetSection = "Preset presets[] = {\n  $PRESETS$\n};\nBladeConfig blades[] = {\n { 0, $BLADES$, CONFIGARRAY(presets) },\n};";

  console.log(layers);
  show("Teensy");
  show("TeensySaber");
  show("Speaker");
  show("Battery");
  if(button1.value == "click") {
    show("Button1");
    buttons.push("Button PowerButton(BUTTON_POWER, powerButtonPin, \"pow\");");
  }
  if(button1.value == "touch") {
    show("TouchButton1");
    buttons.push("TouchButton PowerButton(BUTTON_POWER, powerButtonPin, 1700, \"pow\");");
    num_buttons++;
  }
  if(button1.value == "latch") {
    show("LatchingButton1");
    buttons.push("LatchingButton PowerButton(BUTTON_POWER, powerButtonPin, \"pow\");");
  }

  if(button2.value == "click") {
    show("Button2");
    buttons.push("Button AuxButton(BUTTON_AUX, auxPin, \"aux\");");
  }
  if(button2.value == "touch") {
    show("TouchButton2");
    buttons.push("TouchButton AuxButton(BUTTON_AUX, auxPin, 1700, \"aux\");");
  }

  if(button3.value == "click") {
    show("Button3");
    buttons.push("Button Aux2Button(BUTTON_AUX2, aux2Pin, \"aux2\");");
  }
  if(button3.value == "touch") {
    show("TouchButton3");
    buttons.push("TouchButton Aux2Button(BUTTON_AUX2, aux2Pin, 1700, \"aux2\");");
  }
  if(blade1.value != "connector") show("Jack");
  if(blade1.value == "connector") {
    show("BladeConnector");
    presetSection = "#include \"common_presets.h\"";
    blades = [""]
  }
  if(blade1.value == "segmented") {
    show("Segmented");
    show("FET1");
    show("FET2");
    show("FET3");
    blades.push("StringBladePtr<Blue3mmLED>()");
  }
  if(blade1.value == "segmented2") {
    show("Segmented");
    show("FlashString");
    show("FET1");
    show("FET2");
    show("FET3");
    blades.push("StringBladePtr<Blue3mmLED, 20, White3mmLED>()");
  }
  if(blade1.value == "rgb") {
    show("StarFront");
    blades.push("SimpleBladePtr<CreeXPE2White, CreeXPE2Blue, CreeXPE2Blue, NoLED>()");
  }
  if(blade1.value == "rgbw") {
    show("RGBW");
    show("FET1");
    blades.push("SimpleBladePtr<CreeXPE2White, CreeXPE2Blue, CreeXPE2Blue, CreeXPE2White>()");
  }
  if(blade1.value == "ws2811") {
    show("NeopixelsFront");
    blades.push("WS2811BladePtr<144, WS2811_ACTUALLY_800kHz | WS2811_GRB>()");
  }
  if(blade2.value == "rgb") {
    show("StarBack");
    show("FET1");
    show("FET2");
    show("FET3");
    blades.push("SimpleBladePtr<CreeXPE2White, CreeXPE2Blue, CreeXPE2Blue, NoLED, bladePowerPin4, bladePowerPin5, bladePowerPin6, -1>()>()");
  }
  if(blade2.value == "rgbx2") {
    show("StarLR");
    show("FET1");
    show("FET2");
    show("FET3");
    blades.push("SimpleBladePtr<CreeXPE2White, CreeXPE2Blue, CreeXPE2Blue, NoLED, bladePowerPin4, bladePowerPin5, bladePowerPin6, -1>()");
  }
  if(blade2.value == "ws2811") {
    show("NeopixelsBack");
    show("FET1");
    show("FET2");
    show("FET3");
    use(7);
    blades.push("WS2811BladePtr<144, WS2811_ACTUALLY_800kHz | WS2811_GRB, 7, PowerPINS<bladePowerPin4, bladePowerPin5, bladePowerPin6> >()");
  }
  if(blade2.value == "ws2811x2") {
    show("NeopixelsLR");
    show("FET1");
    show("FET2");
    use(7);
    use(8);
    blades.push("WS2811BladePtr<26, WS2811_ACTUALLY_800kHz | WS2811_GRB, 7, PowerPINS<bladePowerPin4> >()");
    blades.push("WS2811BladePtr<26, WS2811_ACTUALLY_800kHz | WS2811_GRB, 8, PowerPINS<bladePowerPin5> >()");
  }

  if (board.value == "v2") {

    config = config.replace("$BOARD_CONFIG$", "\"v2_config.h\"");
  }
  if (board.value == "v3") {

    config = config.replace("$BOARD_CONFIG$", "\"v3_config.h\"");
  }
  if (board.value == "ProffieBoard") {

    config = config.replace("$BOARD_CONFIG$", "\"proffieboard_v1_config.h\"");
  }
  if (ble.checked) {
    show("BLE");
    use(7);
    use(8);
    config = config.replace("$BLE$",
       "#define ENABLE_SERIAL\n" +
       "// Max 20 characters\n" +
       "#define BLE_PASSWORD \"your password\"\n" +
       "// Max 32 characters.\n" +
       "#define BLE_NAME \"Your Saber Name\"\n" +
       "// Max 9 characters\n" +
       "#define BLE_SHORTNAME \"Saber\"\n");
  }
  if (pli.checked) {
    show("PLI");
    config = config.replace("$DISPLAY$", "#define ENABLE_SSD1306");
  } else {
    config = config.replace("$DISPLAY$\n", "");
  }
  if (blade3.value == "pl9823") {
    show("CrystalPL9823");
    show("FET3");
    use(7);
    blades.push("WS2811BladePtr<1, WS2811_580kHz, 7, PowerPINS<bladePowerPin6> >()");
  }
  if (blade3.value == "rgb") {
    show("CrystalRGB");
    show("FET1");
    show("FET2");
    show("FET3");
    blades.push("SimpleBladePtr<CreeXPE2White, CreeXPE2Blue, CreeXPE2Blue, NoLED, bladePowerPin4, bladePowerPin5, bladePowerPin6, -1>()");
  }
  if (blade3.value == "led") {
    show("CrystalLED");
    show("FET3");
    blades.push("SimpleBladePtr<CreeXPE2White, NoLED, NoLED, NoLED, bladePowerPin6, -1, -1, -1>()");
  }

  console.log(buttons);
  console.log(blades);

  if (blade1.value == "ws2811" && blade2.value == "ws2811x2") {
    presetSection = document.getElementById("ConfigFileCrossGuardPresets").innerHTML;
  } else if (blade1.value == "segmented" || blade1.value == "segmented2") {
    presets.push("{ \"fontdir\", \"track.wav\", StyleNormalPtr<CYAN, WHITE, 300, 800>(), \"Ignition\" }");
  } else {
    function mkpreset(str, name) {
      var p = " { \"fontdir\", \"track.wav\",\n    ";
      var j;
      for (j = 0; j < blades.length; j++) {
        if (j) p+=",\n    ";
        if (j != 0 && str[0] == '&') {
          p += "StyleNormalPtr<BLACK, BLACK, 300, 800>()";
        } else if (j == blades.length -1 && blade3.value == "led") {
          p += "StyleNormalPtr<WHITE, WHITE, 300, 800>()";
        } else if (blades.length == 1) {
          p += str.replace("$BLADE_NUM$", "");
        } else {
          p += str.replace("$BLADE_NUM$", ", " + j);
        }
      }
      p += ", \"" + name + "\"}";
      presets.push(p);
    }
    function mkpresetWS2811(str, name) {
      if (blade1.value == "ws2811") mkpreset(str, name);
    }
    mkpreset("StyleNormalPtr<CYAN, WHITE, 300, 800>()", "cyan");
    mkpreset("StylePtr<InOutSparkTip<EASYBLADE(BLUE, WHITE), 300, 800> >()", "blue");
    mkpresetWS2811("StyleFirePtr<RED, YELLOW$BLADE_NUM$>()", "fire");
    mkpreset("StyleNormalPtr<RED, WHITE, 300, 800>()", "red");
    mkpresetWS2811("StyleFirePtr<BLUE, CYAN$BLADE_NUM$>()", "blue fire");
    mkpreset("StylePtr<InOutHelper<EASYBLADE(OnSpark<GREEN>, WHITE), 300, 800> >()", "green");
    mkpreset("StyleNormalPtr<WHITE, RED, 300, 800, RED>()", "white");
    mkpreset("StyleNormalPtr<AudioFlicker<YELLOW, WHITE>, BLUE, 300, 800>()", "yellow");
    mkpreset("StylePtr<InOutSparkTip<EASYBLADE(MAGENTA, WHITE), 300, 800> >()", "magenta");
    mkpresetWS2811("StyleNormalPtr<Gradient<RED, BLUE>, Gradient<CYAN, YELLOW>, 300, 800>()", "gradient");
    mkpresetWS2811("StyleRainbowPtr<300, 800>()", "rainbow");
    mkpreset("StyleStrobePtr<WHITE, Rainbow, 15, 300, 800>()", "strobe");
    mkpresetWS2811("&style_pov", "POV");
    mkpresetWS2811("&style_charging", "Battery\\nLevel");
  }

  config = config.replace("$NUM_BUTTONS$", buttons.length +"");
  config = config.replace("$NUM_BLADES$", blades.length +"");
  config = config.replace("$BUTTONS$", buttons.join("\n"));
  presetSection = presetSection.replace("$BLADES$", blades.join(",\n    "));
  presetSection = presetSection.replace("$PRESETS$", presets.join(",\n  "));
  config = config.replace("$PRESETS$", presetSection);
  config = config.split("&lt;").join("<");
  config = config.split("&gt;").join(">");
  config = config.split("&amp;").join("&");

  while (config.indexOf("\"fontdir\"") != -1) {
    config = config.replace("\"fontdir\"", "\"TeensySF\"");
    config = config.replace("\"fontdir\"", "\"SmthJedi\"");
    config = config.replace("\"fontdir\"", "\"SmthGrey\"");
    config = config.replace("\"fontdir\"", "\"SmthFuzz\"");
    config = config.replace("\"fontdir\"", "\"RgueCmdr\"");
    config = config.replace("\"fontdir\"", "\"TthCrstl\"");
  }

  while (config.indexOf("\"track.wav\"") != -1) {
    config = config.replace("\"track.wav\"", "\"tracks/venus.wav\"");
    config = config.replace("\"track.wav\"", "\"tracks/mars.wav\"");
    config = config.replace("\"track.wav\"", "\"tracks/mercury.wav\"");
    config = config.replace("\"track.wav\"", "\"tracks/uranus.wav\"");
  }

  var conf = document.getElementById("configuration");
  conf.value = config;
  conf.rows = config.split("\n").length + "";
}

// $(window).load(function(){
//   console.log("ass");
//   conf();
// });

function Copy(){

  var copyText = document.getElementById("configuration");
  copyText.select();
  document.execCommand("copy");
  // alert("Copy to Clipboard" + copyText.value);
  myAlertTop("Copy to Clipboard");
}

function SaveAs(){

  var copyText = document.getElementById("configuration");
  var name = document.getElementById("customFile");


blob = new Blob([copyText.value], { type: 'text/plain' }),
anchor = document.createElement('a');

anchor.download = name.value;
anchor.href = (window.webkitURL || window.URL).createObjectURL(blob);
anchor.dataset.downloadurl = ['text/plain', anchor.download, anchor.href].join(':');
anchor.click();

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
  console.log( "MAKER READY!" );
  conf();

  });
  
  


