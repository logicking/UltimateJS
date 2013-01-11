/*
 * Standard HTML5 sound 
 */

var htmlSound = function() {
	this.soundOffset = 0;
	this.mp3offset = -0.05;
	

	this.startTime = 0;
	this.endTime = 0;
};

htmlSound.prototype.play = function(sndInst, callback) {
	var that = this;

	if (this.audioSpriteInstance == null) {
		return;
	}
	
	this.stopCallback = callback;
	var audio = this.audioSpriteInstance; 
	audio.pause();
	
	that.startTime = sndInst.offset + this.soundOffset;
	that.endTime = that.startTime + sndInst.duration;
	audio.currentTime = that.startTime;
	
	audio.play();

	

//	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
//			sndInst.duration * 1000);
//
//	audioSpriteEndCallback = function() {
//		that.stop();
//		if (callback) {
//			callback();
//		}
//	};

};

htmlSound.prototype.stop = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}

//	if (this.audioSpriteTimeoutHandler) {
//		clearTimeout(this.audioSpriteTimeoutHandler);
//		audioSpriteTimeoutHandler = null;
//	}
	this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}

	this.audioSpriteInstance.muted = true;
};

htmlSound.prototype.unmute = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}
	this.audioSpriteInstance.muted = false;
};

htmlSound.prototype.loadSound = function(audioSpriteName, callback) {
	var canPlayMp3, canPlayOgg = null;
	var myAudio = document.createElement('audio');
	if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/mpeg');
		canPlayOgg = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
	}
	var ext;
	if (canPlayOgg) {
		ext = ".ogg";
	} else {
		ext = ".mp3";
		this.soundOffset = this.mp3offset;
	}

	var audio = new Audio(audioSpriteName + ext);

	var that = this;
	if (callback) {
		audio.addEventListener('canplaythrough', function() {
			that.audioSpriteInstance = audio;
			callback(that.audioSpriteInstance);
		}, false);
		
		audio.addEventListener('timeupdate', function() {
			console.log(that.audioSpriteInstance.currentTime, that.endTime);
			
			if(that.audioSpriteInstance.currentTime < that.startTime) {
				alert(that.audioSpriteInstance.currentTime + " - " + that.startTime);
				that.audioSpriteInstance.currentTime = that.startTime;
			}
			if(that.audioSpriteInstance.currentTime >= that.endTime) {
				that.stop();
				if (that.stopCallback) {
					that.stopCallback();
				}
			}
		}, false);
	} else {
		that.audioSpriteInstance = audio;
	}
};