/**
 * viewport and dragn drop functions 
 */

VIEWPORT_KILLER = false;

/**
 * @constructor
 */
function GuiDiv() {
	GuiDiv.parent.constructor.call(this);
}

GuiDiv.inheritsFrom(GuiElement);
GuiDiv.prototype.className = "GuiDiv";

GuiDiv.prototype.createInstance = function(params) {
	var entity = new GuiDiv();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDiv);

GuiDiv.prototype.initialize = function(params) {
	this.divname = params['divname'];
	this.backgrounds = new Array();
	if (VIEWPORT_KILLER) this.disableViewport();
	// short alias for background
	if (params['image']) {
		params['background'] = {
			image : params['image']
		};
	}
	this.remote = params['remote'];
	/*
	 * if(params['background']instanceof Array){ for(var i = 0;i <
	 * params['background'].length;i++) {
	 * this.backgrounds.push(params['background'][i]); } }
	 */
	// ref to rect clamped by viewport
	this.viewRect = {};

	// DIV will be used as enhanced background to cover as much available
	// space on the screen as possible
	if (params['enhancedScene']) {
		params['width'] = params['width'] ? params['width']
				: ENHANCED_BASE_WIDTH;
		params['height'] = params['height'] ? params['height']
				: ENHANCED_BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : -ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : -ENHANCED_BASE_MARGIN_HEIGHT;
		this.enhancedScene = true;
		// enhancedScene is clamped by the maximum allowed screen size
		this.setViewport(Screen.fullRect());
	} else if (params['innerScene']) {
		// main scene is located on normal position inside enhanced scene
		params['width'] = params['width'] ? params['width'] : BASE_WIDTH;
		params['height'] = params['height'] ? params['height'] : BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : ENHANCED_BASE_MARGIN_HEIGHT;
		this.innerScene = true;
	}
	GuiDiv.parent.initialize.call(this, params);
	this.applyBackground(params['background']);

	if (params['enhancedScene']) {
		this.resize();
	}

	assert(!this.innerScene || this.parent.enhancedScene,
			"inner scene should always be child to enhanced scene");

	if (this.innerScene) {
		this.clampByParentViewport();
	}
};

GuiDiv.prototype.generate = function(src) {
	return "<div id=\"" + this.id + "\" class=\"" + this.style
	+ " unselectable\""+((this.divname)?("name=\""+ this.divname +"\""):("")) +"></div>";
};

GuiDiv.prototype.empty = function() {
	this.jObject['empty']();
};

GuiDiv.prototype.applyBackground = function(params) {
	if (params instanceof Array) {
		var j = params.length - 1;
		for ( var i = 0; i < params.length; i++) {
			params[i]['image'] = Resources.getImage(params[i]['image']);
			this.setBackgroundFromParams(params[i], j--);
		}
	} else if (params) {
		params['image'] = this.remote?params['image']:Resources.getImage(params['image']);
		this.setBackgroundFromParams(params, null);
	}
};

GuiDiv.prototype.setBackground = function(src, backWidth, backHeight, backX, backY, repeat, frameX, frameY, idx) {
    if (idx == "begin") {
        this.backgrounds.unshift({});
        idx = 0;
    } else if (idx == "end") {
        idx = this.backgrounds.length;
    }

    idx = idx ? idx : 0;
    frameX = frameX ? frameX : (this.backgrounds[idx] && this.backgrounds[idx].frameX ? this.backgrounds[idx].frameX : 0);
    frameY = frameY ? frameY : (this.backgrounds[idx] && this.backgrounds[idx].frameY ? this.backgrounds[idx].frameY : 0);
    backWidth = backWidth ? backWidth : (this.backgrounds[idx] && this.backgrounds[idx].width ? this.backgrounds[idx].width : this.width);
    backHeight = backHeight ? backHeight : (this.backgrounds[idx] && this.backgrounds[idx].height ? this.backgrounds[idx].height : this.height);

    this.backgrounds[idx] = {
        url : src,
        width : backWidth,
        height : backHeight,
        left : backX ? backX : 0,
        top : backY ? backY : 0,
        frameX : frameX,
        frameY : frameY,
        repeat : (repeat ? repeat : "no-repeat")
    };

    this.showBackground();
//	this.resizeBackground();
};

GuiDiv.prototype.setBackgroundFromParams = function(param, j) {
	var x = param['x'] ? Screen.macro(param['x']) : 0;
	var y = param['y'] ? Screen.macro(param['y']) : 0;
	var w = param['width'] ? Screen.macro(param['width']) : this.width;
	var h = param['height'] ? Screen.macro(param['height']) : this.height;
    var frameX = param['frameX'] ? Screen.macro(param['frameX']) : 0;
    var frameY = param['frameY'] ? Screen.macro(param['frameY']) : 0;
	var r = param['repeat'] ? param['repeat'] : null;
	this.setBackground(param['image'], w, h, x, y, r, frameX, frameY, j);
};
GuiDiv.prototype.setBackgroundPosition = function(backX, backY, idx) {
	idx = idx ? idx : 0;

	var backgroundX = backX ? backX : 0;
	var backgroundY = backY ? backY : 0;
	this.backgrounds[idx].left = backgroundX;
	this.backgrounds[idx].top = backgroundY;

	this.setRealBackgroundPosition(0, 0);
};

GuiDiv.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var positions = " ";
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		var pos = Screen.calcRealSize(back.left + offsetX, back.top + offsetY);
		positions += pos.x + "px " + pos.y + "px,";
	});
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.resizeBackground = function() {
    var positions = " ";
    var sizes = " ";
    var that = this;
    $['each'](this.backgrounds, function(i, back) {
        if (!back)
            return;
        var pos = Screen.calcRealSize(back.left + back.frameX, back.top + back.frameY);
        positions += pos.x + "px " + pos.y + "px,";

        var w = that.calcPercentageWidth(back.width);
        var h = that.calcPercentageHeight(back.height);
        var size = Screen.calcRealSize(w, h);
        sizes += size.x + "px " + size.y + "px,";
    });
    sizes = sizes.substr(0, sizes.length - 1);
    positions = positions.substr(0, positions.length - 1);
    this.jObject['css']("background-size", sizes);
    this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.setPosition = function(x, y) {
	GuiDiv.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.resize = function() {
	// if this DIV is inner scene than adjust our position
	// by parent - enhancedScene
	// if (this.innerScene) {
	// var parent = this.parent;
	// this.setPosition(parent.viewRect.left, parent.viewRect.top);
	//
	// // innerScene by default is always visible, so it's
	// // clamped only by enhanced scene
	// this.viewRect.left = -parent.viewRect.left;
	// this.viewRect.top = -parent.viewRect.top;
	// this.viewRect.right = this.viewRect.left + parent.viewRect.width;
	// this.viewRect.bottom = this.viewRect.top + parent.viewRect.height;
	// this.viewRect.width = parent.viewRect.width;
	// this.viewRect.height = parent.viewRect.height;
	// }

	GuiDiv.parent.resize.call(this);

	this.resizeBackground();
	// TODO make optimization, currently setting size and pos twice
	// Consider removing this from GuiDiv
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.dragBegin = function(e) {
	if (this.dragStarted)
		return;

	DragManager.setItem(this, e);

	this.dragStarted = true;
	var pos = Device.getPositionFromEvent(e);
	this.dragX = pos.x;
	this.dragY = pos.y;
	if (this.onDragBegin)
		this.onDragBegin();
	this.$()['addClass']("dragged");

	// console.log("dragBegin");
};

GuiDiv.prototype.dragMove = function(e) {
	if (this.dragStarted) {
		var pos = Device.getPositionFromEvent(e);
		var dX = pos.x - this.dragX;
		var dY = pos.y - this.dragY;
		this.move(dX / Screen.widthRatio(), dY / Screen.heightRatio());
		this.dragX = pos.x;
		this.dragY = pos.y;
		// console.log("dragMove real " + this.id + ", " + this.x + ", " +
		// this.y);
	} else {
		// console.log("dragMove not real");
	}

};

GuiDiv.prototype.dragEnd = function(dragListener) {
	if (!this.dragStarted)
		return;

	// .hack seem like webkit bug, touchmove event will be halted
	// once we remove item form scene. So we remove button
	// only after drag n drop complete, thus onBeforeDragEnd callback
	if (this.onBeforeDragEnd)
		this.onBeforeDragEnd(dragListener);

	if (this.onDragEnd)
		this.onDragEnd(dragListener);
	this.$()['removeClass']("dragged");
	this.dragStarted = false;

	// console.log("dragEnd");
};

GuiDiv.prototype.setDragable = function(isTrue) {
	this.dragable = isTrue;
	if (isTrue) {
		var that = this;
		this.$().bind(Device.event("cursorDown") + ".dragEvents", function(e) {
			that.dragBegin(e);
		});
	} else {
		this.$()['unbind'](".dragEvents");
	}
};

// Setups Div as reciver for drag items
// callbacks to override: onDragItemEnter, onDragItemOut, onDragItemDrop
GuiDiv.prototype.setDragListener = function(isTrue, priority) {
	this.dragSlot = isTrue;
	if (isTrue) {
		if (priority) {
			this.dragListenerPriority = priority;
		}
		DragManager.addListener(this);
	} else {
		DragManager.removeListener(this);
		if (this.$ && this.$()) 				/// TODO Another hack for GuiCSprite. Must be refactord as soon as possible
			this.$()['unbind'](".dragEvents");
	}
};

GuiDiv.prototype.hideBackground = function() {
	this.jObject['css']("background-image", "none");
};

GuiDiv.prototype.showBackground = function() {
	var urls = " ";
	var repeats = " ";
	var positions = " ";

	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		if (back.url) urls += "url('" + back.url + "'),";

        // TODO: test it
        if (back.frameX && back.frameY) {
            var pos = Screen.calcRealSize(back.frameX, back.frameY);
            positions += pos.x + "px " + pos.y + "px,";
        }

		repeats += back.repeat + ",";
	});

	urls = urls.substr(0, urls.length - 1);
	repeats = repeats.substr(0, repeats.length - 1);
    positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-image", urls);
	this.jObject['css']("background-position", positions);
	this.jObject['css']("background-repeat", repeats);
};

GuiDiv.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiDiv.prototype.setViewport = function(rect, isParent) {
	if(Screen.fixedSize || this.viewportDisable){
		this.viewport = null;
		return;
	}
	this.viewport = rect;
	this.isParentsViewport = isParent;

	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.disableViewport = function(){
	this.viewportDisable = true;
	this.viewport = null;
};

GuiDiv.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	var viewLeft = (this.viewRect && this.viewRect.left) ? this.viewRect.left
			: 0;
	var viewTop = (this.viewRect && this.viewRect.top) ? this.viewRect.top : 0;

	return {
		x : pos.x - viewLeft,
		y : pos.y - viewTop
	};
};

GuiDiv.prototype.clampByViewport = function() {
	if (!this.isVisible()) {
		return;
	}

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	// 2) find out intersection rect between our rect and
	// parent rect - it will be new visibile rect for our div.
	// Rect will be in parent's coordinates
	var rect = this.viewport;
	var left = Math.max(originalRect.left, rect.left);
	var top = Math.max(originalRect.top, rect.top);
	var right = Math.min(originalRect.right, rect.right);
	var bottom = Math.min(originalRect.bottom, rect.bottom);

	var w = right - left;
	var h = bottom - top;

	// item is completely outside viewport, hide it
	if (w < 0 || h < 0) {
		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.viewRect.isOutside = false;
			if (this.isVisible()) {
				this.jObject['show']();
			}
		}
	}

	var screenLeft = left;
	var screenTop = top;

	if (this.isParentsViewport) {
		screenLeft -= Math.max(rect.left, 0);
		screenTop -= Math.max(rect.top, 0);
	}
	this.setRealPosition(screenLeft, screenTop);
	this.setRealSize(w, h);

	// 3) calculate offset
	var offsetX = originalRect.left - left;
	var offsetY = originalRect.top - top;
	this.setRealBackgroundPosition(offsetX, offsetY);

	// calculate viewport for this Div for childrens to use
	if (this.innerScene) {
		// ignore boundaries of innerScene
		this.viewRect.left = rect.left - x;
		this.viewRect.top = rect.top - y;
		this.viewRect.right = rect.right - x;
		this.viewRect.bottom = rect.bottom - y;
		this.viewRect.width = rect.width;
		this.viewRect.height = rect.height;
		return;
	} else {
		this.viewRect.left = left - x;
		this.viewRect.top = top - y;
	}
	this.viewRect.right = this.viewRect.left + w;
	this.viewRect.bottom = this.viewRect.top + h;
	this.viewRect.width = w;
	this.viewRect.height = h;
	this.viewRect.offsetX = screenLeft;
	this.viewRect.offsetY = screenTop;

	var name = this.id;
	if (this.enhancedScene) {
		name += " Enhanced";
	} else if (this.innerScene) {
		name += " Inner";
	}

	// console.log(name + " " + "screen " + Math.round(screenLeft) + ", "
	// + Math.round(screenTop) + " originalRect "
	// + Math.round(originalRect.left) + ", "
	// + Math.round(originalRect.top) + " rect " + Math.round(rect.left)
	// + ", " + Math.round(rect.top) + " offset "
	// + Math.round(this.viewRect.left) + ", "
	// + Math.round(this.viewRect.top));

};


// Only perform show/hide check
GuiDiv.prototype.clampByViewportSimple = function() {

	// console.log("clamped");
	if (!this.isVisible()) {
		return;
	}
	var rect = this.viewport;

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	var rect = this.viewport;

	var screenLeft, screenTop;
	if (this.isParentsViewport) {
		screenLeft = originalRect.left - rect.left;
		screenTop = originalRect.top - rect.top;
	}
	if (screenLeft + this.width < 0 || screenLeft > rect.width
			|| screenTop + this.height < 0 || screenTop > rect.height) {

		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.jObject['show']();
			this.viewRect.isOutside = false;
		}
	}
	this.setRealPosition(screenLeft, screenTop);
};


GuiDiv.prototype.remove = function() {
	GuiDiv.parent.remove.call(this);
	this.setDragListener(false);
};

/**
 *
 * @param {number} width
 * @param {number} height
 * @param {number} idx background index. default 0
 */
GuiDiv.prototype.setSize = function (width, height, idx) {
    // using for frames from sprite sheet
    if (this.width != null) {
        var background = this.backgrounds[idx ? idx : 0];
        if (background && (background.frameX || background.frameY)) {
            var scaleX = width / this.width;
            var scaleY = height / this.height;
            background.width *= scaleX;
            background.height *= scaleY;
            background.frameX *= scaleX;
            background.frameY *= scaleY;
        }
    }

    GuiDiv.parent.setSize.call(this, width, height);
};