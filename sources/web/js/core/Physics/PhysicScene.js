/**
 * PhysicsScene - abstract Scene class witch represents local physic world,
 * PhysicEntity`s container
 */

var div2=document.createElement("div");
div2.style.position = "fixed";
div2.style.zIndex = 100000000;
div2.style.marginTop = 30 + "px";
div2.style.marginLeft = "200px";
div2.style.backgroundColor = "white";
document.body.appendChild(div2);

function log2(message) {
	div2.innerHTML = message;
}

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
	that = this;

	this.physicsUpdateInterval = 15;
	this.physicsCounter = 0;
	function updateWorld() {
//		if (!that.newUpdate) {
			Physics.updateWorld(30);
			that.setTimeout(updateWorld, 15);
//		} else {
//			that.prevUpdateTime = Date.now();
//			that.physicUpdate(that.physicsUpdateInterval);
//		}
	}
	updateWorld();
	Physics.pause(true);
};

PhysicScene.prototype.physicUpdate = function(dt) {
	var that = this;
	var date = Date.now();
	if(date - this.prevUpdateTime >= 1000){
		dt = date - this.prevUpdateTime;
		log2(this.physicsCounter);
		this.physicsCounter = 0;;
		this.prevUpdateTime = Date.now();
	}else{
		this.physicsCounter++;
		dt += date - this.prevUpdateTime;
	}
	Physics.updateWorld(30);
	window.requestAnimationFrame(function() {
		that.physicUpdate(dt);
	});
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
