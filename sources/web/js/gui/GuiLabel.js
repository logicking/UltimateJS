/**
 * Label with text that can be aligned vertically and horizontally
 */

/**
 * @constructor
 */
function GuiLabel() {
	GuiLabel.parent.constructor.call(this);
}

GuiLabel.inheritsFrom(GuiElement);
GuiLabel.prototype.className = "GuiLabel";

GuiLabel.prototype.createInstance = function(params) {
	var entity = new GuiLabel();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiLabel);

GuiLabel.prototype.initialize = function(params) {
	this.divname = params['divname'];
	GuiLabel.parent.initialize.call(this, params);

	this.fontSize = params['fontSize'] ? params['fontSize'] : 20;
	this.change(params['text']);
	if(params['cursor']){
		this.jObject['css']("cursor", params['cursor']);
		this.cursor = params['cursor'];
	}
	if (params['align']) {
		this.align(params['align'], params['verticalAlign']);
	}
	if (params['color']) {
		this.setColor(params['color']);
	}
	
	this.setLineHeight(params['lineHeight']?params['lineHeight']:1);
};

GuiLabel.prototype.generate = function(src) {
	var id = this.id;
	this.rowId = this.id + "_row";
	this.cellId = this.id + "_cell";
	return "<div id='" + this.id + "' class='" + this.style + " unselectable' style='cursor: default'>"
	+ "<div id='" + this.rowId + "' style='display:table-row; '>"
	+ "<div id='" + this.cellId +"'"+((this.divname)?(" name='"+ this.divname +"'"):(""))+ " style='display:table-cell;'>"
	+ src + "</div></div></div>";
};

GuiLabel.prototype.create = function(src) {
	GuiDiv.parent.create.call(this, src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");

};

GuiLabel.prototype.change = function(src, fontSize) {
	src = Resources.getString(src);
	$("#" + this.cellId).html(src);
	if (fontSize)
		this.fontSize = fontSize;
//	console.error(this.id,this.cellId, $("#" + this.cellId).text());
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
//	this.resize();
};

GuiLabel.prototype.refresh = function() {
	this.change(Resources.getString(this.params.text && this.params.text.length ? this.params.text : this.getText()));
	GuiLabel.parent.refresh.call(this);
};

GuiLabel.prototype.getText = function() {
	return $("#" + this.cellId).html();
};

GuiLabel.prototype.append = function(src) {
	$("#" + this.cellId).append(src);
	this.resize();
};

GuiLabel.prototype.empty = function() {
	$("#" + this.cellId).empty();
	this.resize();
};

GuiLabel.prototype.setPosition = function(x, y) {
	GuiLabel.parent.setPosition.call(this, x, y);

};

GuiLabel.prototype.setRealSize = function(width, height) {
	GuiLabel.parent.setRealSize.call(this, width, height);

	var size = Screen.calcRealSize(width, height);
	$("#" + this.rowId)['css']("width", size.x);
	$("#" + this.rowId)['css']("height", size.y);
	$("#" + this.cellId)['css']("width", size.x);
	$("#" + this.cellId)['css']("height", size.y);

	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
	// cssTransform($("#" + this.cellId), null, null, Screen.widthRatio(),
	// Screen.heightRatio());

};

GuiLabel.prototype.resize = function() {
	GuiLabel.parent.resize.call(this);
};

GuiLabel.prototype.setColor = function(color) {
	this.jObject['css']("color", color);
};

GuiLabel.prototype.setLineHeight = function(lineHeight) {
	this.jObject['css']("line-height", lineHeight);
};

GuiLabel.prototype.align = function(alignH, alignV) {
	if (alignH) {
		$("#" + this.cellId)['css']("text-align", alignH);
	}
	if (alignV) {
		$("#" + this.cellId)['css']("vertical-align", alignV);
	}
};
