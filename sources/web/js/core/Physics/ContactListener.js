
/**
 * Contact Listener - part of the Physics singleton to
 * listen and register contacts dynamics,
 */

var LOG_DEBUG = false;

/**
 * @constructor
 */
function ContactListener(contactProcessor, body) {
	this.body = body;
	this.contactProcessor = contactProcessor;
	if (!contactProcessor)
		console.log("No contact processor were added! Will be defaults");
	//world = Physics.getWorld();
	this.activeContacts = new Array();
	this.activeContactIDs = new Array();
//	this.contactShape1 = null;
//	this.contactShape2 = null;	
//	this.currentContact = null;
	this.events = new Array();
};

//
//	Returns list of contacts and contacted entities id
//
ContactListener.prototype.getContacts = function(body) {
	//var body = world.m_bodyList;
	var contactIDs = new Array();
	var contacts = new Array();
	//for (; body != null; body = body['m_next']) {
		var contact = body.m_contactList;
		if (contact!=null)
		for (; contact != null; contact = contact['m_next']) {
			if ($.inArray(contact, contacts) == -1)
				{
					contactIDs.push(contact.contact.m_fixtureA.m_body.m_userData.id + ':'
							+ contact.contact.m_fixtureB.m_body.m_userData.id);
					contacts.push(contact.contact);
				}
		}
	//}
	return {
		"iDs" : contactIDs,
		"contacts" : contacts
	};
};

//
//	Main part of the listener
//
ContactListener.prototype.update = function() {
	var that = this;
	var contactList = this.getContacts(this.body);

	var newContactIDs = contactList["iDs"];
	var newContacts = contactList["contacts"];

	if (this.activeContactIDs && this.contactProcessor) {
		$['each'](newContactIDs, function(id, value) {
			if ($.inArray(value, that.activeContactIDs) == -1) {
				var type1 = newContacts[id].m_fixtureA.m_body.m_userData.params["type"];
				var type2 = newContacts[id].m_fixtureB.m_body.m_userData.params["type"];
				var contact = newContacts[id];
				that.contactProcessor.processBegin(type1, type2, contact);								
			}
		});
		$['each'](that.activeContactIDs, function(id, value) {
			if ($.inArray(value, newContactIDs) == -1) {
				var type1 = that.activeContacts[id].m_fixtureA.m_body.m_userData.params["type"];
				var type2 = that.activeContacts[id].m_fixtureB.m_body.m_userData.params["type"];
				var contact = that.activeContacts[id];
				that.contactProcessor.processEnd(type1, type2, contact);
			}
		});
	}
	
	this.activeContactIDs = newContactIDs;
	this.activeContacts = newContacts;
};