var DOM_MODE = false;


/**
 * GuiCSprite is a sprite for GuiCanvas (UltimateJS) based on GuiSprite.js but
 * not inherit from
 * 
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
 * 
 * @param params
 *            may contain: - parent - width - height - image - offsetX - offsetY -
 *            x - y - z - hide - opacity - totalImage, - totalImageWidth, -
 *            totalImageHeight, - totalTile
 */
GuiCSprite.prototype.initialize = function(params) {
	var that = this;
	
	this.params = params;

	this.x = this.calcPercentageWidth(params.x||0);
	this.y = this.calcPercentageHeight(params.y||0);

	this.z = params.z||0;

	this.opacity = params.opacity?params.opacity:1;
	this.width = params.width;
	this.height = params.height;
	
	this.parent = params.parent.canvas?params.parent.canvas:params.parent;
	this.id = this.parent.generateId.call(this);
	
	this.total = {
		image :	params.totalImage,
		width : params.totalImageWidth,
		height : params.totalImageHeight,
		tile : params.totalTile
	};

	this.setOffset(params.offsetX, params.offsetY);

	this.setTransformOrigin(params.transformOrigin);

	this.img = Resources.getImageAsset(this.total.image, function(image) {
		init.call(that, image);
	});


	function init(image) {	
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
		
		that.show();
		that.setEnabled(true);
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

	if (this.parent.canvas) {
		this.parent.canvas.addGui(this);
	} else {
		this.parent.addGui(this);
	}
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

// GuiCSprite.prototype.update = function(dt) {
// if (this.currentAnimation == null && this.spatialAnimation == null) {
// return;
// }
//
// var curTime = (new Date()).getTime();
// if (!dt) {
// dt = curTime - this.lastUpdateTime;
// }
// this.lastUpdateTime = curTime;
// this.currentFrameTime += dt;
//
// if (this.spatialAnimation !== null) {
// this.updateSpatialAnimation(dt);
// }
// while (this.currentFrameTime >= this.currentFrameLength) {
// var stopped = this.updateAnimation();
// if (stopped == true) {
// return;
// }
// this.currentFrameTime -= this.currentFrameLength;
// }
// };


GuiCSprite.prototype.isEnabled = function() {
	return this.enabled;
};

GuiCSprite.prototype.setEnabled = function(on) {
	if (on) {
		this.enabled = true;
	} else {
		this.enabled = false;
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

		this.changeBackgroundPosition(frame, row);
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
	this.parent.setAwake(true);
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
	this.parent.setAwake(true);
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
	this.parent.setAwake(true);
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
	this.parent.setAwake(true);
};

GuiCSprite.prototype.rotate = function(angle) {
	this.angle = angle;
	this.parent.setAwake(true);
};

GuiCSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = {
            x : transformOrigin?(Math.round(transformOrigin.x * 100) / 100):0.5,
            y : transformOrigin?(Math.round(transformOrigin.y * 100) / 100):0.5
        };
	this.parent.setAwake(true);
};

GuiCSprite.prototype.setPosition = function(x, y) {
	this.x = this.calcPercentageWidth(x);
	this.y = this.calcPercentageHeight(y);
	this.parent.setAwake(true);
};

GuiCSprite.prototype.setOffset = function(x, y) {
	this.offsetX = this.calcPercentageWidth(x||0);
	this.offsetY = this.calcPercentageHeight(y||0);
	this.parent.setAwake(true);
};

GuiCSprite.prototype.setRealPosition = function(x, y) {
};

GuiCSprite.prototype.setTransform = function(matrix) {
// this.angle = angle;
	this.matrix = matrix;
};

GuiCSprite.prototype.resize = function() {
	
// this.parent.render();
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
	this.changeBackgroundPosition(-frame, row);
	this.parent.setAwake(true);
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
	this.parent.setAwake(true);
};

GuiCSprite.prototype.show = function() {
	this.visible = true;
	this.parent.setAwake(true);
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

	var x = Math.round((this.x + this.parent.guiOffsetX + this.offsetX)*scrnRatio.x);
    var y =  Math.round((this.y + this.parent.guiOffsetY + this.offsetY)*scrnRatio.y);
    var w = Math.ceil(this.width*scrnRatio.x);// this.imageWidth;//
    var h =  Math.ceil(this.height*scrnRatio.y);// this.imageHeight;//
	var bx = Math.ceil(this.backgroundPosition.x * this.imageWidth);
	var by = Math.ceil(this.backgroundPosition.y * this.imageHeight);

    var ratio = {
        x : this.transformOrigin.x,
        y : this.transformOrigin.y
    };
	
	ctx.translate(Math.round((x+w*ratio.x)), Math.round((y+h*ratio.y)));
	ctx.rotate(MathUtils.toRad(Math.round(this.angle))); 
	ctx.globalAlpha = this.opacity;
	
// ctx.scale(this.scale.x, this.scale.y);

// try {
	    ctx.drawImage(this.img,
			    bx, by,
			    Math.ceil(this.imageWidth), Math.ceil(this.imageHeight),
	            -Math.ceil(w*ratio.x), -Math.ceil(h*ratio.y),
	            w, h);
// } catch (e) {
// }
};
