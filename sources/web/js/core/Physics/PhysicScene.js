/**
 * PhysicsScene - abstract Scene class witch represents local physic world,
 * PhysicEntity`s container
 */

/**
 * @constructor
 */
function PhysicScene() {
	PhysicScene.parent.constructor.call(this);
};

PhysicScene.inheritsFrom(Scene);

PhysicScene.prototype.className = "PhysicScene";
PhysicScene.prototype.createInstance = function(params) {
	var entity = new PhysicScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PhysicScene);

PhysicScene.prototype.init = function(params) {
	PhysicScene.parent.init.call(this, params);
	this.world = Physics.getWorld();
	Physics.setup();
};

PhysicScene.prototype.addChild = function(child) {
	PhysicScene.parent.addChild.call(this, child);
};

PhysicScene.prototype.createVisual = function() {
	PhysicScene.parent.createVisual.call(this);

	this.setInterval(Physics.updateWorld, Physics.getUpdateInterval());
};

PhysicScene.prototype.setBackgrounds = function(backgrounds, visual) {
	if (!visual) visual = this.getVisual();
	$['each'](backgrounds, function(key, value) {
		visual.setBackground(value.src, value.backWidth, value.backHeight,
				value.backX, value.backY, value.repeat, value.idx);
	});
	visual.resize();
};

PhysicScene.prototype.destroy = function() {
	Physics.getContactProcessor().clearContactCallbacks();
	PhysicScene.parent.destroy.call(this);
};


PhysicScene.prototype.attachChildVisual = function(child) {
	PhysicScene.parent.attachChildVisual.call(this, child);
};
