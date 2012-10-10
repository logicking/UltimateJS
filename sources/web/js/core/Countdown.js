/**
 * Countdown - VisualEntity with countdown label inside it.
 */
Countdown.prototype = new VisualEntity();
Countdown.prototype.constructor = Countdown;

/**
 * @constructor
 */
function Countdown() {
	Countdown.parent.constructor.call(this);
};

Countdown.inheritsFrom(VisualEntity);
Countdown.prototype.className = "Countdown";

Countdown.prototype.createInstance = function(params) {
	var entity = new Countdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Countdown);

Countdown.prototype.init = function(params) {
	Countdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle of animation finished
 * 
 * @param animationCycleEndCallback
 */
Countdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

/**
 * Will be called after the countdown completely finished
 * 
 * @param animationEndCallback
 */
Countdown.prototype.setEndCallback = function(EndCallback) {
	this.EndCallback = EndCallback;
};

Countdown.prototype.createVisual = function() {
	Countdown.parent.createVisual.call(this);
	if (this.description['sprite']) {
		this.sprite = guiFactory
				.createObject(
						"GuiSprite",
						{
							'parent' : this.guiParent,
							'style' : "dialogButton",
							'x' : this.params['x'],
							'y' : this.params['y'],
							'width' : this.description['sprite']['width'],
							'height' : this.description['sprite']['height'],
							'totalImage' : Resources
									.getImage(this.description['sprite']['totalImage']),
							'totalImageWidth' : this.description['sprite']['totalImageWidth'],
							'totalImageHeight' : this.description['sprite']['totalImageHeight'],
							'totalTile' : this.description['sprite']['totalTile'],
							'spriteAnimations' : this.description['sprite']['spriteAnimations']

						});
		var visualInfo = {};
		visualInfo.visual = this.sprite;
		this.addVisual("sprite", visualInfo);
	}
	this.tickSound = this.description['tickSound'] ? this.description['tickSound']
			: "beepShort";
	this.lastSound = this.description['lastSound'] ? this.description['lastSound']
			: "beepShort";
	this.tickDuration = this.description['tickDuration'] ? this.description['tickDuration']
			: 1000;
	this.count = this.params['count'];
	this.duration = this.count * this.tickDuration;
	this.alarmColor = this.description['alarmColor'];
	this.alarmCount = this.params['alarmCount'];
	this.paused = this.description['paused'] ? this.description['paused']
			: false;
	// this.go = this.description['go'];
	if (this.description['label']) {
		this.label = guiFactory
				.createObject(
						"GuiLabel",
						{
							"parent" : this.guiParent,
							"style" : this.description['label']['params']['style'] ? this.description['label']['params']['style']
									: "dialogButtonLabel lcdmono-ultra",
							"width" : this.description['label']['params']['width'],
							"height" : this.description['label']['params']['height'],
							"x" : this.description['label']['params']['x'] ? this.description['label']['params']['x']
									: this.params['x'],
							"y" : this.description['label']['params']['y'] ? this.description['label']['params']['y']
									: this.params['y'],
							"align" : "center",
							"verticalAlign" : "middle",
							"text" : this.count,
							"fontSize" : this.description['label']['params']['fontSize'],
							"color" : this.description['label']['params']['color']
						});
		var labelVisualInfo = {};
		labelVisualInfo.visual = this.label;
		this.addVisual("label", labelVisualInfo);
	}

	var that = this;
	var animationEnd = function() {
		if (!that.paused) {
			if (that.count > 1) {
				that.count--;
//				if (that.cycleEndCallback) {
//					that.cycleEndCallback();
//				}
				if (that.label)
					that.label.change(that.count);
				if (that.sprite)
					that.sprite.playAnimation("countdown", that.tickDuration,
							false);
				that.sprite.setAnimationEndCallback(animationEnd);
			} else {
				if (that.sprite)
					that.sprite.playAnimation("empty", that.tickDuration, true);
				if (that.label)
					that.label.change(that.description["go"]);
				if (that.EndCallback) {
					that.EndCallback();
				}
				return;
			}
		}
	};
	// Sound.play("beepShort");
	if (this.sprite) {
		this.sprite.playAnimation("countdown", 1000, false);
		this.sprite.setAnimationEndCallback(animationEnd);
	}
};

Countdown.prototype.update = function(updateTime) {
	var text = Math.floor(this.duration / 1000) + 1;
	if (!this.paused) {
		if (this.sprite) {
			this.sprite.update(updateTime);
		}
		if (this.label) {
			this.duration -= updateTime;
			if (this.duration > 0) {
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = this.label.text;
				}
				if (this.alarmCount
						&& ((this.duration / 1000) < this.alarmCount)) {
					this.label.setColor(this.description['alarmColor']);
					this.alarmCount = null;
				} else {
					if (!this.sprite) {
						this.label.change(Math.floor(this.duration / 1000) + 1);
					}
				}
			} else {
				if (!this.sprite) {
					this.label.change(this.description['go']);
					if (this.EndCallback) {
						this.EndCallback();
						delete this.update;
					}
				}
			}
		}
		if (!this.label && !this.sprite) {
			if (this.duration > 0) {
				this.duration -= updateTime;
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = Math.floor(this.duration / 1000) + 1;
				}
			} else {
				if (this.EndCallback) {
					this.EndCallback();
					delete this.update;
				}
			}
		}
	}
};
Countdown.prototype.pause = function() {
	this.paused = true;
};

Countdown.prototype.resume = function() {
	this.paused = false;
};
Countdown.prototype.getTimeRemains = function() {
	return this.count;
};
