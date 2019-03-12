import './main.scss'

import * as THREE from 'three';
import {
  add
} from './wow.rs';
import * as CANNON from 'cannon';
import keyboardJS from 'keyboardjs';
import './OrbitControls';
import './ColladaLoader';
import './AmmoDebugDrawer';
import Stats from 'stats-js';
import {
  threeToCannon
} from './threetoCannon';
import * as TWEEN from '@tweenjs/tween.js';
import {
  createCollisionShape
} from './threetoAmmo';

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
  var time = 0;

  var armMovement = 0;
  var debugDrawer;

  var level1;
  var torus;
  var ballBody;

  var daeLoader = new THREE.ColladaLoader();
  daeLoader.load(
    '/models/dae/level1.dae',
    // '/models/dae/torus.dae',
    function (obj) {
      console.log(obj);
      level1 = obj.scene;
      // torus = obj.scene.children[1]
      torus = obj.scene.children[2]
      init();
      animate();
      // scene.add( obj.scene );
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    // called when loading has errors
    function (error) {
      console.log(error);
      console.log('An error happened');
    }
  );

  function init() {
    // initThree();
    initGraphics();
    initPhysics();
    createObjects();
    initInput();
    initDebug();
  }

  let cameraRelativePosition = {
    x: -20,
    y: 40,
    z: 0,
  }

  keyboardJS.bind(['d', 'right'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(0, 0, 10));
    console.log(ball.position)
  });

  keyboardJS.bind(['a', 'left'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(0, 0, -10));
    console.log(ball.position)
  });

  keyboardJS.bind(['w', 'up'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(10, 0, 0));
    console.log(ball.position)
  });

  keyboardJS.bind(['s', 'down'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(-10, 0, 0));
    console.log(ball.position)
  });

  keyboardJS.bind(['space'], () => {
    ballBody.setLinearVelocity(new Ammo.btVector3(0, 20, 0));
    console.log(ball.position)
  });

  // keyboardJS.bind(['space'], () => {
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


  function initGraphics() {

    container = document.getElementById('container');

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 2000);

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

  function initInput() {

    window.addEventListener('keydown', function (event) {

      switch (event.keyCode) {
        // Q
        case 81:
          console.log('q')
          armMovement = 1;
          break;

          // A
        case 65:
          console.log('a')
          armMovement = -1;
          break;
      }

    }, false);

    window.addEventListener('keyup', function (event) {

      armMovement = 0;

    }, false);

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

    pos.set(-189.40704345703125, 10.1738862991333, 198.43898010253906);
    quat.set(0, 0, 0, 1);
    ball = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
    }));
    var ballShape = new Ammo.btSphereShape(2);
    ballShape.setMargin(margin);
    ballBody = createRigidBody(ball, ballShape, 3, pos, quat);
    ball.castShadow = true;
    ball.receiveShadow = true;
    console.log(ballBody.getLinearVelocity());
    console.log(ballBody);
    ballBody.setLinearVelocity(new Ammo.btVector3(1, 1, 1));
    ballBody.setDamping(0.5, 0.5);

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

    // let level1Shape = createCollisionShape(level1, {});
    // createRigidBody(level1, level1Shape, 0, pos, quat);
    // console.log(level1Shape)
    level1.children.forEach((obj) => {
      // let shape = createCollisionShape(obj, {});
      // createRigidBody(obj, shape, 0, pos, quat)
      threeToAmmo(obj, shape)
    })

    // threeToAmmo(torus);

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

  function threeToAmmo(obj) {
    let pos = new THREE.Vector3();
    let quat = new THREE.Quaternion();
    let scale = new THREE.Vector3();
    pos.set(0, 0, 0)
    quat.set(0, 0, 0, 1)

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
      return createRigidBody(obj, shape, 0, pos, quat);
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
    requestAnimationFrame(animate);
    render();
    stats.update()

    // stats.begin();
    // renderer.render( scene, camera );
    // updatePhysics();
    // updateCamera();
    // if (debugDrawer) debugDrawer.update();
    // tween.update();
    // stats.end();
  }

  function render() {

    var deltaTime = clock.getDelta();

    updatePhysics(deltaTime);

    controls.update(deltaTime);

    camera.position.set(ball.position.x + cameraRelativePosition.x, ball.position.y + cameraRelativePosition.y, ball.position.z)
    controls.target = new THREE.Vector3(
      ball.position.x,
      ball.position.y,
      ball.position.z
    )

    renderer.render(scene, camera);

    time += deltaTime;

    if (debugDrawer) debugDrawer.update();

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

  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
});