
/**
 * This is canvas class for UltimateJS based on GuiElement.js but not inherit from
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */

function GuiCanvas() {
	GuiCanvas.parent.constructor.call(this);
}

GuiCanvas.inheritsFrom(GuiElement);
GuiCanvas.prototype.className = "GuiCanvas";

GuiCanvas.prototype.className = "GuiCanvas";

GuiCanvas.prototype.createInstance = function(params) {
	var entity = new GuiCanvas();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiCanvas);

GuiCanvas.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<canvas id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

/**
 * Initial function to save and use incoming params
 * @param params may contain:
 * - parent
 * - width
 * - height
 * - image
 * - offsetX
 * - offsetY
 * - x
 * - y
 * - z
 * - hide
 * - opacity
 */
GuiCanvas.prototype.initialize = function(params) {
	GuiCanvas.parent.initialize.call(this, params);
	this.renderQueue = new Array();
	this.context = this.jObject[0].getContext("2d");
	this.context.imageSmoothingEnabled = false;
	this.context.webkitImageSmoothingEnabled = false;
	this.context.mozImageSmoothingEnabled = false;

	// Creating background pattern for the canvas if image is exist in tha params.
	this.terrainPattern = null;
	if (params.image) {
		var img = Resources.getAsset(params.image);
		this.terrainPattern = this.context.createPattern(img, 'repeat');
	}

	this.setAwake(true);
	Account.instance.addRenderEntity(this);
};

GuiCanvas.prototype.addToRenderQueue = function(elem) {
	assert(elem, "Can`t add 'undefined' to "  + this.id + " render queue");
	this.renderQueue.push(elem);
	this.setAwake(true);
};

GuiCanvas.prototype.removeFromRenderQueue = function(elem) {
	assert(elem, "Can`t remove 'undefined' from "  + this.id + " render queue");
	var idx = this.renderQueue.indexOf(elem);//$.inArray(elem, this.renderQueue);
	if (idx < 0) return;
	this.renderQueue.splice($.inArray(elem, this.renderQueue),1);
	this.setAwake(true);
};

GuiCanvas.prototype.destroy = function() {
	Account.instance.removeRenderEntity(this);
	GuiCanvas.parent.destroy.call(this);
};

GuiCanvas.prototype.setGuiOffset = function(offsetX, offsetY) {
	this.guiOffsetX = this.calcPercentageWidth(offsetX?offsetX:0);
	this.guiOffsetY = this.calcPercentageHeight(offsetY?offsetY:0);
	this.setAwake(true);
};

GuiCanvas.prototype.setPosition = function(x, y) {
	GuiCanvas.parent.setPosition.call(this, x, y);
	this.setAwake(true);
};

/**
 * Sets size of canvas element
 * @param width number or String percent
 * @param height number or String percent
 * @param noResize {Boolean} to disable resize in this function call
 */
GuiCanvas.prototype.setSize = function(width, height, dontResize) {
	GuiCanvas.parent.setSize.call(this, width, height, dontResize);
	this.setAwake(true);
};

/**
 * Changing width and height attr of canvas element
 * @param width {number}
 * @param height {number}
 */
GuiCanvas.prototype.setRealSize = function(width, height) {
	GuiCanvas.parent.setRealSize.call(this, width, height);
	if (!this.context)
		return;
	this.context.canvas.width = this.jObject.width();
	this.context.canvas.height = this.jObject.height();
	this.setAwake(true);
};

/**
 * Changing left and top attr of canvas element
 * @param x {number}
 * @param y {number}
 */
GuiCanvas.prototype.setRealPosition = function(x, y) {
	GuiCanvas.parent.setRealPosition.call(this, x, y);
	this.setAwake(true);
};

/**
 * Total execution of size and positioning changes
 */
GuiCanvas.prototype.resize = function() {
	if (this.params.wrap)
		this.wrapToParentsViewport();
	else
		this.wrapToEnhancedScene();
	GuiCanvas.parent.resize.call(this);
	this.setAwake(true);
};

GuiCanvas.prototype.wrapToParentsViewport = function() {
//	var additionalOffset = {
//			x: -this.parent.width * 0.06,
//			y: 0,
//			width: this.parent.width * 1.18,
//			height: this.parent.height * 0.87 
//	};
//	this.x = additionalOffset.x;
//	this.y = additionalOffset.y;
//	this.width = additionalOffset.width;
//	this.height = additionalOffset.height;
//	
	if(this.parent.viewport) {

		this.x = 0;
		this.y = 0;
		this.width = this.parent.viewRect.width;
		this.height = this.parent.viewRect.height;
	} else {
		this.x = 0;
		this.y = 0;
		this.width = this.parent.width;
		this.height = this.parent.height;
	}
};

GuiCanvas.prototype.wrapToEnhancedScene = function() {
	if (this.parent.parent.parent) {
		this.x = this.parent.parent.parent.x;
		this.y = this.parent.parent.parent.y;
		this.width = this.parent.parent.parent.width;
		this.height = this.parent.parent.parent.height;
	}
};

GuiCanvas.prototype.setAwake = function(awake) {
	var that = this; 
	
	this.awake = true;
	if (this.awakeTimeout)
		clearTimeout(this.awakeTimeout);
	
	this.awakeTimeout = setTimeout(function() {
		that.awake = false;
	}, 500);
};

/**
 * Render of the canvas. draw the background and render children
 */
GuiCanvas.prototype.render = function() {
	if (!this.awake)
		return;
	var w = this.width*Screen.widthRatio();
	var h = this.height*Screen.heightRatio();
	if (this.terrainPattern) {
	    this.context.fillStyle = this.terrainPattern;
	    this.context.fillRect(0, 0, w, h);
	} else {
		this.context.clearRect(0, 0, w, h);
	}

//	this.smartClear();
	for (var i = 0; i < this.renderQueue.length; i++) {
			this.context.save();
			this.renderQueue[i].render(this.context);
			this.context.restore();
	}
};

GuiCanvas.prototype.smartClear = function() {
	for (var i = 0; i < this.renderQueue.length; i++) {
		this.context.save();
		this.renderQueue[i].clear(this.context);
		this.context.restore();
	}
};