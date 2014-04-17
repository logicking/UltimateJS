/*
 * Standard HTML5 sound 
 */

var htmlSound = function() {
	this.soundOffset = 0;
	this.mp3offset = 0.001;// ;-0.05;
	this.audioSpriteInstance = {};
	this.fade = false;

	this.startTime = 0;
	this.endTime = 0;
};

htmlSound.prototype.play = function(sndInst, callback) {
	var spriteInst = this.audioSpriteInstance[sndInst.spriteName];

	if (!spriteInst || spriteInst.play) {
		return;
	}

	spriteInst.stopCallback = callback;
	spriteInst.audio.volume = sndInst.volume;
	spriteInst.audio.pause();
	if (sndInst.loop) {
		spriteInst.audio.addEventListener('ended', function() {
			this.currentTime = 0;
			this.play();
		}, false);
	}

	spriteInst.startTime = sndInst.offset + this.soundOffset;
	spriteInst.endTime = spriteInst.startTime + sndInst.duration;
	spriteInst.audio.currentTime = spriteInst.startTime;
	spriteInst.play = true;
	spriteInst.audio.play();
};

htmlSound.prototype.stop = function(sndInst) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (sndInst) {
		if (!this.audioSpriteInstance[sndInst.spriteName]) {
			return;
		}
		this.audioSpriteInstance[sndInst.spriteName].audio.pause();
		this.audioSpriteInstance[sndInst.spriteName].play = false;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.pause();
			value.play = false;
		});
	}
	// this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (channel) {
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = true;
		this.audioSpriteInstance[channel.playing.spriteName].muted = true;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.muted = true;
			value.muted = true;
		});
	}
	// this.stop();
};

htmlSound.prototype.unmute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if (channel) {
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = false;
		this.audioSpriteInstance[channel.playing.spriteName].muted = false;
	} else {
		$['each'](this.audioSpriteInstance, function(index, value) {
			value.audio.muted = false;
			value.muted = false;
		});
	}
};

htmlSound.prototype.fadeTo = function(fadeInst) {
	var fadeStep = 10;
	if (this.fade == fadeInst.sndInst.id) {
		return;
	}

	var audio = this.audioSpriteInstance[fadeInst.sndInst.spriteName].audio;
	if (this.audioSpriteInstance[fadeInst.sndInst.spriteName].muted) {
		return;
	}
	this.fade = fadeInst.sndInst.id;
	var that = this;
	fadeInst.dVol = fadeInst.volume - audio.volume;
	if (fadeInst.dVol == 0) {
		return;
	}
	fadeInst.dVol /= fadeInst.time / fadeStep;
	if (fadeInst.sndInst) {
		this.fading = true;
		var int = setInterval(function() {
			if (Math.abs(audio.volume - fadeInst.volume) >= Math.abs(fadeInst.dVol)) {
				audio.volume += fadeInst.dVol;
			} else {
				audio.volume = fadeInst.volume;
				that.fade = false;
				if (fadeInst.callback) {
					fadeInst.callback();
				}
				clearInterval(int);
			}
		}, fadeStep);
	}
};

htmlSound.prototype.loadSound = function(audioSpriteName, callback) {
	var canPlayMp3, canPlayOgg = null;
	var myAudio = document.createElement('audio');
	// myAudio.preload = "auto";
	if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/mpeg');
		canPlayOgg = !!myAudio.canPlayType && "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
	}
	var ext;
	if (canPlayOgg) {
		ext = ".ogg";
	} else {
		ext = ".mp3";
		this.soundOffset = this.mp3offset;
	}

	var audio = new Audio(audioSpriteName + ext);
	audio.preload = "auto";
	var that = this;
	if (callback) {

		audio.addEventListener('abort', function() {
			alert(audioSpriteName + " aborted");
		}, true);

		audio.addEventListener('error', function() {
			alert(audioSpriteName + " error");
		}, true);

		audio.addEventListener('suspend', function() {
			alert(audioSpriteName + " suspend");
		}, true);

		var canplay = function() {
			that.audioSpriteInstance[audioSpriteName] = {
				audio : audio,
				startTime : 0,
				endTime : 0
			};
			callback(that.audioSpriteInstance[audioSpriteName]);
			audio.removeEventListener("canplaythrough", canplay, false);
		};
		audio.addEventListener('canplaythrough', canplay, false);
		audio.addEventListener('timeupdate', function() {
			var spriteInst = that.audioSpriteInstance[audioSpriteName];
			if (spriteInst.audio.currentTime < spriteInst.startTime) {
				spriteInst.audio.currentTime = spriteInst.startTime;
			}
			if (spriteInst.audio.currentTime >= spriteInst.endTime) {
				spriteInst.audio.pause();
				spriteInst.play = false;
				if (spriteInst.stopCallback) {
					spriteInst.stopCallback();
					spriteInst.stopCallback = null;
				}
			}
		}, false);
	} else {
		console.log("NO CALLBACK ON SOUND INIT");
		that.audioSpriteInstance[audioSpriteName] = audio;
	}
};