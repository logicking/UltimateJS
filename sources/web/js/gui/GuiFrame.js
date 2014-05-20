/**
 * GuiFrame is a GuiElement with ability to scaling using CSS transform scale. 
 * It's particularly useful for scaling iframes objects (like advertising) since
 * there's no other method to scale content inside iframe.
 */

/**
 * Scene to operate Sprites
 */

/**
 * @constructor
 */
function GuiFrame(parent, clazz, width, height) {
	GuiFrame.parent.constructor.call(this, parent, "", clazz, width, height);
}

GuiFrame.inheritsFrom(GuiElement);
GuiFrame.prototype.className = "GuiFrame";

GuiFrame.prototype.createInstance = function(params) {
	var entity = new GuiFrame(params['parent'], "dialogButton",
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

GuiFrame.prototype.initialize = function(params) {
	GuiFrame.parent.initialize.call(this, params);

	this.attachedDiv = params['attachedDiv'];
	this.attachedDiv = $("#" + params['attachedDiv']);
	
	if(this.attachedDiv.length <= 0) {
		this.hide();
		console.log( "Object attched to GuiFrame not exists " + params['attachedDiv']);
		return;
	}
	
	this.attachedDiv['show']();
	this.realWidth = this.attachedDiv['width']();
	var originalWidth = params['originalWidth'] ? params['originalWidth'] : 320;
	var originalHeight = params['originalHeight'] ? params['originalHeight'] : 50;
	this.originalWidth = originalWidth;
	this.originalHeight = originalHeight;
	this.alignH = params['alignH'];
	this.alignV = params['alignV'];
	
	
	
	this.scaleFactor = params['width'] / originalWidth;
	this.attachedDiv['width'](0);
	this.attachedDiv['height'](0);
	this.attachedDiv['css']("position", "absolute");
	// this.jObject['css']("transform-origin", "left bottom");

	this.jObject['css']("display", "none");
	this.jObject['css']("position", "absolute");

	this.jObject['css']("display", "block");
	//this.jObject['css']("border", "solid");

	// this.setRealSize(0, 0);
	// this.rootOffsetX = this.rootOffsetY = 0;
	this.setZ(this.z);
	this.attachedDiv['css']("z-index", 999);
};


GuiFrame.prototype.resize = function() {
	GuiFrame.parent.resize.call(this);

	// this.realWidth = this.attachedDiv.width();
	if (this.attachedDiv) {
		var scaleX = Screen.widthRatio() * this.scaleFactor;
		var scaleY = Screen.heightRatio() * this.scaleFactor;
		if(scaleX > 1) {
			scaleX = scaleY = 1;
		}
		var pos = this.jObject.offset();
		
		if(this.alignH == "center") {
			pos.left  = pos.left  + this.jObject.width() /2 - this.originalWidth / 2;
		} else if(this.alignH == "right") {
			pos.left  = pos.left  + this.jObject.width() - this.originalWidth;
		}
		
		
		if(this.alignV == "center") {
			pos.top  = pos.top + this.jObject.height() / 2 - this.originalHeight / 2;
		} else if(this.alignV == "bottom") {
			pos.top  = pos.top  + this.jObject.height() - this.originalHeight;
		}
		
		
		
		this.attachedDiv['css']("left", pos.left);
		this.attachedDiv['css']("top", pos.top);
//		cssTransform(this.attachedDiv, null, null, scaleX, scaleY, {
//			"x" : pos.left,
//			"y" : pos.top
//		});
	}
};

GuiFrame.prototype.setZ = function(z) {
	GuiFrame.parent.setZ.call(this, z);
	if (this.attachedDiv && this.z) {
		this.attachedDiv['css']("z-index", this.z);
	};
};

GuiFrame.prototype.show = function() {
	GuiFrame.parent.show.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['show']();
		this.resize();
	}
};

GuiFrame.prototype.hide = function() {
	GuiFrame.parent.hide.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['hide']();
	}
};

GuiFrame.prototype.remove = function() {
	GuiFrame.parent.remove.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['hide']();
	}
};

guiFactory.addClass(GuiFrame);