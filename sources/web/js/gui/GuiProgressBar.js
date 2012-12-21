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
	this.vertical = params['vertical'] ? params['vertical'] : false;
	this.style = params['style'];
	this.width = params['width'];
	this.stableHeight = params['bar']['height'];
	this.stableWidth = params['bar']['width'];// (this.current -
	// this.min)*params['width']/(this.max-this.min)
	this.height = (params['height']) ? params['height'] : that.height;
	var that = this;
	var barHeight = this.vertical ? (this.current - this.min)
			* params['bar']['height'] / (this.max - this.min)
			: params['bar']['height'];
	var barWidth = this.vertical ? params['bar']['width']
	: (this.current - this.min) * params['bar']['width']
	/ (this.max - this.min);
	console.log("OFFSET", this.stableHeight - barHeight);
	this.bar = guiFactory.createObject("GuiDiv", {
		parent : that,
		background : {
			image :	params['bar']['background']['image'],
			y : this.stableHeight - barHeight,
			x : this.stableWidth - barWidth
		},
		style : params['bar']['style'],
		width : this.stableWidth,
		height : this.stableHeight,
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
	this[what] = Math.floor(newValue);
	if (this.current >= this.max) {
		this.current = this.max;
	}

	if(this.label){
		this.label.change(this.current);
	}
	
	if(this.vertical){
		var height = Math.round((this.current - this.min) * this.stableHeight
				/ (this.max - this.min));	
		this.bar.setBackgroundPosition(0, this.stableHeight - height);
	}else{
		var width = Math.round((this.current - this.min) * this.stableWidth
				/ (this.max - this.min));
		this.bar.setBackgroundPosition(0, this.stableWidth - width);
	}
//	this.resize();
};

GuiProgressBar.prototype.resize = function() {
	GuiProgressBar.parent.resize.call(this);
};