var GUISPRITE_HACK_ON = false;

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

	// .hack temporary disable viewport for sprites at all
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
    this.flipped = params['flipped'] != null ? params['flipped'] : false;

	this.setBackground(this.totalSrc);

	this.currentAnimation = null;
	this.spatialAnimation = null;
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

	this.resize();

	if (params['startAnimation']) {
		this.playAnimation(params['startAnimation']['name'],
				params['startAnimation']['duration'],
				params['startAnimation']['loop']);
		this.setStaticUpdate(true);
	}
	
	this.frames = {};
	if(params['frames']){
		this.frames = params['frames']; 
	}

};

GuiSprite.prototype.setStaticUpdate = function(isStatic){
	if(isStatic === false){
		delete Account.instance.staticSprites[this.id];
	}else{
		Account.instance.staticSprites[this.id] = this;
	}
};

GuiSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration'],
		spatial : description['spatial']
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

GuiSprite.prototype.changeBackgroundPosition = function(x, y) {
	this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
			* x + Screen.heightRatio() * this.offsetX1)
			+ "px "	+ Math.round(-Screen.heightRatio() * y
					+ Screen.heightRatio() * this.offsetY1) + "px ");
};

GuiSprite.prototype.changeBackgroundPositionReal = function(x, y) {
	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
			* (x * this.width + this.offsetX1))
			+ "px "
			+ Math.round(Screen.heightRatio() * (y * this.height + this.offsetY1))
			+ "px ");
};

GuiSprite.prototype.selectFrame = function(frame, row) {
	this.changeBackgroundPosition(frame * this.width, row * this.height);
};

GuiSprite.prototype.updateSpatialAnimation = function(dt, dontResize) {
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
	if (!dontResize)
		this.resize();
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

	var rowFramesLength = Math.round(this.totalWidth / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	
	if(this.frames[frame]){
		var frm = this.frames[frame]; 
		this.changeBackgroundPosition(frm.x, frm.y);
//		this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
//				* frm.x + Screen.heightRatio() * this.offsetX1)
//				+ "px "	+ Math.round(-Screen.heightRatio() * frm.y
//						+ Screen.heightRatio() * this.offsetY1) + "px ");
//		if(frm.w && frm.h){
//			this.jObject['css']("background-position", frm.w + "px " + frm.w + "px ");
//		}
	}else{
		var remainder = frame % rowFramesLength;
		var q = (frame - remainder) / rowFramesLength;
		var row = this.animations[this.currentAnimation].row + q;
		frame = remainder;

		this.selectFrame(frame, row);
		
//		this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
//				* frame * this.width + Screen.heightRatio() * this.offsetX1)
//				+ "px "
//				+ Math.round(-Screen.heightRatio() * row * this.height
//						+ Screen.heightRatio() * this.offsetY1) + "px ");
		this.frame = frame;
		this.row = row;
	}
	
//	this.setRealBackgroundPosition();// test
	if (this.frameCallback != null) {
		if (this.frameCallback[this.currentAnimation]) {
			this.frameCallback[this.currentAnimation](this.currentFrame);
		}
	}
	this.currentFrame++;
};

GuiSprite.prototype.stopAnimation = function(dontCallCallback, dontCallJQuery) {
	if (!dontCallJQuery)
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

GuiSprite.prototype.getAnimation = function(animationName) {
	return this.animations[animationName];
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

// GuiSprite.prototype.animate = function(moveVector, duration) {
// var that = this;
// this.jObject['animate']({
// left : moveVector.x * Screen.widthRatio() + 'px',
// top : moveVector.y * Screen.heightRatio() + 'px'
// }, {
// duration : duration,
// easing : "linear",
// complete : function() {
// that.stopAnimation();
// // that.x = $("#" + that.id)['css']("left");
// }
// // ,
// // step : function(now, fx) {
// // console.log($("#" + that.id)['css']("left"));
// // }
// });
// };

GuiSprite.prototype.animate = function(animation, callback) {
	var that = this;
	var dx = 0;
	var dy = 0;
	if (animation.x) {
		dx = animation.x - this.x;
	}
	if (animation.y) {
		dy = animation.y - this.y;
	}
	this.spatialAnimation = {
		dx : dx,
		dy : dy,
		duration : animation.duration,
		timeLeft : animation.duration
	};
	if (animation.fade) {
		this.fadeTo(0, animation.duration - 100, function() {
			that.spatialAnimation = null;
			if (callback) {
				callback();
			}
		});
	} else {
		this.spatialAnimation['callback'] = callback;
	}
};

GuiSprite.prototype.flip = function(needToBeFlipped, dontCallTransform) {
	this.flipped = needToBeFlipped;
	if (!dontCallTransform)
		this.transform();
};

GuiSprite.prototype.transform = function(transfromations, dontCallCssTransform) {
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
	
	if (!dontCallCssTransform)
		cssTransform(this.jObject, this.matrix, this.angle, scaleX, scaleY,
				this.translate);
};

GuiSprite.prototype.rotate = function(angle, dontCallTransform) {
	this.angle = angle;
	if (!dontCallTransform)
		this.transform();
};

GuiSprite.prototype.setTransformOrigin = function(transformOrigin) {
	if (typeof transformOrigin == 'string') {
		this.transformOrigin = transformOrigin;
	} if (transformOrigin && transformOrigin.x && transformOrigin.y) {
		this.transformOrigin = parseInt(transformOrigin.x*100) + "% " + parseInt(transformOrigin.y*100) + "%";
	} else {
		this.transformOrigin = "50% 50%";
	}
	// console.log("Set transform origin to %s", transformOrigin);
	var obj = this.jObject;
	obj['css']("-webkit-transform-origin", this.transformOrigin);
	obj['css']("transform-origin", this.transformOrigin);
	obj['css']("-moz-transform-origin", this.transformOrigin);
	obj['css']("-o-transform-origin", this.transformOrigin);
	obj['css']("transform-origin", this.transformOrigin);
	obj['css']("msTransform-origin", this.transformOrigin);
};

GuiSprite.prototype.setPosition = function(x, y) {
//	if (this.x !== x || this.y !== y) {
		this.x = x;
		this.y = y;

		if (this.viewport) {
			this.clampByViewport();
		} else {
			this.setRealPosition(x, y);
		}
//	}
};

GuiSprite.prototype.setRealPosition = function(x, y) {
	var transObj = {
			translate : {
				x : Math.round(x * Screen.widthRatio()),
				y : Math.round(y * Screen.heightRatio())
			}
	};
	this.transform(transObj);
};

GuiSprite.prototype.setTransform = function(matrix, angle) {
	this.angle = angle;
	this.matrix = matrix;
	this.transform();
};

GuiSprite.prototype.resize = function() {
	GuiSprite.parent.resize.call(this);
//	this.setRealBackgroundPosition(this.offsetX1, this.offsetY1);
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
	this.changeBackgroundPositionReal(-frame, row);
//	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
//			* (-frame * this.width + offsetX))
//			+ "px "
//			+ Math.round(Screen.heightRatio() * (row * this.height + offsetY))
//			+ "px ");
};

GuiSprite.prototype.resizeBackground = function() {
	var size = Screen.calcRealSize(this.totalWidth, this.totalHeight);
	this.jObject['css']("background-size", size.x + "px " + size.y + "px");
};

/**
 * usage:
 * var changingColorPairs = [];
 * var pair1 = new ColorRgbChangingPair(new ColorRgb(1, 1, 1), new ColorRgb(2, 2, 2));
 * var pair2 = new ColorRgbChangingPair(new ColorRgb(3, 3, 3), new ColorRgb(4, 4, 4));
 * changingColorPairs.push(pair);
 * changingColorPairs.push(pair2);
 * guiSprite.recolor(changingColorPairs);
 *
 * @param [{ColorRgbChangingPair}] changingColorPairs
 * @return {string} imageUrl
 */
GuiSprite.prototype.recolor = function (changingColorPairs) {
    var image = Resources.getAsset(this.params.totalImage);
    var url = recolorImage(image, changingColorPairs);
    this.setBackgroundFromParams({image: url}, null);
    return url;
};

/**
 *
 * @param {ColorRgbChangingPair} changingColorPair
 * @return {string} imageUrl
 */
GuiSprite.prototype.recolorFullImage = function (changingColorPair) {
    var image = Resources.getAsset(this.params.totalImage);
    var url = recolorFullImage(image, changingColorPair);
    this.setBackgroundFromParams({image: url}, null);
    return url;
};
