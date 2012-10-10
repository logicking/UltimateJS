/**
 * Scene - Container for VisualEntities
 */

Scene.prototype = new VisualEntity();
Scene.prototype.constructor = Scene;

function Scene() {
	Scene.parent.constructor.call(this);
};

Scene.inheritsFrom(VisualEntity);
Scene.prototype.className = "Scene";

Scene.prototype.createInstance = function(params) {
	var entity = new Scene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Scene);

Scene.prototype.init = function(params) {
	Scene.parent.init.call(this, params);
};

Scene.prototype.createVisual = function() {
	var params = this.params;
	var visual = guiFactory.createObject("GuiScene", {
		parent : this.guiParent,
		style : "scene",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height'],
		background : params['background']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);

	var that = this;
	this.children = this.children ? this.children : new Array();
	$['each'](this.children, function(id, val) {
		that.attachChildVisual(val);
	});
};

Scene.prototype.attachChildVisual = function(child) {
	if (child.attachToGui) {
		child.attachToGui(this.getVisual(), true);
	}
};

Scene.prototype.move = function(dx, dy, parallaxDepth) {
	var visual = this.getVisual();
	if (parallaxDepth) {
		$['each'](visual.backgrounds, function(i, back) {
			if (!back)
				return;
			if (i != visual.backgrounds.length - 1) {
				visual.setBackgroundPosition(visual.backgrounds[i].left
						- (dx * (i / parallaxDepth)), visual.backgrounds[i].top
						- (dy * (i / parallaxDepth)), i);
			}
		});
	}

	visual.move(dx, dy);
	//visual.resize();
};
