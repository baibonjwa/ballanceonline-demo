import './main.scss'

import * as THREE from 'three';
import {add} from './wow.rs';
import * as CANNON from 'cannon';
import keyboardJS from 'keyboardjs';
import './GLTFLoader';
import './OBJLoader';
import './OrbitControls';
import './TrackballControls';
import './FBXLoader';
import './ColladaLoader';
import './MapControls';
import './MTLLoader';
import Stats from 'stats-js';
import { threeToCannon } from './threetoCannon';
import * as TWEEN from '@tweenjs/tween.js';

let world, mass, body, shape, timeStep=1/60;
let camera, scene, renderer;
let geometry, material, mesh;
let light;
let controls;
let stats;
let ball;
let bodies = [];
let tween;


// var loader = new THREE.GLTFLoader()
// var mtlLoader = new THREE.MTLLoader();
// mtlLoader.setPath("/models/obj/level1/");
// mtlLoader.load( 'level1.mtl', function( materials ) {
  // materials.preload();
  var objLoader = new THREE.OBJLoader();
  var daeLoader = new THREE.ColladaLoader();
  var fbxLoader = new THREE.FBXLoader();
  // objLoader.setMaterials( materials )
  // Load a glTF resource
  // objLoader.load(
    // fbxLoader.load(
    daeLoader.load(
    // resource URL
    // '/models/gltf/Duck/Duck.gltf',
    '/models/dae/level1.dae',
    // '/models/dae/temp.dae',
    // '/models/dae/lalala3(1).dae',
    // '/models/fbx/level1.fbx',
    // called when the resource is loaded
    function ( obj ) {

      initThree();
      // console.log(obj);
      console.log(obj.scene);
      // scene.add( obj );
      scene.add( obj.scene );
      // ball = obj.children.find((mesh) => {
      //   return mesh.name === "objP_Ball_Wood_04"
      // });
      // console.log(ball);
      // controls.target = ball.position;

      // obj.children.forEach((child) => {
      //   // let vector = new THREE.Vector3();
      //   child.geometry.computeBoundingSphere();
      //   var vector = child.geometry.boundingSphere.center;
      //   // child.updateMatrixWorld();
      //   // vector.setFromMatrixPosition( child.matrixWorld );
      //   console.log(vector);
      //   console.log(child.getWorldPosition())
      // })

      // ball.geometry.computeBoundingSphere();
      // camera.lookAt(initialBall.geometry.boundingSphere.center);
      // console.log('init ball', initialBall.geometry.boundingSphere.center)
      // console.log(camera);

      // obj.animations; // Array<THREE.AnimationClip>
      // obj.scene; // THREE.Scene
      // obj.scenes; // Array<THREE.Scene>
      // obj.cameras; // Array<THREE.Camera>
      // obj.asset; // Object

      initCannon();
      animate();
      // initCannon(gltf);
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
// })

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

// hotkeys('space', (event, handler) => {
//   event.preventDefault()
//   camera.position.set(body.position.x, body.position.y + 80, body.position.z)
// })

// hotkeys('d,right', (event, handler) => {
//   // Prevent the default refresh event under WINDOWS system
//   event.preventDefault()
//   body.velocity.set(0, 0, 20);

//   // let position = {
//   //   x: body.position.x - 20,
//   //   y: body.position.y + 40,
//   //   z: body.position.z,
//   // }
//   // let target = {
//   //   x: body.position.x - 20,
//   //   y: body.position.y + 40,
//   //   z: body.position.z,
//   // }
//   // var tween = new TWEEN.Tween(position).to(target, 0.1);
//   // tween.onUpdate(function() {
//   //   // camera.position.set(body.position.x - 20, body.position.y + 40, body.position.z)
//   //   camera.position.set(position.x, position.y, position.z)
//   //   console.log(position);
//   // });
//   // tween.start();
//   // tween.update();
//   // camera.position.set(body.position.x - 20, body.position.y + 40, body.position.z)
//   // controls.target = new THREE.Vector3(
//   //   body.position.x,
//   //   body.position.y,
//   //   body.position.z
//   // )
// });

// hotkeys('shift+a', (event, handler) => {
//   console.log('camera');
//   // camera.rotation.y += 90 * Math.PI / 180
// })

function initThree() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 5000 );
    // camera.position.set(0, 0, 0);
    // camera.position.set(30, 20, 170);


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
    // camera.lookAt(mesh);
    // mesh.position.set(100, 100, 100)

    // light = new THREE.PointLight( 0xff0000, 0, 200 );

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

    // light = new THREE.AmbientLight( 0x404040 )
    // light.position.set( 0, 0, 0 );
    // scene.add( light );

    document.body.innerHTML = '';
    document.body.appendChild( renderer.domElement );

    stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild( stats.dom );

}

function initCannon() {
  world = new CANNON.World();
  // world.gravity.set(0,0,0);
  world.gravity.set(0, -9.8, 0);
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10;
  shape = threeToCannon(mesh, threeToCannon.Type.SPHERE);
  // shape = new CANNON.Box(new CANNON.Vec3(0.1, 0.1, 0.1));
  // mass = 1;
  body = new CANNON.Body({
    mass: 0.1
  });

  let initPos = new THREE.Vector3(50, 30, 152);
  // let initPos = new THREE.Vector3(0, 10, 0);
  camera.position.set(initPos.x - 20, initPos.y + 40, initPos.z)
  // camera.rotation.y += 90 * Math.PI / 180
  controls.target = initPos;
  body.position.set(initPos.x, initPos.y, initPos.z);
  console.log('body', body);
  console.log('controls', controls)
  body.addShape(shape);
  // camera.position.set(
  //   ball.geometry.boundingSphere.center
  // )

  // body.angularVelocity.set(10,10,10);
  // body.angularDamping = 0.5;
  // body.velocity.set(1,0,0);
  body.linearDamping = 0.9;
  world.addBody(body);

  console.log(scene);
  scene.children[4].children.forEach((child) => {

    console.log('child', child);
    // if (child.name !== 'objA01_Floor_01_02') return;
    console.log('child', child.name)
    child.children.forEach((c) => {
      // if (c.name == 'Shape_IndexedFaceSet_029') {
        let shape = threeToCannon(c, {type: threeToCannon.Type.BOX})
        let body = new CANNON.Body({ mass: 0 });
        console.log('aaa')
        body.addShape(shape);
        body.linearDamping = 0.9;
        bodies.push({ uuid: c.uuid, body })
        world.addBody(body);
      // }
    })

    // if (child.name == 'Shape_IndexedFaceSet_029') {
    //   let shape = threeToCannon(child, {type: threeToCannon.Type.HULL})
    //   let body = new CANNON.Body({ mass: 0 });
    //   console.log('aaa')
    //   body.addShape(shape);
    //   body.linearDamping = 0.9;
    //   bodies.push({ uuid: child.uuid, body })
    //   world.addBody(body);
    // }
    // if (child.type == 'Mesh') {
    // }
  })

  // Create a plane
  // var groundBody = new CANNON.Body({
  //   mass: 0 // mass == 0 makes the body static
  // });
  // var groundShape = new CANNON.Box(new CANNON.Vec3(2, 1.5, 0.00000000001));
  // var groundShape = threeToCannon(groundMesh);
  // groundBody.addShape(groundShape);
  // world.addBody(groundBody);
}

function animate() {
    requestAnimationFrame( animate );
    // stats.begin();
    renderer.render( scene, camera );
    updatePhysics();
    updateCamera();
    // tween.update();
    // stats.end();
}

function updateCamera() {
  controls.update();
  camera.position.set(body.position.x + cameraRelativePosition.x, body.position.y + cameraRelativePosition.y, body.position.z)
  controls.target = new THREE.Vector3(
    body.position.x,
    body.position.y,
    body.position.z
  )
}

function updatePhysics() {
  // Step the physics world
  world.step(timeStep);
  // Copy coordinates from Cannon.js to Three.js
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);

  scene.children[4].children.forEach((child) => {
    if (child.type == 'Mesh') {
      let body = bodies.find((obj) => {
        return obj.uuid === child.uuid
      })
      child.position.copy(body.body.position)
      child.quaternion.copy(body.body.quaternion)
    }
  })

  // duckMesh.position.copy(duckBody.position);
  // duckMesh.quaternion.copy(duckBody.quaternion);

}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}
