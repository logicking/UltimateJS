
/**
 * This is canvas class for UltimateJS based on GuiElement.js but not inherit from
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */
function GuiCanvas() {
}

GuiCanvas.prototype.className = "GuiCanvas";

GuiCanvas.prototype.createInstance = function(params) {
	var entity = new GuiCanvas();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiCanvas);

/**
 * Creates id for GuiCanvas
 * @returns {String} unique id for children of this canvas
 */
GuiCanvas.prototype.generateId = function() {
	return this.className + uniqueId();
};

/**
 * Method to create canvas element and get the 2d contex to this.contex
 * Append to body, if there is parent - to the parent.
 * @param src
 */
GuiCanvas.prototype.create = function(src) {
	var canvas = document.createElement("canvas");
	this.contex = canvas.getContext("2d");
	this.contex.imageSmoothingEnabled = false;
	this.contex.webkitImageSmoothingEnabled = false;
	this.contex.mozImageSmoothingEnabled = false;
	
	canvas.id = this.id;	
	canvas.width = this.width;	
	canvas.height = this.height;
	canvas.style.position = "absolute";
	document.body.appendChild(canvas);	
	
	// remember jQuery object
	this.jObject = $("#" + this.id);
	
	if (!this.setParent(this.parent)) {
		// if no parent provided assigning to the body object
		console.warn("No parent was provided for object id = " + this.id);
	}
	
	assert(this.jObject.length > 0, "Object id ='" + this.id
			+ "' was not properly created");
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
	this.params = params;

	this.parent = params['parent'];

	// generate ID
	this.id = this.generateId();
	
	
	// Setting position and size variables
	this.setSize(Screen.macro(params['width']), Screen.macro(params['height']), true);
	this.setOffset(Screen.macro(params['offsetX']), Screen
			.macro(params['offsetY']));
	this.setPosition(Screen.macro(params['x']), Screen.macro(params['y']), true);
	
	// Check whether element with such id is already in scene
	if ($("#" + this.id).length > 0) {
		console.error(" GuiCanvas with  id = '" + this.id
				+ "' is already exists.");
	}
	
	// Container for children
	this.children = new GuiContainer();
	this.children.init();

	// Creating of the canvas element
	this.create();
	
	// Creating background pattern for the canvas if image is exist in tha params.
	this.terrainPattern = null;
	if (params.image) {
		var img = Resources.getAsset(params.image);
		this.terrainPattern = this.contex.createPattern(img, 'repeat');
	}
	
	// attach 'this' as data to the element, so we can reference to it by
	// element id
	this.jObject['data']("GuiCanvas", this);

	// Creating baseDiv for div elements attach to if needed. 
//	this.baseDiv = guiFactory.createObject("GuiDiv", {
//		"parent" : this.parent,
//		"width" : this.width,
//		"height" : this.parent,
//		"x" : this.x,
//		"y" : this.y,
//		"offsetX" : this.offsetX,
//		"offsetY" : this.offsetY
//	});
	
	if (typeof params['z'] == "number") {
		this.setZ(params['z']);
	}

	// Can be hidden on the start
	if (params['hide']) {
		this.hide();
	} else {
		this.show();
	}

	if (typeof params['opacity'] == "number") {
		this.setOpacity(params['opacity']);
	}

	// Enable update
	this.enabled = true;

	// Position and size the element once in the end of initialize
	this.resize();
	
	// Adding GuiCanvas for update
//	Account.instance.addScheduledEntity(this);
	Account.instance.addRenderEntity(this);
};

/**
 * Creating shift which is considered while positioning element
 * @param offsetX shift on x coordinate
 * @param offsetY shift on y coordinate
 */
GuiCanvas.prototype.setOffset = function(offsetX, offsetY) {
	this.offsetX = offsetX;
	this.offsetY = offsetY;
	
	if (this.baseDiv)
		this.baseDiv.setOffset(offsetX, offsetY);
};

/**
 * Converting percents to number for width
 * @param val a string or number value
 * @returns {Number} a calculated percent, or the val itself
 */
GuiCanvas.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

/**
 * Converting percents to number for height
 * @param val a string or number value
 * @returns {Number} a calculated percent, or the val itself
 */
GuiCanvas.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

/**
 * Function to position the canvas element
 * @param x a number or percent value
 * @param y a number or percent value
 * @param noResize {Boolean} to disable resize in this function call
 */
GuiCanvas.prototype.setPosition = function(x, y, noResize) {
	this.x = x;
	this.y = y;

	if (!noResize)
		this.resize();
};

/**
 * Function to move canvas element
 * @param dx number
 * @param dy number
 */
GuiCanvas.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.setPosition(this.x, this.y);
};

/**
 * Get "left" and "right" style attr of the canvas element 
 * @returns object { x, y }
 */
GuiCanvas.prototype.getRealPosition = function() {
	return {
		x : this.jObject['css']("left").replace("px", ""),
		y : this.jObject['css']("top").replace("px", "")
	};
};

/**
 * Get x and y values of GuiCanvas
 * @returns { x, y }
 */
GuiCanvas.prototype.getPosition = function() {
	return {
		x : this.x,
		y : this.y
	};
};

/**
 * Sets z-index of the canvas element
 * @param z number
 */
GuiCanvas.prototype.setZ = function(z) {
	this.jObject['css']("z-index", z);
	this.jObject['css']("-webkit-transform", "translateZ(0)");
	this.z = z;
};

/**
 * Show canvas element
 */
GuiCanvas.prototype.show = function() {
	this.jObject['show']();
	this.visible = true;
};

/**
 * Hide canvas element
 */
GuiCanvas.prototype.hide = function() {
	this.jObject['hide']();
	this.visible = false;
};

/**
 * Set the opacity css attr
 * @param opacity number >= 0 and <= 1
 */
GuiCanvas.prototype.setOpacity = function(opacity) {
	this.jObject['css']("opacity", opacity);
};

GuiCanvas.prototype.isEventIn = function(e) {
	var pos = Device.getPositionFromEvent(e);

	var left = this.$()['offset']()['left'];
	var right = left + this.$()['width']();
	var top = this.$()['offset']()['top'];
	var bottom = top + this.$()['height']();
	var isIn = (pos.x > left) && (pos.x < right) && (pos.y > top)
			&& (pos.y < bottom);

	return isIn;
};

GuiCanvas.prototype.addJqueryAnimation = function(name, description) {
	this.jqueryAnimations = this.jqueryAnimations ? this.jqueryAnimations
			: new Object();
	this.jqueryAnimations[name] = description;
};

GuiCanvas.prototype.playJqueryAnimation = function(name, callback) {
	var desc = this.jqueryAnimations[name];
	assert(desc, "No animation found with name '" + name + "'");

	this.stopJqueryAnimation();
	var finalAnimationState = null;

	var that = this;

	var updateDisplay = function(that, action) {
		that.setPosition(action["x"] || that.x, action["y"] || that.y);
		if (action["display"]) {
			if (action["display"] === "hide") {
				that.hide();
			} else if (action["display"] === "show") {
				that.show();
			}
		}
		// that.setSize(action["width"] || that.width, action["height"]
		// || that.height);
	};

	for ( var i = 0; i < desc.length; i++) {
		var actionDesc = desc[i];
		var action;
		if (action = actionDesc["animate"]) {
			var anim = new Object();
			$['each'](action["actions"], function(idx, params) {
				var param01 = params[0];
				var param02 = params[1];
				var param03 = params[2];

				if (param01 == "left" || param01 == "width") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.widthRatio()) : param03;
				} else if (param01 == "top" || param01 == "height") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.heightRatio()) : param03;
				}
				anim[param01] = param02 + param03.toString();
			});

			that.$()['animate'](anim, action["time"]);

		} else if (action = actionDesc["start"]) {
			var x = action["x"] != null ? action["x"] : that.x;
			var y = action["y"] != null ? action["y"] : that.y;
			that.setPosition(x, y);
			updateDisplay(that, action);
		} else if (action = actionDesc["final"]) {
			// force final params after all animations since
			// resize will call reset animation sequence or there's
			// can be option with animations disabled
			finalAnimationState = function() {
				var x = action["x"] != null ? action["x"] : that.x;
				var y = action["y"] != null ? action["y"] : that.y;
				that.setPosition(x, y);
				updateDisplay(that, action);
			};
		}
	}

	this.jqueryAnimationCallback = function() {
		if (finalAnimationState)
			finalAnimationState();
		if (callback)
			callback();
	};

	this.$()['queue']("fx", function() {
		that.jqueryAnimationCallback();
		that.jqueryAnimationCallback = null;
		that.jObject['stop'](true);
	});
};

GuiCanvas.prototype.stopJqueryAnimation = function() {
	if (!this.$()['is'](':animated')) {
		return;
	}
	this.$()['stop'](true);
	if (this.jqueryAnimationCallback) {
		this.jqueryAnimationCallback();
		this.jqueryAnimationCallback = null;
	}
};

/**
 * Return true if canvas elemnt is nit hiden
 * @returns {Boolean}
 */
GuiCanvas.prototype.isVisible = function() {
	return this.visible;
};

/**
 * Sets size of canvas element
 * @param width number or String percent
 * @param height number or String percent
 * @param noResize {Boolean} to disable resize in this function call
 */
GuiCanvas.prototype.setSize = function(width, height, noResize) {
	this.width = width;
	this.height = height;

	if (!noResize)
		this.resize();
};

/**
 * Changing width and height attr of canvas element
 * @param width {number}
 * @param height {number}
 */
GuiCanvas.prototype.setRealSize = function(width, height) {
	var size = Screen.calcRealSize(width, height);
	this.contex.canvas.width = size.x;
	this.contex.canvas.height = size.y;
//	this.jObject['css']("width", size.x);
//	this.jObject['css']("height", size.y);
};

/**
 * Changing left and top attr of canvas element
 * @param x {number}
 * @param y {number}
 */
GuiCanvas.prototype.setRealPosition = function(x, y) {
	var pos = Screen.calcRealSize(x, y);
	this.jObject['css']("left", pos.x);
	this.jObject['css']("top", pos.y);
};

/**
 * Total execution of size and positioning changes
 */
GuiCanvas.prototype.resize = function() {
	w = this.calcPercentageWidth(this.width);
	h = this.calcPercentageHeight(this.height);
	this.setRealSize(w, h);
	
	var offsetX = 0, offsetY = 0;
	if (typeof (this.offsetX) == "number") {
		offsetX = this.offsetX;
	}

	if (this.offsetY != null) {
		offsetY = this.offsetY;
	}

	x = this.calcPercentageWidth(this.x);
	y = this.calcPercentageHeight(this.y);

	this.setRealPosition(x + offsetX, y + offsetY);

	if (this.baseDiv) {
		this.baseDiv.setSize(this.width, this.height);
		this.baseDiv.setPosition(this.x, this.y);
		this.baseDiv.resize();
	}

	this.children.resize();
};

/**
 * Disable resize with the chance to turn it on again
 * @param isTrue {Boolean}
 */
GuiCanvas.prototype.disableResize = function(isTrue) {
	if (this.originalResize == null) {
		this.originalResize = this.resize;
	}
	if (isTrue == false) {
		this.resize = this.originalResize;
	} else {
		this.resize = function() {
		};
	}
};

GuiCanvas.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	return {
		x : pos.x,
		y : pos.y
	};
};

/**
 * Sets a new parent for the canvas element with the avaibility to save position on the screen
 * @param newParent
 * @param saveGlobalPosition {Boolean}
 * @returns {Boolean}
 */
GuiCanvas.prototype.setParent = function(newParent, saveGlobalPosition) {
	// 'newParent' can be either string ID, JQuery object,
	// or object inherited of GuiCanvas
	var parent = null;
	var jParent = null;
	if (typeof newParent == "string") {
		jParent = $(newParent);
	} else if (newParent && typeof newParent == "object") {
		if (newParent['jquery']) {
			jParent = newParent;
		} else if (newParent.jObject && newParent.jObject.length > 0) {
			parent = newParent;
		}
	}
	// parent been represented as JQuery object
	if (jParent) {
		assert(jParent.length > 0, "Object id ='" + this.id
				+ "' has wrong parent: '" + newParent + "'");

		// check whether our parent already has GuiCanvas representation
		parent = jParent['data']("GuiCanvas");
		if (!parent) {
			parent = guiFactory.createObject("GuiCanvas", {
				"jObject" : jParent
			});
		}
	}

	if (parent) {
		var oldParent = this.parent;
		this.parent = parent;

		// recalculate entity x,y so it will
		// stay at the same place on the screen after the parent change
		if (oldParent && saveGlobalPosition) {
			var oldParentPos, newParentPos;

			oldParentPos = oldParent.globalOffset();
			newParentPos = parent.globalOffset();

			var left = oldParentPos.x - newParentPos.x;
			var top = oldParentPos.y - newParentPos.y;
			this.move(left, top);
		}

		if (this.jObject) {
			this.jObject['appendTo'](parent.jObject);
		}
		return true;
	} else {
		console.error("Can't attach object '" + this.id
				+ "' to parent that doesn't exists '" + newParent + "'");
		return false;
	}
};

/**
 * Destruction of the element and it's children
 */
GuiCanvas.prototype.remove = function() {

	Account.instance.removeRenderEntity(this);
	// console.log("Removing item with id %s, classname = %s", this.id,
	// this.className);
	if(this.tooltip){
		this.tooltip.remove();
	}
	this.children.remove();
	this.jObject['remove']();
};

GuiCanvas.prototype.detach = function() {
	this.jObject['detach']();
};

/**
 * Adds entity to children of this GuiCanvas
 * @param entity
 * @param name
 */
GuiCanvas.prototype.addGui = function(entity, name) {
	this.children.addGui(entity, name);
};

/**
 * Removes entity from children of this GuiCanvas
 * @param entity
 */
GuiCanvas.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};

/**
 * Returns entity with name if exists in children of this GuiCanvas
 * @param name
 */
GuiCanvas.prototype.getGui = function(name) {
	return this.children.getGui(name);
};


GuiCanvas.prototype.enableTouchEvents = function(push) {
	if (Device.isTouch()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				push(e1);
			}
			return false;
		};
	} else {
		this.jObject['bind']("mousedown", push);
	}
};

/**
 * checks whether (x, y) in real global coords is inside element's bounds
 * @param x {number}
 * @param y {number}
 * @returns {Boolean}
 */
GuiCanvas.prototype.isPointInsideReal = function(x, y) {
	var pos = this.jObject.offset();
	var width = this.jObject.width();
	var height = this.jObject.height();
	if ((x > pos.left && x < (pos.left + width))
			&& (y > pos.top && y < (pos.top + height))) {
		return true;
	} else {
		return false;
	}
};

/**
 * Returns position of the event relatively this element 
 * @param e
 * @returns Object { x, y }
 */
GuiCanvas.prototype.getEventPosition = function(e) {
	var pos = Device.getPositionFromEvent(e);
	var elementPos = this.jObject['offset']();
	var needed = {};
	needed.x = pos.x - elementPos.left;
	needed.y = pos.y - elementPos.top;
	var result = Screen.calcLogicSize(needed.x, needed.y);
	return result;
};


/**
 * Scheduled function to call continuosly, used to call render if enabled
 */
GuiCanvas.prototype.update = function() {
	if (this.isEnabled()) {
		this.render();
	}
};

/**
 * Returns true if enabled
 * @returns {Boolean}
 */
GuiCanvas.prototype.isEnabled = function() {
	return this.enabled;
};

/**
 * Render of the canvas. draw the background and render children
 */
GuiCanvas.prototype.render = function() {
	var w = this.width*Screen.widthRatio();
	var h = this.height*Screen.heightRatio();
	if (this.terrainPattern) {
	    this.contex.fillStyle = this.terrainPattern;
	    this.contex.fillRect(0, 0, w, h);
	} else {
		this.contex.clearRect(0, 0, w, h);
	}

	this.children.render(this.contex);
	this.contex.restore();
};
