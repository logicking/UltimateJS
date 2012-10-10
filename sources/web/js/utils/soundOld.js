// There two approaches to audio support:
// 1. Audio sprites for iOS and Android devices
// 2. Audio objects for general browsers

var Sound = (function() {
	var MP3_OFFSET = 0.07;
	var APPLE_OFFSET = -0.2 * 0;
	var PATH_TO_JPLAYER_SWF = "scripts/";

	// private interface

	var useAudioSprite;
	var soundOn;
	var canPlayOgg, canPlayMp3, canPlayMp4;
	var playOffset = 0;

	// array of sounds samples
	var sounds = new Object();
	// array of currently playing sounds
	var channels = new Object();

	var addFunc = function() {
	};
	var playFunc = function() {
	};
	var stopFunc = function() {
	};

	// HTML5 Audio Interface
	// supported audio '.ogg' or '.mp3'
	var audioExtention = null;

	function addAudio(id, filename) {
		var url = filename + audioExtention;
		var audio = new Audio(url);
		audio.preload = "auto";
		audio.load();

		sounds[id] = {
			url : url,
			audio : audio
		};
	}

	function playAudio(id, loop, volume, priority) {
		var snd = sounds[id];
		var sndInstance = {
			id : id,
			priority : priority
		};
		if (!snd || !snd.audio)
			return null;

		if (volume)
			snd.audio.volume = volume;

		snd.audio.play();
		try {
			// .hack fail on mozilla
			snd.audio.currentTime = 0;
		} catch (e) {
		}

		if (loop) {
			snd.audio.addEventListener('ended', function() {
				try {
					this.currentTime = 0;
				} catch (e) {
				}
				this.play();
			}, false);
		} else {
			snd.audio.addEventListener('ended', function() {
				if (sndInstance.channel) {
					channels[sndInstance.channel] = null;
				}
			}, false);
		}

		// sound instance
		return sndInstance;
	}

	function stopAudio(id, repeat) {
		var snd = sounds[id];
		if (!snd)
			return;
		snd.audio.pause();
	}

	// Audio Sprite Interface
	var audioSpriteTimeoutHandler = null;
	var audioSpriteEndCallback = null;

	// var jPlayerInstance;
	function initAudioSprite(audioSpriteName) {
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
							jPlayerInstance = $("#jPlayerInstanceId");
							jPlayerInstance['jPlayer']
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
										solution : "flash, html",
										//solution : "html, flash",
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
											//console.log("Jplayer playing " + timeNow);
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
	}

	function addAudioSprite(id, filename, timeStart, timeLength) {
		sounds[id] = {
			start : timeStart,
			length : timeLength
		};
	}

	function playAudioSprite(id, repeat, volume, priority) {
		var audioSprite = sounds[id];
		var sndInstance = {
			id : id,
			priority : priority
		};
		
		if (!audioSprite) {
			return null;
		}
			
		if (audioSpriteEndCallback) {
			audioSpriteEndCallback();
			audioSpriteEndCallback = null;
		}
				
		if (volume) {
			jPlayerInstance['jPlayer']("volume", volume);
		}

		jPlayerInstance['jPlayer']("pause", audioSprite.start + playOffset);
		jPlayerInstance['jPlayer']("play", audioSprite.start + playOffset);

		audioSpriteEndCallback = function() {
			stopAudioSprite();
			if (sndInstance.channel) {
				channels[sndInstance.channel] = null;
				//console.log("end audio", sndInstance.id);
			}
		};

		audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
				audioSprite.length * 1000);

		return sndInstance;
	}

	function stopAudioSprite(dontStopJplayer) {
		clearTimeout(audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;

		if (dontStopJplayer != true)
			jPlayerInstance['jPlayer']("pause");
	}

	return {
		// public interface
		TURNED_OFF_BY_DEFAULT : false,
		LOW_PRIORITY : -100,
		NORMAL_PRIORITY : 0,
		HIGH_PRIORITY : 100,
		// init sounds
		init : function(audioSpriteName, forceAudioSprite, pathToScripts) {

			useAudioSprite = forceAudioSprite
					|| (typeof (audioSpriteName) == "string")
					&& Device.isMobile();
			
			soundOn = Device.getStorageItem("soundOn", null);
			// init sound for the first time
			if(soundOn == null) {
				soundOn = Sound.TURNED_OFF_BY_DEFAULT ? false : true;
				Device.setStorageItem("soundOn", soundOn);
			} else {
				soundOn = (soundOn == "true");
			}
			
			if (useAudioSprite) {
				PATH_TO_JPLAYER_SWF = pathToScripts ? pathToScripts
						: PATH_TO_JPLAYER_SWF;
				initAudioSprite(audioSpriteName);
				addFunc = addAudioSprite;
				playFunc = playAudioSprite;
				stopFunc = stopAudioSprite;
			} else {
				var myAudio, audioObjSupport, basicAudioSupport;

				try {
					myAudio = new Audio("");

					audioObjSupport = !!(myAudio.canPlayType);
					basicAudioSupport = !!(!audioObjSupport ? myAudio.play
							: false);
				} catch (e) {
					audioObjSupport = false;
					basicAudioSupport = false;
				}

				if (myAudio && myAudio.canPlayType) {
					// Currently canPlayType(type) returns: "no", "maybe" or
					// "probably"
					canPlayOgg = ("no" != myAudio.canPlayType("audio/ogg"))
							&& ("" != myAudio.canPlayType("audio/ogg"));
					canPlayMp4 = ("no" != myAudio.canPlayType("audio/mp4"))
							&& ("" != myAudio.canPlayType("audio/mp4"));
					canPlayMp3 = ("no" != myAudio.canPlayType("audio/mpeg"))
							&& ("" != myAudio.canPlayType("audio/mpeg"));

					if (canPlayOgg) {
						audioExtention = '.ogg';
						playOffset = 0;
					} else if (canPlayMp4) {
						audioExtention = '.mp4';
						playOffset = 0;
					} else if (canPlayMp3) {
						audioExtention = '.mp3';
						playOffset = MP3_OFFSET;
					}

					if (audioExtention) {
						addFunc = addAudio;
						playFunc = playAudio;
						stopFunc = stopAudio;
					}
				}
			}
		},
		update : function(delta) {
		},

		turnOn : function(isOn) {

			soundOn = isOn;
			Device.setStorageItem("soundOn", soundOn);

			if (useAudioSprite) {
				if (soundOn)
					jPlayerInstance['jPlayer']("unmute");
				else
					jPlayerInstance['jPlayer']("mute");
			} else {
				Sound.stop();
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},

		supportedExtention : function() {
			return audioExtention;
		},

		// 
		add : function(id, filename, startTimeInSprite, lengthInSprite,
				ignoreForAudioSprite) {
			if (useAudioSprite && ignoreForAudioSprite)
				return;
			addFunc.call(this, id, filename, startTimeInSprite, lengthInSprite);
		},

		play : function() {
			if (!soundOn)
				return;

			var channel, id, loop, volume = null, priority = null;
			// args: soundId or params
			if (arguments.length == 1) {
				if (typeof (arguments[0]) == "object") {
					var params = arguments[0];
					channel = params.channel;
					id = params.id;
					loop = params.loop;
					volume = params.volume;
					priority = params.priority;
				} else {
					channel = null;
					id = arguments[0];
					loop = null;
				}
				// args: soundId, loop
			} else if (arguments.length == 2) {
				if (typeof (arguments[1]) == "boolean") {
					channel = null;
					id = arguments[0];
					loop = arguments[1];
					// args: channel, soundId
				} else {
					channel = arguments[0];
					id = arguments[1];
					loop = null;
				}
				// args: channel, soundId, loop, priority
			} else {
				channel = arguments[0];
				id = arguments[1];
				loop = arguments[2];
				priority = arguments[3];
			}

			// stop the current sound for the specified channel
			// if channel = null - no channels used
			if (channel != null) {
				var curSnd = channels[channel];

				if (curSnd) {
					var curSndPriority = curSnd.priority
							|| Sound.NORMAL_PRIORITY;
					if (priority >= curSndPriority) {
						//console.log("stop audio", curSnd.id);
						stopFunc.call(this, curSnd);
						channels[channel] = null;
					} else {
						//console.log("can't play audio", id, curSnd.id);
						return null;
					}
				}
			}

			//console.log("play audio", id);
			var newSnd = playFunc.call(this, id, loop, volume, priority);
			if (newSnd && channel != null) {
				channels[channel] = newSnd;
				newSnd.channel = channel;
			}
			return newSnd;
		},
		stop : function(channel) {

			if (channel != null) {
				var curSnd = channels[channel];
				if (curSnd) {
					stopFunc.call(this, curSnd);
				}
			} else {
				// stop all sounds
				for ( var i in channels) {
					var curSnd = channels[i];
					if (curSnd) {
						stopFunc.call(this, curSnd);
					}
				}
			}
		}
	};
})();