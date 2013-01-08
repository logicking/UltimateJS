var htmlSound = function() {
};

htmlSound.prototype.play = function(sndInst, callback) {
	var that = this;

	this.audioSpriteInstance.pause();
	this.audioSpriteInstance.currentTime = sndInst.offset;
	this.audioSpriteInstance.currentTime.play(); 

	audioSpriteEndCallback = function() {
		that.stop();
		if(callback){
			callback();
		}
	};

	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
			sndInst.duration * 1000);

};

htmlSound.prototype.stop = function() {
	if (this.audioSpriteTimeoutHandler) {
		clearTimeout(this.audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;
	}
	this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function(){
	this.audioSpriteInstance.muted = true;
};

htmlSound.prototype.unmute = function(){
	this.audioSpriteInstance.muted = false;
};

htmlSound.prototype.loadSound = function(audioSpriteName) {
	this.audioSpriteInstance = new Audio(audioSpriteName + ".mp3");
};