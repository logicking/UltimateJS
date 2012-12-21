var jSound = function() {
	this.sprites = null;
};

jSound.prototype.playSprite = function(sndInst, callback) {
	var that = this;
	// if (!audioSprite) {
	// return null;
	// }

	// if (audioSpriteEndCallback) {
	// audioSpriteEndCallback();
	// audioSpriteEndCallback = null;
	// }

	// if (volume) {
	// jPlayerInstance['jPlayer']("volume", volume);
	// }

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
		// if (sndInstance.channel) {
		// channels[sndInstance.channel] = null;
		// //console.log("end audio", sndInstance.id);
		// }
	};

	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
			sndInst.duration * 1000);

};
jSound.prototype.play = function(sndInst, callback) {
	var that = this;
	if (!this.sprites) {
		this.playSprite(sndInst, callback);
		return null;
	}
	// if (!audioSprite) {
	// return null;
	// }
	// if (audioSpriteEndCallback) {
	// audioSpriteEndCallback();
	// audioSpriteEndCallback = null;
	// }
	// if (volume) {
	// jPlayerInstance['jPlayer']("volume", volume);
	// }

	this.sprites[sndInst.spriteName]['jPlayer']("pause", sndInst.offset);
	console.log("PLAAAAAAAAAAAAAAAAAYYY", sndInst.offset);
	this.sprites[sndInst.spriteName]['jPlayer']("play", sndInst.offset);

	audioSpriteEndCallback = function() {
		if (sndInst.loop) {
			console.log("LOOOOOOOOOOOOOOOOOOOO12345OP");
			that.play(sndInst, callback);
		} else {
			console.log("PRESTOP SPRITE NAME", sndInst.spriteName)
			that.stop(sndInst.spriteName);
			if (callback) {
				callback();
			}
		}
		// if (sndInstance.channel) {
		// channels[sndInstance.channel] = null;
		// //console.log("end audio", sndInstance.id);
		// }
	};

	this.sprites[sndInst.spriteName].audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
			sndInst.duration * 1000);

};

jSound.prototype.stop = function(spriteName) {
	if (this.audioSpriteTimeoutHandler) {
		clearTimeout(this.audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;
	}
	
	if(this.sprites[spriteName].audioSpriteTimeoutHandler){
		clearTimeout(this.sprites[spriteName].audioSpriteTimeoutHandler);
	}
	// this.jPlayerInstance['jPlayer']("pause");
	if (this.sprites) {
		if (spriteName) {
			console.log("STOP SPRITE NAME", spriteName);
			this.sprites[spriteName]['jPlayer']("pause");
		} else {

			$['each'](this.sprites, function(index, value) {
				value['jPlayer']("pause");
			});
		}
	}else{
		this.jPlayerInstance['jPlayer']("pause");
	}

};

jSound.prototype.mute = function() {
	// this.jPlayerInstance['jPlayer']("mute");
	if (this.sprites) {
		$['each'](this.sprites, function(index, value) {
			value['jPlayer']("mute");
		});
	}else{
		this.jPlayerInstance['jPlayer']("mute");
	}
};

jSound.prototype.unmute = function() {
	// this.jPlayerInstance['jPlayer']("unmute");
	if (this.sprites) {
		$['each'](this.sprites, function(index, value) {
			value['jPlayer']("unmute");
		});
	}else{
		this.jPlayerInstance['jPlayer']("mute");
	}
};

jSound.prototype.loadSound = function(audioSpriteName) {
	var that = this;
	var PATH_TO_JPLAYER_SWF = "js/";
	if (Device.isAppleMobile()) {
		playOffset = APPLE_OFFSET;
	}
	// add jPlayer
	jQuery['getScript']
			(
					PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
					function() {
						$("body")['append']
								("<div id='jPlayerInstanceId' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>");
						that.jPlayerInstance = $("#jPlayerInstanceId");
						that.jPlayerInstance['jPlayer']
								({
									ready : function() {
										$(this)['jPlayer']("setMedia", {
											oga : "sounds/" + audioSpriteName
													+ ".ogg",
											m4a : "sounds/" + audioSpriteName
													+ ".mp4",
											mp3 : "sounds/" + audioSpriteName
													+ ".mp3"
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
					});
};

jSound.prototype.loadSprite = function(audioSpriteName) {
	var that = this;
	var PATH_TO_JPLAYER_SWF = "js/";
	if (this.sprites == null) {
		this.sprites = {};
	}
	// add jPlayer
	jQuery['getScript']
			(
					PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
					function() {
						$("body")['append']
								("<div id='jPlayerInstanceId"
										+ audioSpriteName
										+ "' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>");
						that.sprites[audioSpriteName] = $("#jPlayerInstanceId"
								+ audioSpriteName);
						that.sprites[audioSpriteName]['jPlayer']
								({
									ready : function() {
										$(this)['jPlayer']("setMedia", {
											oga : "sounds/" + audioSpriteName
													+ ".ogg",
											m4a : "sounds/" + audioSpriteName
													+ ".mp4",
											mp3 : "sounds/" + audioSpriteName
													+ ".mp3"
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
					});

};