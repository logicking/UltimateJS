// There few approaches to audio support:
// Audio sprites and separate audio files
// Audio can be played via Flash by JPlayer, HTML5 Audio, Web Audio API

var Sound = (function() {
	var snd = {
		channels : {
			"default" : {
				playing : null
			},
			"back" : {
				playing : null
			}
		},
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
		stop : function(channel) {
			var that = this;
			if (channel) {
				this.instance.stop(this.getChannel(channel)['playing']);
			} else {
				$['each'](this.channels, function(index, value) {
					that.instance.stop(value['playing']);
				});
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},
		turnOn : function(isOn) {
			var soundOn = isOn;
			Device.setStorageItem("soundOn", soundOn);
			if (soundOn) {
				this.instance.unmute();
			} else {
				this.instance.mute();
				this.stop();
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
			if (!this.soundBuffers[id])
				return;

			var ch = this.getChannel(channel);
			var sound = this.soundBuffers[id];
			var sndInstance = {
				id : id,
				priority : priority ? priority : sound.priority,
				loop : loop ? true : false,
				offset : sound.offset,
				duration : sound.duration,
				spriteName : sound.spriteName,
				buffer : this.sprites[sound.spriteName] ? this.sprites[sound.spriteName]
						: this.sprite
			};
			if (ch.playing != null) {
				if (ch.playing.priority > sndInstance.priority) {
					return;
				} else {
					this.instance.stop(ch.playing);
					ch.playing = sndInstance;
					this.instance.play(sndInstance, function() {
						ch.playing = null;
					});
				}
			} else {
				ch.playing = sndInstance;
				this.instance.play(sndInstance, function() {
					ch.playing = null;
				});
			}
		},
		init : function(name, forceSprite) {// use when only one spriteis needed
			var that = this;
			this.forceSprite = forceSprite ? true : false;
			if (this.forceSprite) {
				console.log("INIT");
				this.instance.loadSound(name, function(buf) {
					that.sprite = buf;
					//set initial mute state
					Sound.turnOn(Sound.isOn());
				});
			}
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
//		context = null;
	} catch (e) {
		console.log("WEB Audio not supported");
	}
	if (context) {
		snd.instance = new WebSound(context);
	} else {
		//snd.instance = new jSound();
		snd.instance = new htmlSound();
	}

	return snd;
})();