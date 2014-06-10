/**
 * GuiCSprite is a sprite for GuiCanvas (UltimateJS) based on GuiSprite.js but
 * not inherit from
 * 
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */
function GuiCSprite() {
	GuiCSprite.parent.constructor.call(this);
}

GuiCSprite.inheritsFrom(GuiSprite);

GuiCSprite.prototype.className = "GuiCSprite";

GuiCSprite.prototype.createInstance = function(params) {
	var entity = new GuiCSprite();
	entity.initialize(params);
	return entity;
};

//GuiCSprite.prototype.generateId = function() {
//	return this.className + uniqueId();
//};

guiFactory.addClass(GuiCSprite);

/**
 * Initial function to save and use incoming params
 * 
 * @param params
 *            may contain: - parent - width - height - image - offsetX - offsetY -
 *            x - y - z - hide - opacity - totalImage, - totalImageWidth, -
 *            totalImageHeight, - totalTile
 */
GuiCSprite.prototype.initialize = function(params) {
	var that = this;
	
	this.canvasToParentOffset = {
		'left' : 0,
		'top': 0
	};
	
	this.params = params;
	this.canvas = params['canvas'];

	this.x = this.calcPercentageWidth(params.x||0);
	this.y = this.calcPercentageHeight(params.y||0);

	this.z = params.z||0;

	this.opacity = params.opacity?params.opacity:1;
	this.width = params.width;
	this.height = params.height;
	
	this.parent = params.parent;//.canvas?params.parent.canvas:params.parent;
	this.id = this.generateId();
	
	this.total = {
		image :	params.totalImage,
		width : params.totalImageWidth,
		height : params.totalImageHeight,
		tile : params.totalTile
	};
	
	this.totalWidth = this.total.width;

	this.setOffset(params.offsetX, params.offsetY);

	this.setTransformOrigin(params.transformOrigin);

	this.img = Resources.getImageAsset(this.total.image, function(image) {
		init.call(that, image);
	});


	function init(image) {
//		if (_PIXIJS) {
//			that.pixiSprite = new PIXI.Sprite(new PIXI.Texture(new PIXI.BaseTexture (image), new PIXI.Rectangle(0, 0, that.width, that.height)), that.width, that.height);
//			that.parent.stage.addChild(that.pixiSprite);
//		}
		
		that.imageHeight = Math.round(that.height * image.height / that.total.height);
		that.imageWidth = Math.round(that.width * image.width / that.total.width);
		that.scale = {
				x : Math.round((that.width / that.imageWidth) * 100) / 100,
				y : Math.round((that.height / that.imageHeight) * 100) / 100
		};
		
		that.backgroundPosition = {
			x : 0,
			y : 0
		};
	
		that.backgroundSize = {
				w : that.total.width,
				h : that.total.height
		};
		
		that.rotate(0);
		
		that.resizeBackground();
		
		if (!that.params.hide)
			that.show();
		
		that.setEnable(true);
		Account.instance.addScheduledEntity(that);
	}
	that.imageHeight = Math.round(that.height * that.img.height / that.total.height);
	that.imageWidth = Math.round(that.width * that.img.width / that.total.width);
	
	that.scale = {
			x : Math.round((that.width / that.imageWidth) * 100) / 100,
			y : Math.round((that.height / that.imageHeight) * 100) / 100
	};
	
	this.backgroundPosition = {
		x : 0,
		y : 0
	};

	this.backgroundSize = {
			w : this.total.width,
			h : this.total.height
	};
	
	this.currentAnimation = null;
	this.spatialAnimation = null;
	this.animations = new Object();
	
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}
	
	this.frames = {};
	if(params['frames']){
		this.frames = params['frames']; 
	}
	
	this.resize();
	
	this.parent.addGui(this);
};


GuiCSprite.prototype.updateSpatialAnimation = function(dt) {
	GuiCSprite.parent.updateSpatialAnimation.call(this, dt, true);
};


GuiCSprite.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.stopAnimation = function(dontCallCallback) {
	GuiCSprite.parent.stopAnimation.call(this, dontCallCallback, true);
};

GuiCSprite.prototype.changeBackgroundPosition = function(x, y) {
	this.backgroundPosition.x = x;
	this.backgroundPosition.y = y;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.changeBackgroundPositionReal = function(x, y) {
	this.changeBackgroundPosition(x,y);
};

GuiCSprite.prototype.selectFrame = function(frame, row) {
	this.changeBackgroundPosition(frame, row);
};

GuiCSprite.prototype.setFrameCallback = function(frameCallback) {
	this.frameCallback = frameCallback;
};

GuiCSprite.prototype.flip = function(needToBeFlipped) {
	GuiCSprite.parent.flip.call(this, needToBeFlipped, true);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.transform = function(transfromations) {
	GuiCSprite.parent.transform.call(this, transfromations, true);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.rotate = function(angle) {
	GuiCSprite.parent.rotate.call(this, angle, true);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = {
            x : (transformOrigin && !isNaN(transformOrigin.x))?(Math.round(transformOrigin.x * 100) / 100):0.5,
            y : (transformOrigin && !isNaN(transformOrigin.x))?(Math.round(transformOrigin.y * 100) / 100):0.5
        };
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setPosition = function(x, y) {
	this.x = this.calcPercentageWidth(x);
	this.y = this.calcPercentageHeight(y);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setOffset = function(x, y) {
	this.offsetX = this.calcPercentageWidth(x||0);
	this.offsetY = this.calcPercentageHeight(y||0);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.setRealPosition = function(x, y) {
};

GuiCSprite.prototype.setTransform = function(matrix) {
// this.angle = angle;
	this.matrix = matrix;
};

GuiCSprite.prototype.resize = function() {
	var offset = this.parent.jObject['offset']();
	var canvasOffset = this.canvas.jObject['offset']();
	this.canvasToParentOffset.left = offset.left - canvasOffset.left;
	this.canvasToParentOffset.top = offset.top - canvasOffset.top;
};

GuiCSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	GuiCSprite.parent.setRealBackgroundPosition.call(this, offsetX, offsetY);
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.resizeBackground = function() {
};

GuiCSprite.prototype.setZ = function(z) {
};

GuiCSprite.prototype.onAdd = function() {
	this.canvas.addToRenderQueue(this);
};

GuiCSprite.prototype.remove = function() {
//	this.canvas.removeFromRenderQueue(this);
	GuiCSprite.parent.remove.call(this);
	Account.instance.removeScheduledEntity(this);
};

GuiCSprite.prototype.hide = function() {
	this.visible = false;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.show = function() {
	this.visible = true;
	this.canvas.setAwake(true);
};

GuiCSprite.prototype.clampByParentViewport = function() {
};

GuiCSprite.prototype.fadeTo = function(fadeValue, time, callback, changeVisibility) {
// var that = this;

	var fadeAnimation = {};

	fadeAnimation.start = this.opacity;
	fadeAnimation.end = fadeValue>0?(fadeValue<1?fadeValue:1):0;
	
	fadeAnimation.dO = fadeAnimation.end - fadeAnimation.start;

	fadeAnimation.time = time>0?time:500;
	fadeAnimation.speed = Math.abs(fadeAnimation.dO/fadeAnimation.time);

	fadeAnimation.callback = callback;
	fadeAnimation.changeVisibility = changeVisibility;
	
	fadeAnimation.norm = fadeAnimation.dO/Math.abs(fadeAnimation.dO);
	
	this.fadeAnimation = fadeAnimation;
	
	this.fading = true;
};

GuiCSprite.prototype.fade = function(dt) {
	
	var step = this.fadeAnimation.speed * dt * this.fadeAnimation.norm;
	var next = this.opacity + step;
	if ((this.fadeAnimation.end - next)*this.fadeAnimation.norm/Math.abs(this.fadeAnimation.norm) > 0) {
		this.setOpacity(next);
	} else {
		this.fading = false;
		this.setOpacity(this.fadeAnimation.end);
		if (this.fadeAnimation.callback)
			this.fadeAnimation.callback();
		if (this.fadeAnimation.changeVisibility)
			this.hide();
	}
	
};

GuiCSprite.prototype.update = function(dt) {
//	this.convertToPixi();
	
	if (this.fading) {
		this.fade(dt);
	}
};

GuiCSprite.prototype.setOpacity = function(opacity) {
	if (opacity>=0 || opacity<=1) {
		this.opacity = opacity;
	}
};


GuiCSprite.prototype.render = function(ctx) {
	if (!this.visible) 
		return;
	var scrnRatio = {
			x : Screen.widthRatio(),
			y : Screen.heightRatio()
	};

	var x = Math.round(this.canvasToParentOffset.left + (this.x + /*this.parent.guiOffsetX*/ + this.offsetX)*scrnRatio.x);
    var y =  Math.round(this.canvasToParentOffset.top + (this.y + /*this.parent.guiOffsetY*/ + this.offsetY)*scrnRatio.y);
    var w = Math.ceil(this.width*scrnRatio.x);// this.imageWidth;//
    var h =  Math.ceil(this.height*scrnRatio.y);// this.imageHeight;//
	var bx = Math.ceil(this.backgroundPosition.x * this.imageWidth);
	var by = Math.ceil(this.backgroundPosition.y * this.imageHeight);
	
    var ratio = {
        x : this.transformOrigin.x,
        y : this.transformOrigin.y
    };
	
    var translate = {
    		x: Math.round((x+w*ratio.x)),
    		y: Math.round((y+h*ratio.y))
    };
    var rot = MathUtils.toRad(Math.round(this.angle));
    rot = rot.toFixed(3)*1;
	ctx.translate(translate.x, translate.y);
	ctx.rotate(rot); 
	ctx.globalAlpha = this.opacity;
	
// ctx.scale(this.scale.x, this.scale.y);

	var sizeX = Math.ceil(this.imageWidth);
	var sizeY = Math.ceil(this.imageHeight);
	var offsetX = -Math.ceil(w*ratio.x);
	var offsetY = -Math.ceil(h*ratio.y);
	
	if (bx+sizeX <= this.img.width && by+sizeY <= this.img.height)
	    ctx.drawImage(this.img,
			    bx, by,
			    sizeX, sizeY,
	            offsetX, offsetY,
	            w, h);
	else 
		console.warn('Shit is happining. Again. Source rect is out of image bounds');
};
