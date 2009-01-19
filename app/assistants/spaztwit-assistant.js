function SpaztwitAssistant() {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	sc.app.twit.setCredentials('spaztest','perlsucks');
	this.reload();
	
}

SpaztwitAssistant.prototype.setup = function() {	
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Luna.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
	Luna.Event.listen($('reload-button'), 'luna-tap', this.reload.bind(this));
}

SpaztwitAssistant.prototype.reload = function() {
	sc.app.twit.getFriendsTimeline();
};

SpaztwitAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


SpaztwitAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

SpaztwitAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}
