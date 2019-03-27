/* global Ammo */
import './main.scss'

import * as THREE from 'three';
import keyboardJS from 'keyboardjs';
import './lib/OrbitControls';
import './lib/ColladaLoader';
import './lib/FBXLoader';
import './lib/OBJLoader';
import './lib/MTLLoader';
import './lib/AmmoDebugDrawer';
import './lib/GeometryUtils';
import Stats from 'stats-js';
// import * as TWEEN from '@tweenjs/tween.js';
// import _ from 'lodash';
import {
  BOX_LIST,
  BALL_PAPER_LIST,
  BALL_STONE_LIST,
  BALL_WOOD_LIST,
  EXTRA_LIFE_LIST,
  HIDDEN_LIST,
  EXTRA_POINT_LIST,
  MODULE_LIST,
  // TRAFO_STONE_LIST,
  // TRAFO_WOOD_LIST,
  // TRAFO_PAPER_LIST,
  RESET_POINT_LIST,
} from './levels/level1';

// let DEBUG_MODE = true;

Ammo().then(function (Ammo) {

  let DEBUG_MODE = false;
  let GAME_STATUS = 'initial';

  let container;
  let clock = new THREE.Clock();

  let camera, scene, renderer;
  let controls;
  let stats;
  let ball;
  // let tween;

  // Physics variables
  // var gravityConstant = -9.8;
  let gravityConstant = -60;
  let collisionConfiguration;
  let dispatcher;
  let broadphase;
  let solver;
  let softBodySolver;
  let physicsWorld;
  let rigidBodies = [];
  let margin = 0.05;
  let transformAux1 = new Ammo.btTransform();
  let time = 0;

  let debugDrawer;

  let level1;
  let ballBody;

  let objLoader = new THREE.OBJLoader();
  let mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("/models/obj/level1/");
  mtlLoader.load( 'level1-6.mtl', function( materials ) {
    materials.preload();
    objLoader.setPath("/models/obj/level1/");
    objLoader.setMaterials( materials )
    objLoader.load('level1-6.obj', function (obj) {
      level1 = obj
      init();
      animate();
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // called when loading has errors
    function (error) {
      console.log(error);
      console.log('An error happened');
    })
  });

  let start = document.getElementById('start');
  start.onclick = () => {
    let mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = 'none';
    GAME_STATUS = 'start';
    controls.autoRotate = false;
    // init();
    // animate();
  }

  let debug = document.getElementById('debug-mode');
  debug.onclick = () => {
    let mainMenu = document.getElementById('main-menu');
    mainMenu.style.display = 'none';
    DEBUG_MODE = true;
    GAME_STATUS = 'debug';
    controls.autoRotate = false;
    debugDrawer.enable();
    // init();
    // animate(true);
  }


  function init() {
    initCamera();
    initGraphics();
    initPhysics();
    createObjects();
    initDebug();
  }

  let cameraRelativePosition = {
    x: -20,
    y: 30,
    z: 0,
  }

  const VELOCITY = 20;

  keyboardJS.bind(['d', 'right'], (e) => {
    let v = ballBody.getLinearVelocity()
    ballBody.setLinearVelocity(new Ammo.btVector3(v.x(), v.y(), VELOCITY));
    // console.log(ball.position)
  });

  keyboardJS.bind(['a', 'left'], (e) => {
    let v = ballBody.getLinearVelocity()
    ballBody.setLinearVelocity(new Ammo.btVector3(v.x(), v.y(), -VELOCITY));
  });

  keyboardJS.bind(['w', 'up'], (e) => {
    let v = ballBody.getLinearVelocity()
    ballBody.setLinearVelocity(new Ammo.btVector3(VELOCITY, v.y(), v.z()));
  });

  keyboardJS.bind(['s', 'down'], (e) => {
    let v = ballBody.getLinearVelocity()
    ballBody.setLinearVelocity(new Ammo.btVector3(-VELOCITY, v.y(), v.z()));
  });

  keyboardJS.bind(['space'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(0, 20, 0));
    // eslint-disable-next-line no-console
    console.log(ball.position)
  });

  // keyboardJS.bind(['shift+up'], () => {
  //   cameraRelativePosition = {
  //     x: -0.1,
  //     y: 60,
  //     z: 0,
  //   }
  // }, () => {
  //   cameraRelativePosition = {
  //     x: -20,
  //     y: 40,
  //     z: 0,
  //   }
  // });

  keyboardJS.bind(['shift+up'], () => {
    camera.rotation.y = 90 * Math.PI / 180
  }, () => {
  });

  function initCamera() {
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.x = -12;
    camera.position.y = 7;
    camera.position.z = 4;
    let pos = new THREE.Vector3 (
      74.78809356689453,
      10.729013442993164,
      507.9201354980469
    )
    camera.position.set(
      pos.x + 50,
      pos.y + 40,
      pos.z + 50,
    );

    controls = new THREE.OrbitControls(camera);
    controls.autoRotate = true;
    // controls.autoRotateSpeed = 1;
    // .autoRotateSpeed
    // controls.target.y = 2;
  }


  function initGraphics() {

    container = document.getElementById('container');

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

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

    container.innerHTML = "";

    container.appendChild(renderer.domElement);

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild(stats.domElement);

    window.addEventListener('resize', onWindowResize, false);
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

  function createBall() {
    var loader = new THREE.TextureLoader();
    loader.load( './models/obj/level1/textures/Ball_Wood.bmp', function ( texture ) {
      let pos = new THREE.Vector3();
      let quat = new THREE.Quaternion();

      // Initial ball position;;;
      pos.set(54.134429931640625, 16.012664794921875, 153.05307006835938);
      quat.set(0, 0, 0, 1);
      const BALL_SIZE = 2
      // textrue.wrapS = texture.wrapT = THREE.RepeatWrapping;
      // texture.repeat.set( 125, 125 );
      ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_SIZE, 12, 12), new THREE.MeshBasicMaterial({
        map: texture,
        overdraw: 1,
      }));
      var ballShape = new Ammo.btSphereShape(BALL_SIZE);
      ballShape.setMargin(margin);
      // ballBody = createRigidBody(ball, ballShape, 1, pos, quat);
      ballBody = createRigidBody(ball, ballShape, 1, pos, quat);
      ball.castShadow = true;
      ball.receiveShadow = true;
      // ball.userData.physicsBody.setFriction(0.);
      ballBody.setLinearVelocity(new Ammo.btVector3(1, 1, 1));
      ballBody.setDamping(0.7, 0);
      ballBody.setFriction(0.4);
      ballBody.setRollingFriction(0.4);
    });
  }

  function createObjects() {

    let skyGeometry = new THREE.CubeGeometry(1920, 1080, 1920);
    let cubeMaterials = [
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Front.BMP"),
        side: THREE.DoubleSide
      }),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Back.BMP"),
        side: THREE.DoubleSide
      }),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Down.BMP"),
        side: THREE.DoubleSide
      }),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Down.BMP"),
        side: THREE.DoubleSide
      }),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Left.BMP"),
        side: THREE.DoubleSide
      }),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("./models/obj/level1/textures/Sky/Sky_L_Right.BMP"),
        side: THREE.DoubleSide
      }),
    ];

    let cubeMaterial = THREE.MeshFaceMaterial( cubeMaterials );
    let skyBox = new THREE.Mesh( skyGeometry, cubeMaterial );
    skyBox.position.set(360, 0, 525)
    // skyBox.position.set(200, -300, 225)
    scene.add(skyBox);

    loadStaticObjects();
    setTimeout(() => {
      createBall();
      loadDynamicObjects();
    }, 0)
  }

  function loadDynamicObjects() {
    level1.children.forEach((obj) => {
      if (!HIDDEN_LIST.includes(obj.name)) {
        setTimeout(() => {
          if (
            BOX_LIST.includes(obj.name) ||
            MODULE_LIST.includes(obj.name) ||
            BALL_PAPER_LIST.includes(obj.name) ||
            BALL_STONE_LIST.includes(obj.name) ||
            BALL_WOOD_LIST.includes(obj.name)
          ) {
            threeToAmmo(obj, 1)
          }
        }, 0)
      }
    });
  }

  function loadStaticObjects() {
    level1.children.forEach((obj) => {
      if (!HIDDEN_LIST.includes(obj.name)) {
        setTimeout(() => {
          if (
            EXTRA_LIFE_LIST.includes(obj.name) ||
            EXTRA_POINT_LIST.includes(obj.name) ||
            RESET_POINT_LIST.includes(obj.name) ||
            BOX_LIST.includes(obj.name) ||
            BALL_PAPER_LIST.includes(obj.name) ||
            BALL_STONE_LIST.includes(obj.name) ||
            BALL_WOOD_LIST.includes(obj.name) ||
            MODULE_LIST.includes(obj.name)
            // TRAFO_STONE_LIST.includes(obj.name) ||
            // TRAFO_WOOD_LIST.includes(obj.name) ||
            // TRAFO_PAPER_LIST.includes(obj.name)
          ) {
            return;
          }
          threeToAmmo(obj)
        }, 0)
      }
    });
  }

  function threeToAmmo(obj, mass = 0) {
    let pos = new THREE.Vector3();
    let quat = new THREE.Quaternion();
    let scale = new THREE.Vector3();

    if (mass > 0) {
      obj.geometry.computeBoundingBox();
      let offset = obj.geometry.boundingBox.center();
      obj.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
        -offset.x, -offset.y, -offset.z));
      pos.set(offset.x, offset.y, offset.z);
    }

    if (obj.type == 'Mesh') {
      var geometry = new THREE.Geometry().fromBufferGeometry(obj.geometry);
      var vertices = geometry.vertices;
      var triangles = [];
      var face;
      var _vec3_1 = new Ammo.btVector3(0, 0, 0);
      var _vec3_2 = new Ammo.btVector3(0, 0, 0);
      var _vec3_3 = new Ammo.btVector3(0, 0, 0);
      var triangle_mesh = new Ammo.btTriangleMesh();
      for (let i = 0; i < geometry.faces.length; i++) {
        face = geometry.faces[i];
        if (face instanceof THREE.Face3) {

          triangles.push([{
              x: vertices[face.a].x,
              y: vertices[face.a].y,
              z: vertices[face.a].z
            },
            {
              x: vertices[face.b].x,
              y: vertices[face.b].y,
              z: vertices[face.b].z
            },
            {
              x: vertices[face.c].x,
              y: vertices[face.c].y,
              z: vertices[face.c].z
            }
          ]);

        } else if (face instanceof THREE.Face4) {

          triangles.push([{
              x: vertices[face.a].x,
              y: vertices[face.a].y,
              z: vertices[face.a].z
            },
            {
              x: vertices[face.b].x,
              y: vertices[face.b].y,
              z: vertices[face.b].z
            },
            {
              x: vertices[face.d].x,
              y: vertices[face.d].y,
              z: vertices[face.d].z
            }
          ]);
          triangles.push([{
              x: vertices[face.b].x,
              y: vertices[face.b].y,
              z: vertices[face.b].z
            },
            {
              x: vertices[face.c].x,
              y: vertices[face.c].y,
              z: vertices[face.c].z
            },
            {
              x: vertices[face.d].x,
              y: vertices[face.d].y,
              z: vertices[face.d].z
            }
          ]);

        }
      }

      for (let i = 0; i < triangles.length; i++) {
        let triangle = triangles[i];

        _vec3_1.setX(triangle[0].x);
        _vec3_1.setY(triangle[0].y);
        _vec3_1.setZ(triangle[0].z);

        _vec3_2.setX(triangle[1].x);
        _vec3_2.setY(triangle[1].y);
        _vec3_2.setZ(triangle[1].z);

        _vec3_3.setX(triangle[2].x);
        _vec3_3.setY(triangle[2].y);
        _vec3_3.setZ(triangle[2].z);

        triangle_mesh.addTriangle(
          _vec3_1,
          _vec3_2,
          _vec3_3,
          true
        );
      }

      let shape;
      if ( mass === 0) {
        shape = new Ammo.btBvhTriangleMeshShape(
          triangle_mesh,
          true,
          true,
        );
      } else {
        shape = new Ammo.btConvexTriangleMeshShape(
          triangle_mesh,
          true,
        );
      }
      shape.setMargin(margin);
      // todo: it's very bad to setLocalScaling on the shape after initializing, causing a needless BVH recalc --
      // we should be using triMesh.setScaling prior to building the BVH
      // torus.matrixWorld.decompose(pos, quat, scale);
      // console.log(scale)
      const localScale = new Ammo.btVector3(obj.scale.x, obj.scale.y, obj.scale.z);
      shape.setLocalScaling(localScale);
      shape.resources = [triangle_mesh];
      return createRigidBody(obj, shape, mass, pos, quat);
    }
  }

  function createParalellepiped(sx, sy, sz, mass, pos, quat, material) {

    var threeObject = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 1, 1, 1), material);
    var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
    shape.setMargin(margin);
    createRigidBody(threeObject, shape, mass, pos, quat);

    return threeObject;
  }

  function createRandomColor() {
    return Math.floor(Math.random() * (1 << 24));
  }

  function createRigidBody(threeObject, physicsShape, mass, pos, quat, friction=0.5, rollingFriction=0.5, damping=0.5) {

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
    body.setFriction(friction);
    body.setRollingFriction(rollingFriction);
    body.setDamping(damping, damping);

    scene.add(threeObject);

    if (mass > 0) {
      rigidBodies.push(threeObject);

      // Disable deactivation
      body.setActivationState(4);
    }

    physicsWorld.addRigidBody(body);
    return body;
  }

  function updatePhysics(deltaTime) {
    // Step world
    physicsWorld.stepSimulation(deltaTime, 10);

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
    if (DEBUG_MODE) debugDrawer.enable();
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
    stats.update()
  }

  function render() {

    var deltaTime = clock.getDelta();

    updatePhysics(deltaTime);

    updateCamera(deltaTime);

    renderer.render(scene, camera);

    time += deltaTime;

    if (debugDrawer && DEBUG_MODE) debugDrawer.update();

  }


  function updateCamera(deltaTime) {
    // let pos = new THREE.Vector3 (
    //   267.6221923828125,
    //   7.0855865478515625,
    //   797.2139892578125
    // )

    controls.update(deltaTime);
    if (GAME_STATUS === 'initial') {
      let pos = new THREE.Vector3 (
        74.78809356689453,
        10.729013442993164,
        507.9201354980469
      )
      controls.target = pos;
    }

    // camera.position.set(
    //   pos.x + cameraRelativePosition.x,
    //   pos.y + cameraRelativePosition.y,
    //   pos.z + cameraRelativePosition.z + 100,
    // )

    // if (ball) {
    //   var x = camera.position.x;
    //   var z = camera.position.z;
    //   camera.position.x = x * Math.cos(0.5) + z * Math.sin(0.5);
    //   camera.position.z = z * Math.cos(0.5) - x * Math.sin(0.5);
    //   camera.lookAt(pos);
    // }

    // if (ball) {
    //   var rad = 100
    //   var geometry = new THREE.SphereGeometry( rad, 32, 32 );
    //   var point = THREE.GeometryUtils.randomPointsInGeometry( geometry, 1 );
    //   var altitude = 100;
    //   var coeff = 1+ altitude/rad;

    //   camera.position.x = point[0].x * coeff;
    //   camera.position.y = point[0].y * coeff;
    //   camera.position.z = point[0].z * coeff;
    //   camera.lookAt(ball.position);
    // }

    if (ball && GAME_STATUS == 'start') {
      let pos = new THREE.Vector3(
        ball.position.x,
        ball.position.y,
        ball.position.z
      )
      camera.position.set(ball.position.x + cameraRelativePosition.x, ball.position.y + cameraRelativePosition.y, ball.position.z)
      controls.target = pos;
    }
  }

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});