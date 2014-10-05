/**
 * PhysicEntity - visual entity with representation in physics world
 */

var ANIM_DELAY = 400;
var POSITION_TRESHHOLD = 2/Physics.getB2dToGameRatio();
var ROTATION_TRESHHOLD = 0.02;

/**
 * @constructor
 */
function PhysicEntity() {
    PhysicEntity.parent.constructor.call(this);
};

PhysicEntity.inheritsFrom(VisualEntity);
PhysicEntity.prototype.className = "PhysicEntity";

PhysicEntity.prototype.createInstance = function (params) {
    var entity = new PhysicEntity();
    entity.init(params);
    return entity;
};

entityFactory.addClass(PhysicEntity);

//
// Initializing and creating physic entity with visuals
//
PhysicEntity.prototype.init = function (params) {
	var description = {};
    this.physicsEnabled = true;
//    if (Screen.isDOMForced() && !Device.isNative())
    	this.initialPosRequiered = true;
//    else
//        this.initialPosRequiered = false;
    if (params.type != null)
        description = Account.instance.descriptionsData[params.type];
    PhysicEntity.parent.init.call(this, $['extend'](params, description));
    if (this.params.physics) {
        this.createPhysics();
    }
    this.material = null;
};

/**
 *  Create and register physics body
 */
PhysicEntity.prototype.createPhysics = function () {
    var fixtureDefList = [];
    var bodyDefinition;
    var physicParams = cloneObject(this.params['physics']); // preloaded from json
    this.params.x = this.params.x ? this.params.x : 0;
    this.params.y = this.params.y ? this.params.y : 0;
    var logicPosition = {
        x: this.params.x / Physics.getB2dToGameRatio(),
        y: this.params.y / Physics.getB2dToGameRatio()
    };

    function setShapeParams(fixtureDefinition, physicParams) {
        fixtureDefinition.density = selectValue(physicParams['density'], 1);
        fixtureDefinition.restitution = selectValue(physicParams.restitution, 0);
        fixtureDefinition.friction = selectValue(physicParams.friction, 0);
        fixtureDefinition.isSensor = selectValue(physicParams.sensor, false);
        fixtureDefinition.userData = selectValue(physicParams.userData, false);
        if (physicParams.filter != null) {
            fixtureDefinition.filter.categoryBits = selectValue(physicParams.filter.categoryBits, 0x0001);
            fixtureDefinition.filter.groupIndex = selectValue(physicParams.filter.groupIndex, 0);
            fixtureDefinition.filter.maskBits = selectValue(physicParams.filter.maskBits, 0xFFFF);
        }
    }

    bodyDefinition = new b2BodyDef();
    bodyDefinition.type = physicParams['static'] ? b2Body.b2_staticBody : b2Body.b2_dynamicBody;
    bodyDefinition.userData = null;
    // Configuring shape params depends on "type" in json
    switch (physicParams.type) {
        case "Box":
        {
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2PolygonShape;
            fixDef.shape.SetAsBox(physicParams.width / (2 * Physics.getB2dToGameRatio()), physicParams.height /
                (2 * Physics.getB2dToGameRatio()));
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        case "Circle":
        {
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2CircleShape(physicParams.radius / Physics.getB2dToGameRatio());
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        case "Poly":
        {
            // TODO: not tested
            var fixDef = new b2FixtureDef();
            fixDef.shape = new b2PolygonShape();
            // apply offset
            var vertices = cloneObject(physicParams.vertices);
            $.each(vertices, function (id, vertex) {
                vertex.x = (vertex.x + physicParams.x) / Physics.getB2dToGameRatio();
                vertex.y = (vertex.y + physicParams.y) / Physics.getB2dToGameRatio();
            });

            fixDef.shape.SetAsArray(vertices, vertices.length);
            setShapeParams(fixDef, physicParams);
            fixtureDefList.push(fixDef);
            break;
        }
        // TODO: implement Triangle etc.
        /*
         case "Triangle": {
         shapeDefinition = new b2PolyDef();
         shapeDefinition.vertexCount = 3;
         shapeDefinition.vertices = physicParams.vertices;
         bodyDefinition.AddShape(shapeDefinition);
         setShapeParams(shapeDefinition, physicParams);
         break;
         }
         case "PolyComposite": {
         $['each'](physicParams.shapes, function(id, shapeData) {

         var shapeDef = new b2PolyDef();
         shapeDef.vertexCount = shapeData.vertexCount;
         var vertices = new Array();
         $['each'](shapeData.vertices, function(idx, vertex) {
         var newVertex = {};
         newVertex.x = physicParams.scale ? vertex.x
         * physicParams.scale : vertex.x;
         newVertex.y = physicParams.scale ? vertex.y
         * physicParams.scale : vertex.y;
         vertices.push(newVertex);
         });
         shapeDef.vertices = vertices;

         setShapeParams(shapeDef, shapeData);

         bodyDefinition.AddShape(shapeDef);
         });
         break;
         }*/
        case "PrimitiveComposite":
        {
            $.each(physicParams.shapes, function (id, fixtureData) {
                var fixDef = new b2FixtureDef();
                switch (fixtureData.type) {
                    case "Box":
                    {
                        fixDef.shape = new b2PolygonShape();
                        var localPos = new b2Vec2(fixtureData.x / Physics.getB2dToGameRatio(), fixtureData.y /
                            Physics.getB2dToGameRatio());
                        fixDef.shape.SetAsOrientedBox(fixtureData.width / (2 * Physics.getB2dToGameRatio()), fixtureData.height /
                            (2 * Physics.getB2dToGameRatio()), localPos);
                        break;
                    }
                    case "Circle":
                    {
                        fixDef.shape = new b2CircleShape(fixtureData.radius / Physics.getB2dToGameRatio());
                        fixDef.shape.SetLocalPosition(new b2Vec2(fixtureData.x / Physics.getB2dToGameRatio(), fixtureData.y /
                            Physics.getB2dToGameRatio()));
                        break;
                    }
                    case "Poly":
                    {
                        fixDef.shape = new b2PolygonShape();

                        // apply offset
                        $.each(fixtureData.vertices, function (id, vertex) {
                            vertex.x = (vertex.x + fixtureData.x) / Physics.getB2dToGameRatio();
                            vertex.y = (vertex.y + fixtureData.y) / Physics.getB2dToGameRatio();
                        });

                        fixDef.shape.SetAsArray(fixtureData.vertices, fixtureData.vertices.length);
                        break;
                    }
                    case "Triangle":
                    {
                        // TODO: implement?
                        /*shapeDefinition = new b2PolyDef();
                         shapeDefinition.vertexCount = 3;
                         shapeDefinition.vertices = physicParams.vertices;
                         bodyDefinition.AddShape(shapeDefinition);
                         setShapeParams(shapeDefinition, physicParams);*/
                        break;
                    }
                }
                setShapeParams(fixDef, fixtureData);
                fixtureDefList.push(fixDef);
            });
            break;
        }
    }

    // Configuring and creating body (returning it)
    bodyDefinition.position.Set(0, 0);
    bodyDefinition.linearDamping = physicParams.linearDamping != null ? physicParams.linearDamping : 0;
    bodyDefinition.angularDamping = physicParams.angularDamping != null ? physicParams.angularDamping : 0;
    
    var that = this;
    Physics.createBody(bodyDefinition, function(body){
      $.each(fixtureDefList, function (id, fixDef) {
    	  body.CreateFixture(fixDef);
      });
      body.SetPositionAndAngle(logicPosition, that.params.angle);
//      body.SetUserData(that);
      that.physics = body;
      body['m_userData'] = that;
      if (body.m_type !== b2Body.b2_staticBody || Physics.debugMode())
          Physics.updateItemAdd(that);
      if (!isNaN(that.m_SetActiveOnCreate)) {
    	  body.SetActive(that.m_SetActiveOnCreate? true : false);
    	  that.m_SetActiveOnCreate = null;
      }
      that.initialPosRequiered = true;
    });
    
    this.destructable = physicParams["destructable"];
    if (this.destructable)
        this.health = physicParams["health"];
    else
        this.health = null;
};

PhysicEntity.prototype.getContactedBody = function () {
    if (this.physics.m_contactList)
        return this.physics.m_contactList.other;
};

PhysicEntity.prototype.getContactList = function () {
    return this.physics.m_contactList;
};

PhysicEntity.prototype.createVisual = function () {
//	Needed for cacheing physics for native
    var that = this;
    if (Device.isNative() && this.physics && !this.physics.IsStatic()) {
        this.physicsId = that.physics.id;
        $.each(this.visuals, function (id, visualInfo) {
            visualInfo.visual.jObject.physicsId = that.physics.id;
            console.log("Attaching physics with id = " + that.physics.id + " to " + that.id);
        });
    }
};

// Update visual position from physics world
PhysicEntity.prototype.updatePositionFromPhysics = function (forceUpdate) {
    if (!this.physics || this.physicsEnabled === false || (this.initialPosRequiered === false && 
    		!forceUpdate && (Physics.paused() === true || this.physics.IsAwake() === false) ))
    	return false;
//    this.positionUpdated = false;
    this.newPosition = this.getPosition();
    if (forceUpdate || this.initialPosRequiered === true 
    		|| !this.lastUpdatedPos || Math.abs(this.newPosition.x - this.lastUpdatedPos.x) > POSITION_TRESHHOLD 
    		|| Math.abs(this.newPosition.y - this.lastUpdatedPos.y) > POSITION_TRESHHOLD) {
	    this.lastUpdatedPos = this.getPosition();
	    this.setPosition(this.newPosition.x - this.params.physics.x - this.params.physics.width / 2,
	    		this.newPosition.y - this.params.physics.y - this.params.physics.height / 2);
//	    this.positionUpdated = true;
	}

	this.newAngle = this.physics.GetAngle();
	if (forceUpdate || this.initialPosRequiered === true 
			|| !this.lastUpdatedAngle || Math.abs(this.newAngle - this.lastUpdatedAngle) > ROTATION_TRESHHOLD) {
		this.lastUpdatedAngle = this.getPhysicsRotation();
        PhysicEntity.parent.rotate.call(this, this.newAngle);
//        this.positionUpdated = true;
	}
};

PhysicEntity.prototype.updatePosition = function () {
    this.setPosition(this.newPosition.x - this.params.physics.x - this.params.physics.width / 2,
	    		this.newPosition.y - this.params.physics.y - this.params.physics.height / 2);
    this.lastUpdatedPos = this.physics.GetPosition();
};

PhysicEntity.prototype.updateAngle = function () {
	PhysicEntity.parent.rotate.call(this, this.newAngle);
    this.lastUpdatedAngle = this.physics.GetAngle();
};

// Makes entity "kinematic" or dynamic
PhysicEntity.prototype.physicsEnable = function (v) {

     if (!v) {
    	 Physics.updateItemRemove(this);
     } else {
     if (!this.physics['IsStatic']() || Physics.debugMode())
    	 Physics.updateItemAdd(this);
     }
    this.physicsEnabled = !!v;
    this.physics.SetActive(this.physicsEnabled);
};

// Gets object rotation from physics (IN WHAT MEASURE? - in !Radians!)
PhysicEntity.prototype.getPhysicsRotation = function () {
    return this.physics.GetAngle();
};

/**
 *
 * @param {b2Vec2} pos logic position
 */
PhysicEntity.prototype.setPhysicsPosition = function (pos) {
    var pos = new b2Vec2(pos.x, pos.y);
    pos.Multiply(1 / Physics.getB2dToGameRatio());
   	this.physics.SetAwake(true);
    this.physics.SetPosition(pos);
    this.updatePositionFromPhysics();
};

/**
 * get logic position (using b2dToGameRatio)
 * @returns {b2Vec2}
 */
PhysicEntity.prototype.getPosition = function () {
    if (this.physics) {
        var pos = this.physics.GetPosition().Copy();
        pos.Multiply(Physics.getB2dToGameRatio());
        return pos;
    }
};

PhysicEntity.prototype.onDragBegin = function () {
    this.physicsEnable(false);
};

PhysicEntity.prototype.onDragEnd = function () {
    this.physicsEnable(true);
};

// Rotates object (as visual as physics) by local coord axis/ degrees angle
PhysicEntity.prototype.rotateByAxis = function (axis, angle) {
    // this.angle = angle;
    // Calculating rotation matrix for canon barrel and power line
    var matTrans = new Transform();
    matTrans.translate(axis.x, axis.y);
    var matRot = new Transform();

    matRot.rotateDegrees(angle);
    matTrans.multiply(matRot);
    matRot.reset();
    matRot.translate(-axis.x, -axis.y);
    matTrans.multiply(matRot);
    var that = this;
    $['each'](this.visuals, function (id, visualInfo) {
        var t = matTrans.transformPoint(that.params.x - that.params.physics.x,
                that.params.y - that.params.physics.y);
        that.physics.SetPosition(new b2Vec2(t[0], t[1]));
    });
};

// Rotates physics bodyand updates visual position
PhysicEntity.prototype.rotate = function (angleInRad) {
    var position = this.physics.GetPosition();
    var oldAngle = this.physics.GetAngle();
    var newAngle = oldAngle + angleInRad;
    if (Screen.isDOMForced() && !Device.isNative())
    	this.physics.SetAwake(true);
    this.physics.SetAngle(newAngle / 2);

    this.updatePositionFromPhysics();
    if (Screen.isDOMForced() && !Device.isNative())
    	this.physics.SetAwake(false);
};

PhysicEntity.prototype.destroy = function () {
	this.destroyPhysics();
   	PhysicEntity.parent.destroy.call(this);
};

PhysicEntity.prototype.destroyPhysics = function () {
	Physics.getContactProcessor().clearContactCallbacks(this);
    Physics.destroy(this);
    this.physics = null;
};

// damage received by other object
PhysicEntity.prototype.onDamage = function (damage) {
    var that = this;
    if (!damage || !this.destructable || !this.health) 
        return;
    

    this.health = Math.max(this.health - damage, 0);

    // damage levels - show animation of different damages levels
    if (this.params.physics.destructionLevels) {
        $['each'](that.params.physics.destructionLevels, function (id, value) {
            if (that.health <= value["minHealth"]) {
                $['each'](that.visuals, function (id, visualInfo) {
                    visualInfo.visual.playAnimation(value["animName"],
                        ANIM_DELAY, false, true);
                });
                return;
            }
        });
    }

    if (this.health <= 0) {
        $['each'](that.visuals, function (id, visualInfo) {
            if (that.params.builtInDestruction)
                visualInfo.visual.setAnimationEndCallback(function () {
                	Account.instance.removeEntity(that.id);
                });
            else 
            	Account.instance.removeEntity(that.id);
            
            return;
        });
    }
};


PhysicEntity.prototype.setContactBeginCallback = function (callback) {
    Physics.getContactProcessor().setContactBeginCalback(callback, this.id);
};

PhysicEntity.prototype.setContactEndCallback = function (callback) {
    Physics.getContactProcessor().setContactEndCalback(callback, this.id);
};

PhysicEntity.prototype.setContactPreSolveCalback = function (callback) {
    Physics.getContactProcessor().setContactPreSolveCalback(callback, this.id);
};

PhysicEntity.prototype.setContactPostSolveCalback = function (callback) {
    Physics.getContactProcessor().setContactPostSolveCalback(callback, this.id);
};

PhysicEntity.prototype.setMaterial = function (material) {
    this.material = material;
};

PhysicEntity.prototype.getMaterial = function () {
    return this.material;
};
