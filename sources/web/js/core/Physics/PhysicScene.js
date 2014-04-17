/**
 * PhysicsScene - abstract Scene class witch represents local physic world,
 * PhysicEntity`s container
 */

// var FLOOR_LEVEL = 352;
PhysicScene.prototype = new Scene();
PhysicScene.prototype.constructor = PhysicScene;

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
	this.physicWorld = Physics.getWorld();
	if(params['physicsBorder']) {
		Physics.createWorldBorder(params['physicsBorder']);
	}
	this.contactProcessor = function(contactProcessor) {

	};
};

PhysicScene.prototype.addChild = function(child) {
	PhysicScene.parent.addChild.call(this, child);
};

PhysicScene.prototype.createVisual = function() {
	PhysicScene.parent.createVisual.call(this);
	var that = this;
	function updateWorld() {
		Physics.updateWorld(30);
		that.setTimeout(updateWorld, 15);
	}
	updateWorld();
//	Physics.pause(true);
};

PhysicScene.prototype.setBackgrounds = function(backgrounds, visual) {
	if (!visual) visual = this.getVisual();
	$['each'](backgrounds, function(key, value) {
		visual.setBackground(value.src, value.backWidth, value.backHeight,
				value.backX, value.backY, value.repeat, value.idx);
	});
	visual.resize();
};

PhysicScene.prototype.attachChildVisual = function(child) {
	PhysicScene.parent.attachChildVisual.call(this, child);
};

// PhysicScene.prototype.move = function(dx, dy) {
//
// };

PhysicScene.prototype.destroy = function() {
	PhysicScene.parent.destroy.call(this);
	// $(document)['unbind'](".BattleSceneEvent");
};
