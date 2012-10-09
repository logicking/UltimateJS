var GUI_BAR_NAME = "GuiProgressBar";

GuiProgressBar.prototype = new GuiDiv();
GuiProgressBar.prototype.constructor = GuiProgressBar;

/**
 * @constructor
 */
function GuiProgressBar() {
	GuiProgressBar.parent.constructor.call(this);
}

GuiProgressBar.inheritsFrom(GuiDiv);
GuiProgressBar.prototype.className = GUI_BAR_NAME;

GuiProgressBar.prototype.createInstance = function(params) {
	var entity = new GuiProgressBar();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiProgressBar);

GuiProgressBar.prototype.init = function() {
	GuiProgressBar.parent.init.call(this);

};
GuiProgressBar.prototype.initialize = function(params) {
	GuiProgressBar.parent.initialize.call(this, params);
	this.min = params['min'] ? params['min'] : 0;
	this.max = params['max'] ? params['max'] : 0;
	this.current = params['current'] ? params['current'] : 0;
	this.style = params['style'];
	this.width = params['width'];
	this.stableWidth = params['bar']['width'];// (this.current -
	// this.min)*params['width']/(this.max-this.min)
	this.height = (params['height']) ? params['height'] : that.height;
	var that = this;
	this.bar = guiFactory.createObject("GuiDiv", {
		parent : that,
		background : params['bar']['background'],
		style : params['bar']['style'],
		width : (this.current - this.min) * params['bar']['width']
				/ (this.max - this.min),
		height : params['bar']['height'],
		x : params['bar']['x'],
		y : params['bar']['y']
	});

	this.children.addGui(this.bar);
	var that = this;
	var labelText;
	if (params['label']) {
		labelText = (params['label']['text']) ? params['label']['text']
				: labelText;
		this.label = guiFactory.createObject("GuiLabel", {
			parent : that,
			style : params['label']['style'],
			width : (params['label']['width']) ? params['label']['width']
					: that.width,
			height : (params['label']['height']) ? params['label']['height']
					: that.height,
			text : "" + this.current,
			align : params['label']['align'],
			verticalAlign : "middle",
			x : (params['label']['x']) ? params['label']['x'] : "50%",
			y : (params['label']['y']) ? params['label']['y'] : "50%"
		});
		that.children.addGui(this.label);
	}

};

GuiProgressBar.prototype.setNewValue = function(what, newValue) {
//	var width = Math.round(this.bar.width * (this.max - this.min)
//			/ (this.current - this.min));if (this.entities['Account01']['experience'] >= 5000) {
//	entities[id] = {};
//	entities[id]['id'] = id;
//	entities[id].newEntity = true;
//	entities[id]['class'] = "Item";
//	entities[id].parent = "Inventory01";
//	entities[id].description = args[0];
//}
	this[what] = Math.floor(newValue);
	if (this.current >= this.max) {
		this.current = this.max;
	}
	
	this.label.change(this.current);
	this.bar.width = Math.round((this.current - this.min) * this.stableWidth
			/ (this.max - this.min));
	this.bar.setSize(this.bar.width, this.bar.height);
	this.resize();
};


GuiProgressBar.prototype.resize = function() {
	GuiProgressBar.parent.resize.call(this);
};