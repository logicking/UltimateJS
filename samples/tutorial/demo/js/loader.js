/**
 * 
 */
var Loader = (function() {
	var currentLoadingStatePercentage = 0;
	var firstTimeHide = true;
	var isShowed = true;
	var loadingStateText;
	var loadingMsg = document['getElementById']("loadingMsg");
	if (loadingMsg) {
		loadingMsg['style']['zIndex'] = "9999";
		loadingStateText = document['getElementById']('loadingStateText');
	}
	var globalBackground = document['getElementById']("globalBackground");
	if (globalBackground) {
		globalBackground['style']['zIndex'] = "9998";
	}

	return {

		loadScripts : function() {

		},
		loadingMessageShowed : function() {
			return isShowed;
		},
		currentLoadingState : function() {
			return currentLoadingStatePercentage;
		},
		updateLoadingState : function(pecentage) {
			currentLoadingStatePercentage = pecentage;
			if (loadingStateText) {
				loadingStateText['removeChild'](loadingStateText.firstChild);
				loadingStateText
						.appendChild(loadingStateText.ownerDocument
								.createTextNode(pecentage + "%"));
			}
		},
		showLoadingMessage : function() {
			if (isShowed)
				return;
			isShowed = true;
			var loadingMsg = $("#loadingMsg");
			if (loadingMsg.length > 0) {
				loadingMsg.show();
			}
		},
		hideLoadingMessage : function() {
			if (!isShowed)
				return;

			// the app has been started
			if (firstTimeHide) {
				firstTimeHide = false;
				var rotateMsg = $("#rotateMsg");
				if (rotateMsg.length > 0) {
					rotateMsg['removeClass']("hidden");
					rotateMsg['addClass']("rotateMsg");
				}
				;
			}

			// here we already have Jquery
			var loadingMsg = $("#loadingMsg");
			if (loadingMsg.length > 0) {
				isShowed = false;
				loadingMsg.hide();
				var globalBackground = $("#globalBackground");
				if (globalBackground.length > 0) {
					globalBackground['css']("z-index", 0);
				}
			}
		}
	};
})();