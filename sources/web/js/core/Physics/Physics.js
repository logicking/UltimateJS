var USE_NATIVE_PHYSICS = true;

if (typeof(Native) == "undefined" || !USE_NATIVE_PHYSICS) {
	b2Math = Box2D.Common.Math.b2Math;
	b2Vec2 = Box2D.Common.Math.b2Vec2;
	b2BodyDef = Box2D.Dynamics.b2BodyDef;
	b2Body = Box2D.Dynamics.b2Body;
	b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
	b2Fixture = Box2D.Dynamics.b2Fixture;
	b2World = Box2D.Dynamics.b2World;
	b2MassData = Box2D.Collision.Shapes.b2MassData;
	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
	b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
	b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef;
	b2ContactListener = Box2D.Dynamics.b2ContactListener; 
}

var DEFAULT_B2WORLD_RATIO = 30;
var DEFAULT_B2WORLD_GRAVITY = new b2Vec2(0, 10);
var DEFAULT_B2WORLD_TIMESTEP = 1/45;
var DEFAULT_B2WORLD_POS_ITERATIONS = 5;
var DEFAULT_B2WORLD_VEL_ITERATIONS = 5;
var DEFAULT_B2WORLD_UPDATE_INTERVAL = 15;

// TODO: remove?
function boxPolyVertices(positionX, positionY, extentionX, extentionY) {
    var px = positionX;
    var py = positionY;
    var ex = extentionX;
    var ey = extentionY;
    return [
        {
            x: px,
            y: py
        },
        {
            x: px + ex,
            y: py
        },
        {
            x: px + ex,
            y: py + ey
        },
        {
            x: px,
            y: py + ey
        }
    ];
};

var MathUtils = (function () {
    return {
        toRad: function (angle) {
            return Math.PI / 180. * angle;
        },
        toDeg: function (angle) {
            return 180. / Math.PI * angle;
        }
    };
})();

function calculateAngle(vec1, vec2) {
    var v1 = new b2Vec2(vec1.x, vec1.y);
    var v2 = new b2Vec2(vec2.x, vec2.y);

    var dot = (vec1.x * vec2.x) + (vec1.y * vec2.y);
    var cosA = dot / (v1.Length() * v2.Length());
    return MathUtils.toDeg(Math.acos(cosA));
};

function calculateSignedAngle(vec1, vec2) {
    var v1 = new b2Vec2(vec1.x, vec1.y);
    var v2 = new b2Vec2(vec2.x, vec2.y);

    var f = (vec1.x * vec2.y) + (vec1.y * vec2.x);
    var sinA = f / (v1.Length() * v2.Length());
    return sinA;
};

function DebugCanvas() {
    //setup debug draw
    var canvasElm = document.getElementById("debugCanvas");
    if (!canvasElm) {
        $("#root")
            .append(
            "<canvas id='debugCanvas' style='position :absolute; top: 0px; left: 0px;'></canvas>");
        canvasElm = document.getElementById("debugCanvas");
    }
    canvasElm.width = BASE_WIDTH;
    canvasElm.height = BASE_HEIGHT;
    canvasElm.style.width = canvasElm.width * Screen.widthRatio();
    canvasElm.style.height = canvasElm.height * Screen.heightRatio();

    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(canvasElm.getContext("2d"));
    debugDraw.SetDrawScale(Physics.getB2dToGameRatio());
    debugDraw.SetFillAlpha(0.5);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    Physics.getWorld().SetDebugDraw(debugDraw);
};

var Physics = (function () {
    var world = null;
    var timeout = null;
    var pause = false;
    var debugMode = true;
    var debugCanvas = null;
    var updateItems = [];
    var bodiesToDestroy = [];
    var contactProcessor = null;
    var contactListener = null;
    var nativePhysics = Device.isNative();//Device.isNative() && USE_NATIVE_PHYSICS;//Device.isNative();// && typeof(NativeContactBegin) != "undefined";
    var maxSpeed = {
    		linearX: 0,
    		linearY: 0,
    		linear: 0,
    		angular: 0
    };
    var worldParams = {
    		b2dToGameRatio: DEFAULT_B2WORLD_RATIO * 1,
    		gravity: DEFAULT_B2WORLD_GRAVITY.Copy(),
    		timeStep: DEFAULT_B2WORLD_TIMESTEP * 1,
    		positionIterations: DEFAULT_B2WORLD_POS_ITERATIONS * 1,
    		velocityIterations: DEFAULT_B2WORLD_VEL_ITERATIONS * 1,
    		updateInterval: DEFAULT_B2WORLD_UPDATE_INTERVAL *1
    };

    function debugDrawing(v) {
        if (v && !debugCanvas) {
            debugCanvas = new DebugCanvas();
        }

        if (!v && debugCanvas) {
            debugCanvas.debugDrawContext
                .clearRect(0, 0, debugCanvas.debugCanvasWidth,
                debugCanvas.debugCanvasHeight);
            debugCanvas = null;
        }
    }

    /**
     *
     * @param {b2Vec2} gravity Default: b2Vec2(0, 10)
     * @param {boolean} sleep default: true;
     * @param {number} ratio Box2d to Ultimate.js coordinates
     */
    function createWorld(gravity, sleep) {
        if (world != null) 
            return;
        gravity = gravity? gravity : worldParams.gravity;
        world = new b2World(gravity, sleep != null ? sleep : true);
    }

    return { // public interface
        setup: function (params) {
        	if (params) {
	        	if (!isNaN(params.ratio))
	        		worldParams.b2dToGameRatio = params.ratio * 1;
	        	if (!isNaN(params.timeStep))
	        		worldParams.timeStep = params.timeStep * 1;
	        	if (!isNaN(params.positionIterations))
	        		worldParams.posIterations = params.positionIterations * 1;
	        	if (!isNaN(params.velocityIterations))
	        		worldParams.velocityIterations = params.velocityIterations * 1;
	        	if (!isNaN(params.updateInterval))
	        		worldParams.updateInterval = params.updateInterval * 1;
	        	if (params.gravity && !isNaN(params.gravity.x) && !isNaN(params.gravity.y))
	        		worldParams.gravity.Set(params.gravity.x * 1, params.gravity.y * 1);
	        	
	        	if (world !== null)
	        		world.SetGravity(worldParams.gravity);
        	}
        	if (nativePhysics)
        		Native.Physics.Setup(JSON.stringify(worldParams));
        },
        createWorld: function (gravity, sleep, ratio) {
        	Physics.setup({
	        		'gravity': gravity, 
	        		'ratio': ratio
        		});
            createWorld(worldParams.gravity, sleep, worldParams.ratio);
        },
        getWorld: function () {
            createWorld();
            assert(world, "No physics world created!");
            return world;
        },
        getB2dToGameRatio: function () {
            return worldParams.b2dToGameRatio;
        },
        getGravity: function () {
            return worldParams.gravity.Copy();
        },
        getUpdateInterval: function () {
            return worldParams.updateInterval * 1;
        },
        getContactProcessor: function () {
        	if (!contactProcessor)
        		contactProcessor = new ContactProcessor();
            return contactProcessor;
        },
        getContactListener: function () {
            return contactListener;
        },
        updateWorld: function () {
            if (world === null || pause === true || nativePhysics === true)
                return;

            var world = Physics.getWorld();
            if (nativePhysics) {
           	 world.UpdateBodies();
           	 world.UpdateContactListener();
            }
            world.Step(worldParams.timeStep, worldParams.positionIterations, worldParams.velocityIterations);
            if (timeout) {
                timeout.tick(15);
            }

            if (debugCanvas) {
                world.DrawDebugData();
            }
            world.ClearForces();
            for (var i = 0; i < updateItems.length; ++i) {
                updateItems[i].updatePositionFromPhysics();
                if (Screen.isDOMForced() === true && updateItems[i].initialPosRequiered === true) {
                	updateItems[i].initialPosRequiered = false;
            		updateItems[i].physics.SetAwake(false);
                }
            }
            if (bodiesToDestroy.length > 0) {
                for (var i = 0; i < bodiesToDestroy.length; ++i) {
                	if (world.IsLocked() === false)
                		world.DestroyBody(bodiesToDestroy[i]);
                	bodiesToDestroy[i].SetUserData(null);
                	bodiesToDestroy[i] = null;
                }
                bodiesToDestroy = [];
            }
        },
        getMaxSpeed: function () {
        	for (var i = 0; i < updateItems.length; ++i) {
                if (updateItems[i].physics && updateItems[i].physics.GetType()) {
                	maxSpeed.linearX = 0;
                	maxSpeed.linearY = 0;
                	maxSpeed.angular = 0;
                	maxSpeed.linearX = Math.max(maxSpeed.linearX, Math.abs(updateItems[i].physics.m_linearVelocity.x));
                	maxSpeed.linearY = Math.max(maxSpeed.linearY, Math.abs(updateItems[i].physics.m_linearVelocity.y));
                	maxSpeed.linear = Math.max(maxSpeed.linearX, maxSpeed.linearY);
                	maxSpeed.angular = Math.max(maxSpeed.angular, Math.abs(updateItems[i].physics.m_angularVelocity));
                }
            }
        	return maxSpeed;
        },
        getCalm: function () {
        	for (var i = 0; i < updateItems.length; ++i) 
                if (updateItems[i].physics && updateItems[i].physics.GetType() && updateItems[i].physics.IsAwake() === true)
                	return false;
            return true;
        },
        destroyBody: function (body) {
            if (!body) 
                return;
            assert(world);
            if (world.IsLocked() === false || nativePhysics === true)
            	world.DestroyBody(body);
            else
            	bodiesToDestroy.push(body);
        },
        destroyWorld: function () {
            world = null;
            updateItems = [];
        },
        pause: function (v) {
            if (v == null) {
                pause = !pause;
            } else {
                pause = v;
            }
            if (nativePhysics)
            	Native.Physics.PauseWorld(v);
        },
        paused: function () {
            return pause;
        },
        resetTimeout: function (addTime) {
            if (!timeout) {
                return;
            }
            timeout.timeOut += addTime;
        },
        clearTimeout: function () {
            timeout = null;
        },
        setTimeout: function (callback, time) {
            timeout = {
                time: 0,
                callback: callback,
                timeOut: time,
                tick: function (delta) {
                    this.time += delta;
                    if (this.time < this.timeOut) {
                        return;
                    }
                    this.callback();
                    timeout = null;
                }
            };
        },
        updateItemAdd: function (entity) {
            var idx = updateItems.indexOf(entity);
            if (idx == -1) {
                updateItems.push(entity);
            }
        },
        updateItemRemove: function (entity) {
            var idx = updateItems.indexOf(entity);
            if (idx != -1) {
                updateItems.splice(idx, 1);
            }
        },
        destroy: function (entity) {
            if (!entity) 
                return;
            Physics.updateItemRemove(entity);
            Physics.destroyBody(entity.physics);
        },
        debugDrawing: function (trueOrFalse) {
            debugDrawing(trueOrFalse);
        },
        debugDrawingIsOn: function (trueOrFalse) {
            return !!debugCanvas;
        },
        setDebugModeEnabled: function (trueOrFalse) {
            debugMode = trueOrFalse;
        },
        debugMode: function () {
            return debugMode;
        },
        explode: function () {

        }
    };
})();

//TODO: remove?
var collisionCallback = function () {
    var entity1 = contact.GetFixtureA().GetBody().GetUserData();
    var entity2 = contact.GetFixtureB().GetBody().GetUserData();
    var material1 = entity1.descriptions.material;
    var material2 = entity2.descriptions.material;

    var materialImpact = Physics.getMaterialImpact(material1, material2);

    if (entity1.beginContact) {
        entity1.beginContact(entity2, materialImpact);
    }
    if (entity2.beginContact) {
        entity12.beginContact(entity1, materialImpact);
    }

    // position
    if (materialImpact.effect) {
        var effect = new VisualEffect(materialImpact.effect);
    }
};


