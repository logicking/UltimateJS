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
	
	var spriteInst = this.audioSpriteInstance[sndInst.spriteName];
	spriteInst.stopCallback = callback;
	spriteInst.audio.volume = sndInst.volume;
	spriteInst.audio.pause();
	
	spriteInst.startTime = sndInst.offset + this.soundOffset;
	spriteInst.endTime = spriteInst.startTime + sndInst.duration;
	spriteInst.audio.currentTime = spriteInst.startTime;
	spriteInst.audio.play();

};

htmlSound.prototype.stop = function(sndInst) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if(sndInst){
		if(!this.audioSpriteInstance[sndInst.spriteName]){
			return;
		}
		this.audioSpriteInstance[sndInst.spriteName].audio.pause();
	}else{
		console.log("STOP ALL CHANNELS");
		$['each'](this.audioSpriteInstance, function(index, value){
			value.audio.pause();
		});
	}
//	this.audioSpriteInstance.pause();
};

htmlSound.prototype.mute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if(channel){
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = true;
	}else{
		$['each'](this.audioSpriteInstance, function(index, value){
			value.audio.muted = true;
		});
	}
	this.stop();
};

htmlSound.prototype.unmute = function(channel) {
	if (this.audioSpriteInstance == null) {
		return;
	}
	if(channel){
		this.audioSpriteInstance[channel.playing.spriteName].audio.muted = false;
	}else{
		$['each'](this.audioSpriteInstance, function(index, value){
			value.audio.muted = false;
		});
	}
};

htmlSound.prototype.fadeTo = function(sndInst, time, volume) {
	var fadeStep = 10;
	if(this.fade == sndInst.id){
		return;
	}
	
	var audio = this.audioSpriteInstance[sndInst.spriteName].audio; 
	
	this.fade = sndInst.id;
	var that = this;
	var dVol = volume - audio.volume;
	if(dVol == 0){
		return;
	}
	dVol /= time/fadeStep;
	if (sndInst) {
		this.fading = true;
		var int = setInterval(function(){
			if(Math.abs(audio.volume - volume) >= Math.abs(dVol)){
				audio.volume += dVol;
			}else{
				audio.volume = volume;
				that.fade = false;
				clearInterval(int);
			}
		},fadeStep);
	}
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
	console.log("CAN PLAY", canPlayMp3);
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
			console.log("CAN PLAY TROUGH "+audioSpriteName);
			that.audioSpriteInstance[audioSpriteName] = {
				audio : audio,
				startTime : 0,
				endTime : 0
			};
//			console.log("AUDIO SPRITE INST", that.audioSpriteInstance);
			callback(that.audioSpriteInstance[audioSpriteName]);
		}, false);
		audio.addEventListener('timeupdate', function() {
			var spriteInst = that.audioSpriteInstance[audioSpriteName];
//			console.log(spriteInst.audio.currentTime,"  ", spriteInst.endTime, audioSpriteName);
			if(spriteInst.audio.currentTime < spriteInst.startTime) {
				spriteInst.audio.currentTime = spriteInst.startTime;
			}
			if(spriteInst.audio.currentTime >= spriteInst.endTime) {
				spriteInst.audio.pause();
				console.log("STOP!>>>>",audioSpriteName);
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