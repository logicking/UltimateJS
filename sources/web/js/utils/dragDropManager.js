/**
 * Drag'n'Drop utilities
 */

var DragManager = (function() {
	// private interface
	var dragItem = null;

	var dragListeners = new Array();

	function cursorMove(e) {
		// console.log("cursorMove");
		if (dragItem) {
			// console.log("cursorMove dragItem");
			dragItem.dragMove(e);
			// notify listeners
			$['each'](dragListeners, function(id, obj) {
				if (obj.isEventIn(e)) {
					if (!obj.dragItemEntered) {
						// item enters listener zone
						// for the first time
						if (obj.onDragItemEnter) {
							obj.onDragItemEnter(dragItem);
						}
						obj.dragItemEntered = true;
					}
				} else if (obj.dragItemEntered) {
					// item moves out from listener zone
					if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
		}
	}

	function cursorUp() {
		if (dragItem) {

			// notify listeners
			var dragListenerAccepted = null;
			$['each'](dragListeners, function(id, obj) {
				if (obj.dragItemEntered) {
					if (!dragListenerAccepted && obj.onDragItemDrop) {
						if (obj.onDragItemDrop(dragItem)) {
							dragListenerAccepted = obj;
						}
					} else if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
			// console.log("dragCursorUp");
			dragItem.dragEnd(dragListenerAccepted);
			dragItem = null;
		}
	}

	var isInit = false;
	function init() {
		$(document)['bind'](Device.event("cursorUp"), cursorUp);
		$(document)['bind'](Device.event("cursorMove"), cursorMove);
		isInit = true;
	}

	return { // public interface
		//
		addListener : function(listener) {
			assert(listener instanceof GuiDiv,
					"Trying to add illegal drag'n'drop listener. Should be GuiDiv");
			listener.dragItemEntered = false;
			dragListeners.push(listener);
			// sort listeners by priority
			dragListeners.sort(function(l1, l2) {
				var z1 = l1.dragListenerPriority ? l1.dragListenerPriority : 0;
				var z2 = l2.dragListenerPriority ? l2.dragListenerPriority : 0;
				return z2 - z1;
			});
		},
		removeListener : function(listener) {
			popElementFromArray(listener, dragListeners);
		},
		setItem : function(item, e) {
			if (!isInit) {
				init();
			}

			if (dragItem && dragItem.dragEnd) {
				dragItem.dragEnd();
			}
			dragItem = item;

			// immediately update dragListeners
			cursorMove(e);
		},
		getItem : function() {
			return dragItem;
		}
	};
})();
