//
var guiFactory = new AbstractFactory();

/**
 * @constructor
 */
guiFactory.createGuiFromJson = function(json, state) {
	guiFactory.createObjectsFromJson(json, function(name, params) {
		if (params['parent'] && typeof params['parent'] == "string") {
			// find parent among local objects or
			// assume that it is ID of existing DOM object
			var localParent = state.getGui(params['parent']);
			if (!localParent) {
				localParent = $(params['parent']);
				if (localParent.length == 0) {
					localParent = null;
				}
			}
			if (localParent) {
				params['parent'] = localParent;
				return;
			}
		}
		console.warn("For object '" + name + "' wrong parent '" + params['parent'] + "' is provided.");
	}, function(name, obj) {
		state.addGui(obj, name);
		if(obj.parent && obj.parent.children){
			obj.parent.children.addGui(obj, name);
		}
		obj.name = name;
	});
};
