import './main.scss'

import * as THREE from 'three';
import {add} from './wow.rs';
import * as CANNON from 'cannon';
import hotkeys from 'hotkeys-js';

let world, mass, body, shape, timeStep=1/60;
let camera, scene, renderer;
let geometry, material, mesh;

initThree();
initCannon();
animate();

hotkeys('d', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(1,0,0);
});

hotkeys('a', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(-1,0,0);
});

hotkeys('w', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(0,1,0);
});

hotkeys('s', (event, handler) => {
  // Prevent the default refresh event under WINDOWS system
  event.preventDefault()
  body.velocity.set(0,-1,0);
});

function initThree() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100 );
    camera.position.z = 2;

    geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
    material = new THREE.MeshNormalMaterial();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );

    mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );

    document.body.appendChild( renderer.domElement );
    initCannon();
}

function initCannon() {
  world = new CANNON.World();
  // world.gravity.set(0,0,0);
  world.gravity.set(0,0,0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  shape = new CANNON.Box(new CANNON.Vec3(1,1,1));
  mass = 1;
  body = new CANNON.Body({
    mass: 1
  });
  body.addShape(shape);
  // body.angularVelocity.set(10,10,10);
  // body.angularDamping = 0.5;
  body.velocity.set(1,0,0);
  body.linearDamping = 0.9;
  world.addBody(body);

  // create heightfield body
  var matrix = [];
  var sizeX = 15,
      sizeY = 15;
  for (var i = 0; i < sizeX; i++) {
      matrix.push([]);
      for (var j = 0; j < sizeY; j++) {
          var height = Math.cos(i/sizeX * Math.PI * 2)*Math.cos(j/sizeY * Math.PI * 2) + 2;
          if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
              height = 3;
          matrix[i].push(height);
      }
  }

  // Create the heightfield
  var hfShape = new CANNON.Heightfield(matrix, {
    elementSize: 1
  });
  var hfBody = new CANNON.Body({ mass: 0 });
  hfBody.addShape(hfShape);
  hfBody.position.set(0, 0, 0)
  // hfBody.position.set(-sizeX * hfShape.elementSize / 2, -20, -10);
  // world.addBody(hfBody);
}

function animate() {
    requestAnimationFrame( animate );
    updatePhysics();
    renderer.render( scene, camera );
}

function updatePhysics() {
  // Step the physics world
  world.step(timeStep);
  // Copy coordinates from Cannon.js to Three.js
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
