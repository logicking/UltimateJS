/**
 * @constructor
 */
function GuiElement() {
}

GuiElement.prototype.className = "GuiElement";

GuiElement.prototype.createInstance = function(params) {
	var entity = new GuiElement();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiElement);

GuiElement.prototype.generateId = function() {
	return this.className + uniqueId();
};

GuiElement.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

GuiElement.prototype.create = function(src) {
	// initial parent set

	// console.log("Creating item with id %s, src = %s and classname = %s",
	// this.id, src, this.className);

	if (!this.setParent(this.parent)) {
		// if no parent provided assigning to the body object
		this.setParent($("body"));
		console.warn("No parent was provided for object id = " + this.id);
	}

	src = (src == null) ? "" : src;
	this.parent.jObject.append(this.generate(src));

	// remember jQuery object
	this.jObject = $("#" + this.id);
	assert(this.jObject.length > 0, "Object id ='" + this.id
			+ "' was not properly created");
};

GuiElement.prototype.$ = function() {
	return this.jObject;
};

GuiElement.prototype.setEnable = function(isEnable) {
	this.enable = isEnable;
};

GuiElement.prototype.isEnabled = function() {
	return this.enable == true;
};

GuiElement.prototype.callBindedFunction = function(event, bindType) {
	if (this.isEnabled()) {
		this[bindType](event);
	} else {
		console.log("Button is not enabled " + this.id);
	}
};

GuiElement.prototype.bind = function(bindFunction, bindType) {
	bindType = (typeof (bindType) == "string") ? bindType : "click";
	if (bindFunction) {
		this[bindType] = bindFunction;
	}
	if (!this[bindType]) {
		return;
	}

	this.unbind(bindType);

	var that = this;
	var callbackCaller = function(event) {
		that.callBindedFunction(event, bindType);
	};

	this.jObject['bind'](Device.event(bindType) + ".guiElementEvents",
			callbackCaller);
};

GuiElement.prototype.unbind = function(callbackType) {
	callbackType = (typeof (callbackType) == "string") ? callbackType : "";
	this.jObject['unbind'](callbackType + ".guiElementEvents");
};

GuiElement.prototype.init = function() {
	this.children.init();

	this.create(this.src);
	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	this.resize();
};

GuiElement.prototype.initialize = function(params) {
	this.params = params;

	this.parent = params['parent'];

	// generate ID
	this.id = this.generateId();
	// Check whether element with such id is already in scene
	if ($("#" + this.id).length > 0) {
		console.error(" GuiElement with  id = '" + this.id
				+ "' is already exists.");
	}

	this.style = params['style'];
	this.width = params['width'];
	this.height = params['height'];
	// preventing clicking on the item to appear
	this.enable = true;
	this.children = new GuiContainer();
	this.children.init();

	this.src = params['html'] ? params['html'] : this.src;
	if (params['jObject']) {
		this.jObject = params['jObject'];

		// if (this.jObject[0] !== $('body')[0]) {
		// this.parent = guiFactory.createObject("GuiElement", {
		// "jObject" : this.jObject.parent()
		// });
		// }

	} else {
		this.create(this.src);
	}

	// attach 'this' as data to the element, so we can reference to it by
	// element id
	this.jObject['data']("guiElement", this);

	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	var that = this;
	if (params['animations']) {
		$['each'](params['animations'], function(name, value) {
			that.addJqueryAnimation(name, value);
		});
	}

	this.setOffset(Screen.macro(params['offsetX']), Screen
			.macro(params['offsetY']));
	this.setPosition(Screen.macro(params['x']), Screen.macro(params['y']));
	this.setSize(Screen.macro(params['width']), Screen.macro(params['height']));
	if (typeof params['z'] == "number") {
		this.setZ(params['z']);
	}

	if (params['hide']) {
		this.hide();
	} else {
		this.show();
	}

	if (typeof params['opacity'] == "number") {
		this.setOpacity(params['opacity']);
	}

	this.resize();
};

GuiElement.prototype.setOffset = function(offsetX, offsetY) {
	this.offsetX = offsetX;
	this.offsetY = offsetY;
};

GuiElement.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

GuiElement.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

GuiElement.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	var offsetX = 0, offsetY = 0;
	if (typeof (this.offsetX) == "number") {
		offsetX = this.offsetX;
	}

	if (this.offsetY != null) {
		offsetY = this.offsetY;
	}

	x = this.calcPercentageWidth(x);
	y = this.calcPercentageHeight(y);

	this.setRealPosition(x + offsetX, y + offsetY);
};

GuiElement.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.setPosition(this.x, this.y);
};

GuiElement.prototype.getRealPosition = function() {
	return {
		x : this.jObject['css']("left").replace("px", ""),
		y : this.jObject['css']("top").replace("px", "")
	};
};

GuiElement.prototype.getPosition = function() {
	return {
		x : this.x,
		y : this.y
	};
};

GuiElement.prototype.setZ = function(z) {
	this.jObject['css']("z-index", z);
	this.jObject['css']("-webkit-transform", "translateZ(0)");
	this.z = z;
};

GuiElement.prototype.show = function() {
	this.jObject['show']();
	this.visible = true;
};

GuiElement.prototype.hide = function() {
	this.jObject['hide']();
	this.visible = false;
};

GuiElement.prototype.setOpacity = function(opacity) {
	this.jObject['css']("opacity", opacity);
};

GuiElement.prototype.isEventIn = function(e) {
	var pos = Device.getPositionFromEvent(e);

	var left = this.$()['offset']()['left'];
	var right = left + this.$()['width']();
	var top = this.$()['offset']()['top'];
	var bottom = top + this.$()['height']();
	var isIn = (pos.x > left) && (pos.x < right) && (pos.y > top)
			&& (pos.y < bottom);

	return isIn;
};

GuiElement.prototype.addJqueryAnimation = function(name, description) {
	this.jqueryAnimations = this.jqueryAnimations ? this.jqueryAnimations
			: new Object();
	this.jqueryAnimations[name] = description;
};

GuiElement.prototype.playJqueryAnimation = function(name, callback) {
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

GuiElement.prototype.stopJqueryAnimation = function() {
	if (!this.$()['is'](':animated')) {
		return;
	}
	this.$()['stop'](true);
	if (this.jqueryAnimationCallback) {
		this.jqueryAnimationCallback();
		this.jqueryAnimationCallback = null;
	}
};

GuiElement.prototype.isVisible = function() {
	return this.visible;
};

GuiElement.prototype.setSize = function(width, height) {
	this.width = width;
	this.height = height;

	this.resize();
};

GuiElement.prototype.setRealSize = function(width, height) {
	var size = Screen.calcRealSize(width, height);
	this.jObject['css']("width", size.x);
	this.jObject['css']("height", size.y);
};

GuiElement.prototype.setRealPosition = function(x, y) {
	var pos = Screen.calcRealSize(x, y);
	this.jObject['css']("left", pos.x);
	this.jObject['css']("top", pos.y);
};

GuiElement.prototype.resize = function() {
	w = this.calcPercentageWidth(this.width);
	h = this.calcPercentageHeight(this.height);
	this.setRealSize(w, h);
	this.setPosition(this.x, this.y);

	this.children.resize();
};

// prevents resizing of element
GuiElement.prototype.disableResize = function(isTrue) {
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

GuiElement.prototype.change = function(src) {
	this.src = src;
	this.detach();
	this.create(src);
	if (this.pushFunction) {
		this['bind'](this.pushFunction);
	}
	this.resize();
	this.show();
};

GuiElement.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	return {
		x : pos.x,
		y : pos.y
	};
};

GuiElement.prototype.setParent = function(newParent, saveGlobalPosition) {
	// 'newParent' can be either string ID, JQuery object,
	// or object inherited of GuiElement
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

		// check whether our parent already has GuiElement representation
		parent = jParent['data']("guiElement");
		if (!parent) {
			parent = guiFactory.createObject("GuiElement", {
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

GuiElement.prototype.remove = function() {

	// console.log("Removing item with id %s, classname = %s", this.id,
	// this.className);

	this.children.remove();
	this.jObject['remove']();
};

GuiElement.prototype.detach = function() {
	this.jObject['detach']();
};

GuiElement.prototype.addGui = function(entity, name) {
	this.children.addGui(entity, name);
};
GuiElement.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};
GuiElement.prototype.getGui = function(name) {
	return this.children.getGui(name);
};

GuiElement.prototype.center = function() {
	this.jObject['css']("text-align", "center");
	// obj.wrap("<div class='middle'/>");
	// obj.wrap("<div class='inner'/>");
};

GuiElement.prototype.fadeTo = function(fadeValue, time, callback,
		dontChangeVisibility) {
	var that = this;
	if (this.fadeToTimeout) {
		clearTimeout(this.fadeToTimeout);
		this.fadeToTimeout = null;
	}

	if (!this.visible && !dontChangeVisibility) {
		// .hack for iOs devices we need a tiny delay
		// to avoid blinking

		// TODO setTimeout move to GuiElement class or create a GuiBase class
		this.fadeToTimeout = setTimeout(function() {
			that.show();
		}, 1);
	}
	this.jObject['animate']({
		opacity : fadeValue
	}, time, callback);
};

GuiElement.prototype.blinking = function(isOn, blinkTime, blinkMin, blinkMax) {

	if (isOn) {
		var fadeTime = blinkTime ? blinkTime : 1000;

		var fadeIn, fadeOut;
		var that = this;
		fadeIn = function() {
			that.jObject['animate']({
				opacity : (blinkMin ? blinkMin : 0)
			}, fadeTime, fadeOut);
		};
		fadeOut = function() {
			that.jObject['animate']({
				opacity : (blinkMax ? blinkMax : 1)
			}, fadeTime, fadeIn);
		};
		fadeIn();
	} else {
		this.jObject['stop']();
	}
};

GuiElement.prototype.right = function() {
	this.jObject['css']("text-align", "right");
};

GuiElement.prototype.left = function() {
	this.jObject['css']("text-align", "left");
};

GuiElement.prototype.setClickTransparent = function(isTrue) {
	// TODO add IE and Opera support
	if (isTrue) {
		this.jObject['css']("pointer-events", "none");
	} else {
		this.jObject['css']("pointer-events", "auto");
	}
};

GuiElement.prototype.enableTouchEvents = function(push) {
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

// checks whether (x, y) in real global coords is inside element's bounds
GuiElement.prototype.isPointInsideReal = function(x, y) {
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

GuiElement.prototype.getEventPosition = function(e){
	var pos = Device.getPositionFromEvent(e);
	var elementPos = this.jObject['offset']();
	var needed = {}; 
	needed.x =  pos.x - elementPos.left;
	needed.y =  pos.y - elementPos.top;
	return Screen.calcLogicSize(needed.x, needed.y);
};
