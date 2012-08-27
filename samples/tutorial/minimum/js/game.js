/*
* Creating Menu with only one button
*/

MenuState.prototype = new BaseState();
MenuState.prototype.constructor = MenuState;

/**
 * @constructor
 */

 
 
 function MenuState() {
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



MenuState.prototype.init = function(params) {
	MenuState.parent.init.call(this, params);

	guiFactory.createGuiFromJson(
		{ 
			"enhancedScene": {
				"class" : "GuiDiv",
				"params" : {
					"parent" : "#root",
					"background": {
						"image" : "images/background.png"
					},
					"style" : "enhancedScene",
					"enhancedScene" : true
				}
			}, 
			"play": {
				"class" : "GuiButton",
				"params" : {
					"parent" : "enhancedScene",
					"normal" : {
						"image" : "images/button.png",
						"label" : {
							"style" : "gameButton",
							"text" : "Play",
							"fontSize" : 36,
							"scale" : 100
						}
					},
					"hover" : {
						"image" : "images/button.png",
						"scale" : 115,
						"label" : {}
					},
					"active" : {"image" : "images/button.png",
						"scale" : 105,
						"label" : {}
					},
					"style" : "gameButton",
					"width" : 120,
					"height" : 66,
					"x" : "50%",
					"y" : "50%",
					"offsetX" : -60,
					"offsetY" : -33
				}
			} 
		}, this);
	var that = this;

	// assigning handler to button "play"
	var playButton = this.getGui("play");
	playButton.bind(function(e) {
		Sound.play("click");
		alert("Button is pressed");
	});
};


// Entry point of the game
$(document).ready(
		function() {
			// Creating account a singleton
			(new BasicAccount()).init();

			Device.init();
			Resources.init();

			// disable console
			// console.log = function(){};

			Screen.init(Account.instance);

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

