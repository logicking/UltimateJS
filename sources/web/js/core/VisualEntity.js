/**
 * VisualEntity - Entity with visual representation
 */

VisualEntity.prototype = new Entity();
VisualEntity.prototype.constructor = VisualEntity;

/**
 * @constructor
 */
function VisualEntity() {
	VisualEntity.parent.constructor.call(this);
};

VisualEntity.inheritsFrom(Entity);

VisualEntity.prototype.init = function(params) {
	VisualEntity.parent.init.call(this, params);
	this.x = params['x'];
	this.y = params['y'];
	this.z = params['z'];
	this.width = params['width'];
	this.height = params['height'];
	this.visible = params['visible'];
	this.visuals = {}; // associative array of all attached visuals
};

VisualEntity.prototype.createVisual = function() {
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");
};

VisualEntity.prototype.addVisual = function(visualId, visualInfo) {
	var id = (visualId == null) ? 0 : visualId;
	this.assert(this.visuals[id] == null, "Visual id = '" + id
			+ "' is already created.");
	this.visuals[id] = visualInfo;

};

VisualEntity.prototype.getVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id] ? this.visuals[id].visual : null;
};

VisualEntity.prototype.removeVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	var visual = this.visuals[id].visual;
	this.guiParent.removeGui(visual);
	delete this.visuals[id];
};

VisualEntity.prototype.getVisualInfo = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id];
};

VisualEntity.prototype.attachToGui = function(guiParent, clampByParentViewport) {
	if (!this.visual) {
		this.guiParent = guiParent ? guiParent : this.params['guiParent'];
		this.assert(this.guiParent, "No guiParent provided");
		this.createVisual();

		var that = this;
		$['each'](that.visuals, function(id, visualInfo) {
			visualInfo.visual.visualEntity = that;
			that.guiParent.addGui(visualInfo.visual);
			if (visualInfo.visual.clampByParentViewport)
				visualInfo.visual.clampByParentViewport(clampByParentViewport);
		});
	}

};

VisualEntity.prototype.destroy = function() {
	VisualEntity.parent.destroy.call(this);
	if (this.guiParent) {
		var that = this;
		$['each'](this.visuals, function(id, visualInfo) {
			that.guiParent.removeGui(visualInfo.visual);
		});
	}
};

VisualEntity.prototype.setZ = function(z) {
	if (typeof z == "number") {
		this.z = z;
	}
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		if (typeof that.z == "number") {
			var visualZ = typeof visualInfo.z == "number" ? visualInfo.z : 0;
			visualInfo.visual.setZ(that.z + visualZ);
		}
	});
};
VisualEntity.prototype.setPosition = function(x, y) {

	this.x = x;
	this.y = y;

	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		// dont' move dependent
		if (visualInfo.dependent) {
			return;
		}
		var x = that.x, y = that.y;
		if (typeof visualInfo.offsetX == "number") {
			x -= visualInfo.offsetX;
		}
		if (typeof visualInfo.offsetY == "number") {
			y -= visualInfo.offsetY;
		}

		visualInfo.visual.setPosition(x, y);
	});
};

VisualEntity.prototype.move = function(dx, dy) {
	this.setPosition(this.x + dx, this.y + dy);
};

// Aligns logic position of visualEntity to the one
// of actual visual
VisualEntity.prototype.setPositionToVisual = function(visualId) {
	var visualInfo = this.getVisualInfo(visualId);
	this.x = visualInfo.visual.x + visualInfo.offsetX;
	this.y = visualInfo.visual.y + visualInfo.offsetY;
	this.setPosition(this.x, this.y);
};

VisualEntity.prototype.show = function() {
	this.visible = true;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.show();
	});
};

VisualEntity.prototype.isVisible = function() {
	return this.visible;
};

VisualEntity.prototype.hide = function() {
	this.visible = false;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.hide();
	});
};

VisualEntity.prototype.resize = function() {
	var that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.resize();
	});
};

VisualEntity.prototype.writeUpdate = function(globalData, entityData) {
	// if(this.id == "Door01"){
	// console.log("FALSE",this.x,this.y);
	// }
	this.writeUpdateProperty(entityData, 'x', this.x);
	this.writeUpdateProperty(entityData, 'y', this.y);
	VisualEntity.parent.writeUpdate.call(this, globalData, entityData);
};

VisualEntity.prototype.readUpdate = function(data) {
	// this.x = this.readUpdateProperty(data, 'x');
	// this.y = this.readUpdateProperty(data, 'y');
	VisualEntity.parent.readUpdate.call(this, data);

};
