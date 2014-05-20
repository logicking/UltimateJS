/**
 * Scene to operate Sprites
 */

/**
 * @constructor
 */
function GuiScene() {
	GuiScene.parent.constructor.call(this);
}

GuiScene.inheritsFrom(GuiDiv);
GuiScene.prototype.className = "GuiScene";

GuiScene.prototype.createInstance = function(params) {
	var entity = new GuiScene(params['parent'], params['style'], params['width'],
			params['height'], params['canvas'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScene);
