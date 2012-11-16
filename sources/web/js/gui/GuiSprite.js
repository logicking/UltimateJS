/*
 * GuiSprite - sprite of GuiScene
 */

var GUISPRITE_HACK_ON = false;

GuiSprite.prototype = new GuiDiv();
GuiSprite.prototype.constructor = GuiSprite;

/**
 * @constructor
 */
function GuiSprite() {
	GuiSprite.parent.constructor.call(this);
}

GuiSprite.inheritsFrom(GuiDiv);
GuiSprite.prototype.className = "GuiSprite";

GuiSprite.prototype.createInstance = function(params) {
	var entity = new GuiSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSprite);

GuiSprite.prototype.initialize = function(params) {
	GuiSprite.parent.initialize.call(this, params);

//	 .hack temporary disable viewport for sprites at all
	 this.clampByViewport = this.clampByViewportSimple;

	this.totalWidth = params['totalImageWidth'];
	this.totalHeight = params['totalImageHeight'];
	this.frameCallback = null;
	this.offsetY1 = 0;
	this.offsetX1 = 0;
	this.totalSrc = params['totalImage'];
	// // .hack temporary for older games
	if (GUISPRITE_HACK_ON) {
		this.totalSrc = Resources.getImage(params['totalImage']);
	}

	if (params['totalTile'] == null) {
		this.totalTile = {
			x : 0,
			y : 0
		};
	} else {
		this.totalTile = params['totalTile'];
	}
	this.flipped = false;

	this.setBackground(this.totalSrc);

	this.currentAnimation = null;
	this.animations = new Object();

	var that = this;
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}

	this.jObject['css']("background-position", Math.floor(Screen.widthRatio()
			* this.totalTile.x * this.width)
			+ "px "
			+ Math.floor(Screen.heightRatio() * this.height * this.totalTile.y)
			+ "px");
};

GuiSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration']
	};
};

GuiSprite.prototype.addAnimation = function(animationName, frames, row,
		frameDuration) {
	this.animations[animationName] = {
		frames : frames,
		row : row,
		frameDuration : frameDuration
	};
};

GuiSprite.prototype.update = function(dt) {
	if (this.currentAnimation == null)
		return;
	var curTime = (new Date()).getTime();
	if (!dt) {
		var dt = curTime - this.lastUpdateTime;
	}
	this.lastUpdateTime = curTime;
	
	this.currentFrameTime += dt;
	while (this.currentFrameTime >= this.currentFrameLength) {
		var stopped = this.updateAnimation();
		if(stopped == true){
			return;
		}
		this.currentFrameTime -= this.currentFrameLength;
	}
};

GuiSprite.prototype.updateAnimation = function() {
	if (this.currentAnimation == null)
		return;
	if (this.currentFrame >= this.animations[this.currentAnimation].frames.length) {
		this.currentFrame = 0;
		if (!this.looped) {
			this.stopAnimation();
			return true;
		}
	}

	// console.log("Frames " + this.currentFrame);
	var rowFramesLength = Math.round(this.totalWidth / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	var remainder = frame % rowFramesLength;
	var q = (frame - remainder) / rowFramesLength;
	var row = this.animations[this.currentAnimation].row + q;
	frame = remainder;

	this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
			* frame * this.width + Screen.heightRatio() * this.offsetX1)
			+ "px "
			+ Math.round(-Screen.heightRatio() * row * this.height
					+ Screen.heightRatio() * this.offsetY1) + "px ");
	this.frame = frame;
	this.row = row;
	this.setRealBackgroundPosition();//test
	if (this.frameCallback != null) {
		if (this.frameCallback[this.currentAnimation]) {
			this.frameCallback[this.currentAnimation](this.currentFrame);
		}
	}
	this.currentFrame++;
};

GuiSprite.prototype.stopAnimation = function(dontCallCallback) {
	this.jObject['stop']();
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

GuiSprite.prototype.remove = function() {
	GuiSprite.parent.remove.call(this);
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
};

GuiSprite.prototype.setFrameCallback = function(frameCallback) {
	this.frameCallback = frameCallback;
};

GuiSprite.prototype.setAnimationEndCallback = function(animationEndCallback) {
	this.animationEndCallback = animationEndCallback;
};

GuiSprite.prototype.playAnimation = function(animationName, duration, isLooped,
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

GuiSprite.prototype.isPlayingAnimation = function(animationName) {
	return this.currentAnimation == animationName;
};

GuiSprite.prototype.animate = function(moveVector, duration) {
	var that = this;
	this.jObject['animate']({
		left : moveVector.x * Screen.widthRatio() + 'px',
		top : moveVector.y * Screen.heightRatio() + 'px'
	}, {
		duration : duration,
		easing : "linear",
		complete : function() {
			that.stopAnimation();
			// that.x = $("#" + that.id)['css']("left");
		}
	// ,
	// step : function(now, fx) {
	// console.log($("#" + that.id)['css']("left"));
	// }
	});
};

GuiSprite.prototype.flip = function(needToBeFlipped) {
	this.flipped = needToBeFlipped;
	this.transform();
};

GuiSprite.prototype.transform = function(transfromations) {
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
	cssTransform(this.jObject, this.matrix, this.angle, scaleX, scaleY,
			this.translate);
};

GuiSprite.prototype.rotate = function(angle) {
	this.angle = angle;
	this.transform();
};

GuiSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = transformOrigin;
	// console.log("Set transform origin to %s", transformOrigin);
	var obj = this.jObject;
	obj['css']("-webkit-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("-moz-transform-origin", transformOrigin);
	obj['css']("-o-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("msTransform-origin", transformOrigin);
};

GuiSprite.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	 if (this.viewport) {
		this.clampByViewport();
	} else {
		this.setRealPosition(x, y);
	}
};

GuiSprite.prototype.setRealPosition = function(x, y) {
	this.transform({
		translate : {
			x : Math.round(x * Screen.widthRatio()),
			y : Math.round(y * Screen.heightRatio())
		}
	});
};

GuiSprite.prototype.setTransform = function(matrix, angle) {
	this.angle = angle;
	this.matrix = matrix;
	this.transform();
};

GuiSprite.prototype.resize = function() {
	GuiSprite.parent.resize.call(this);
	this.setRealBackgroundPosition(this.offsetX1, this.offsetY1);
};

GuiSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	if (offsetY) {
		this.offsetY1 = offsetY;
	}
	if (offsetX) {
		this.offsetX1 = offsetX;
	}
	var frame = selectValue(this.frame, 0);
	var row = selectValue(this.row, 0);
	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
			* (-frame * this.width + offsetX))
			+ "px "
			+ Math.round(Screen.heightRatio() * (row * this.height + offsetY))
			+ "px ");
};

GuiSprite.prototype.resizeBackground = function() {
	var size = Screen.calcRealSize(this.totalWidth, this.totalHeight);
	this.jObject['css']("background-size", size.x + "px " + size.y + "px");
};
