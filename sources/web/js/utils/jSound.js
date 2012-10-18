var jSound = function() {
};

jSound.prototype.play = function(sndInst, callback) {
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
		that.stop();
		if(callback){
			callback();
		}
		// if (sndInstance.channel) {
		// channels[sndInstance.channel] = null;
		// //console.log("end audio", sndInstance.id);
		// }
	};

	this.audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
			sndInst.duration * 1000);

};

jSound.prototype.stop = function() {
	if (this.audioSpriteTimeoutHandler) {
		clearTimeout(this.audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;
	}
	this.jPlayerInstance['jPlayer']("pause");
};

jSound.prototype.mute = function(){
	this.jPlayerInstance['jPlayer']("mute");
};

jSound.prototype.unmute = function(){
	this.jPlayerInstance['jPlayer']("unmute");
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
											oga : audioSpriteName + ".ogg",
											m4a : audioSpriteName + ".mp4",
											mp3 : audioSpriteName + ".mp3"
										});
										// alert("READY11");
									},
									supplied : "oga, mp3, m4a",
									solution : "html, flash",
//									 solution : "html",//, flash",
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