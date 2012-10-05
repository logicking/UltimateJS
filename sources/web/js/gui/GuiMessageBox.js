var GUI_MB_NAME = "GuiMessageBox";

GuiMessageBox.prototype = new GuiDialog();
GuiMessageBox.prototype.constructor = GuiMessageBox;

function GuiMessageBox() {
	GuiMessageBox.parent.constructor.call(this);
};

GuiMessageBox.inheritsFrom(GuiDialog);
GuiMessageBox.prototype.className = "GuiMessageBox";

GuiMessageBox.prototype.createInstance = function(params) {
	var entity = new GuiMessageBox(params['parent']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiMessageBox);

GuiMessageBox.prototype.initialize = function(params) {

	GuiMessageBox.parent.initialize.call(this, params);
	this.parent = params['parent'];
	this.customGuis = [];
	this.x = 800 / 2 - this.width / 2;
	this.y = 500 / 2 - this.height / 2;
	this.buttons = new Object();
	this.labels = new Object();
	this.icons = new Object();
	var that = this;
	// var labelParams = labelParams ? labelParams : params['label']['params'];
	if (params['icons'])
		$['each'](params['icons'], function(index, value) {
			that.icons[index] = guiFactory.createObject("GuiDiv", {
				parent : that,
				background : value['background'],
				style : params['style'],
				width : value['width'],
				height : value['height'],
				x : value['x'] ? value['x'] : that.width / 2 - value['width']
						/ 2,
				y : value['y'] ? value['y'] : that.height * 5 / 18
						- value['height'] / 2,
				z : value['z'] ? value['z'] : 0
			});
			that.children.addGui(that.icons[index]);
		});
	if (params['labels'])
		$['each'](params['labels'], function(index, value) {
			that.labels[index] = guiFactory.createObject("GuiLabel", {
				parent : that,
				style : value['params']['style'],
				width : value['params']['width'] ? value['params']['width']
						: params['width'],
				height : value['params']['height'],
				text : value['params']['text'],
				fontSize : value['params']['fontSize'],
				align : "center",
				verticalAlign : value['params']['align'],
				x : value['params']['x'] ? value['params']['x'] : that.width
						/ 2 - params['width'] / 2,
				y : value['params']['y'] ? value['params']['y'] : that.height
						* 2 / 3 - value['params']['height'] / 2,
				color : value['params']['color']
			});
			that.children.addGui(that.labels[index]);
		});

	$['each'](params['buttons'], function(index, value) {
		that.buttons[value['name']] = guiFactory.createObject("GuiButton", {
			parent : that,
			style : value['params']['style'],
			width : value['params']['width'],
			height : value['params']['height'],
			params : value['params']['params'],
			normal : value['params']['normal'],
			// label : value['params']['label'],
			hover : value['params']['hover'],
			active : value['params']['active'],
			x : value['params']['x'],
			y : value['params']['y'],
			activated : value['activated'] ? value['activated'] : false
		});
		// made for switching rooms
		if (value['roomPrice']) {
			that.buttons[value['name']]['roomPrice'] = value['roomPrice'];
		}
		if (value['buyLevel']) {
			that.buttons[value['name']]['buyLevel'] = value['buyLevel'];
		}
		if (value['activeLevel']) {
			that.buttons[value['name']]['activeLevel'] = value['activeLevel'];
		}
		if (value['activated']) {
			that.buttons[value['name']]['activated'] = value['activated'];
		}
		if (value['buyAble']) {
			that.buttons[value['name']]['buyAble'] = value['buyAble'];
		}
		that.children.addGui(that.buttons[value['name']]);
	});
	this.resize();
	this.hide();
};

GuiMessageBox.prototype.resize = function() {
	GuiMessageBox.parent.resize.call(this);
	this.children.resize();
};

GuiMessageBox.prototype.addCustomGui = function(gui, name) {
	this.customGuis.push(name);
	this.children.addGui(gui, name);
	console.log("ARRRAY", this.customGuis);
};
GuiMessageBox.prototype.removeAllCustomGui = function() {
	for ( var i = 0; i < this.customGuis.length; i++) {
		var entity = this.children.getGui(this.customGuis[i]);
		console.log("ENTITY!!", entity, this.customGuis[i]);
		this.children.removeGui(entity);
	}
	this.customGuis = [];
};

GuiMessageBox.prototype.hide = function() {
	GuiMessageBox.parent.hide.call(this);
//	this.removeAllCustomGui();
};