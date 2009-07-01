function PostAssistant(args) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
	if (args) {
		this.args = args;
	}
	
	scene_helpers.addCommonSceneMethods(this);
}

PostAssistant.prototype.setup = function() {
	
	this.initTwit();
	
	this.postMode = 'normal'; // 'normal' or 'email'
	
	this.Users = new Users(sc.app.prefs);
	
	this.model = {
		'attachment':null
	};
	
	this.buttonAttributes = {
		type: Mojo.Widget.activityButton
	};
	this.postButtonModel = {
		buttonLabel : "Send",
		buttonClass: 'primary'
	};
	this.attachImageButtonModel = {
		buttonLabel : "Attach Image",
		buttonClass: 'secondary'
	};
	this.shortenTextButtonModel = {
		buttonLabel : "Shorten text",
		buttonClass: 'secondary'
	};
	this.shortenURLsButtonModel = {
		buttonLabel : "Shorten URLs",
		buttonClass: 'secondary'
	};
	this.postTextFieldModel = {
		value:'',
		disabled:false
	};
	
	this.controller.setupWidget('post-send-button',         this.buttonAttributes, this.postButtonModel);
	this.controller.setupWidget('attach-image-button',      {}, this.attachImageButtonModel);
	this.controller.setupWidget('post-shorten-text-button', this.buttonAttributes, this.shortenTextButtonModel);
	this.controller.setupWidget('post-shorten-urls-button', this.buttonAttributes, this.shortenURLsButtonModel);
	this.controller.setupWidget('post-textfield', {
			'multiline':true,
			'enterSubmits':true,
			'autoFocus':true,
			'changeOnKeyPress':true
			
		},
	this.postTextFieldModel);
	
	

	
	
	
	this.imageUploaderEmailModel = {
		'image-uploader-email':''
	};
	this.controller.setupWidget('image-uploader-email',
	    {
			// hintText: $L('posting email'),
			enterSubmits: false,
			requiresEnterKey: false,
			modelProperty:		'image-uploader-email',
			changeOnKeyPress: true, 
			focusMode:		Mojo.Widget.focusSelectMode,
			multiline:		false
		},
		this.imageUploaderEmailModel
  );
	
	
	
	this.spm = new SpazPhotoMailer();
	var uploaders = this.spm.getAPILabels();
	this.validImageUploaders = [];
	for (var i=0; i < uploaders.length; i++) {
		this.validImageUploaders.push({label:$L(uploaders[i]),  value:uploaders[i]});
	};
	
	this.imageUploaderModel = {
		'image-uploader':sc.app.prefs.get('image-uploader')
	};
	
	this.controller.setupWidget('image-uploader',
		{
			label: $L('Image host'),
			choices: this.validImageUploaders,
			modelProperty:'image-uploader'
		},
		this.imageUploaderModel
	);
	
	
	jQuery('#post-buttons-image').hide();
	jQuery('#post-panel-attachment').hide();
	

};

PostAssistant.prototype.activate = function(event) {
	var thisA = this;
	
	
	this.postTextField = $('post-textfield');
	
	
	if (this.args) {
		
		if (this.args.text) { this.postTextField.mojo.setText(this.args.text); }
		
		if (this.args.type) { /*type is ignored for now*/ }
		
		/*this.postTextField.mojo.setCursorPosition(this.args.select_start, this.args.select_start+this.args.select_length);*/
		
		if (this.args.irt_status_id) {
			this.setPostIRT(this.args.irt_status_id, this.args.irt_status);
		}

	}
	
	
	
	Mojo.Event.listen($('post-send-button'), Mojo.Event.tap, this.sendPost.bindAsEventListener(this));
	Mojo.Event.listen($('attach-image-button'), Mojo.Event.tap, this.attachImage.bindAsEventListener(this));
	Mojo.Event.listen($('post-shorten-text-button'), Mojo.Event.tap, this.shortenText.bindAsEventListener(this));
	Mojo.Event.listen($('post-shorten-urls-button'), Mojo.Event.tap, this.shortenURLs.bindAsEventListener(this));
	this.listenForEnter('post-textfield', function() {
		this.controller.get('post-send-button').mojo.activate();
		this.sendPost();
	});
	Mojo.Event.listen($('image-uploader'), Mojo.Event.propertyChange, this.changeImageUploader.bindAsEventListener(this));	
	Mojo.Event.listen($('image-uploader-email'), Mojo.Event.propertyChange, this.setImageUploaderEmail.bindAsEventListener(this));	
	

	jQuery('#post-panel-username').text(sc.app.username);

	
	/*
		if update succeeds
	*/
	jQuery().bind('update_succeeded', { thisAssistant:this }, function(e, data) {
		e.data.thisAssistant.renderSuccessfulPost(e, data);
	});

	/*
		if update fails
	*/
	jQuery().bind('update_failed', { thisAssistant:this }, function(e, error_obj) {
		e.data.thisAssistant.reportFailedPost(error_obj);
	});

			
	jQuery('#post-textfield').bind('keyup',   function(e) {
		thisA._updateCharCount();
	});
	jQuery('#post-textfield').bind('keydown', function(e) {
		thisA._updateCharCount();
	});
	jQuery('#post-textfield').bind('blur',    function(e) {
		thisA._updateCharCount();
	});
	jQuery('#post-textfield').bind('focus',   function(e) {
		thisA._updateCharCount();
	});
			
	jQuery('#post-panel-irt-dismiss').bind(Mojo.Event.tap, function(e) {
		thisA.clearPostIRT();
	});
	
	
	jQuery('#post-image-lookup-email').bind(Mojo.Event.tap, function(e) {
		var api_label = thisA.imageUploaderModel['image-uploader'];
		var help_text = $L(thisA.spm.apis[api_label].help_text);
		var email_info_url = $L(thisA.spm.apis[api_label].email_info_url);

		thisA.showAlert(
			$L(help_text),
			$('Look-Up Posting Email Address'),
			function(choice) {
				if (choice === 'Open Browser') {
					thisA.openInBrowser(email_info_url);
				}
			}, 
			[{label:$L('Open')+' '+api_label, value:"Open Browser", type:'affirmative'}]
		);
	});
	
	jQuery('#post-image-choose').bind(Mojo.Event.tap, function(e) {
		thisA.chooseImage();
	});
	
	thisA._updateCharCount();


};


PostAssistant.prototype.deactivate = function(event) {
	Mojo.Event.stopListening($('post-send-button'), Mojo.Event.tap, this.sendPost); 
	Mojo.Event.stopListening($('attach-image-button'), Mojo.Event.tap, this.attachImage);
	Mojo.Event.stopListening($('post-shorten-text-button'), Mojo.Event.tap, this.shortenText);
	Mojo.Event.stopListening($('post-shorten-urls-button'), Mojo.Event.tap, this.shortenURLs);
	Mojo.Event.stopListening($('image-uploader'), Mojo.Event.propertyChange, this.changeImageUploader);	
	Mojo.Event.stopListening($('image-uploader-email'), Mojo.Event.propertyChange, this.setImageUploaderEmail);	
	
	
	this.stopListeningForEnter('post-textfield');
	
	jQuery('#post-textfield').unbind('keyup');
	jQuery('#post-textfield').unbind('keydown');
	jQuery('#post-textfield').unbind('blur');
	jQuery('#post-textfield').unbind('focus');
	
	jQuery('#post-panel-irt-dismiss').unbind(Mojo.Event.tap);
	jQuery('#post-image-lookup-email').unbind(Mojo.Event.tap);
	jQuery('#post-image-choose').unbind(Mojo.Event.tap);
	
	jQuery().unbind('update_succeeded');
	jQuery().unbind('update_failed');
	

};

PostAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
};


/**
 * @private 
 */
PostAssistant.prototype._updateCharCount = function() {
	var thisA = this;
	
	if (thisA._updateCharCountTimeout) {
		clearTimeout(thisA._updateCharCountTimeout);
	}

	function _updateCharCountNow() {
		var numchars  = thisA.postTextFieldModel.value.length;
		var charcount = 140 - numchars;
		document.getElementById('post-panel-counter-number').innerHTML = charcount.toString();
		if (charcount < 0) {
			jQuery('#post-panel-counter', thisA.controller.getSceneScroller()).addClass('over-limit');
			/*
				disable post send button
			*/
			jQuery('#post-send-button', thisA.controller.getSceneScroller()).attr('disabled', 'disabled');
		} else {
			jQuery('#post-panel-counter', thisA.controller.getSceneScroller()).removeClass('over-limit');
			/*
				enable post send button
			*/
			jQuery('#post-send-button', thisA.controller.getSceneScroller()).attr('disabled', '');
		}	
	}
	
	this._updateCharCountTimeout = setTimeout(_updateCharCountNow, 250);
	
	
};


PostAssistant.prototype.setPostIRT = function(status_id, statusobj) {
	var status_text = '';
	if (statusobj && statusobj.SC_text_raw) {
		status_text = statusobj.SC_text_raw;
	} else {
		status_text = 'status #'+status_id;
	}
	
	// update the GUI stuff
	jQuery('#post-panel-irt-message', this.controller.getSceneScroller())
		.html(status_text)
		.attr('data-status-id', status_id);
	jQuery('#post-panel-irt', this.controller.getSceneScroller()).slideDown('fast');
};


PostAssistant.prototype.clearPostPanel = function() {
	this.clearPostIRT();
	jQuery('#post-textfield', this.controller.getSceneScroller()).val('');
	this._updateCharCount();
};


PostAssistant.prototype.clearPostIRT = function() {
	jQuery('#post-panel-irt', this.controller.getSceneScroller()).slideUp('fast');
	jQuery('#post-panel-irt-message').html('').attr('data-status-id', '0');
};



PostAssistant.prototype.shortenText = function(event) {
	var stxt = new SpazShortText();
	this.postTextFieldModel.value = stxt.shorten(this.postTextFieldModel.value);
	this.controller.modelChanged(this.postTextFieldModel);
	this._updateCharCount();
	this.deactivateButtonSpinner('post-shorten-text-button');
};

PostAssistant.prototype.shortenURLs = function(event) {
	
	var event_target = $('post-shorten-urls-button');
	
	var surl = new SpazShortURL(SPAZCORE_SHORTURL_SERVICE_BITLY);
	var longurls = sc.helpers.extractURLs(this.postTextFieldModel.value);

	/*
		check URL lengths
	*/
	var reallylongurls = [];
	for (var i=0; i<longurls.length; i++) {
		if (longurls[i].length > 25) { // only shorten links longer than 25chars
			reallylongurls.push(longurls[i]);
		}
	}
	
	/*
		drop out if we don't have any URLs
	*/
	if (reallylongurls.length < 1) {
		this.deactivateButtonSpinner('post-shorten-urls-button');
		this._updateCharCount();
		return;
	}
	
	function onShortURLSuccess(e) {
		var data = sch.getEventData(e);
		this.postTextFieldModel.value = sc.helpers.replaceMultiple(this.postTextFieldModel.value, data);
		this.controller.modelChanged(this.postTextFieldModel);
		this.deactivateButtonSpinner('post-shorten-urls-button');
		this._updateCharCount();
		sch.unlisten(event_target, sc.events.newShortURLSuccess, onShortURLSuccess, this);
		sch.unlisten(event_target, sc.events.newShortURLFailure, onShortURLFailure, this);
	}
	function onShortURLFailure(e) {
		var error_obj = sch.getEventData(e);
		this.deactivateButtonSpinner('post-shorten-urls-button');
		this._updateCharCount();
		sch.unlisten(event_target, sc.events.newShortURLSuccess, onShortURLSuccess, this);
		sch.unlisten(event_target, sc.events.newShortURLFailure, onShortURLFailure, this);
	}
	
	sch.listen(event_target, sc.events.newShortURLSuccess, onShortURLSuccess, this);
	sch.listen(event_target, sc.events.newShortURLFailure, onShortURLFailure, this);

	surl.shorten(reallylongurls, {
		'event_target':event_target,
		'apiopts': {
			'version':'2.0.1',
			'format':'json',
			'login':'spazcore',
			'apiKey':'R_f3b86681a63a6bbefc7d8949fd915f1d'
		}
	});
	
	
	
};


/**
 * saves the new image uploader label and loads up the appropriate email address for that api
 */
PostAssistant.prototype.changeImageUploader = function(e) {
	var api_label = this.imageUploaderModel['image-uploader'];
	sc.app.prefs.set('image-uploader', api_label);
	this.loadImageUploaderEmail(api_label);
	
};

/**
 * Loads up the posting address for the given api label. If a user metakey is set for this, use that. otherwise retrieve from API 
 */
PostAssistant.prototype.loadImageUploaderEmail = function(api_label) {
	if (!api_label) {
		api_label = this.imageUploaderModel['image-uploader'];
	}
	
	var email = null;
	
	email = this.getImageUploaderEmail(api_label);
	
	if (!email) {
		email = this.spm.apis[api_label].getToAddress({
			'username':sc.app.username
		});
		this.setImageUploaderEmail(api_label, email);
	}
	
	this.imageUploaderEmailModel['image-uploader-email'] = email;
	this.controller.modelChanged(this.imageUploaderEmailModel);
};

/**
 * Gets the meta value for the current user & api's posting address
 */
PostAssistant.prototype.getImageUploaderEmail = function(api_label) {
	return this.Users.getMeta(sc.app.username, sc.app.type, api_label+'_posting_address');
};

/**
 * Sets the posting email for the given api and the current user 
 */
PostAssistant.prototype.setImageUploaderEmail = function(api_label, email) {
	if (!api_label || !sch.isString(api_label)) {
		api_label = this.imageUploaderModel['image-uploader'];
	}
	if (!email || !sch.isString(email)) {
		email = this.imageUploaderEmailModel['image-uploader-email'];
	}
	
	this.Users.setMeta(sc.app.username, sc.app.type, api_label+'_posting_address', email);
};


/**
 * Sends a post, either by email or normal AJAX posting to Twitter, per this.postMode
 */
PostAssistant.prototype.sendPost = function(event) {
	var status = this.postTextFieldModel.value;
	
	if (this.postMode === 'email') {
		
		var api_label = this.imageUploaderModel['image-uploader'];
		var email = this.imageUploaderEmailModel['image-uploader-email'];
		var emailobj = {'name':api_label, 'address':email};
		var file = this.model.attachment;
		this.postImageMessage(emailobj, status, file);
		return;
	}
	
	if (status.length > 0) {
		var in_reply_to = parseInt(jQuery('#post-panel-irt-message', this.controller.getSceneScroller()).attr('data-status-id'), 10);
		
		if (in_reply_to > 0) {
			this.twit.update(status, null, in_reply_to);
		} else {
			this.twit.update(status, null, null);
		}

		this.postTextFieldModel.disabled = true;
		this.controller.modelChanged(this.postTextFieldModel);
		
	} else { // don't post if length < 0
		this.deactivateSpinner();
	}
	
};




/**
 * Change the "mode" of the posting scene so we see the controls for attaching an image 
 */
PostAssistant.prototype.attachImage = function() {
	
	jQuery('#post-buttons-standard').slideUp('200', function() {
		jQuery('#post-buttons-image').slideDown('200');
	});
	
	this.loadImageUploaderEmail();
	
	jQuery('#post-image-cancel').one('click', this.cancelAttachImage);
	
};

/**
 * Go back to the "normal" posting scene controls 
 */
PostAssistant.prototype.cancelAttachImage = function() {
	if ( jQuery('#post-buttons-image').is(':visible') ) {
		jQuery('#post-buttons-image').slideUp('200', function() {
			jQuery('#post-buttons-standard').slideDown('200');
		});
	}
	if (this.postMode === 'email') {
		this.setPostButtonLabel($L('Email Image Post'));
	} else {
		this.setPostButtonLabel($L('Post'));
	}
	
};


PostAssistant.prototype.setPostButtonLabel = function(label) {
	this.postButtonModel.buttonLabel = label;
	this.controller.modelChanged(this.postButtonModel);
};



PostAssistant.prototype.postImageMessage = function(post_add_obj, message, file) {
    sendEmail({
      to: [post_add_obj],
      msg: message,
      subject: message,
      attachments: [file],
      controller: this.controller
    });
    // next line should close new post "dialog"
    //this.controller.stageController.popScene();
};

/**
 * opens the file picker for images, and passes a callback to change the post scene state to reflect
 * the new "email and image" mode 
 */
PostAssistant.prototype.chooseImage = function(posting_address, message, filepath) {

	var thisA = this;
	
	// function fakeIt(file) {
	// 	jQuery('#post-attachment').show().html(file);
	// 	thisA.model.attachment = file;
	// 	thisA.postMode = 'email';
	// 	thisA.cancelAttachImage();
	// 	jQuery('#post-panel-attachment').show();
	// 	jQuery('#post-panel-attachment-dismiss').one('click', function() {
	// 		thisA.postMode = 'normal';
	// 		jQuery('#post-panel-attachment').hide();
	// 		thisA.model.attachment = null;
	// 		thisA.cancelAttachImage();
	// 	});
	//     }
	// 
	// fakeIt('file:///media/internal/wallpapers/01.jpg');
	// return;
	
	
	var params = {
	    kinds: ['image'],
	    onSelect: function(file) {
			jQuery('#post-attachment').show().html(file);
			thisA.model.attachment = file;
			thisA.postMode = 'email';
			thisA.cancelAttachImage();
			jQuery('#post-panel-attachment').show();
			jQuery('#post-panel-attachment-dismiss').one('click', function() {
				thisA.postMode = 'normal';
				jQuery('#post-panel-attachment').hide();
				thisA.model.attachment = null;
				thisA.cancelAttachImage();
			});
	    }.bind(this)
	};
	Mojo.FilePicker.pickFile(params, this.controller.stageController);
};



/**
 * 
 */
PostAssistant.prototype.renderSuccessfulPost = function(event, data) {
	if (sch.isArray(data)) {
		data = data[0];
	}

	data.text = makeItemsClickable(data.text);
	
	/*
		save this tweet to Depot
	*/
	sc.app.Tweets.save(data);
	
	dump(data);

	var itemhtml = sc.app.tpl.parseTemplate('tweet', data);
	


	/*
		prepend the rendered markup to the timeline, so it shows on top
	*/
	if (jQuery('#my-timeline').length == 1) {
		jQuery('#my-timeline').prepend(itemhtml);
	}
		
	


	/*
		remove extra items
	*/
	// sch.removeExtraElements('#my-timeline div.timeline-entry', sc.app.prefs.get('timeline-maxentries'));
	
	sch.removeExtraElements('#my-timeline div.timeline-entry:not(.reply):not(.dm)', sc.app.prefs.get('timeline-maxentries'));
	sch.removeExtraElements('#my-timeline div.timeline-entry.reply', sc.app.prefs.get('timeline-maxentries-reply'));
	sch.removeExtraElements('#my-timeline div.timeline-entry.dm', sc.app.prefs.get('timeline-maxentries-dm'));
	

	/*
		Update relative dates
	*/
	sch.updateRelativeTimes('div.timeline-entry .meta>.date', 'data-created_at');
	
	/*
		re-apply filtering
	*/
	this.filterTimeline();

	this.playAudioCue('send');
	
	this.deactivateSpinner();
	
			
	this.controller.stageController.popScene();
	// this.clearPostPanel(event);

};


/**
 *  
 */
PostAssistant.prototype.reportFailedPost = function(error_obj) {
	this.deactivateSpinner();
	this.postTextFieldModel.disabled = false;
	this.controller.modelChanged(this.postTextFieldModel);
	
	var err_msg = $L("There was a problem posting your status");
	this.sceneAssistant.displayErrorInfo(err_msg, error_obj);
};

PostAssistant.prototype.deactivateSpinner = function() {
	this.buttonWidget = this.controller.get('post-send-button');
	this.buttonWidget.mojo.deactivate();
};


