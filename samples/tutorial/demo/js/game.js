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
/*
 * Character incapsulates animated sprite
 * into the entity 
 */

var SPEED_MOVE = 100;
BasicCharacter.prototype = new VisualEntity();
BasicCharacter.prototype.constructor = BasicCharacter;

/**
 * @constructor
 */
function BasicCharacter() {
	BasicCharacter.parent.constructor.call(this);
};

BasicCharacter.inheritsFrom(VisualEntity);
BasicCharacter.prototype.className = "BasicCharacter";

BasicCharacter.prototype.createInstance = function(params) {
	var entity = new BasicCharacter();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BasicCharacter);

BasicCharacter.prototype.init = function(params) {
	BasicCharacter.parent.init.call(this, params);
	this.speed = selectValue(params['speed'], SPEED_MOVE);
	this.stashed = params['stashed'];
	this.flagMove = false;
	this.clickPosition = {};
	this.lastDirection = null;

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

BasicCharacter.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['width'],
		height : this.description['height'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile'],
		"spriteAnimations" : {
			"idle" : {
				"frames" : [ 1, 1, 2, 2, 1 ],
				"row" : 0
			},
			"walk" : {
				"frames" : [ 4, 5, 6, 7, 8, 9, 10, 11 ],
				"row" : 0,
				"frameDuration" : 100
			}
		}
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	visualInfo.z = this.description['z-index'];
	visualInfo.offsetX = this.description['centerX'] ? calcPercentage(
			this.description['centerX'], this.description['width']) : 0;
	visualInfo.offsetY = this.description['centerY'] ? calcPercentage(
			this.description['centerY'], this.description['height']) : 0;

	this.addVisual(null, visualInfo);
	this.setPosition(this.x, this.y);
	this.startX = this.x;
	this.startY = this.y;
	this.setZ(null);
	visual.playAnimation("idle", 5, true);
};

BasicCharacter.prototype.update = function(updateTime) {
	var visual = this.getVisual();
	if(!visual) {
		return;
	}
	
	if (this.flagMove == true) {
		if ((Math.abs(this.clickPosition.x - this.x) > 4)
				|| (Math.abs(this.clickPosition.y - this.y) > 4)) {
			this.x += this.speed * (updateTime / 1000) * this.normX;
			this.y += this.speed * (updateTime / 1000) * this.normY;
			this.setPosition(this.x, this.y);
		} else {
			Sound.play("final");
			this.startX = this.x;
			this.startY = this.y;
			this.stop();
		}
	} else {
		this.startX = this.x;
		this.startY = this.y;
	}
	visual.update();
};

BasicCharacter.prototype.move = function() {
	this.flagMove = true;
	this.getVisual().stopAnimation();

	var dx = this.clickPosition.x - this.startX;
	var dy = this.clickPosition.y - this.startY;
	this.normX = dx / Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
	this.normY = dy / Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

	if (this.normX < 0) {
		this.getVisual().flip(true);
	} else {
		this.getVisual().flip(false);
	}
	
	Sound.play("monkey");
	this.getVisual().playAnimation("walk", null, true);
};

BasicCharacter.prototype.stop = function() {
	this.flagMove = false;
	this.getVisual().stopAnimation();
	this.getVisual().playAnimation("idle", 5, true);
};
/**
 * Scene is a place to put all sprites in
 */

BasicScene.prototype = new Scene();
BasicScene.prototype.constructor = BasicScene;

/**
 * @constructor
 */
function BasicScene() {
	BasicScene.parent.constructor.call(this);
};

BasicScene.inheritsFrom(Scene);

BasicScene.prototype.className = "BasicScene";
BasicScene.prototype.createInstance = function(params) {
	var entity = new BasicScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BasicScene);

BasicScene.prototype.init = function(params) {
	BasicScene.parent.init.call(this, params);
};

BasicScene.prototype.addChild = function(child) {
	BasicScene.parent.addChild.call(this, child);
};

BasicScene.prototype.createVisual = function() {
	BasicScene.parent.createVisual.call(this);
	var visual = this.getVisual();
	var descriptionTile = Account.instance.descriptionsData[this.params['tile']];
	visual.setBackground(Resources.getImage(descriptionTile['image']),
			descriptionTile['width'], descriptionTile['height'], 0, 0,
			"repeat", 0);
	this.parent.resize();

	// Binding touchUp and mouseUp to handle character movement
	var that = this;
	var lastEvent = null;
	visual.jObject['bind'](Device.event("cursorDown"), function(e) {
		lastEvent = e;
	});
	visual.jObject['bind'](Device.event("cursorMove"), function(e) {
		lastEvent = e;
	});
	visual.jObject['bind'](Device.event("cursorUp"), function() {
		if(!lastEvent) {
			return;
		}
		var e = lastEvent;
		that.monkey = Account.instance.getEntity("basicCharacter01");
		if (that.monkey.flagMove == false) {
			that.monkey.clickPosition = that.getVisual().getEventPosition(e);
			that.monkey.move();
		} else {
			that.monkey.stop();
		}
	});

};

// do cleanup here
BasicScene.prototype.destroy = function() {
	BasicScene.parent.destroy.call(this);
};/*
 * Game state is a application state where all the game logic is happens
 */

GameState.prototype = new BaseState();
GameState.prototype.constructor = GameState;

/**
 * @constructor
 */
function GameState() {
	// loading json with GUI info
	this.preloadJson(GAME_STATE_UI_FILE);
	GameState.parent.constructor.call(this);
};

GameState.inheritsFrom(BaseState);

GameState.prototype.className = "GameState";
GameState.prototype.createInstance = function(params) {
	var entity = new GameState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(GameState);

GameState.prototype.jsonPreloadComplete = function() {
	GameState.parent.jsonPreloadComplete.call(this);
};

GameState.prototype.init = function(params) {
	GameState.parent.init.call(this, params);
	
	guiFactory.createGuiFromJson(this.resources.json[GAME_STATE_UI_FILE], this);
	var that = this;

	var playButton = this.getGui("backToMenu");
	playButton.bind(function(e) {
		Sound.play("click");
		Account.instance.switchState("MenuState01", that.id, that.parent.id);
	});
	
	this.scene = Account.instance.getEntity(params['scene']);
	this.scene.attachToGui(this.getGui("mainScene"));
	
	//fading out from previous switch state
	Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
	});
};/**
 * Main.js Entry point of the whole game
 */

// Entry point of the game
$(document).ready(
		function() {
			// Creating account a singleton
			(new BasicAccount()).init();

			var DESCRIPTIONS_FILE = 'resources/descriptions.json';
			Account.instance.preloadJson(DESCRIPTIONS_FILE);
			Account.instance.preload.call(Account.instance);
			Device.init();
			Resources.init();

			// disable console
			// console.log = function(){};

			// IMAGES
			// in images/low we can put low-resolution images for the slower
			// devices
			Resources.addResolution("low", "images/low/");
			Resources.addResolution("normal", "images/", true);

			// Switch resolution if running on slow device
			if (false && Device.isSlow()) {
				// In Basic Demo there's no low resolution
				Resources.setResolution("low");
			}

			// preloading fonts
			Resources.preloadFonts([ "pusab-white" ]);

			// Init sound-sprites audio
			Sound.init("sounds/total", true, "js/");
			Sound.add("click", "", 0, 0.3);
			Sound.add("monkey", "", 1.0, 1.0);
			Sound.add("final", "", 4.0, 2.0);

			Screen.init(Account.instance);

			/*
			 * Preloading art, changing loader progress
			 */
			var preloadComplete = function() {

				Account.instance.backgroundState.fadeIn(LEVEL_FADE_TIME,
						"white", function() {
							Account.instance.backgroundState
									.fadeOut(LEVEL_FADE_TIME);
							Loader['hideLoadingMessage']();

							// Very IMPORTANT!
							// Initial state of the game - is an active
							// MenuState
							var data = {
								"Account01" : {
									"class" : "Account",
									"state" : "MenuState01"
								},
								"MenuState01" : {
									"class" : "MenuState",
									"parent" : "Account01"
								}

							};
							Account.instance.readGlobalUpdate(data);
							$(window)['trigger']("resize");
						});
			};
			

			Loader['updateLoadingState'](Loader['currentLoadingState']() + 10);
			var currentPecent = Loader['currentLoadingState']();
			var remainPecent = 100 - currentPecent;
			var preloadProgress = function(data) {
				Loader['updateLoadingState']
						(currentPecent
								+ Math.round(remainPecent
										* (data.loaded / data.total)));
			};

			var mediaArray = [ "background.png", "button.png", "tile.png",
					"monkey.png" ];
			Resources.loadMedia(mediaArray, preloadComplete, preloadProgress);

		});
/**
 * BasicAccount is derived from Account. Accounts handle all system information,
 * perform serialization and networking. All entities are childrens of account.
 * Account.instance - is a singletone for account.
 */

BasicAccount.prototype = new Account();
BasicAccount.prototype.constructor = BasicAccount;

/**
 * @constructor
 */
function BasicAccount(parent) {
	BasicAccount.parent.constructor.call(this);
};

BasicAccount.inheritsFrom(Account);
BasicAccount.prototype.className = "BasicAccount";

BasicAccount.prototype.jsonPreloadComplete = function() {
	Account.instance.descriptionsData = this.resources.json[DESCRIPTIONS_FILE];
};

BasicAccount.prototype.init = function() {
	BasicAccount.parent.init.call(this);
	this.states = new Object();
	//
	this.states["MenuState01"] = {
		"MenuState01" : {
			"class" : "MenuState",
			"parent" : "Account01",
			"children" : {}
		}
	};

	// Description of states
	this.states["GameState01"] = {
		"GameState01" : {
			"class" : "GameState",
			"parent" : "Account01",
			"scene" : "Scene01",
			"children" : {}
		},
		"Scene01" : {
			"class" : "BasicScene",
			"parent" : "GameState01",
			"tile" : "basicTextureTile",
			"x" : 0,
			"y" : 0,
			"width" : 800,
			"height" : 500
		},
		"basicCharacter01" : {
			"class" : "BasicCharacter",
			"parent" : "Scene01",
			"description" : "monkey",
			"x" : 300,
			"y" : 352
		}
	};

	Account.instance = this;
};

// SwitchState perform fading in, and swithching state,
// which mean changing entities from one account to another.
BasicAccount.prototype.switchState = function(stateName, id, parentId) {
	var that = this;
	this.backgroundState.fadeIn(LEVEL_FADE_TIME, "white", function() {
		var data = new Object();
		$['each'](Account.instance.states, function(key, value) {
			if (key === stateName) {
				data = Account.instance.states[key];
				data[key]["parent"] = parentId;
				data[id] = {
					"destroy" : true
				};
				console.log(stateName, data);
				that.readGlobalUpdate(data);
			}
		});
	});
};
