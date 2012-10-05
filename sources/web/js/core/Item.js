/**
 * Item - VisualEntity that can be stored in inventory or placed inside scene.
 */
var ITEM_NAME = "Item";

Item.prototype = new VisualEntity();
Item.prototype.constructor = Item;

/**
 * @constructor
 */
function Item() {
	Item.parent.constructor.call(this);
};

Item.inheritsFrom(VisualEntity);
Item.prototype.className = ITEM_NAME;

Item.prototype.createInstance = function(params) {
	var entity = new Item();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Item);

Item.prototype.init = function(params) {
	Item.parent.init.call(this, params);
	this.stashed = params['stashed'];
	if (this.stashed) {
		return;
	} else {
		var guiParent = this.params['guiParent'] ? this.params['guiParent']
				: this.parent.visual;
		if (guiParent) {
			this.attachToGui(guiParent);
		}
	}

	this.z = (this.z != null) ? this.z : 0;
};

Item.prototype.getIcon = function() {
	return this.description['totalImage'];
};

Item.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	if(this.description == null){
		this.description = Account.instance.descriptionsData[this.params['description']];
	}
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['totalImageWidth'],
		height : this.description['totalImageHeight'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile']
	});
//	for(var i=0;i<=10;i++){
//		for(var j=0;j<=10;j++){
//		x=i*100;
//		y=j*100;
//		visual.jObject['append']("<div class='sprite' style='width : 100px; height : 100px; -webkit-transform: translateX("+x+"px) translateY("+y+"px) scaleX(1) scaleY(1);background-image: url(http://logicking.com/html5/KittyWorldTest/images/introScreen.jpg); background-size : cover'></div>")
//		}
//	}

	var visualInfo = {};
	visualInfo.visual = visual;
	visualInfo.z = this.description['z-index'];
	visualInfo.offsetX = this.description['centerX'] ? calcPercentage(
			this.description['centerX'], this.description['width']) : 0;
	visualInfo.offsetY = this.description['centerY'] ? calcPercentage(
			this.description['centerY'], this.description['height']) : 0;

	this.addVisual(null, visualInfo);
	this.setPosition(this.x, this.y);
	this.setZ(null);
};

Item.prototype.writeUpdate = function(globalData, entityData) {
	Item.parent.writeUpdate.call(this, globalData, entityData);
};
Item.prototype.readUpdate = function(data) {
	// this.params['count'] = data['count'];
	Item.parent.readUpdate.call(this, data);
};
