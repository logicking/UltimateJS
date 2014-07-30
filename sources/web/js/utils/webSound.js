/*WebSound*/
var WebSound = function(context) {
	this.context = context;
	this.volume = 1;
	this.fade = false;
//	if (context.createGain) {
//		this.gainNode = context.createGain();
//		alert('context.createGain')
//	}
};

WebSound.prototype.createSource = function(buffer) {
	  var source = this.context.createBufferSource();
	  source.buffer = buffer;
	  
	  source = this.createGain(source);

	  return source;
};

WebSound.prototype.createGain = function(source, vol) {
	  var gainNode = this.context.createGain();
      gainNode.gain.value = (vol || vol === 0)?vol:1;
    source.connect(gainNode);
	  gainNode.connect(this.context.destination);
	  source.gain = gainNode.gain;
	  
	  return source;
};

WebSound.prototype.play = function(sndInst, callback) {
	var that = this;
	if(!sndInst.buffer){
		return;
	}
	sndInst.source = this.createSource(sndInst.buffer);
	sndInst.source.loop = sndInst.loop;
	sndInst.source.gain.value = sndInst.volume;
	sndInst.source.start(0, sndInst.offset, sndInst.duration);
//  deprecated
//	sndInst.source.noteGrainOn(0, sndInst.offset, sndInst.duration);
	var buf = sndInst.buffer;
	if (!sndInst.loop) {
		this.playTimeout = setTimeout(function() {
			sndInst.source = that.createSource(buf);
			if (callback) {
				callback();
			}
		}, sndInst.duration * 1000);
	}
};

WebSound.prototype.stop = function(sndInst) {
	if (sndInst && sndInst.source) {
		try{
			sndInst.source.noteOff(0);
		}catch(e){
//			alert("WEB STOPERR:"+e);
		}
	}
};

WebSound.prototype.mute = function(channel) {
    var that = this;
	this.muted = true;
	if(channel){
		if (channel.playing && !channel.playing.source)
            channel.playing.source = that.createGain(channel.playing.source, 0);
		channel.playing.source.gain.value = 0;
	}else{
		this.volume = 0;
	}
};

WebSound.prototype.unmute = function(channel) {
    var that = this;
	this.muted = false;
	if(channel){
        if (channel.playing && !channel.playing.source)
            channel.playing.source = that.createGain(channel.playing.source, channel.volume);
		channel.playing.source.gain.value = channel.volume;
	}else{
		this.volume = 1;
	}
};


WebSound.prototype.fadeTo = function(fadeInst) {
	if(this.muted){
		return;
	}
	var fadeStep = 10;
	if(this.fade == fadeInst.sndInst.id){
		return;
	}
	this.fade = fadeInst.sndInst.id;
	var that = this;
	fadeInst.sndInst.source = that.createGain(fadeInst.sndInst.source);
	fadeInst.dVol = fadeInst.volume - fadeInst.sndInst.source.gain.value;
	if(fadeInst.dVol == 0){
		return;
	}
	fadeInst.dVol = Math.round((fadeInst.dVol/(fadeInst.time/fadeStep)) * 10000)/10000;
	if (fadeInst.sndInst) {
		this.fading = true;
		var int = setInterval(function(){
			if(Math.abs(fadeInst.sndInst.source.gain.value - fadeInst.volume) >= Math.abs(2 * fadeInst.dVol)){
				fadeInst.sndInst.source.gain.value += fadeInst.dVol;
			}else{
				fadeInst.sndInst.source.gain.value = fadeInst.volume;
				fadeInst.sndInst.source.gain.value = Math.round(fadeInst.sndInst.source.gain.value * 10000)/10000;
				that.fade = false;
				if(fadeInst.callback){
					fadeInst.callback();
				}
				clearInterval(int);
			}
		},fadeStep);
	}
};

WebSound.prototype.loadSprite = function(name, callback) {
	this.loadSound(name, callback);
};

WebSound.prototype.loadSound = function(name, callback) {
	var that = this;
	
	var canPlayMp3, canPlayOgg = null;
	var myAudio = document.createElement('audio');
	if (myAudio.canPlayType) {
		canPlayMp3 = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/mpeg');
		canPlayOgg = !!myAudio.canPlayType
				&& "" != myAudio.canPlayType('audio/ogg; codecs="vorbis"');
	}
	var ext;
	if(canPlayOgg) {
		ext = ".ogg";
	} else {
		ext = ".mp3";
		//this.soundOffset = this.mp3offset;
	}

	var request = new XMLHttpRequest();
	request.open('GET', name + ext, true);
	request.responseType = 'arraybuffer';
	// Decode asynchronously
	request.onload = function() {
		that.context.decodeAudioData(request.response, function(buffer) {
			var source = that.context.createBufferSource();
			source.buffer = buffer;
			if (callback) {
				callback(buffer);
			}
		}, function() {
			console.error("Unable to load sound:" + name + EXTENTION);
		});
	};
	request.send();
};
