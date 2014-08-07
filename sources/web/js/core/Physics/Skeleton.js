var BodyFactory = {
    createBody: function (params, categoryBits, maskBits, groupIndex) {
        function setShapeParams(fixDef, physicParams) {
            fixDef.density = selectValue(physicParams['density'],
                (physicParams['static'] == true) ? 0 : 1);
            fixDef.restitution = selectValue(physicParams.restitution, 1);
            fixDef.friction = selectValue(physicParams.friction, 0);
        }

        var bodyDefinition = new b2BodyDef();
        bodyDefinition.type = params['static'] ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
        var fixDef = new b2FixtureDef();
        if (params.type === "Box") {
            fixDef.shape = new b2PolygonShape;
            fixDef.shape.SetAsBox(params.width / (2 * Physics.getB2dToGameRatio()), params.height /
                (2 * Physics.getB2dToGameRatio()));

            /*shapeDefinition = new b2BoxDef();
             shapeDefinition.extents = new b2Vec2(params.width / 2,
             params.height / 2);
             if (params.angle != null) {
             shapeDefinition.localRotation = params.angle;
             }*/
        } else if (params.type === "Circle") {
            fixDef.shape = new b2CircleShape(params.radius / Physics.getB2dToGameRatio());
            /*fixDef.shape.SetLocalPosition(new b2Vec2(params.x / Physics.getB2dToGameRatio(), params.y /
             Physics.getB2dToGameRatio()));*/
        }
        if (categoryBits != null) {
            fixDef.filter.categoryBits = categoryBits;
        }
        if (maskBits != null) {
            fixDef.filter.maskBits = maskBits;
        }
        if (groupIndex != null) {
            fixDef.filter.groupIndex = groupIndex;
        }
        setShapeParams(fixDef, params);

        // Configuring and creating body (returning it)
        bodyDefinition.position.Set(0, 0);
        bodyDefinition.linearDamping = params.linearDamping;
        if (params.angularDamping != null) {
            bodyDefinition.angularDamping = params.angularDamping;
        }

        var physicWorld = Physics.getWorld();
        var body = physicWorld.CreateBody(bodyDefinition);
        body.CreateFixture(fixDef);
        return body;
    }
};

Skeleton.prototype = new PhysicEntity();
Skeleton.prototype.constructor = Skeleton;

/**
 * @constructor
 */
function Skeleton() {
    Skeleton.parent.constructor.call(this);
};

Skeleton.collisionGroupIndex = -1; //static field

Skeleton.inheritsFrom(PhysicEntity);
Skeleton.prototype.className = "Skeleton";

Skeleton.prototype.createInstance = function (params) {
    var entity = new Skeleton();
    entity.init(params);
    return entity;
};

entityFactory.addClass(Skeleton);

Skeleton.prototype.init = function (params) {
    Skeleton.parent.init.call(this, params);
};

Skeleton.prototype.createPhysics = function () {
    var that = this;
    this.parts = {}; // skeleton parts

    var physicParams = this.params['physics']; // preloaded from json
    var logicPosition = {
        x: this.params.x,
        y: this.params.y
    };

    $['each'](physicParams.parts, function (id, value) {
        var body = {};
        value.linearDamping = physicParams['linearDamping'];
        if (id === "body") {
            body = BodyFactory.createBody(value, CollisionFilter.categoryBits.MAN_CATEGORY_BITS,
                    CollisionFilter.categoryBits.START_CATEGORY_BITS, Skeleton.collisionGroupIndex);
        } else {
            body = BodyFactory.createBody(value, CollisionFilter.categoryBits.LIMBS_CATEGORY_BITS,
                CollisionFilter.categoryBits.MAN_CATEGORY_BITS, Skeleton.collisionGroupIndex);
        }
        body.SetPosition(new b2Vec2((logicPosition.x + value.x) / Physics.getB2dToGameRatio(), (logicPosition.y + value.y) / Physics.getB2dToGameRatio())); //set position with offset
        body.m_userData = that;
        if (that.params.angle)
            that.rotate(that.params.angle * 2);
        that.parts[id] = body;
        if (value.jointTo != null) {
            var jointDef = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
            var anchor = new b2Vec2(logicPosition.x + value.anchorPoint.x, logicPosition.y + value.anchorPoint.y);
            anchor.Multiply(1 / Physics.getB2dToGameRatio());
            jointDef.Initialize(body, that.parts[value.jointTo], anchor);
            jointDef.enableLimit = true;
            jointDef.enableMotor = true;
            jointDef.maxMotorTorque = 0.01;
            jointDef.lowerAngle = MathUtils.toRad(value.lowerAngle);
            jointDef.upperAngle = MathUtils.toRad(value.upperAngle);
            jointDef.userData = that;
            Physics.getWorld().CreateJoint(jointDef);
        } else if (id === "body") {
            that.physics = body;
        }
    });
};

// Update visual position from physics world
Skeleton.prototype.updatePositionManual = function () {
    var that = this;
    $.each(this.visuals, function (id, visualInfo) {
        if (that.parts[id] == null) {
            alert(id + "is null physObject");
            return;
        }
        //position
        var part = that.parts[id]; // box2d body
        var partParams = that.params.physics.parts[id]; // params
        var pos = part.GetPosition().Copy()
        pos.Multiply(Physics.getB2dToGameRatio());; //physPart position
        var angleInDeg = part.GetAngle().toFixed(3);

        visualInfo.visual.setPosition(pos.x - visualInfo.visual.width / 2,
                pos.y - visualInfo.visual.height / 2, angleInDeg);
    });
};

Skeleton.prototype.updatePositionFromPhysics = function (dontRotate, dontTranslate, force) {
    if (!this.physics || this.physicsEnabled === false || (Physics.paused() === true && !force) || this.physics.IsAwake() === false)
        return false;

    this.positionUpdated = false;
    this.newPosition = this.getPosition();
    this.newAngle = this.physics.GetAngle();
    if ((!dontTranslate && (Device.isNative() || !Screen.isDOMForced() || this.initialPosRequiered
        || !this.lastUpdatedPos || !this.lastUpdatedAngle || Math.abs(this.newPosition.x - this.lastUpdatedPos.x) > POSITION_TRESHHOLD
        || Math.abs(this.newAngle - this.lastUpdatedAngle) > ROTATION_TRESHHOLD
        || Math.abs(this.newPosition.y - this.lastUpdatedPos.y) > POSITION_TRESHHOLD)) || force) {
        this.updatePositionManual();
        this.positionUpdated = true;
        this.lastUpdatedPos = this.getPosition();
        this.lastUpdatedAngle = this.getPhysicsRotation().toFixed(3);
    }

};

// Should be overwritten, I guess
Skeleton.prototype.createVisual = function () {
    Skeleton.parent.createVisual.call(this);
};

Skeleton.prototype.attachToGui = function (guiParent) {
    Skeleton.parent.attachToGui.call(this, guiParent, false);
};

// Example
/*"RedHero": {
    "class": "RagdollEntity",
        "visuals": {
        "leftHand": {
            "class": "GuiSprite",
                "width": 35,
                "height": 12,
                "totalImage": "GG_Hand.png",
                "totalImageWidth": 35,
                "totalImageHeight": 12,
                "totalTile": 1,
                "mirror" : {
                "x" : -1,
                    "y" : 1
            }
        },
        "rightHand": {
            "class": "GuiSprite",
                "width": 35,
                "height": 12,
                "totalImage": "GG_Hand.png",
                "totalImageWidth": 35,
                "totalImageHeight": 12,
                "totalTile": 1
        },
        "leftLeg": {
            "class": "GuiSprite",
                "width": 14,
                "height": 40,
                "totalImage": "GG_Leg.png",
                "totalImageWidth": 14,
                "totalImageHeight": 40,
                "totalTile": 1,
                "mirror" : {
                "x" : -1,
                    "y" : 1
            }
        },
        "rightLeg": {
            "class": "GuiSprite",
                "width": 14,
                "height": 40,
                "totalImage": "GG_Leg.png",
                "totalImageWidth": 14,
                "totalImageHeight": 40,
                "totalTile": 1
        },
        "body": {
            "class": "GuiSprite",
                "width": 30,
                "height": 40,
                "totalImage": "GG_Body_Red.png",
                "totalImageWidth": 30,
                "totalImageHeight": 40,
                "totalTile": 1
        },
        "head": {
            "class": "GuiSprite",
                "width": 70,
                "height": 65,
                "totalImage": "Head_Faces_001.png",
                "totalImageWidth": 490,
                "totalImageHeight": 65,
                "totalTile": 1,
                "spriteAnimations": {
                "idle": {
                    "frames": [0],
                        "row": 0
                },
                "smile": {
                    "frames": [5, 5, 5, 0],
                        "row": 0
                },
                "lookRight": {
                    "frames": [1, 1, 0],
                        "row": 0
                },
                "lookLeft": {
                    "frames": [2, 2, 0],
                        "row": 0
                },
                "lookDown": {
                    "frames": [3, 3, 0],
                        "row": 0
                },
                "beaten_1": {
                    "frames": [4],
                        "row": 0
                },
                "beaten_2": {
                    "frames": [6],
                        "row": 0
                }
            }
        }

    },
    "physics": {
        "x": 0,
            "y": 0,
            "width": 10,
            "height": 20,
            "linearDamping": 0.009,
            "parts": {
            "body": {
                "type": "Circle",
                    "x": 0,
                    "y": 0,
                    "radius": 18,
                    "density": 1,
                    "friction": 100,
                    "restitution": 0
            },
            "head": {
                "type": "Circle",
                    "x": -2,
                    "y": -45,
                    "jointTo": "body",
                    "anchorPoint": {
                    "x": 0,
                        "y": -13
                },
                "radius": 29,
                    "lowerAngle": -25,
                    "upperAngle": 25,
                    "density": 1,
                    "friction": 100,
                    "restitution": 0.01
            },
            "leftHand": {
                "type": "Box",
                    "x": 24,
                    "y": -8,
                    "jointTo": "body",
                    "anchorPoint": {
                    "x": 11,
                        "y": -3
                },
                "width": 38,
                    "height": 10,
                    "lowerAngle": -35,
                    "upperAngle": 55,
                    "density": 1.5,
                    "friction": 1,
                    "restitution": 0.01
            },
            "rightHand": {
                "type": "Box",
                    "x": -22,
                    "y": -8,
                    "jointTo": "body",
                    "anchorPoint": {
                    "x": -11,
                        "y": -3
                },
                "width": 38,
                    "height": 10,
                    "lowerAngle": -55,
                    "upperAngle": 35,
                    "density": 1.5,
                    "friction": 1,
                    "restitution": 0.01
            },
            "leftLeg": {
                "type": "Box",
                    "x": 9,
                    "y": 26,
                    "jointTo": "body",
                    "anchorPoint": {
                    "x": 6,
                        "y": 12
                },
                "width": 16,
                    "height": 36,
                    "lowerAngle": -5,
                    "upperAngle": 30,
                    "density": 6,
                    "friction": 1,
                    "restitution": 0.01
            },
            "rightLeg": {
                "type": "Box",
                    "x": -7,
                    "y": 26,
                    "jointTo": "body",
                    "anchorPoint": {
                    "x": -6,
                        "y": 12
                },
                "width": 16,
                    "height": 36,
                    "lowerAngle": -30,
                    "upperAngle": 5,
                    "density": 6,
                    "friction": 1,
                    "restitution": 0.01
            }
        }
    }
}*/
// /Example

