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
	
	if(params["loader"]){
		loader = guiFactory.createObject("GuiDiv", {
			parent : this.mask,
			image : params['loader'],
			background : {
				image : params['loader']
			},
			style : "sprite",
			width : 35,
			height : 35,
			x : "50%",
			y : "50%",
			offsetX : -17,
			offsetY : -17
			
		});
	}
	this.addGui(this.mask);
	this.mask.$()['css']("opacity", 0);
	this.mask.setZ(10000);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	this.mask.$()['css']("opacity", 0);
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, callback);
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	this.mask.fadeTo(0, fadeTime, function(s) {
		that.mask.hide();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};