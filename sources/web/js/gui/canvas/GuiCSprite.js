
/**
 * GuiCSprite is a sprite for GuiCanvas (UltimateJS) based on GuiSprite.js but not inherit from
 * @author Glukozavr
 * @date April-May 2014
 * @constructor
 */
function GuiCSprite() {
}

GuiCSprite.prototype.className = "GuiCSprite";

GuiCSprite.prototype.createInstance = function(params) {
	var entity = new GuiCSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiCSprite);

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
 * - totalImage,
 * - totalImageWidth,
 * - totalImageHeight,
 * - totalTile
 */
GuiCSprite.prototype.initialize = function(params) {
	var that = this;
	
	this.params = params;

	this.x = params.x||0;
	this.y = params.y||0;

	this.z = params.z||0;

	this.width = params.width;
	this.height = params.height;
	
	this.parent = params.parent;
	this.id = this.parent.generateId.call(this);
	
	this.total = {
		image :	params.totalImage,
		width : params.totalImageWidth,
		height : params.totalImageHeight,
		tile : params.totalTile
	};

	this.offsetX = params.offsetX||0;
	this.offsetY = params.offsetY||0;
	
	this.img = Resources.getAsset(this.total.image);
	
	this.img.onload = function() {
		that.imageHeight = Math.round(that.img.height / Math.round(that.total.height / that.height));
		that.imageWidth = Math.round(that.img.width / Math.round(that.total.width / that.width));
//		that.img.setAttribute("height", that.height);
//		that.img.setAttribute("width", that.width);
		that.scale = {
				x : that.width / that.imageWidth,
				y : that.height / that.imageHeight
		};
	};
//	this.imageHeight = parseInt(this.img.height / parseInt(this.total.height / this.height));
//	this.imageWidth = parseInt(this.img.width / parseInt(this.total.width / this.width));
	this.imageHeight = this.height;
	this.imageWidth = this.width;
	that.scale = {
			x : that.width / that.imageWidth,
			y : that.height / that.imageHeight
	};
	
	this.backgroundPosition = {
		x : 0,
		y : 0
	};

	this.backgroundSize = {
			w : this.total.width,
			h : this.total.height
	};
	
	this.rotate(0);
	
	this.resizeBackground();
	
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

	if (this.parent.canvas) {
		this.parent.canvas.addGui(this);
	} else {
		this.parent.addGui(this);
	}
	
	this.show();
};


GuiCSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration'],
		spatial : description['spatial']
	};
};

GuiCSprite.prototype.addAnimation = function(animationName, frames, row,
		frameDuration) {
	this.animations[animationName] = {
		frames : frames,
		row : row,
		frameDuration : frameDuration
	};
};

GuiSprite.prototype.update = function(dt) {
	if (this.currentAnimation == null && this.spatialAnimation == null) {
		return;
	}

	var curTime = (new Date()).getTime();
	if (!dt) {
		dt = curTime - this.lastUpdateTime;
	}
	this.lastUpdateTime = curTime;
	this.currentFrameTime += dt;

	if (this.spatialAnimation !== null) {
		this.updateSpatialAnimation(dt);
	}
	while (this.currentFrameTime >= this.currentFrameLength) {
		var stopped = this.updateAnimation();
		if (stopped == true) {
			return;
		}
		this.currentFrameTime -= this.currentFrameLength;
	}
};

GuiCSprite.prototype.updateSpatialAnimation = function(dt) {
	if (this.spatialAnimation == null) {
		return;
	}
	var part = dt / this.spatialAnimation.duration;
	if (this.spatialAnimation.timeLeft > dt) {
		this.move(this.spatialAnimation.dx * part, this.spatialAnimation.dy
				* part);
	} else {
		part = this.spatialAnimation.timeLeft / this.spatialAnimation.duration;
		this.move(this.spatialAnimation.dx * part, this.spatialAnimation.dy
				* part);
		if (this.spatialAnimation.callback) {
			this.spatialAnimation.callback();
		}
		this.spatialAnimation = null;
	}
	if (this.spatialAnimation) {
		this.spatialAnimation.timeLeft -= dt;
	}
};

GuiCSprite.prototype.updateAnimation = function() {
	if (this.currentAnimation == null)
		return;
	if (this.currentFrame >= this.animations[this.currentAnimation].frames.length) {
		this.currentFrame = 0;
		if (!this.looped) {
			this.stopAnimation();
			return true;
		}
	}
	
	

	var rowFramesLength = Math.round(this.total.width / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	
	if(this.frames[frame]){
		var frm = this.frames[frame]; 
		this.changeBackgroundPosition(frm.x, frm.y);
	}else{
		var remainder = frame % rowFramesLength;
		var q = (frame - remainder) / rowFramesLength;
		var row = this.animations[this.currentAnimation].row + q;
		frame = remainder;

		this.changeBackgroundPosition(frame * this.width, row * this.height);
		this.frame = frame;
		this.row = row;
	}
	
	if (this.frameCallback != null) {
		if (this.frameCallback[this.currentAnimation]) {
			this.frameCallback[this.currentAnimation](this.currentFrame);
		}
	}
	this.currentFrame++;
};

GuiCSprite.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
};

GuiCSprite.prototype.stopAnimation = function(dontCallCallback) {
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
	this.currentAnimation = null;
	// this.frameCallback = null;
	if (!dontCallCallback && this.animationEndCallback) {
		// trick with oldCallback is to allow to call setCallback
		// inside callback itself
		var oldCallback = this.animationEndCallback;
		this.animationEndCallback = null;
		oldCallback.call(this);
	}
};

GuiCSprite.prototype.changeBackgroundPosition = function(x, y) {
	this.backgroundPosition.x = x;
	this.backgroundPosition.y = y;
};

GuiCSprite.prototype.setFrameCallback = function(frameCallback) {
	this.frameCallback = frameCallback;
};

GuiCSprite.prototype.setAnimationEndCallback = function(animationEndCallback) {
	this.animationEndCallback = animationEndCallback;
};

GuiCSprite.prototype.playAnimation = function(animationName, duration, isLooped,
		independentUpdate) {

	var animation = this.animations[animationName];
	assert(animation, "No such animation: " + animationName);

	this.stopAnimation(true);

	this.currentAnimation = animationName;

	this.lastAnimation = animationName;

	var that = this;
	this.currentFrame = 0;
	this.currentFrameTime = 0;
	this.lastUpdateTime = (new Date()).getTime();

	// console.log(this.animations[this.currentAnimation].frameDuration);
	if (duration) {
		this.currentFrameLength = duration / animation.frames.length;
		// console.log("frame lenght " + this.currentFrameLength + ", " +
		// animation.frames.length);
	} else {
		this.currentFrameLength = this.animations[this.currentAnimation].frameDuration;
	}
	this.looped = isLooped;

	if (independentUpdate) {
		this.updateAnimationCallback = setInterval(function() {
			that.updateAnimation();
		}, this.currentFrameLength);
	}
	this.updateAnimation();
};

GuiCSprite.prototype.isPlayingAnimation = function(animationName) {
	return this.currentAnimation == animationName;
};

GuiCSprite.prototype.flip = function(needToBeFlipped) {
	this.flipped = needToBeFlipped;
};

GuiCSprite.prototype.transform = function(transfromations) {
	if (transfromations) {
		if (transfromations.matrix != null)
			this.matrix = transfromations.matrix;
		if (transfromations.angle != null)
			this.angle = transfromations.angle;
		if (transfromations.scale != null)
			this.scale = transfromations.scale;
		if (transfromations.translate != null)
			this.translate = transfromations.translate;
	}
	var scaleY = selectValue(this.scale, 1);
	var scaleX = scaleY;
	scaleX *= (this.flipped ? -1 : 1);
};

GuiCSprite.prototype.rotate = function(angle) {
	this.angle = angle;
};

GuiCSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = transformOrigin;
};

GuiCSprite.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;
};

GuiCSprite.prototype.setRealPosition = function(x, y) {
};

GuiCSprite.prototype.setTransform = function(matrix) {
//	this.angle = angle;
	this.matrix = matrix;
};

GuiCSprite.prototype.resize = function() {
};

GuiCSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	if (offsetY) {
		this.offsetY1 = offsetY;
	}
	if (offsetX) {
		this.offsetX1 = offsetX;
	}
	var frame = selectValue(this.frame, 0);
	var row = selectValue(this.row, 0);
	this.changeBackgroundPosition(-frame * this.width, row * this.height);
};

GuiCSprite.prototype.resizeBackground = function() {
};

GuiCSprite.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

GuiCSprite.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

GuiCSprite.prototype.setZ = function(z) {
};

GuiCSprite.prototype.remove = function() {
};

GuiCSprite.prototype.hide = function() {
	this.visible = false;
};

GuiCSprite.prototype.show = function() {
	this.visible = true;
};

GuiCSprite.prototype.clampByParentViewport = function() {
	this.visible = true;
};

GuiCSprite.prototype.render = function(ctx) {
	if (!this.visible) 
		return;
	var scrnRatio = {
			x : Screen.widthRatio(),
			y : Screen.heightRatio()
	};
	
	var x = Math.round((this.calcPercentageWidth(this.x) + this.offsetX)*scrnRatio.x);
    var y =  Math.round((this.calcPercentageHeight(this.y) + this.offsetY)*scrnRatio.y);
    var w = Math.round(this.width*scrnRatio.x);//this.imageWidth;//
    var h =  Math.round(this.height*scrnRatio.y);//this.imageHeight;//
	var bx = Math.round(this.backgroundPosition.x);
	var by = Math.round(this.backgroundPosition.y * this.height);

	var ratio = {
		x : this.transformOrigin?this.transformOrigin.x:0.5,
		y : this.transformOrigin?this.transformOrigin.y:0.5
	};
	
	ctx.translate(parseInt((x+w*ratio.x)), parseInt((y+h*ratio.y)));
	ctx.rotate(MathUtils.toRad(parseInt(this.angle))); 
//	ctx.scale(this.scale.x, this.scale.y); 

	try {
    ctx.drawImage(this.img,
		    bx, by,
		    this.width, this.height,
            -parseInt(w*ratio.x), -parseInt(h*ratio.y),
            w, h);
	}
	catch (e) {
	}
};
