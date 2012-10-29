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
	this.mask.setZ(10000);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	this.mask.$()['css']("opacity", 0);
	if (this.loader != null) {
		this.loader.$()['css']("opacity", 0);
		this.loader.fadeTo(1, 1.5 *fadeTime, function() {
		});
	}
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, callback);
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	if (this.loader != null) {
		this.loader.fadeTo(0, 0.3 * fadeTime, function() {
//			that.loader.hide();
		});
	}
	this.mask.fadeTo(0, fadeTime, function(s) {
		that.mask.hide();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	this.loader.resize();
	this.loader.$()['css']("position", "fixed");
	this.loader.$()['css']("top", "50%");
	this.loader.$()['css']("left", "50%");
	console.log("LOADER RESIZE");
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};