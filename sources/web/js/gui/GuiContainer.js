/**
 * @constructor
 */
function GuiContainer() {
	this.guiEntities = null;
}

GuiContainer.prototype.init = function() {
	this.guiEntities = new Array();
	this.guiEntitiesMap = new Object();
};
GuiContainer.prototype.resize = function() {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].resize) {
			this.guiEntities[i].resize();
		}
	}
};

GuiContainer.prototype.update = function(time) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].update) {
			this.guiEntities[i].update(time);
		}
	}
};

GuiContainer.prototype.render = function(ctx) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].render) {
			ctx.save(); 
			this.guiEntities[i].render(ctx);
			ctx.restore(); 
		}
	}
};

GuiContainer.prototype.setUpdateInterval = function(time) {
	var that = this;
	this.updateIntervalTime = time;
	this.updateIntervalHandler = setInterval(function() {
		that.update(that.updateIntervalTime);
	}, this.updateIntervalTime);
};

GuiContainer.prototype.resetUpdateInterval = function() {
	if (this.updateIntervalHandler) {
		clearInterval(this.updateIntervalHandler);
		this.updateIntervalHandler = null;
		this.updateIntervalTime = null;
	}
};

GuiContainer.prototype.clear = function() {
	// console.log("Clear GuiContainer, there is %d entities",
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

GuiContainer.prototype.remove = function() {
	this.clear();
	this.resetUpdateInterval();
};

GuiContainer.prototype.addGui = function(entity, name) {
	assert(entity, "Trying to add null pointer!");
	this.guiEntities.push(entity);

	if (typeof (name) == "string") {
		entity.name = name;
		this.guiEntitiesMap[name] = entity;
	}
};

GuiContainer.prototype.removeGui = function(entity) {
	popElementFromArray(entity, this.guiEntities);
	if (this.guiEntitiesMap[entity.name]) {
		delete this.guiEntitiesMap[entity.name];
	}
	entity.remove();
};

GuiContainer.prototype.getGui = function(name) {
	return this.guiEntitiesMap[name];
};
