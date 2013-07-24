/**
 * SimpleCountdown - VisualEntity with only countdown label.
 */
SimpleCountdown.prototype = new VisualEntity();
SimpleCountdown.prototype.constructor = SimpleCountdown;

/**
 * @constructor
 */
function SimpleCountdown() {
	SimpleCountdown.parent.constructor.call(this);
};

SimpleCountdown.inheritsFrom(VisualEntity);
SimpleCountdown.prototype.className = "SimpleCountdown";

SimpleCountdown.prototype.createInstance = function(params) {
	var entity = new SimpleCountdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(SimpleCountdown);

SimpleCountdown.prototype.init = function(params) {
	this.paused = true;
	SimpleCountdown.parent.init.call(this, params);
	this.label = params['label'];
	//refactor!!!!!
	var go = null;
	var alarmColor = null;
	if(this.description){
		go = this.description['go'];
		alarmColor = this.description['alarmColor'];
	}
	this.goText = selectValue(params['go'], go); 
	
	if(!params['initStart']){
		this.setEnable(false);
	}else{
		this.paused = false;
	}
	this.count = this.params['count'] * 1000;
	this.alarmCount = this.params['alarmCount'] * 1000;
	
	this.alarmColor = selectValue(this.params['alarmColor'], alarmColor);
};

/**
 * Will be called after a cycle will be finished
 * 
 * @param animationCycleEndCallback
 */
SimpleCountdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

SimpleCountdown.prototype.createVisual = function() {
	SimpleCountdown.parent.createVisual.call(this);
	this.description['style'] = (this.description['style'] == null) ? "dialogButtonLabel lcdmono-ultra"
			: this.description['style'];
	
	this.label = this.label ? this.label : guiFactory.createObject("GuiLabel", {
		"parent" : this.guiParent,
		"x" : this.params['x'],
		"y" : this.params['y'],
		"style" : this.description['style'],// "dialogButtonLabel
											// lcdmono-ultra",
		"width" : this.description['width'],
		"height" : this.description['height'],
		"align" : "center",
		"verticalAlign" : "middle",
		"text" : this.params['count'],
		"fontSize" : this.description['fontSize'],
		"color" : this.description['color']
	});
	// this.visual.addGui(this.label);

	var visualInfo = {};
	visualInfo.visual = this.label;
	this.addVisual(null, visualInfo);

	this.paused = false;
};

SimpleCountdown.prototype.pause = function() {
	this.paused = true;
};

SimpleCountdown.prototype.resume = function() {
	this.paused = false;
	this.time = Date.now();
};

SimpleCountdown.prototype.setTime = function(sec) {
	this.count = sec * 1000;
};

SimpleCountdown.prototype.addTime = function(sec) {
	this.count += sec * 1000;
};

SimpleCountdown.prototype.getTimeRemains = function() {
	return this.count;
};

SimpleCountdown.prototype.start = function(){
	this.setEnable(true);
	this.paused = false;
	this.time = Date.now();
};

SimpleCountdown.prototype.updateLabel = function(){
	var secCount = Math.floor(this.count / 1000);
	if(secCount >= 60){
		var minCount = Math.floor(secCount / 60);
		secCount = secCount - (minCount * 60);
		this.label.change(""+minCount+" : "+secCount);
	}else{
		this.label.change(secCount);
	}
};

SimpleCountdown.prototype.update = function(updateTime) {
	if (!this.paused) {
//		this.count -= updateTime;
		this.count -= Date.now() - this.time;
		this.time = Date.now();
		if (this.count > 0) {
			if (this.alarmCount && (this.count < this.alarmCount + 1000)) {
				this.label.setColor(this.alarmColor);
				this.alarmCount = null;
			} else {
//				this.label.change(Math.floor(this.count / 1000));
				this.updateLabel();
			}
		} else {
			this.label.change(this.goText);
			if (this.cycleEndCallback) {
				this.cycleEndCallback();
				this.cycleEndCallback = null;
			}
		}
	}
};
