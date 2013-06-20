var jSound = function() {
	this.chCount = 10;
	this.sprites = null;
	this.i = 0;
};

jSound.prototype.playSprite = function(sndInst, callback) {
	var that = this;

	this.jPlayerInstance['jPlayer']("pause", sndInst.offset);
	this.jPlayerInstance['jPlayer']("play", sndInst.offset);

	audioSpriteEndCallback = function() {

		if (sndInst.loop) {
			that.play(sndInst, callback);
		} else {
			that.stop();
			if (callback) {
				callback();
			}
		}

	};

	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback, sndInst.duration * 1000);

};
jSound.prototype.play = function(sndInst, callback) {
	var that = this;
	var sriteInst = this.sprites[sndInst.spriteName];
	if (!sriteInst) {
		return;
	}
	sriteInst.volume = sndInst.volume;
	sriteInst.play(sndInst, callback);
};

jSound.prototype.fadeTo = function(fadeInst) {
	var fadeStep = 10;
	if (this.fade == fadeInst.sndInst.spriteName) {
		return;
	}

	var spriteInst = this.sprites[fadeInst.sndInst.spriteName];
	if (spriteInst.muted) {
		return;
	}
	this.fade = fadeInst.sndInst.spriteName;
	var that = this;
	fadeInst.dVol = fadeInst.volume - spriteInst.volume;
	if (fadeInst.dVol == 0) {
		return;
	}
	fadeInst.dVol /= fadeInst.time / fadeStep;
	if (fadeInst.sndInst) {
		this.fading = true;
		spriteInst.int = setInterval(function() {
			if (Math.abs(spriteInst.volume - fadeInst.volume) >= Math.abs(fadeInst.dVol)) {
				spriteInst.volume += fadeInst.dVol;
				spriteInst.setVolume(fadeInst.sndInst.id, spriteInst.volume);
			} else {
				spriteInst.volume = fadeInst.volume;
				spriteInst.setVolume(fadeInst.sndInst.id, fadeInst.volume);
				that.fade = false;
				if (fadeInst.callback) {
					fadeInst.callback();
				}
				clearInterval(spriteInst.int);
			}
		}, fadeStep);
	}
};

jSound.prototype.stop = function(sndInst) {
	if (this.sprites == null) {
		return;
	}
	if (sndInst) {
		if (!this.sprites[sndInst.spriteName]) {
			return;
		}
		this.sprites[sndInst.spriteName].stop();
		if(this.sprites[sndInst.spriteName].int){
			clearInterval(this.sprites[sndInst.spriteName].int);				
		}
	} else {
		$['each'](this.sprites, function(index, value) {
			value.audio.stop();
			if(value.int){
				clearInterval(value.int);				
			}
		});
	}
};

jSound.prototype.mute = function(channel) {
	if (this.sprites == null) {
		return;
	}
	if (channel) {
		this.sprites[channel.playing.spriteName].mute();
	} else {
		$['each'](this.sprites, function(index, value) {
			value.mute();
		});
	}
	// this.stop();
};

jSound.prototype.unmute = function(channel) {
	if (this.sprites == null) {
		return;
	}
	if (channel) {
		this.sprites[channel.playing.spriteName].unmute(channel.volume);
	} else {
		$['each'](this.sprites, function(index, value) {
			value.unmute();
		});
	}
};

jSound.prototype.loadSound = function(audioSpriteName, callback, createChannels) {
	if (this.sprites == null) {
		this.sprites = {};
	}
	var that = this;
	if (Device.isAppleMobile()) {
		playOffset = APPLE_OFFSET;
	}
	var name = audioSpriteName;
	var slashInd = audioSpriteName.indexOf("/");// jPlayer's div id must not to
	// include "/"
	if (slashInd >= 0) {
		var ss = audioSpriteName.split('/');
		name = ss[ss.length - 1];
	}

	var jArr = [];
	var n = 1;
	if (createChannels) {
		n = this.chCount;
	}
	for ( var i = 0; i < n; i++) {
		var jPlayer = this.generateJplayer(name + i, audioSpriteName);
		jArr.push(jPlayer);
	}

	this.sprites[audioSpriteName] = this.generateSpriteChannels(jArr);
	if (callback) {
		setTimeout(callback, 1000);
	}
};

jSound.prototype.loadSprite = function(audioSpriteName) {
	var that = this;
	var PATH_TO_JPLAYER_SWF = "js/";
	if (this.sprites == null) {
		this.sprites = {};
	}
	// add jPlayer
	// jQuery['getScript'](PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
	// function() {
	$("body")['append']("<div id='jPlayerInstanceId" + audioSpriteName
			+ "' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>");
	that.sprites[audioSpriteName] = $("#jPlayerInstanceId" + audioSpriteName);
	that.sprites[audioSpriteName]['jPlayer']({
		ready : function() {
			$(this)['jPlayer']("setMedia", {
				oga : "sounds/" + audioSpriteName + ".ogg",
				m4a : "sounds/" + audioSpriteName + ".mp4",
				mp3 : "sounds/" + audioSpriteName + ".mp3"
			});
		},
		supplied : "oga, mp3, m4a",
		solution : "html, flash",
		// solution : "html",//, flash",
		swfPath : PATH_TO_JPLAYER_SWF,

		ended : function() { // The
			// $.jPlayer.event.ended
			// event
			// console.log("Jplayer ended");
		},
		playing : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer playing " +
			// timeNow);
		},
		timeupdate : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer timeupdate "
			// + timeNow);
		}
	});
	// });

};

jSound.prototype.generateJplayer = function(id, audioSpriteName) {
	var PATH_TO_JPLAYER_SWF = "js/";
	var playerDiv = "<div id='" + id + "' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>";
	$("body")['append'](playerDiv);
	var jPlayerInstance = $("#" + id);
	// that.sprites[audioSpriteName] = jPlayerInstance;
	// console.log("JPJPJPJPJPJPJJ", jPlayerInstance);
	jPlayerInstance['jPlayer']({
		ready : function() {
			$(this)['jPlayer']("setMedia", {
				oga : audioSpriteName + ".ogg",
				// m4a : audioSpriteName + ".mp4",
				mp3 : audioSpriteName + ".mp3"
			});
		},
		supplied : "oga, mp3, m4a",
		solution : "html, flash",
		preload : "auto", 
		// solution : "html",//, flash",
		swfPath : PATH_TO_JPLAYER_SWF,

		ended : function() { // The
			// $.jPlayer.event.ended
			// event
			// console.log("Jplayer ended");
		},
		playing : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer playing " + timeNow);
		},
		timeupdate : function(event) { // The
			// $.jPlayer.event.ended
			// event
			var timeNow = event['jPlayer'].status.currentTime;
			// console.log("Jplayer timeupdate " + timeNow);
		}
	});
	return jPlayerInstance;
};

jSound.prototype.generateSpriteChannels = function(jArr) {
	var that = this;
	var spriteInst = {
		volume : 1,
		channels : [],
		play : function(sndInst, callback) {
			var ch = this.getFree();
			if (ch) {
				ch.audio['jPlayer']("volume", this.volume);
				ch.audio['jPlayer']("play", sndInst.offset);
				ch.playing = sndInst;
				audioSpriteEndCallback = function() {
					ch.audio['jPlayer']("pause");
					ch.playing = null;
					if (sndInst.loop) {
						that.play(sndInst, callback);
					} else {
						if (callback) {
							callback();
						}
					}
				};

				ch.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback, sndInst.duration * 1000);
			}
		},
		stop : function() {
			$['each'](this.channels, function(index, value) {
				if (value.playing) {
					 value.audio['jPlayer']("pause");
					 value.playing = null;
				}
			});
		},
		getFree : function() {
			for ( var i = 0; i < this.channels.length; i++) {
				if (!this.channels[i].playing) {
					return this.channels[i];
				}
			}
			console.log("NO FREE CHANNEL");
			return null;
		},
		mute : function() {
			this.muted = true;
			$['each'](this.channels,function(index, value){
//				value.audio['jPlayer']("mute");
				value.audio['jPlayer']("volume", 0);
			});
		},
		unmute : function(vol) {
			this.muted = false;
			$['each'](this.channels,function(index, value){
//				value.audio['jPlayer']("unmute");
				value.audio['jPlayer']("volume", vol);
			});
		},
		setVolume : function(id, vol) {
			$['each'](this.channels, function(index, value) {
				if (value.playing && value.playing.id == id) {
					value.audio['jPlayer']("volume", vol);
				}
			});
		}
	};
	$['each'](jArr, function(index, value) {
		var chInst = {
			audio : value,
			playing : null
		};
		spriteInst.channels.push(chInst);
	});
	return spriteInst;
};