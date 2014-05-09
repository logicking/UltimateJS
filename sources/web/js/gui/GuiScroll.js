/*
 * Scrolling group of elements
 */

GuiScroll.prototype = new GuiElement();
GuiScroll.prototype.constructor = GuiScroll;

/**
 * @constructor
 */
function GuiScroll() {
	GuiScroll.parent.constructor.call(this);
}

GuiScroll.inheritsFrom(GuiElement);
GuiScroll.prototype.className = "GuiScroll";

GuiScroll.prototype.generate = function(src) {
	this.listId = this.id + "_list";
	this.scrollId = this.id + "_scroll";
	this.listId = this.scrollId;

	return "<div id='" + this.id + "' class='" + this.style
			+ " scrollerWrapper " + "unselectable'>" + "<div id='"
			+ this.scrollId + "' class='scrollerBackground'>"
			// + "<ul id=\"" + this.listId + "\"></ul>"
			+ "</div></div>";
};

GuiScroll.prototype.createInstance = function(params) {
	var entity = new GuiScroll(params['parent'], params['style'],
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScroll);

GuiScroll.prototype.initialize = function(params) {
	GuiScroll.parent.initialize.call(this, params);
	this.createScroll();
};

GuiScroll.prototype.createScroll = function() {
	var thisGuiScroll = this;
	this.hScroll = (this.params['hScroll'] != null) ? this.params['hScroll']
			: true;
	this.vScroll = (this.params['vScroll'] != null) ? this.params['vScroll']
			: true;
	
	if (this.params["fixedHeight"])
	this.setFixedHeight(this.params["fixedHeight"]);
	
	this.scroll = new iScroll(this.id, {
		'hScroll' : this.hScroll,
		'vScroll' : this.vScroll,
		'useTransform' : true,
		'onBeforeScrollStart' : function(e) {
			var target = e.target;
			while (target.nodeType != 1) {
				target = target.parentNode;
			}

			// if (target.tagName != 'SELECT' && target.tagName != 'INPUT' &&
			// target.tagName != 'TEXTAREA')
			e.preventDefault();

			// console.log("candidate " + target.id);
		},
		'onScrollStart' : function(e) {
			var target = e.target;
			thisGuiScroll.candidateToClick = null;

			while (true) {
				// a text element or element without id - skip it
				if (target.nodeType != 1 || target.id == '') {
					target = target.parentNode;
					continue;
				}

				// console.log("try to click " + target.id);
				var item = $("#" + target.id);
				if (item.length > 0) {
					var element = item['data']("guiElement");
					// console.log("element is " + element);

					// TODO listItemClickCallback and listItemMouseDownCallback
					// hacks
					// should be moved to GuiButton
					if (element) {
						if (element.listItemClickCallback) {
							thisGuiScroll.candidateToClick = element;
							break;
						} else if (element.listItemMouseDownCallback) {
							element.listItemMouseDownCallback(e);
							break;
						}
						// console.log("candidate " +
						// thisGuiScroll.candidateToClick.id);
					}
				}
				target = target.parentNode;

				// we have no parent or reached scroll element itself
				if (!target || target.id == thisGuiScroll.listId
						|| target.id == thisGuiScroll.scrollId
						|| target.id == thisGuiScroll.id)
					break;
			}
		},
		'onScrollMove' : function(e) {
			thisGuiScroll.candidateToClick = null;
		},
		'onBeforeScrollEnd' : function() {
			if (thisGuiScroll.candidateToClick) {
				thisGuiScroll.candidateToClick.listItemClickCallback();
				thisGuiScroll.candidateToClick = null;
			}
		}
	});
};

GuiScroll.prototype.refresh = function(height) {
	this.scroll['scrollTo'](0, 0, 0, false);
	if (this.fixedHeight) {
		this.scroll['refresh'](this.fixedHeight * Screen.heightRatio());
	} else {
		this.scroll['refresh']();
	}
};

GuiScroll.prototype.addListItem = function(item) {
	// var listItemId = this.listId + "_item" + uniqueId();
	// $("#" + this.listId).append("<li id='" + listItemId + "'></li>");
	// if (typeof item === "string") {
	// $("#" + listItemId).html(item);
	// } else {
	// item.setParent(listItemId);
	// }

	item.setParent("#" + this.listId);
	// allow events to propagate to reach the scroll
	item.unbind();
	this.children.addGui(item);

	this.resize();
};

GuiScroll.prototype.removeListItem = function(item) {
	this.children.removeGui(item);
	this.resize();
};

GuiScroll.prototype.clearList = function() {
	$("#" + this.listId).empty();
	this.children.clear();
};

GuiScroll.prototype.remove = function() {
	if(this.scroll){
		this.scroll['destroy']();
		delete this.scroll;
	}
	GuiScroll.parent.remove.call(this);
};

GuiScroll.prototype.resizeScroll = function() {
	// a bit hacky. To enable horizontal scrolling
	// make sure that we will have enough width.
	if (this.hScroll && !this.vScroll) {
		var totalWidth = 0;
		for ( var i = 0; i < this.children.guiEntities.length; i++) {
			totalWidth += this.children.guiEntities[i].$()['outerWidth'](true);
		}
		$("#" + this.listId)['width'](totalWidth);
	}
};

GuiScroll.prototype.setFixedHeight = function(height) {
	this.fixedHeight = height;
};

GuiScroll.prototype.resize = function() {
	GuiScroll.parent.resize.call(this);
	this.resizeScroll();
	if (this.scroll) {
		this.refresh();
	}
};

