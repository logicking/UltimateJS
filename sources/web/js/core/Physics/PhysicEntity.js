/**
 * PhysicEntity - visual entity with representation in physics world
 */

var ANIM_DELAY = 400;

PhysicEntity.prototype = new VisualEntity();
PhysicEntity.prototype.constructor = PhysicEntity;

/**
 * @constructor
 */
function PhysicEntity() {
	PhysicEntity.parent.constructor.call(this);
};

PhysicEntity.inheritsFrom(VisualEntity);
PhysicEntity.prototype.className = "PhysicEntity";

PhysicEntity.prototype.createInstance = function(params) {
	var entity = new PhysicEntity();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PhysicEntity);

//
// Initializing and creating physic entity with visuals
//
PhysicEntity.prototype.init = function(params) {
	var description = {};
	this.physicsEnabled = true;

	if (params.type != null)
		description = Account.instance.descriptionsData[params.type];
	PhysicEntity.parent.init.call(this, $['extend'](params, description));
	if (this.params.physics) {
		this.createPhysics();

		assert(!this.physics['m_userData']);
		this.physics['m_userData'] = this;

		this.updatePositionFromPhysics();
		if (!this.physics['IsStatic']() || Physics.debugMode())
			Physics.updateItemAdd(this);
	}
};

//
// Create and register physics body function
//
PhysicEntity.prototype.createPhysics = function() {
	var that = this;
	var shapeDefinition;
	var bodyDefinition;
	var physicParams = this.params['physics']; // preloaded from json
	var logicPosition = {
		x : this.params.x,
		y : this.params.y
	};

	function setShapeParams(shapeDefinition, physicParams) {
		shapeDefinition.density = selectValue(physicParams['density'],
				(physicParams['static'] == true) ? 0 : 1);
		shapeDefinition.restitution = selectValue(physicParams.restitution, 1);
		shapeDefinition.friction = selectValue(physicParams.friction, 0);
	}

	bodyDefinition = new b2BodyDef();

	// Configuring shape params depends on "type" in json
	switch (physicParams.type) {
	case "Box": {
		shapeDefinition = new b2BoxDef();
		shapeDefinition.extents = new b2Vec2(physicParams.width / 2,
				physicParams.height / 2);
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		break;
	}
	case "Circle": {
		shapeDefinition = new b2CircleDef();
		shapeDefinition.radius = physicParams.radius;
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		// bodyDefinition.bullet == true;
		break;
	}
	case "Poly": {
		shapeDefinition = new b2PolyDef();
		shapeDefinition.vertexCount = physicParams.vertexCount;
		shapeDefinition.vertices = physicParams.vertices;
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		break;
	}
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
	}
	case "PrimitiveComposite": {
		$['each'](physicParams.shapes, function(id, shapeData) {
			switch (shapeData.type) {
			case "Box": {
				shapeDefinition = new b2BoxDef();
				shapeDefinition.extents = new b2Vec2(shapeData.width / 2,
						shapeData.height / 2);
				setShapeParams(shapeDefinition, shapeData);
				shapeDefinition.localPosition = new b2Vec2(shapeData.x,
						shapeData.y);

				bodyDefinition.AddShape(shapeDefinition);

				break;
			}
			case "Circle": {
				shapeDefinition = new b2CircleDef();
				shapeDefinition.radius = physicParams.radius;
				setShapeParams(shapeDefinition, physicParams);

				bodyDefinition.AddShape(shapeDefinition);
				break;
			}
			case "Poly": {
				shapeDefinition = new b2PolyDef();
				shapeDefinition.vertexCount = physicParams.vertexCount;
				shapeDefinition.vertices = physicParams.vertices;
				setShapeParams(shapeDefinition, physicParams);

				bodyDefinition.AddShape(shapeDefinition);
				break;
			}
			case "Triangle": {
				shapeDefinition = new b2PolyDef();
				shapeDefinition.vertexCount = 3;
				shapeDefinition.vertices = physicParams.vertices;

				bodyDefinition.AddShape(shapeDefinition);
				setShapeParams(shapeDefinition, physicParams);
				break;
			}
			}
		});
		break;
	}
	}

	// Configuring and creating body (returning it)

	bodyDefinition.position.Set(0, 0);
	bodyDefinition.linearDamping = physicParams.linearDamping;
	physicWorld = Physics.getWorld();
	this.physics = physicWorld.CreateBody(bodyDefinition);
	this.physics.SetCenterPosition(
			new b2Vec2(logicPosition.x, logicPosition.y), 0);
	this.destructable = physicParams["destructable"];
	if (this.destructable)
		this.health = physicParams["health"];
	else
		this.health = null;
	if (this.params.angle)
		this.rotate(this.params.angle * 2);
};

PhysicEntity.prototype.getContactedBody = function() {
	if (this.physics.m_contactList)
		return this.physics.m_contactList.other;
};

PhysicEntity.prototype.getContactList = function() {
	return this.physics.m_contactList;
};

PhysicEntity.prototype.setContactCallback = function(callback) {
	var shape = this.physics['GetShapeList']();
	for (; shape != null; shape = shape['m_next']) {
		shape['contactCallback'] = callback;
	}
};

PhysicEntity.prototype.createVisual = function() {
	PhysicEntity.parent.createVisual.call(this);

};

// Update visual position from physics world
PhysicEntity.prototype.updatePositionFromPhysics = function() {
	var that = this;

	if (that.physics == null)
		return;
	that.setPosition(that.physics.m_position.x - that.params.physics.x
			- that.params.physics.width / 2, that.physics.m_position.y
			- that.params.physics.y - that.params.physics.height / 2);

	if (!this.noUsualRotate) {
			$['each'](this.visuals, function(id, visualInfo) {
				var angleInDeg = that.getPhysicsRotation().toFixed(3);
				angleInDeg = MathUtils.toDeg(angleInDeg);

				var localPoint = {
					"x" : that.physics.GetCenterPosition()['x'],
					"y" : that.physics.GetCenterPosition()['y']
				};
				localPoint.x -= (visualInfo.visual.width / 2);
				localPoint.y -= (visualInfo.visual.height / 2);

				var matTrans = new Transform();
				var matRot = new Transform();
				matTrans.translate((localPoint.x) * Screen.widthRatio(),
						localPoint.y * Screen.heightRatio());
				matRot.rotateDegrees(angleInDeg / 2);
				matTrans.multiply(matRot);
				matRot.translate(-localPoint.x * Screen.widthRatio(),
						-localPoint.y * Screen.heightRatio());
				matTrans.multiply(matRot);

            visualInfo.visual.setTransform(matTrans.m, 0);
		});
	}
};

// Makes entity "kinematic" or dynamic
PhysicEntity.prototype.physicsEnable = function(v) {

	// if (!v) {
	// Physics.updateItemRemove(this);
	// } else {
	// if (!this.physics['IsStatic']() || Physics.debugMode())
	// Physics.updateItemAdd(this);
	// }
	this.physicsEnabled = v;
};

// PhysicEntity update function
PhysicEntity.prototype.updatePhysics = function() {
	if ((this.params.physics) && (this.physicsEnabled) && (!Physics.paused())) {
		this.updatePositionFromPhysics();
		// this.physics.SetCenterPosition(this.physics.GetCenterPosition(),
		// this.physics.GetRotation());
	}
};

// Gets object rotation from physics (IN WHAT MEASURE? - in !Radians!)
PhysicEntity.prototype.getPhysicsRotation = function() {
	return this.physics['GetRotation']();
};

PhysicEntity.prototype.onDragBegin = function() {
	this.physicsEnable(false);
};

PhysicEntity.prototype.onDragEnd = function() {
	this.physicsEnable(true);
};

// Rotates object (as visual as physics) by local coord axis/ degrees angle
PhysicEntity.prototype.rotateByAxis = function(axis, angle) {
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
	that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		var t = matTrans.transformPoint(that.params.x - that.params.physics.x,
				that.params.y - that.params.physics.y);
		that.physics.SetCenterPosition(new b2Vec2(t[0], t[1]), that.physics
				.GetRotation());
	});
};

// Rotates physics bodyand updates visual position
PhysicEntity.prototype.rotate = function(angleInRad) {
	var position = this.physics.GetCenterPosition();
	var oldAngle = this.physics.GetRotation();
	var newAngle = oldAngle + angleInRad;
	this.physics.SetCenterPosition(position, newAngle / 2);

	this.updatePositionFromPhysics();
};

PhysicEntity.prototype.destroy = function() {
	PhysicEntity.parent.destroy.call(this);
	if (this.physics) {
		Physics.getWorld().DestroyBody(this.physics);
	}
	this.destroyed = true;
	Account.instance.removeEntity(this.id, true);
};

// damage received by other object
PhysicEntity.prototype.onDamage = function(damage) {
	var that = this;
	if (!this.destructable || this.health <= 0) {
		return;
	}

	this.health -= damage;

	// damage levels - show animation of different damages levels
	if (this.params.physics.destructionLevels) {
		$['each'](that.params.physics.destructionLevels, function(id, value) {
			if ((that.health < value["minHealth"])
					|| (that.health == value["minHealth"])) {
				$['each'](that.visuals, function(id, visualInfo) {
					visualInfo.visual.playAnimation(value["animName"],
							ANIM_DELAY, false, true);
				});
				return;
			}
		});
	}

	if (this.health <= 0) {
		$['each'](that.visuals, function(id, visualInfo) {
			if (that.params.builtInDestruction)
				visualInfo.visual.setAnimationEndCallback(function() {
					that.destroy();
					// delete that;
				});
			else {
				that.destroy();
				// delete that;
			}
			return;
		});
	}
};

PhysicEntity.prototype.updateNeedCheck = function() {
	if (this.destroyed) {
		return false;
	}
	return true;
};


