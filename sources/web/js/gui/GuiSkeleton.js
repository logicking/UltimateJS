/**
 * GuiSkeleton - container for animated objects, consists of:
 * - array of bones or bodyparts
 * - keyframes
 * - animations
 */

/**
 * @constructor
 */
function GuiSkeleton() {
	GuiSkeleton.parent.constructor.call(this);
}

GuiSkeleton.inheritsFrom(GuiElement);
GuiSkeleton.prototype.className = "GuiSkeleton";

GuiSkeleton.prototype.createInstance = function(params) {
	var entity = new GuiSkeleton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSkeleton);

GuiSkeleton.prototype.initialize = function(params) {
	this.bones = {};

	this.viewRect = {};
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	GuiSkeleton.parent.initialize.call(this, params);

	var keyframesData = params['keyframes'];
	var bones = params['bones'];
	var avatarData = params['bones'];
	this.framesNum = selectValue(params['framesNum'], 120);
};

GuiSkeleton.prototype.addBone = function(params) {
	// name - unique id, specifies bone in keyfraymes
	// parent - parent bone, currently not implemented
	// image - bone's image filename
	// priority - drawing priority
	// transformOrigin
	// initialPartTransform
	// initialBoneTransform

	var name = params.name;
	var bone = {};
	this.bones[name] = bone;
	bone.keyframes = params.keyframes;

	// TODO frames for the bone should be shared between all GuiSkeletons
	// frames for the bone
	bone.frames = new Array();
	// not scaled frames
	bone.originalFrames = new Array();

	var transformOriginArray = params.transformOrigin;
	var initialBoneTransformArray = params.initialBoneTransform;
	var initialPartTransformArray = params.initialPartTransform;

	var transformBone = new Transform();
	var transformBoneNegative = new Transform();

	transformBone.translate(initialBoneTransformArray[0],
			initialBoneTransformArray[1]);
	transformBoneNegative.translate(-initialBoneTransformArray[0],
			-initialBoneTransformArray[1]);

	var transformRotate = new Transform();
	var boneRotate = params.initialBoneTransform.rotate;
	if (boneRotate) {
		transformRotate.rotateDegrees(boneRotate);
	}

	var transformOriginNegative = new Transform();
	transformOriginNegative.translate(-transformOriginArray[0],
			-transformOriginArray[1]);

	var transformPart = new Transform();
	var transformPartNegative = new Transform();

	transformPart.translate(initialPartTransformArray[0],
			initialPartTransformArray[1]);
	transformPartNegative.translate(-initialPartTransformArray[0],
			-initialPartTransformArray[1]);

	var transformOriginPositive = new Transform();
	transformOriginPositive.translate(transformOriginArray[0],
			transformOriginArray[1]);

	var resultMatrix = new Transform();
	resultMatrix.multiply(transformBone);
	resultMatrix.multiply(transformPart);
	resultMatrix.multiply(transformOriginPositive);
	resultMatrix.multiply(transformRotate);
	resultMatrix.multiply(transformOriginNegative);

	var image = params.image;

	var sprite = guiFactory.createObject("GuiSprite", {
		parent : this,
		style : "sprite",
		width : params.width,
		height : params.height,
		x : 0,
		y : 0,
		totalImage : image,
		totalImageWidth : params.width,
		totalImageHeight : params.height,
		totalImageTile : false
	});

	this.addGui(sprite);
	sprite.show();
	bone.sprite = sprite;

	if ($['browser']['mozilla']) {
		resultMatrix.m[4] += "px";
		resultMatrix.m[5] += "px";
	}
	sprite.setTransform(resultMatrix.m.join(","), null);

	// add animation
	var step = 0;
	if (bone.keyframes['frames']) {
		while (step < this.framesNum) {
			if (bone.keyframes['frames'][step]) {

				var framesTransformArray = bone.keyframes['frames'][step]['matrix']
						.split(",");
				var transformFrameBone = new Transform();
				transformFrameBone.translate(framesTransformArray[4],
						framesTransformArray[5]);

				var transformOffset = new Transform();
				transformOffset.translate(0, 0);

				var transformFrameRotate = new Transform();
				var framesRotate = bone.keyframes['frames'][step]['rotate'];
				if (framesRotate) {
					// console.log("bone rotation is %s", framesRotate);
					// ctx.rotate(boneRotate * Math.PI / 180);
					transformFrameRotate.rotateDegrees(framesRotate);
				}

				var resultFrameMatrix = new Transform();
				resultFrameMatrix.multiply(transformFrameBone);
				resultFrameMatrix.multiply(transformPart);
				resultFrameMatrix.multiply(transformOriginPositive);
				resultFrameMatrix.multiply(transformFrameRotate);
				resultFrameMatrix.multiply(transformOriginNegative);

				if ($['browser']['mozilla']) {
					resultFrameMatrix.m[4] += "px";
					resultFrameMatrix.m[5] += "px";
				}
				bone.frames[step] = bone.originalFrames[step] = resultFrameMatrix.m
						.join(",");
			}
			step++;
		}
	}
};

GuiSkeleton.prototype.prepareAnimations = function(params) {
	var that = this;
	if (this.bones == null)
		return;
	// console.log("GuiSkeleton no resize");
	$['each'](this.bones, function(name, bone) {
		// console.log("GuiSkeleton bone " + name);
		//bone.sprite.resize();
		if (bone.originalFrames) {
			for ( var frame = 0; frame < that.framesNum; frame++) {
				var animationFrame = bone.originalFrames[frame];
				if (animationFrame) {
					var animationFrameArray = animationFrame.split(",");
					animationFrameArray[4] = animationFrameArray[4].replace(
							"px", "")
							* Screen.widthRatio();
					animationFrameArray[5] = animationFrameArray[5].replace(
							"px", "")
							* Screen.heightRatio();
					if ($['browser']['mozilla']) {
						animationFrameArray[4] += "px";
						animationFrameArray[5] += "px";
					}
					animationFrame = animationFrameArray.join(",");
					bone.frames[frame] = animationFrame;
				}
			}
			var animationFrame = bone.frames[0];
			bone.sprite.setTransform(animationFrame, null);
		}
	});
};


GuiSkeleton.prototype.resize = function() {

	GuiSkeleton.parent.resize.call(this);

	// to prevent from redundant resizing
	if (this.resizeWidthRatio == Screen.widthRatio()
			|| this.resizeHeightRatio == Screen.heightRatio()) {
		return;
	}
	this.resizeWidthRatio = Screen.widthRatio();
	this.resizeHeightRatio = Screen.heightRatio();


	// if (this.viewport) {
	// console.log("CLAMPING",);
	// this.clampByViewport();
	// }
	this.prepareAnimations();

};

GuiSkeleton.prototype.setAnimations = function(animations) {
	this.animations = animations;
};

GuiSkeleton.prototype.setCurrentAnimation = function(animationName) {
	this.currentAnimation = animationName;
	if (this.animations[animationName]) {
		this.frame = this.animations[animationName]['begin'];
		var steps = this.animations[animationName]['end']
				- this.animations[animationName]['begin'];
		return steps;
	}
	return 0;
};

GuiSkeleton.prototype.advanceFrame = function() {
	var that = this;
	$['each'](this.bones, function(name, bone) {
		if (bone.frames) {
			var animationFrame = bone.frames[that.frame];
			if (animationFrame) {
				bone.sprite.setTransform(animationFrame, null);
			}
		}
	});
	this.frame++;
	if (this.frame >= this.animations[this.currentAnimation]['end']) {
		this.frame = this.animations[this.currentAnimation]['begin'];
	}
};

GuiSkeleton.prototype.stopAnimation = function() {

};

GuiSkeleton.prototype.playAnimation = function(animationName, animationTime,
		animationCycles) {
	// console.log("update frames");

	console.log("Play animation %s with time %f and cycles %d", animationName,
			animationTime, animationCycles);

	this.currentAnimation = animationName;
	this.currentAnimationCycles = animationCycles;

	if (this.animations[animationName]) {

		var steps = this.animations[animationName]['end']
				- this.animations[animationName]['begin'];
		var animationStepTime = animationTime / steps;

		this.frame = this.animations[animationName]['begin'];
		var that = this;
		var updateFrame = function() {
			if (that.frame >= that.animations[animationName]['end']) {
				that.frame = 0;
				that.currentAnimationCycles--;
				if (that.currentAnimationCycles > 0) {
					setTimeout(updateFrame, animationStepTime);
				}
			} else {
				setTimeout(updateFrame, animationStepTime);
			}
		};
		setTimeout(updateFrame, animationStepTime);
	} else {
		console.log("There is no animation with name %s in the %s",
				animationName, this.animations);
	}
};

GuiSkeleton.prototype.animate = function(moveVector, duration) {
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

GuiSkeleton.prototype.flip = function(needToBeFlipped) {
	console.log(this.animations);
	this.flipped = needToBeFlipped;
	this.scale = this.flipped ? -1 : 1;
	cssTransform(this.jObject, null, null, this.scale, null, null);
};

GuiSkeleton.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiSkeleton.prototype.setViewport = function(rect, isParent) {
	this.viewport = rect;
	this.isParentsViewport = isParent;
	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};
GuiSkeleton.prototype.setPosition = function(x, y) {
	GuiSkeleton.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};