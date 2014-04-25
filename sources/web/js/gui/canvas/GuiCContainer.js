/**
 * @constructor
 */
function GuiCContainer() {
	this.guiEntities = null;
}

GuiCContainer.prototype.init = function() {
	this.guiEntities = new Array();
	this.guiEntitiesMap = new Object();
};
GuiCContainer.prototype.resize = function() {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].resize) {
			this.guiEntities[i].resize();
		}
	}
};

GuiCContainer.prototype.update = function(time) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].update) {
			this.guiEntities[i].update(time);
		}
	}
};

GuiCContainer.prototype.render = function(ctx) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].render) {
			ctx.save(); 
			this.guiEntities[i].render(ctx);
			ctx.restore(); 
		}
	}
};

GuiCContainer.prototype.setUpdateInterval = function(time) {
	var that = this;
	this.updateIntervalTime = time;
	this.updateIntervalHandler = setInterval(function() {
		that.update(that.updateIntervalTime);
	}, this.updateIntervalTime);
};

GuiCContainer.prototype.resetUpdateInterval = function() {
	if (this.updateIntervalHandler) {
		clearInterval(this.updateIntervalHandler);
		this.updateIntervalHandler = null;
		this.updateIntervalTime = null;
	}
};

GuiCContainer.prototype.clear = function() {
	// console.log("Clear GuiCContainer, there is %d entities",
	// this.guiEntities.length);
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].remove) {
			// console.log("Remove entity %s", this.guiEntities[i].src);
			this.guiEntities[i].remove();
		}
	}
	popAllElementsFromArray(this.guiEntities);
	this.guiEntitiesMap = {};
};

GuiCContainer.prototype.remove = function() {
	this.clear();
	this.resetUpdateInterval();
};

GuiCContainer.prototype.addGui = function(entity, name) {
	assert(entity, "Trying to add null pointer!");
	this.guiEntities.push(entity);

	if (typeof (name) == "string") {
		entity.name = name;
		this.guiEntitiesMap[name] = entity;
	}
};

GuiCContainer.prototype.removeGui = function(entity) {
	popElementFromArray(entity, this.guiEntities);
	if (this.guiEntitiesMap[entity.name]) {
		delete this.guiEntitiesMap[entity.name];
	}
	entity.remove();
};

GuiCContainer.prototype.getGui = function(name) {
	return this.guiEntitiesMap[name];
};
