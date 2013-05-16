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
		stop : function(channel) {
			console.log("STOP", channel);
			var that = this;
			if (channel) {
				this.instance.stop(this.getChannel(channel)['playing']);
			} else {
				$['each'](this.channels, function(index, value) {
					if(index != "background" && value.playing){
						console.log("STOPPING INDEX", index);
						that.instance.stop(value['playing']);
					}
				});
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},
		mute : function(channel){
			var that = this;
			var ch = this.getChannel(channel);
			ch.initVol = ch.volume;
			ch.volume = 0;
			if (channel) {
				if(channel.playing){
					this.instance.mute(ch);
				}else{
					channel.volume = 0;
				}
			} else {
				$['each'](this.channels, function(index, value) {
					if(index != "background"){
						if(value.playing){
							that.instance.mute(value);
						}else{
							value.volume = 0;
						}
					}
				});
			}
		},
		unmute : function(channel){
			var that = this;
			var ch = this.getChannel(channel);
			ch.initVol = ch.volume;
			ch.volume = 0;
			if (channel) {
				if(channel.playing){
					this.instance.mute(ch);
				}else{
					channel.volume = 1;
				}
			} else {
				$['each'](this.channels, function(index, value) {
					if(index != "background"){
						if(value.playing){
							that.instance.unmute(value);
						}else{
							value.volume = 1;
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
			var that = this;
			if (!this.soundBuffers[id] || (!this.isOn() && channel != "background")){
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
				volume : ch.volume,
				duration : sound.duration,
				spriteName : sound.spriteName,
				buffer : this.sprites[sound.spriteName] ? this.sprites[sound.spriteName]
						: this.sprite
			};
			if (ch.playing != null) {
				var num = this.channelCount++;
				var chName = "channel"+num;
				this.channels[chName] = {
						playing : null,
						volume : 1
				};
				ch = this.channels[chName];
				ch.playing = sndInstance;
				this.instance.play(sndInstance, function() {
					if(callback){
						callback();
					}
					ch.playing = null;
					that.channels[chName] = null;
					delete that.channels[chName];
				});
				
//				if (ch.playing.priority > sndInstance.priority) {
//					return;
//				} else {
//					this.instance.stop(ch.playing);
//					ch.playing = sndInstance;
//					this.instance.play(sndInstance, function() {
//						if(callback){
//							callback();
//						}
//						ch.playing = null;
//					});
//				}
			} else {
				ch.playing = sndInstance;
				this.instance.play(sndInstance, function() {
					if(callback){
						callback();
					}
					ch.playing = null;
				});
			}
		},
		init : function(name, forceSprite, callback) {
			var that = this;
			this.forceSprite = forceSprite ? true : false;
			if (this.forceSprite) {

				console.log("INIT "+name);
				this.instance.loadSound(name, function(buf) {
					console.log("LOAD SOUND CALLBACK");
					that.sprites[name] = buf;
					//set initial mute state
//					Sound.turnOn(Sound.isOn());
					if(callback){
						callback();
					}
				});
			}
		},
		fadeTo : function(channel, time, volume) {
			var that = this;
			var playing = this.getChannel(channel).playing;
			if(!playing){
				return;
			}
			this.instance.fadeTo(playing, time, volume);
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
		context = null;
	} catch (e) {
		context = null;
		console.log("WEB Audio not supported");
	}
	if (context !== null) {
		snd.instance = new WebSound(context);
		alert("WEB SOUND");
	} else {
		//snd.instance = new jSound();
		snd.instance = new htmlSound();
	}

	return snd;
})();