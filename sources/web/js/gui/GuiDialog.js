/**
 * GuiDialog - modal dialog Has a mask full screen mask over the screen and
 * background image
 */

GuiDialog.prototype = new GuiDiv();
GuiDialog.prototype.constructor = GuiDialog;
/**
 * @constructor
 */
function GuiDialog() {
	GuiDialog.parent.constructor.call(this);
};

GuiDialog.inheritsFrom(GuiDiv);
GuiDialog.prototype.className = "GuiDialog";

GuiDialog.prototype.maskDivSoul = null;

GuiDialog.prototype.createInstance = function(params) {
	var entity = new GuiDialog(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDialog);

GuiDialog.prototype.resize = function() {
	GuiDialog.parent.resize.call(this);
	this.children.resize();
};

GuiDialog.prototype.initialize = function(params) {
	GuiDialog.parent.initialize.call(this, params);
	
	this.maskDiv = null;
	this.visible = false;
	

	var that = this;

	// "x" : ((Screen.baseWidth() - this.width) / 2),
	// "y" : ((Screen.baseHeight() - this.height) / 2)

	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	if (!GuiDialog.prototype.maskDivSoul) {
		GuiDialog.prototype.maskDivSoul = guiFactory.createObject("GuiDiv", {
			"parent" : "body",
			// "image" :
			// "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=",
			"style" : "mask",
			"width" : "FULL_WIDTH",
			"height" : "FULL_HEIGHT",
			"x" : 0,
			"y" : 0
		});
		var tempFunc = GuiDialog.prototype.maskDivSoul.remove;
		GuiDialog.prototype.maskDivSoul.remove = function() {
			GuiDialog.prototype.maskDivSoul = null;
			tempFunc.call(this);
		};
	}
	this.maskDiv = GuiDialog.prototype.maskDivSoul;
//	this.maskDiv.setPosition(this.parent.width/2 - this.maskDiv.width, this.parent.height/2 - this.maskDiv.height);
	this.maskDiv.setBackground("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	this.maskDiv.bind(function(e) {
		e.preventDefault();
		return false;
	});
	this.children.addGui(this.maskDiv);

	this.maskDiv.setZ(130);
	this.setZ(131);
	this.maskDiv.hide();

	// if (this.backSrc) {
	// this.children.addGui(this.backImage =
	// factory.createGuiImage(this.dialogContainer, , "dialogButton",
	// this.width, this.height, 0, 0));
	// }
	this.resize();
};

GuiDialog.prototype.init = function() {
	GuiDialog.parent.init.call(this);
};

GuiDialog.prototype.show = function() {
	GuiDialog.parent.show.call(this);
	if (this.maskDiv) {
		this.maskDiv.resize();
		this.maskDiv.show();
	}
	this.visible = true;
};

GuiDialog.prototype.hide = function() {
	GuiDialog.parent.hide.call(this);
	if (this.maskDiv) {
		this.maskDiv.hide();
	}
	this.visible = false;
};

GuiDialog.prototype.isVisible = function() {
	return this.visible;
};
