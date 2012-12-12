/*WebSound*/
var WebSound = function(context) {
	this.context = context;
	this.volume = 0;
};

WebSound.prototype.play = function(sndInst, callback) {
	var that = this;
	var source = this.context.createBufferSource();
	sndInst.source = source;
	sndInst.source.connect(this.context.destination);
	sndInst.source.buffer = sndInst.buffer;
	sndInst.source.loop = sndInst.loop;
	sndInst.source.gain.value = this.volume;
	sndInst.source.noteGrainOn(0, sndInst.offset, sndInst.duration);
	var buf = sndInst.buffer;
	if (!sndInst.loop) {
		this.playTimeout = setTimeout(function() {
			sndInst.source = that.context.createBufferSource();
			sndInst.source.buffer = buf;
			if (callback) {
				callback();
			}
		}, sndInst.duration * 1000);
	}
};

WebSound.prototype.stop = function(sndInst) {
	if (sndInst) {
		sndInst.source.noteOff(0);
	}
};

WebSound.prototype.mute = function() {
	this.volume = 0;
};

WebSound.prototype.unmute = function() {
	this.volume = 1;
};

WebSound.prototype.loadSound = function(name, callback) {
	var that = this;
	var EXTENTION = ".mp3";
	console.log("LoadSound", name + EXTENTION, callback);
	var request = new XMLHttpRequest();
	request.open('GET', name + EXTENTION, true);
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
