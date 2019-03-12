import './main.scss'

import * as THREE from 'three';
import {add} from './wow.rs';
import * as CANNON from 'cannon';
import keyboardJS from 'keyboardjs';
import './OrbitControls';
import './ColladaLoader';
import Stats from 'stats-js';
import { threeToCannon } from './threetoCannon';
import * as TWEEN from '@tweenjs/tween.js';
import * as Ammo from 'ammo.js'

let world, mass, body, shape, timeStep=1/60;
let camera, scene, renderer;
let geometry, material, mesh;
let light;
let controls;
let stats;
let ball;
let bodies = [];
let tween;

// Physics variables
var gravityConstant = -9.8;
var collisionConfiguration;
var dispatcher;
var broadphase;
var solver;
var softBodySolver;
var physicsWorld;
var rigidBodies = [];
var margin = 0.05;
var hinge;
var cloth;
var transformAux1 = new Ammo.btTransform();

var daeLoader = new THREE.ColladaLoader();
  daeLoader.load(
  '/models/dae/level1.dae',
  function ( obj ) {
    // scene.add( obj.scene );
  },
  // called while loading is progressing
  function ( xhr ) {
    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
  },
  // called when loading has errors
  function ( error ) {
    console.log(error);
    console.log( 'An error happened' );
  }
);

initThree();
initPhysics();
createObjects();
animate();
initDebug();

let cameraRelativePosition = {
  x: -20,
  y: 40,
  z: 0,
}

keyboardJS.bind(['d', 'right'], () => {
  body.velocity.set(0, 0, 20);
});

keyboardJS.bind(['a', 'left'], () => {
  body.velocity.set(0, 0, -20);
});

keyboardJS.bind(['w', 'up'], () => {
  body.velocity.set(20, 0, 0);
});

keyboardJS.bind(['s', 'down'], () => {
  body.velocity.set(-20, 0, 0);
});

keyboardJS.bind(['space'], () => {
  cameraRelativePosition = {
    x: -0.1,
    y: 60,
    z: 0,
  }
}, () => {
  cameraRelativePosition = {
    x: -20,
    y: 40,
    z: 0,
  }
});

function initThree() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );

    let cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);

    var axesHelper = new THREE.AxesHelper( 100 );
    scene.add( axesHelper );

    geometry = new THREE.SphereGeometry( 3, 100, 100 );
    material = new THREE.MeshNormalMaterial();

    renderer = new THREE.WebGLRenderer( { antialias: false } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    controls = new THREE.OrbitControls( camera );
    // controls.enableKeys = false;

    mesh = new THREE.Mesh( geometry, material );
    mesh.position.set(0, 0, 0);
    scene.add( mesh );

    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    var light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-7, 10, 15);
    light.castShadow = true;
    var d = 10;
    light.shadow.camera.left = -d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = -d;
    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;
    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;
    light.shadow.bias = -0.01;
    scene.add(light);

    document.body.innerHTML = '';
    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild( stats.dom );
}

function initPhysics() {

  collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
  dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  broadphase = new Ammo.btDbvtBroadphase();
  solver = new Ammo.btSequentialImpulseConstraintSolver();
  softBodySolver = new Ammo.btDefaultSoftBodySolver();
  physicsWorld = new Ammo.btSoftRigidDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration, softBodySolver);
  physicsWorld.setGravity(new Ammo.btVector3(0, gravityConstant, 0));
  physicsWorld.getWorldInfo().set_m_gravity(new Ammo.btVector3(0, gravityConstant, 0));

}

function createObjects() {

  let pos = new THREE.Vector3();
  let quat = new THREE.Quaternion();
  let scale = new THREE.Vector3();

  // Ground
  pos.set(0, -0.5, 0);
  quat.set(0, 0, 0, 1);
  var ground = createParalellepiped(40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial({
    color: 0xFFFFFF
  }));
  ground.castShadow = true;
  ground.receiveShadow = true;
  textureLoader.load("../textures/grid.png", function (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    ground.material.map = texture;
    ground.material.needsUpdate = true;
  });

  // Wall
  var brickMass = 0.5;
  var brickLength = 1.2;
  var brickDepth = 0.6;
  var brickHeight = brickLength * 0.5;
  var numBricksLength = 6;
  var numBricksHeight = 8;
  var z0 = -numBricksLength * brickLength * 0.5;
  pos.set(0, brickHeight * 0.5, z0);
  quat.set(0, 0, 0, 1);
  for (var j = 0; j < numBricksHeight; j++) {

    var oddRow = (j % 2) == 1;

    pos.z = z0;

    if (oddRow) {
      pos.z -= 0.25 * brickLength;
    }

    var nRow = oddRow ? numBricksLength + 1 : numBricksLength;
    for (var i = 0; i < nRow; i++) {

      var brickLengthCurrent = brickLength;
      var brickMassCurrent = brickMass;
      if (oddRow && (i == 0 || i == nRow - 1)) {
        brickLengthCurrent *= 0.5;
        brickMassCurrent *= 0.5;
      }

      // var brick = createParalellepiped(brickDepth, brickHeight, brickLengthCurrent, brickMassCurrent, pos, quat, createMaterial());
      // brick.castShadow = true;
      // brick.receiveShadow = true;

      if (oddRow && (i == 0 || i == nRow - 2)) {
        pos.z += 0.75 * brickLength;
      } else {
        pos.z += brickLength;
      }

    }
    pos.y += brickHeight;
  }

  // The cloth
  // Cloth graphic object
  var clothWidth = 4;
  var clothHeight = 3;
  var clothNumSegmentsZ = clothWidth * 5;
  var clothNumSegmentsY = clothHeight * 5;
  var clothSegmentLengthZ = clothWidth / clothNumSegmentsZ;
  var clothSegmentLengthY = clothHeight / clothNumSegmentsY;
  var clothPos = new THREE.Vector3(-3, 3, 2);

  //var clothGeometry = new THREE.BufferGeometry();
  var clothGeometry = new THREE.PlaneBufferGeometry(clothWidth, clothHeight, clothNumSegmentsZ, clothNumSegmentsY);
  clothGeometry.rotateY(Math.PI * 0.5)
  clothGeometry.translate(clothPos.x, clothPos.y + clothHeight * 0.5, clothPos.z - clothWidth * 0.5)
  //var clothMaterial = new THREE.MeshLambertMaterial( { color: 0x0030A0, side: THREE.DoubleSide } );
  var clothMaterial = new THREE.MeshLambertMaterial({
    color: 0xFFFFFF,
    side: THREE.DoubleSide
  });
  cloth = new THREE.Mesh(clothGeometry, clothMaterial);
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  scene.add(cloth);
  textureLoader.load("../textures/grid.png", function (texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(clothNumSegmentsZ, clothNumSegmentsY);
    cloth.material.map = texture;
    cloth.material.needsUpdate = true;
  });


  pos.set(0, 3, 0)
  quat.set(0, 0, 0, 1)
  // var mTriMesh = new Ammo.btTriangleMeshShape();
  var geometry = new THREE.Geometry().fromBufferGeometry( torus.geometry );
  var vertices = geometry.vertices;
  var triangles = [];
  var face;
  var _vec3_1 = new Ammo.btVector3(0, 0, 0);
  var _vec3_2 = new Ammo.btVector3(0, 0, 0);
  var _vec3_3 = new Ammo.btVector3(0, 0, 0);
  var triangle_mesh = new Ammo.btTriangleMesh();
  for ( let i = 0; i < geometry.faces.length; i++ ) {
    face = geometry.faces[i];
    if ( face instanceof THREE.Face3) {

      triangles.push([
        { x: vertices[face.a].x, y: vertices[face.a].y, z: vertices[face.a].z },
        { x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
        { x: vertices[face.c].x, y: vertices[face.c].y, z: vertices[face.c].z }
      ]);

    } else if ( face instanceof THREE.Face4 ) {

      triangles.push([
        { x: vertices[face.a].x, y: vertices[face.a].y, z: vertices[face.a].z },
        { x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
        { x: vertices[face.d].x, y: vertices[face.d].y, z: vertices[face.d].z }
      ]);
      triangles.push([
        { x: vertices[face.b].x, y: vertices[face.b].y, z: vertices[face.b].z },
        { x: vertices[face.c].x, y: vertices[face.c].y, z: vertices[face.c].z },
        { x: vertices[face.d].x, y: vertices[face.d].y, z: vertices[face.d].z }
      ]);

    }
  }

  for ( let i = 0; i < triangles.length; i++ ) {
    let triangle = triangles[i];

    _vec3_1.setX(triangle[0].x );
    _vec3_1.setY(triangle[0].y );
    _vec3_1.setZ(triangle[0].z );

    _vec3_2.setX(triangle[1].x );
    _vec3_2.setY(triangle[1].y );
    _vec3_2.setZ(triangle[1].z );

    _vec3_3.setX(triangle[2].x );
    _vec3_3.setY(triangle[2].y );
    _vec3_3.setZ(triangle[2].z );

    triangle_mesh.addTriangle(
      _vec3_1,
      _vec3_2,
      _vec3_3,
      true
    );
  }

  // var shape = new Ammo.btBvhTriangleMeshShape(
  var shape = new Ammo.btBvhTriangleMeshShape(
    triangle_mesh,
    true,
    true,
  );
  console.log(triangle_mesh);
  shape.setMargin(margin);
  // todo: it's very bad to setLocalScaling on the shape after initializing, causing a needless BVH recalc --
  // we should be using triMesh.setScaling prior to building the BVH
  // torus.matrixWorld.decompose(pos, quat, scale);
  // console.log(scale)
  const localScale = new Ammo.btVector3(torus.scale.x, torus.scale.y, torus.scale.z);
  shape.setLocalScaling(localScale);
  // shape.resources = [triangle_mesh];
  createRigidBody(torus, shape, 0, pos, quat);

  console.log('triangle_mesh', triangle_mesh);
  console.log('shape', shape);
  console.log(torus);
  // for (var i = 0; i < vx.length; i+=9){
  //   tmpPos1.setValue( vx[i+0]*o.size[0], vx[i+1]*o.size[1], vx[i+2]*o.size[2] );
  //   tmpPos2.setValue( vx[i+3]*o.size[0], vx[i+4]*o.size[1], vx[i+5]*o.size[2] );
  //   tmpPos3.setValue( vx[i+6]*o.size[0], vx[i+7]*o.size[1], vx[i+8]*o.size[2] );
  //   mTriMesh.addTriangle( tmpPos1, tmpPos2, tmpPos3, true );
  // }

  // Cloth physic object
  var softBodyHelpers = new Ammo.btSoftBodyHelpers();
  var clothCorner00 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z);
  var clothCorner01 = new Ammo.btVector3(clothPos.x, clothPos.y + clothHeight, clothPos.z - clothWidth);
  var clothCorner10 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z);
  var clothCorner11 = new Ammo.btVector3(clothPos.x, clothPos.y, clothPos.z - clothWidth);
  var clothSoftBody = softBodyHelpers.CreatePatch(physicsWorld.getWorldInfo(), clothCorner00, clothCorner01, clothCorner10, clothCorner11, clothNumSegmentsZ + 1, clothNumSegmentsY + 1, 0, true);
  var sbConfig = clothSoftBody.get_m_cfg();
  sbConfig.set_viterations(10);
  sbConfig.set_piterations(10);

  clothSoftBody.setTotalMass(0.9, false)
  Ammo.castObject(clothSoftBody, Ammo.btCollisionObject).getCollisionShape().setMargin(margin * 3);
  physicsWorld.addSoftBody(clothSoftBody, 1, -1);
  cloth.userData.physicsBody = clothSoftBody;

  // Disable deactivation
  clothSoftBody.setActivationState(4);

  // The base
  var armMass = 2;
  var armLength = 3 + clothWidth;
  var pylonHeight = clothPos.y + clothHeight;
  var baseMaterial = new THREE.MeshPhongMaterial({
    color: 0x606060
  });
  pos.set(clothPos.x, 0.1, clothPos.z - armLength);
  quat.set(0, 0, 0, 1);
  var base = createParalellepiped(1, 0.2, 1, 0, pos, quat, baseMaterial);
  base.castShadow = true;
  base.receiveShadow = true;
  pos.set(clothPos.x, 0.5 * pylonHeight, clothPos.z - armLength);
  var pylon = createParalellepiped(0.4, pylonHeight, 0.4, 0, pos, quat, baseMaterial);
  pylon.castShadow = true;
  pylon.receiveShadow = true;
  pos.set(clothPos.x, pylonHeight + 0.2, clothPos.z - 0.5 * armLength);
  var arm = createParalellepiped(0.4, 0.4, armLength + 0.4, armMass, pos, quat, baseMaterial);
  arm.castShadow = true;
  arm.receiveShadow = true;

  // Glue the cloth to the arm
  var influence = 0.5;
  clothSoftBody.appendAnchor(0, arm.userData.physicsBody, false, influence);
  clothSoftBody.appendAnchor(clothNumSegmentsZ, arm.userData.physicsBody, false, influence);

  // Hinge constraint to move the arm
  var pivotA = new Ammo.btVector3(0, pylonHeight * 0.5, 0);
  var pivotB = new Ammo.btVector3(0, -0.2, -armLength * 0.5);
  var axis = new Ammo.btVector3(0, 1, 0);
  hinge = new Ammo.btHingeConstraint(pylon.userData.physicsBody, arm.userData.physicsBody, pivotA, pivotB, axis, axis, true);
  physicsWorld.addConstraint(hinge, true);

}

function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

  var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
  var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
  shape.setMargin(margin);
  createRigidBody(threeObject, shape, mass, pos, quat);

  return threeObject;
}

function createRigidBody(threeObject, physicsShape, mass, pos, quat) {

  threeObject.position.copy(pos);
  threeObject.quaternion.copy(quat);

  var transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
  var motionState = new Ammo.btDefaultMotionState(transform);

  var localInertia = new Ammo.btVector3(0, 0, 0);
  physicsShape.calculateLocalInertia(mass, localInertia);

  var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
  var body = new Ammo.btRigidBody(rbInfo);

  threeObject.userData.physicsBody = body;

  scene.add(threeObject);

  if (mass > 0) {
    rigidBodies.push(threeObject);

    // Disable deactivation
    body.setActivationState(4);
  }

  physicsWorld.addRigidBody(body);
}

function updatePhysics(deltaTime) {

  // Hinge control
  hinge.enableAngularMotor(true, 0.8 * armMovement, 50);

  // Step world
  physicsWorld.stepSimulation(deltaTime, 10);

  // Update cloth
  var softBody = cloth.userData.physicsBody;
  var clothPositions = cloth.geometry.attributes.position.array;
  var numVerts = clothPositions.length / 3;
  var nodes = softBody.get_m_nodes();
  var indexFloat = 0;
  for (var i = 0; i < numVerts; i++) {

    var node = nodes.at(i);
    var nodePos = node.get_m_x();
    clothPositions[indexFloat++] = nodePos.x();
    clothPositions[indexFloat++] = nodePos.y();
    clothPositions[indexFloat++] = nodePos.z();

  }
  cloth.geometry.computeVertexNormals();
  cloth.geometry.attributes.position.needsUpdate = true;
  cloth.geometry.attributes.normal.needsUpdate = true;

  // Update rigid bodies
  for (var i = 0, il = rigidBodies.length; i < il; i++) {
    var objThree = rigidBodies[i];
    var objPhys = objThree.userData.physicsBody;
    var ms = objPhys.getMotionState();
    if (ms) {

      ms.getWorldTransform(transformAux1);
      var p = transformAux1.getOrigin();
      var q = transformAux1.getRotation();
      objThree.position.set(p.x(), p.y(), p.z());
      objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
    }
  }
}

function initDebug() {
  debugDrawer = new THREE.AmmoDebugDrawer(scene, physicsWorld);
  debugDrawer.enable();
  // setInterval(() => {
  //   var mode = (debugDrawer.getDebugMode() + 1) % 3;
  //   debugDrawer.setDebugMode(mode);
  // }, 1000);
}

function animate() {
    requestAnimationFrame( animate );
    // stats.begin();
    renderer.render( scene, camera );
    updatePhysics();
    updateCamera();
    if (debugDrawer) debugDrawer.update();
    // tween.update();
    // stats.end();
}

function updateCamera() {
  controls.update();
  // camera.position.set(body.position.x + cameraRelativePosition.x, body.position.y + cameraRelativePosition.y, body.position.z)
  // controls.target = new THREE.Vector3(
  //   body.position.x,
  //   body.position.y,
  //   body.position.z
  // )
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
