GuiButton.prototype = new GuiDiv();
GuiButton.prototype.constructor = GuiButton;

/**
 * @constructor
 */
function GuiButton() {
	GuiButton.parent.constructor.call(this);
}

GuiButton.inheritsFrom(GuiDiv);
GuiButton.prototype.className = "GuiButton";

GuiButton.prototype.createInstance = function(params) {
	var entity = new GuiButton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiButton);

GuiButton.prototype.generate = function(src) {
	var htmlText = "<div id='" + this.id + "' class='" + this.style
			+ " unselectable'>";
	htmlText += "</div>";

	return htmlText;
};

GuiButton.prototype.initialize = function(params) {
	GuiButton.parent.initialize.call(this, params);
	
	// buttons is supposed to be small, so clamping it simple
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	this.jObject['css']("cursor", "pointer");
	this.params = params;
	var that = this;
	var labelParams;
	var normalParams = {};
	// this.$()['css']("border", "solid");
	// this.$()['css']("border-color", "red");

	var prepareButtonState = function(params) {

		params['image'] = Resources.getImage(params['image']);
		var image = GuiDiv.prototype
				.createInstance({
					parent : that,
					style : params['imageStyle'] ? params['imageStyle']
							: "buttonImage",
					width : that.width,
					height : that.height,
					x : params['x'] ? params['x'] : "50%",
					y : params['y'] ? params['y'] : "50%"
				});

		// image.$()['css']("border", "solid");
		// image.$()['css']("border-color", "black");

		that.children.addGui(image);

		var w = selectValue(params['width'], normalParams['width'], that.width);
		var h = selectValue(params['height'], normalParams['height'],
				that.height);
		// if scale parameter exists scale size, scale specifies in percents
		if (params['scale']) {
			w = Math.round(w * params['scale'] / 100);
			h = Math.round(h * params['scale'] / 100);
		}

		var offsetX = -Math.round(w / 2);
		var offsetY = -Math.round(h / 2);

		image.setOffset(offsetX, offsetY);
		if (params['background']) {
			image.applyBackground(params['background']);
		} else {
			image.setBackground(params['image'], w, h, 0, 0);
		}
		image.setSize(w, h);
		image.hide();

		var label;
		if (params['label']) {
			labelParams = labelParams ? labelParams : params['label'];
			// if scale parameter exists then scale size, scale specifies in
			// percents
			var scale = 1;
			if (typeof params['scale'] == "number") {
				scale = params['scale'] / 100;
			}

			w = selectValue(params['label']['width'], labelParams['width'],
					that.width)
					* scale;
			h = selectValue(params['label']['height'], labelParams['height'],
					that.height)
					* scale;

			fontSize = selectValue(params['label']['fontSize'],
					labelParams['fontSize'])
					* scale;

			offsetX = selectValue(params['label']['offsetX'],
					labelParams['offsetX'], -Math.round(w / 2));
			offsetY = selectValue(params['label']['offsetY'],
					labelParams['offsetY'], -Math.round(h / 2));

			w = Math.round(w);
			h = Math.round(h);

			label = guiFactory.createObject("GuiLabel",
					{
						parent : image,
						style : selectValue(params['label']['style'],
								labelParams['style']),
						width : w,
						height : h,
						text : selectValue(params['label']['text'],
								labelParams['text']),
						fontSize : fontSize,
						align : selectValue(params['label']['align'],
								labelParams['align'], "center"),
						verticalAlign : selectValue(params['label']['align'],
								labelParams['align'], "middle"),
						x : selectValue(params['label']['x'], labelParams['x'],
								"50%"),
						y : selectValue(params['label']['y'], labelParams['y'],
								"50%"),
						offsetX : params['label']['offsetX'] ? offsetX
								+ params['label']['offsetX'] : offsetX,
						offsetY : params['label']['offsetY'] ? offsetY
								+ params['label']['offsetY'] : offsetY
					});
			that.children.addGui(label);
			label.hide();
		}

		var callback = function() {
			// a bit hacky, but works
			// identify current state by reference to its params object
			if (that.currentStateParams === params) {
				return;
			} else {
				that.currentStateParams = params;
			}

			var oldCurrentImage = that.currentImage;
			var oldCurrentLabel = that.currentLabel;

			that.currentImage = image;
			if (that.currentImage) {
				that.currentImage.show();
			}

			that.currentLabel = label;
			if (that.currentLabel) {
				that.currentLabel.show();
			}
			if (oldCurrentLabel) {
				oldCurrentLabel.hide();
			}
			if (oldCurrentImage) {
				oldCurrentImage.hide();
			}
		};
		return {
			image : image,
			label : label,
			callback : callback
		};
	};

	// normal state (unpressed button)
	if (params['normal']) {
		normalParams = params['normal'];
		var resultNormal = prepareButtonState(params['normal']);
		that.imageNormal = resultNormal.image;
		that.normalState = function() {
			resultNormal.callback.call(that);
			that.clickAllowed = false;
		};
		that.normalState.call(that);
	}

	// mouse over the button
	if (!Device.isTouch()) {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageHover = result.image;
			that.hoverState = result.callback;
		}
		// button pressed
		if (params['active']) {
			var result = prepareButtonState(params['active']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		} else {
			if (params['hover']) {
				that.activeState = that.normalState;
			}
		}
	} else {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		}
	}
};

GuiButton.prototype.bind = function(pushFunction) {
	// simple onclick event without any effects for button
	if (!this.activeState) {
		GuiButton.parent.bind.call(this, pushFunction);
		return;
	}
	var that = this;

	this.backedToNormal = false;
	this.clickAllowed = false;
	this.unbind();
	if (this.hoverState && !Device.isTouch()) {
		this.jObject.bind("mouseenter.guiElementEvents", this.hoverState);
		this.jObject.bind("mouseleave.guiElementEvents", this.normalState);
	}

	if (pushFunction) {
		this.pushFunction = pushFunction;
	}
	var backToNormalCallback = this.hoverState ? this.hoverState
			: this.normalState;

	var callbackCaller = function(event) {
		if (that.isEnabled()) {
			if (that.clickAllowed) {
				if (that.pushFunction) {
					that.pushFunction(event);
				}
				that.clickAllowed = false;
			}
			backToNormalCallback.call(that);
		}
	};

	if (this.activeState) {
		if (!Device.isTouch()) {
			this.jObject.bind("mousedown", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
			});
			this.jObject.bind("mouseup", callbackCaller);
		} else {
			this.jObject.bind("touchstart", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
				that.backedToNormal = false;
			});
			this.jObject.bind("touchend", callbackCaller);
			this.jObject.bind("touchmove",
					function(e) {
						if (that.backedToNormal) {
							return;
						}

						e.preventDefault();
						var touch = e.originalEvent.touches[0]
								|| e.originalEvent.changedTouches[0];
						var obj = $(document.elementFromPoint(touch.pageX,
								touch.pageY));

						if (!that.isPointInsideReal(touch.pageX, touch.pageY)) {
							backToNormalCallback.call(that);
							that.backedToNormal = true;
						}
					});
		}

	}
};

// change background in all of button states
GuiButton.prototype.changeButtonBackgrounds = function(params, idx) {
	if (this.imageNormal) {
		this.imageNormal.setBackgroundFromParams(params, idx);
	}
	if (this.imageHover) {
		this.imageHover.setBackgroundFromParams(params, idx);
	}
	if (this.imageActive) {
		this.imageActive.setBackgroundFromParams(params, idx);
	}
};

// show or hides background
//changes background for highlighted
GuiButton.prototype.highlight = function(isOn) {
		if (this.params['highlight']) {
			if (isOn) {
			this.img = this.params['background']['image'];
			this.setBackground(this.params['highlight']['image']);
			this.backgroundShown = isOn;
			this.showBackground();
		} else {
			this.setBackground(this.img);
			this.showBackground();
		}
	}else{
		this.backgroundShown = isOn;
		if (this.backgroundShown) {
			this.showBackground();
		} else {
			this.hideBackground();
		}
	}
	
	
};

GuiButton.prototype.resize = function() {
	GuiButton.parent.resize.call(this);
};
