// There few approaches to audio support:
// Audio sprites and separate audio files
// Audio can be played via Flash by JPlayer, HTML5 Audio, Web Audio API

var Sound = (function() {
	var snd = {
		channels : {
			"default" : {
				playing : null,
				volume : 1
			},
			"background" : {
				playing : null,
				volume : 0.2
			}
		},
		channelCount : 2,
		spriteName : null,
		sprite : {},
		sprites : {},
		forceSprite : false,
		soundBuffers : {},
		getChannel : function(channel) {
			if (!channel || channel == "default") {
				return this.channels["default"];
			} else {
				return this.channels[channel];
			}
		},
		addChannel : function(channel, name) {
			for ( var i = 0; i < this.channels.length; i++) {
				if (this.channels[i] == channel) {
					return;
				}
			}
			if (!channel) {
				return;
			}

			this.channels[name] = channel;
		},
		stop : function(channel) {
			var that = this;
			if (channel) {
				var ch = this.getChannel(channel);
				if (ch) {
					this.instance.stop(ch['playing']);
				}
			} else {
				$['each'](this.channels, function(index, value) {
					if (index != "background" && value.playing != null) {
						that.instance.stop(value['playing']);
					}
				});
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},
		mute : function(channel) {
			var that = this;
			var ch = this.getChannel(channel);
			ch.initVol = ch.volume;
			// ch.volume = 0;
			if (ch) {
				if (ch.playing) {
					this.instance.mute(ch);
					ch.muted = true;
				} else {
					// ch.volume = 0;
					ch.muted = true;
				}
			} else {
				$['each'](this.channels, function(index, value) {
					if (index != "background") {
						if (value.playing) {
							that.instance.mute(value);
							value.muted = true;
						} else {
							// value.volume = 0;
							value.muted = true;
						}
					}
				});
			}
		},
		unmute : function(channel) {
			var that = this;
			var ch = this.getChannel(channel);
			ch.initVol = ch.volume;
			// ch.volume = 0;
			if (ch) {
				if (ch.playing) {
					this.instance.unmute(ch);
					ch.muted = false;
				} else {
					// ch.volume = 1;
					ch.muted = false;
				}
			} else {
				$['each'](this.channels, function(index, value) {
					if (index != "background") {
						if (value.playing) {
							that.instance.unmute(value);
							value.muted = false;
						} else {
							// value.volume = 1;
							value.muted = false;
						}
					}
				});
			}
		},
		turnOn : function(isOn) {
			var soundOn = isOn;
			Device.setStorageItem("soundOn", soundOn);
			if (soundOn) {
				this.unmute();
			} else {
				this.mute();
				// this.stop();
			}
		},
		add : function(id, offset, duration, spriteName, priority) {
			// if (this.forceSprite) {
			this.soundBuffers[id] = {
				priority : priority ? priority : 0,
				offset : offset,
				spriteName : spriteName ? spriteName : id,
				duration : duration
			};
			// }
		},
		play : function(id, loop, priority, channel) {
			var that = this;
			if (!this.soundBuffers[id] || (!this.isOn() && channel != "background")) {
				return;
			}
			var callback = null;

			var ch = this.getChannel(channel);
			var sound = this.soundBuffers[id];
			if (typeof loop === 'function') {
				callback = loop;
				loop = false;
			}
			var sndInstance = {
				id : id,
				priority : priority ? priority : sound.priority,
				loop : loop ? true : false,
				offset : sound.offset,
				volume : ch.muted ? 0 : ch.volume,
				duration : sound.duration,
				spriteName : sound.spriteName,
				buffer : this.sprites[sound.spriteName] ? this.sprites[sound.spriteName] : this.sprite
			};
			if (ch.playing != null) {
				var num = this.channelCount++;
				var chName = "channel" + num;
				this.channels[chName] = {
					playing : null,
					volume : 1
				};
				ch = this.channels[chName];
				ch.playing = sndInstance;
				this.instance.play(sndInstance, function() {
					if (callback) {
						callback();
					}
					ch.playing = null;
					that.channels[chName] = null;
					delete that.channels[chName];
				});

				// if (ch.playing.priority > sndInstance.priority) {
				// return;
				// } else {
				// this.instance.stop(ch.playing);
				// ch.playing = sndInstance;
				// this.instance.play(sndInstance, function() {
				// if(callback){
				// callback();
				// }
				// ch.playing = null;
				// });
				// }
			} else {
				ch.playing = sndInstance;
				this.instance.play(sndInstance, function() {
					if (callback) {
						callback();
					}
					ch.playing = null;
				});
			}
		},
		init : function(name, forceSprite, callback, createChannels) {
			// createChannels is using only in jSound
			var that = this;
			this.forceSprite = forceSprite ? true : false;
			if (this.forceSprite) {

				// console.log("INIT "+name);
				this.instance.loadSound(name, function(buf) {
					that.sprites[name] = buf;
					// set initial mute state
					// Sound.turnOn(Sound.isOn());
					if (callback) {
						callback();
					}
				}, createChannels);
			}
		},
		fadeTo : function(channel, time, volume, callback) {
			var that = this;
			var ch = this.getChannel(channel);
			var playing = ch.playing;
			if (!playing || ch.muted) {
//				console.log(playing, ch);
				return;
			}
			var fadeInst = {
				channel : channel,
				time : time,
				sndInst : playing,
				volume : volume,
				callback : callback
			};
			this.instance.fadeTo(fadeInst);
		},
		addSprite : function(name) {
			var that = this;
			// this.forceSprite = forceSprite ? true : false;
			// if (this.forceSprite) {
			this.instance.loadSprite(name, function(buf) {
				that.sprites[name] = buf;
			});
			// }
		}
	};
	var context = null;

	try {
		context = new webkitAudioContext();
//		 context = null;
	} catch (e) {
		context = null;
		console.log("WEB Audio not supported");
	}
	if (context != null) {
		snd.type = "webAudio";
		snd.instance = new WebSound(context);
	} else {
		snd.type = "jSound";
		snd.instance = new jSound();
//		snd.instance = new htmlSound();
	}

	return snd;
})();