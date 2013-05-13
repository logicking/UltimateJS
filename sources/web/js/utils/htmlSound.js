/*
 * Standard HTML5 sound 
 */

var htmlSound = function() {
	this.soundOffset = 0;
	this.mp3offset = -0.05;
	this.audioSpriteInstance = {};
	this.fade = false;

	this.startTime = 0;
	this.endTime = 0;
};

htmlSound.prototype.play = function(sndInst, callback) {
	var that = this;
	console.log("SND INST",sndInst, "SPRITE",  this.audioSpriteInstance);
	if (this.audioSpriteInstance[sndInst.spriteName] == null) {
		return;
	}
	
	this.stopCallback = callback;
	var audio = this.audioSpriteInstance[sndInst.spriteName]; 
	audio.pause();
	
	that.startTime = sndInst.offset + this.soundOffset;
	that.endTime = that.startTime + sndInst.duration;
	audio.currentTime = that.startTime;
	console.log("PPPPPPPPLLLLLLLLLAAAAAAAAYYYYYYY!")
	audio.play();

};

htmlSound.prototype.stop = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}
	$['each'](this.audioSpriteInstance, function(index, value){
		if(index == "muted") return;
		value.pause();
	});

//	this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}
	this.audioSpriteInstance.muted = true;
	this.stop();
};

htmlSound.prototype.unmute = function() {
	if (this.audioSpriteInstance == null) {
		return;
	}
	this.audioSpriteInstance.muted = false;
};

htmlSound.prototype.fadeIn = function() {
	if(this.fade){
		return;
	}
	this.fade = true;

};

htmlSound.prototype.fadeOut = function() {
	if(this.fade){
		return;
	}
	this.fade = true;
	
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
			that.audioSpriteInstance[audioSpriteName] = audio;
			console.log("AUDIO SPRITE INST", that.audioSpriteInstance);
			callback(that.audioSpriteInstance[audioSpriteName]);
		}, false);
		audio.addEventListener('timeupdate', function() {
			console.log(that.audioSpriteInstance[audioSpriteName].currentTime, that.endTime);
			if(that.audioSpriteInstance[audioSpriteName].currentTime < that.startTime) {
				that.audioSpriteInstance[audioSpriteName].currentTime = that.startTime;
			}
			if(that.audioSpriteInstance[audioSpriteName].currentTime >= that.endTime) {
				that.stop();
				if (that.stopCallback) {
					that.stopCallback();
				}
			}
		}, false);
	} else {
		that.audioSpriteInstance[audioSpriteName] = audio;
	}
};