import './main.scss'

import * as THREE from 'three';
import keyboardJS from 'keyboardjs';
import './lib/OrbitControls';
import './lib/ColladaLoader';
import './lib/FBXLoader';
import './lib/OBJLoader';
import './lib/MTLLoader';
import './lib/AmmoDebugDrawer';
import Stats from 'stats-js';
import * as TWEEN from '@tweenjs/tween.js';
import _ from 'lodash';
import {
  BOX_LIST,
  BALL_PAPER_LIST,
  BALL_STONE_LIST,
  BALL_WOOD_LIST,
  EXTRA_LIFE_LIST,
  HIDDEN_LIST,
  EXTRA_POINT_LIST,
  TRAFO_STONE_LIST,
  TRAFO_WOOD_LIST,
  TRAFO_PAPER_LIST,
  RESET_POINT_LIST,
} from './levels/level1';

Ammo().then(function (Ammo) {

  let container;
  let textureLoader;
  let clock = new THREE.Clock();

  let world, mass, body, shape, timeStep = 1 / 60;
  let camera, scene, renderer;
  let geometry, material, mesh;
  let light;
  let controls;
  let stats;
  let ball;
  let bodies = [];
  let tween;

  // Physics variables
  // var gravityConstant = -9.8;
  var gravityConstant = -60;
  var collisionConfiguration;
  var dispatcher;
  var broadphase;
  var solver;
  var softBodySolver;
  var physicsWorld;
  var rigidBodies = [];
  var margin = 0.05;
  var transformAux1 = new Ammo.btTransform();
  var time = 0;

  var debugDrawer;

  var level1;
  var ballBody;

  var objLoader = new THREE.OBJLoader();
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("/models/obj/level1/");
  mtlLoader.load( 'level1-3.mtl', function( materials ) {
    materials.preload();
    objLoader.setPath("/models/obj/level1/");
    objLoader.setMaterials( materials )
    objLoader.load('level1-3.obj', function (obj) {
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

  function init() {
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


  function initGraphics() {

    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);

    scene = new THREE.Scene();

    camera.position.x = -12;
    camera.position.y = 7;
    camera.position.z = 4;

    controls = new THREE.OrbitControls(camera);
    controls.target.y = 2;

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xbfd1e5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    textureLoader = new THREE.TextureLoader();

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
    loader.load( './models/obj/level1/Textures/Ball_Wood.bmp', function ( texture ) {
      let pos = new THREE.Vector3();
      let quat = new THREE.Quaternion();

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
    level1.children.forEach((obj, index) => {
      if (!HIDDEN_LIST.includes(obj.name)) {
        setTimeout(() => {
          if (
            EXTRA_LIFE_LIST.includes(obj.name) ||
            EXTRA_POINT_LIST.includes(obj.name) ||
            RESET_POINT_LIST.includes(obj.name)
            // TRAFO_STONE_LIST.includes(obj.name) ||
            // TRAFO_WOOD_LIST.includes(obj.name) ||
            // TRAFO_PAPER_LIST.includes(obj.name)
          ) {
            return;
          }
          if (BOX_LIST.includes(obj.name)) {

            let pos = new THREE.Vector3();
            let quat = new THREE.Quaternion();
            const v = new THREE.Vector3();

            obj.geometry.computeBoundingBox();
            let bBox = obj.geometry.boundingBox.clone();

            const btHalfExtents = new Ammo.btVector3(bBox.size().x / 2, bBox.size().y / 2, bBox.size().z / 2);
            const collisionShape = new Ammo.btBoxShape(btHalfExtents);

            const offset = bBox.center();

            obj.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
              -offset.x, -offset.y, -offset.z));

            pos.set(offset.x, offset.y, offset.z);
            quat.set(0, 0, 0, 1);
            createRigidBody(obj, collisionShape, 5, pos, quat);
          } else if (
            BALL_PAPER_LIST.includes(obj.name) ||
            BALL_STONE_LIST.includes(obj.name) ||
            BALL_WOOD_LIST.includes(obj.name)) {

            let pos = new THREE.Vector3();
            let quat = new THREE.Quaternion();
            const v = new THREE.Vector3();

            obj.geometry.computeBoundingBox();
            let bBox = obj.geometry.boundingBox.clone();

            const btHalfExtents = new Ammo.btVector3(bBox.size().x / 2, bBox.size().y / 2, bBox.size().z / 2);
            const collisionShape = new Ammo.btBoxShape(btHalfExtents);

            const offset = bBox.center();

            obj.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(
              -offset.x, -offset.y, -offset.z));

            pos.set(offset.x, offset.y, offset.z);
            quat.set(0, 0, 0, 1);
            createRigidBody(obj, collisionShape, 0.5, pos, quat);
          } else {
            threeToAmmo(obj)
          }
        }, 0)
      }
    });
    setTimeout(() => {
      createBall();
    }, 0)
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

      // var shape = new Ammo.btBvhTriangleMeshShape(
      var shape = new Ammo.btBvhTriangleMeshShape(
        triangle_mesh,
        true,
        true,
      );
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

  function createMaterial() {
    return new THREE.MeshPhongMaterial({
      color: createRandomColor()
    });
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
    body.setFriction(0.4);
    body.setRollingFriction(0.4);

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
    // debugDrawer.enable();
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

    if (debugDrawer) debugDrawer.update();

  }


  function updateCamera(deltaTime) {
    controls.update(deltaTime);

    if (ball) {
      camera.position.set(ball.position.x + cameraRelativePosition.x, ball.position.y + cameraRelativePosition.y, ball.position.z)
      controls.target = new THREE.Vector3(
        ball.position.x,
        ball.position.y,
        ball.position.z
      )
    }
  }

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});