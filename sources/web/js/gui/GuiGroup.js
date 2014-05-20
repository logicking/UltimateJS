/**
 * GuiGroup - grouping buttons
 */

/**
 * @constructor
 */
function GuiGroup() {
	GuiGroup.parent.constructor.call(this);
}

GuiGroup.inheritsFrom(GuiDiv);
GuiGroup.prototype.className = "GuiGroup";

GuiGroup.prototype.createInstance = function(params) {
	var entity = new GuiGroup(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiGroup);

GuiGroup.prototype.initialize = function(params) {
	GuiGroup.parent.initialize.call(this, params);
	this.allowMultiSelect = false;
	if (params['allowMultiSelect']) {
		this.allowMultiSelect = true;
	}
};

GuiGroup.prototype.addGui = function(entity, name, isSelected, onSelected, onSelect, onUnselect) {
	this.children.addGui(entity, name);
	if (isSelected) {
		//console.log("isSelected");
		onSelected();
		onSelect();
	} else {
		onUnselect();
	}
	entity.onSelect = onSelect;
	entity.onUnselect = onUnselect;
};

GuiGroup.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};

GuiGroup.prototype.clear = function() {
	popAllElementsFromArray(this.children.guiEntities);
	delete this.children.guiEntitiesMap;

	this.children.guiEntities = new Array();
	this.children.guiEntitiesMap = new Object();
};

GuiGroup.prototype.getGui = function(name) {
	for ( var i = 0; i < this.children.length; i++) {
		if (this.children[i].name === name) {
			return this.children[i];
		}
	}
};

GuiGroup.prototype.disselectAll = function() {
	for ( var i = 0; i < this.children.guiEntities.length; i++) {
		// console.log("onUnselect %s", this.children.guiEntities[i].id);
		this.children.guiEntities[i].onUnselect();
	}
};

GuiGroup.prototype.selectGui = function(selected) {
	// console.log("selectGui %s, children size is %d", selected.id,
	// this.children.guiEntities.length);
	if (!this.allowMultiSelect) {
		this.disselectAll();
	}
	for ( var i = 0; i < this.children.guiEntities.length; i++) {
		if (this.children.guiEntities[i].id === selected.id) {
			// console.log("onSelect %s", this.children.guiEntities[i].id);
			this.children.guiEntities[i].onSelect();
		}
	}
};
