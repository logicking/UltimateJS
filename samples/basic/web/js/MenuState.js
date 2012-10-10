var GAME_STATE_UI_FILE = 'resources/ui/gameState.json';
var MENU_GUI_JSON = "resources/ui/menuState.json";

var DESCRIPTIONS_FILE = 'resources/descriptions.json';

MenuState.prototype = new BaseState();
MenuState.prototype.constructor = MenuState;

/**
 * @constructor
 */
function MenuState() {
	// json with MenuState GUI
	this.preloadJson(MENU_GUI_JSON);
	// json with random info about game entities.
	// All reusable data can be stored in the descriptions.json
	this.preloadJson(DESCRIPTIONS_FILE);

	MenuState.parent.constructor.call(this);
};

MenuState.inheritsFrom(BaseState);

MenuState.prototype.className = "MenuState";
MenuState.prototype.createInstance = function(params) {
	var entity = new MenuState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(MenuState);

MenuState.prototype.jsonPreloadComplete = function() {
	MenuState.parent.jsonPreloadComplete.call(this);

};

MenuState.prototype.init = function(params) {
	MenuState.parent.init.call(this, params);

	guiFactory.createGuiFromJson(this.resources.json[MENU_GUI_JSON], this);
	var that = this;

	// assigning handler to button "play"
	var playButton = this.getGui("play");
	playButton.bind(function(e) {
		Sound.play("click");
		Account.instance.switchState("GameState01", that.id, that.parent.id);
	});

	Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
		$(window)['trigger']("resize");
	});
};
