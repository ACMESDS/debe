// UNCLASSIFIED

/**
 * @class client.games
 * Provides a Voxel client supporting the [content management framework](https://sigma0.ilabs.ic.gov/skinguide.view)
*/

/*
var VOX = require('./voxel-engine');
alert("here");
var GAMES = {
	engine: VOX(),
	name: "wierdness"
};
GAMES.engine.appendTo(document.body);
*/
//alert("start games");

var createDrone = require('../');
alert(createDrone);
var createEngine = require('voxel-engine');
var createTerrain = require('voxel-perlin-terrain');
var logodrone = require('logo-drone')();

var TIC = require('tic')();

var GAME = createEngine({		// create the GAME
	
  //generateVoxelChunk: createTerrain({scaleFactor:10}),
  generate: function(x, y, z) {
    return (Math.sqrt(x*x + y*y + z*z) > 100 || y*y > 10) ? 0 : (Math.random() * 3) + 1;
  },
  chunkDistance: 2,
  materials: [
    'obsidian',
    ['grass', 'dirt', 'grass_dirt'],
    'grass',
    'plank'
  ],
  texturePath: './textures/',
  worldOrigin: [0, 0, 0]
});
var container = document.getElementById('container');
GAME.appendTo(container);

// create PLAYER
var createPlayer = require('voxel-player')(GAME);
var PLAYER = createPlayer('textures/PLAYER.png');
PLAYER.yaw.position.set(0, 10, 0);
PLAYER.possess();

// add some trees
/*var createTree = require('voxel-forest');
for (var i = 0; i < 20; i++) {
createTree(GAME, { bark: 4, leaves: 3 });
}*/

// ability to explode voxels
var explode = require('voxel-debris')(GAME);
GAME.on('mousedown', function (pos) {
  if (erase) explode(pos);
  else GAME.createBlock(pos, 1);
});

var erase = true;
function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keydown', ctrlToggle);
window.addEventListener('keyup', ctrlToggle);

// Handle entering a command
window.addEventListener('keyup', function(e) {
  if (e.keyCode !== 13) return;
  var el = document.getElementById('cmd');
  if (document.activeElement === el) {
    var cmd = el.value, res;
    try {
      if (cmd.indexOf('(') === -1) {
        // logo ftw!
        logodrone.convertAndSend(cmd);
      } else if (el.value !== '') {
        res = eval('drone.' + el.value);
      }
    } catch (err) {
      res = err.message;
    }
    el.setAttribute('placeholder', res);
    el.value = '';
    el.blur();
  } else {
    el.focus();
  }
});


// create a drone
var drone = window.drone = logodrone.drone = createDrone(GAME);
var item = drone.item();

// start the drone in front of the player
item.avatar.position.set(0, 10, -10);

GAME.on('TICk', TIC.TICk.bind(TIC));
TIC.interval(function() {
  //console.log(item.avatar.position);
  console.log(item.velocity);
}, 1000);
// show the video monitor
//drone.viewCamera();

// log navdata
/*var battery = document.querySelector('#battery');
drone.on('navdata', function(data) {
battery.innerHTML = data.demo.batteryPercentage + '%';
//console.log(data);
});*/

// fly the drone
TIC.timeout(function() {
  drone.takeoff();
  /*setTimeout(function() {
drone.animateLeds('blinkGreenRed', 30, 10);
}, 2000);*/
  var cmds = [
    'up', 'front', 'clockwise', 'front',
    //'front', 'clockwise', 'front',
    //'back', 'clockwise', 'back',
    //'left', 'clockwise', 'left',
    //'right', 'clockwise', 'right',
  ];
  var i = 0;
  (function loop() {
    if (i >= cmds.length) {
      //drone.stop();
      drone.land();
      return;
    }
    var cmd = cmds[i++];
    drone.stop();
    console.log(cmd);
    drone[cmd](0.5);
    TIC.timeout(loop, cmd === 'clockwise' ? 2000 : 3000);
  }());
}, 2000);

// UNCLASSIFIED
