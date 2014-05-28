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
    var b2dToGameRatio = 1; // Box2d to Ultimate.js coordinates //TODO: implement
    var worldBorder = null;
    var timeout = null;
    var pause = false;
    var debugMode = true;
    var debugCanvas = null;
    var updateItems = [];
    var bodiesToDestroy = [];
    var contactListener = null;
    var contactProcessor = null;

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
    function createWorld(gravity, sleep, ratio) {
        if (world != null) {
            return;
        }
        b2dToGameRatio = ratio != null ? ratio : 1;
        world = new b2World(gravity != null ? gravity : new b2Vec2(0, 10), sleep != null ? sleep : true);
        contactProcessor = new ContactProcessor();
        /// New contact listener version
//        contactListener = new Box2D.Dynamics.b2ContactListener;
//        contactListener.BeginContact = function(contact) {
//        	if (contactProcessor) {
//				var type1 = contact.GetFixtureA().GetBody().GetUserData().params["type"];
//				var type2 = contact.GetFixtureB().GetBody().GetUserData().params["type"];
//				contactProcessor.processBegin(type1, type2, contact);	
//        	}
//        };
//        contactListener.EndContact = function(contact) {
//        	if (contactProcessor) {
//				var type1 = contact.GetFixtureA().GetBody().GetUserData().params["type"];
//				var type2 = contact.GetFixtureB().GetBody().GetUserData().params["type"];
//				contactProcessor.processEnd(type1, type2, contact);	
//        	}
//    		
//        };
//        contactListener.PreSolve = function(contact, impulse) {
//        	
//        };
//        contactListener.PostSolve = function(contact, oldManifold) {
//        	
//        };
//        
//        world.SetContactListener(contactListener);
        ///
// Old one        
//  contactListener = new ContactListener(contactProcessor);
    }

    // TODO: remove?
    function createWorldBorder(params) {
        assert(world);

        var SIDE = ENHANCED_BASE_MARGIN_WIDTH;
        if (!GROUND) {
            var GROUND = 0;
        }

        var ADD_HEIGHT = 1000;
        var borderWidth = 100;
        var B = borderWidth;
        var W = BASE_WIDTH;
        var H = BASE_HEIGHT;
        var WE = W + 2 * B + 2 * SIDE;
        var HE = H + 2 * B - GROUND;
        var poligons = [
            boxPolyVertices(-B - SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
            boxPolyVertices(W + SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
            boxPolyVertices(-B - SIDE, H - GROUND, WE, B) ];
        worldBorder = Physics.createPolyComposite(0, 0, 0, poligons);
    }

    // TODO: remove?
    function putToSleep() { // 2dBody function
        world['m_contactManager']['CleanContactList']();
        this['m_flags'] |= b2Body['e_sleepFlag'];
        this['m_linearVelocity']['Set'](0.0, 0.0);
        this['m_angularVelocity'] = 0.0;
        this['m_sleepTime'] = 0.0;
    }

    // TODO: remove?
    function setBodyPoseByShape(position, angle) {
        this['SetCenterPosition'](position, angle);
        var shapeToBody = b2Math['SubtractVV'](this['m_position'],
            this['GetShapeList']()['GetPosition']());
        this['SetCenterPosition']
        (b2Math['AddVV'](position, shapeToBody), angle);
    }

    // TODO: remove?
    function getShapesCount() {// 2dBody function
        var shape = this['GetShapeList']();
        var shapesCount = 0;
        for (; shape != null; ++shapesCount, shape = shape['m_next'])
            ;
        return shapesCount;
    }

    // TODO: remove?
    function getShapeByIdx(shapeIdx) {// 2dBody function
        var shapesCount = this.getShapesCount();
        var listPosition = shapesCount - 1 - shapeIdx;
        var shape = this['GetShapeList']();
        for (var i = 0; i < listPosition; ++i) {
            if (!shape['m_next']) {
                eLog("bad shape idx!");
                return null;
            }
            shape = shape['m_next'];
        }

        return shape;
    }

    // TODO: remove?
    function setContactCallback(callback, shapeIdx) {
        if (shapeIdx != undefined) {
            this.getShapeByIdx(shapeIdx)['contactCallback'] = callback;
            return;
        }
        var shape = this['GetShapeList']();
        for (; shape != null; shape = shape['m_next']) {
            shape['contactCallback'] = callback;
        }
    }

    return { // public interface
        createWorld: function (gravity, sleep, ratioB2dToUl) {
            createWorld(gravity, sleep, ratioB2dToUl);
        },
        getWorld: function () {
            createWorld();
            assert(world, "No physics world created!");
            return world;
        },
        getB2dToGameRatio: function () {
            return b2dToGameRatio;
        },
        addBodyToDestroy: function (body) {
            bodiesToDestroy.push(body);
        },
        createWorldBorder: function (params) {
            createWorldBorder(params);
        },
        getContactProcessor: function () {
            return contactProcessor;
        },
        getContactListener: function () {
            return contactListener;
        },
        updateWorld: function () {
            if (pause) {
                return;
            }

            var world = this.getWorld();
            world.Step(1 / 45, 5, 5);
            if (timeout) {
                timeout.tick(15);
            }

            if (debugCanvas) {
                world.DrawDebugData();
            }
            world.ClearForces();
            for (var i = 0; i < updateItems.length; ++i) {
                updateItems[i].updatePhysics();
                if (DOM_MODE && updateItems[i].initialPosRequiered) {
                	updateItems[i].initialPosRequiered = null;
            		updateItems[i].physics.SetAwake(false);
                }
            }
            if (bodiesToDestroy.length > 0) {
                for (var i = 0; i < bodiesToDestroy.length; ++i) {
                    world.DestroyBody(bodiesToDestroy[i]);
                }
                bodiesToDestroy = [];
            }
        },
        destroy: function (physics) {
            if (!physics) {
                return;
            }
            assert(world);
            world.DestroyBody(physics);
        },
        destroyWorld: function () {
            Physics.destroy(worldBorder);
            world = null;
            updateItems = [];
        },
        getWorldBorder: function () {
            if (!worldBorder) {
                createWorld();
            }
            assert(worldBorder);
            return worldBorder;
        },
        pause: function (v) {
            if (v == null) {
                pause = !pause;
            } else {
                pause = v;
            }
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
            if (!entity) {
                return;
            }
            Physics.updateItemRemove(entity);
            if (world && entity.physics) {
                world.DestroyBody(entity.physics);
            }
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


