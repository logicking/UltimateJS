////////////////////////////////////////////////////
/**
 * BackgroundState set of useful functions, operating div that permanently exist
 * in game
 */

var LEVEL_FADE_TIME = 500;

BackgroundState.prototype = new BaseState();
BackgroundState.prototype.constructor = BaseState;

/**
 * @constructor
 */
function BackgroundState() {
	BackgroundState.parent.constructor.call(this);
};

BackgroundState.inheritsFrom(BaseState);

BackgroundState.prototype.init = function(params) {
	params = params ? params : {};
	var image = selectValue(
			params['image'],
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	var background;
	if (params['background']) {
		background = params['background'];
		image = null;
	}

	// foreach(params['dialogs'])
	// ['Ok']
	this.dialogs = new Object();
	var that = this;
	if (params['dialogs'])
		$['each'](params['dialogs'], function(index, value) {
			that.dialogs[index] = guiFactory.createObject("GuiMessageBox",
					value['params']);
		});
	BackgroundState.parent.init.call(this, params);
	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.mask = guiFactory.createObject("GuiDiv", {
		parent : "body",
		image : image,
		background : background,
		style : "mask",
		width : "FULL_WIDTH",
		height : "FULL_HEIGHT",
		x : 0,
		y : 0
	});

	if (params["loader"]) {
		this.loader = guiFactory.createObject("GuiDiv", {
			parent : "body",
			image : params['loader'],
			background : {
				image : params['loader']
			},
			style : "spite",
			width : 35,
			height : 35,
			x : "50%",
			y : "50%",
			offsetX : -17,
			offsetY : -17

		});
		this.loader.setClickTransparent(true);
		this.addGui(this.loader);
		this.loader.$()['css']("opacity", 0);
		this.loader.$()['css']("position", "fixed");
		this.loader.$()['css']("top", "50%");
		this.loader.$()['css']("left", "50%");
		this.loader.setZ(11001);
		this.loader.hide();
		// this.mask.children.addGui(loader,"loader");
	}
	this.addGui(this.mask);
	this.mask.setClickTransparent(true);
	this.mask.$()['css']("opacity", 0);
	this.mask.setZ(99999999);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	var that = this;
	if (this.loader != null) {
		this.loader.show();
		this.loader.$()['css']("opacity", 0);
		this.loader.$()['stop']();
		this.loader.$()['delay'](0.5 * fadeTime);
		this.loader.fadeTo(1, 0.5 * fadeTime, function() {
		});
	}
	this.mask.show();
	this.mask.$()['stop']();
	this.mask.$()['css']("opacity", 0);
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, function(){
		that.faded = true;
//		that.mask.show();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	if (this.loader != null) {
		this.loader.$()['stop']();
		this.loader.hide();
//		this.loader.fadeTo(0, 0.3 * fadeTime);
	}
	this.mask.fadeTo(0, fadeTime, function() {
		that.faded = false;
		that.mask.hide();
		if (callback)
			callback();
	});
	this.faded = false;
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	if (this.loader != null) {
		this.loader.resize();
		this.loader.$()['css']("position", "fixed");
		this.loader.$()['css']("top", "50%");
		this.loader.$()['css']("left", "50%");
	}
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};