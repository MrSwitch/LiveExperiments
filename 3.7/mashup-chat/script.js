/*********************************************************************
 * This script interacts with the DOM of the page it is loaded into.
 *
 * Dependent Files
 * ./token.php  	- locally hosted server side script to set cookies.
 * ./style.css 	- Styles HTML defined in this doc
 *
 * @author Andrew Dodson, i-andods@microsoft.com
 *
 * @since Feb 2010
 *********************************************************************/

/**
 * Get the chatBox credentials
 */
setInterval((function(){
	glow.net.get( "./token.php?attr=json", {
			onLoad: function(response) {
					msgr.cred = response.json();
			}
	});
	return arguments.callee;
})(), 1000*60*30);

var $ = glow.dom.get;

/*********************************************
 * Object controls
 *
 *********************************************/
 
var msgr = {
	//---------------------------
	// MessegnerUser contains the current user session object
	user : null,
	
	appid : null,

	cred : null,

	init : function(){

		$('.chat_box').addClass("signedout").append(
		'<div class="top"> \
			<span class="showhide"><\/span> \
			<span class="mesenger">Messenger<\/span> \
			<button class="sign"><span class="signin">sign in<\/span><span class="signingin">signing in<\/span><span class="signout">sign out<\/span><\/button> \
		<\/div> \
		<div class="body"> \
			<div class="shout"> \
				<input type="text" name="shout" /> \
				<button>Shout<\/button> \
			<\/div> \
			<div class="contacts-control"> \
				<div class="inner"> \
					<a class="share">Invite People <div class="contact-picker"><ul><\/ul><\/div><\/a> \
					<span class="num_friends_in_video">Nobody watching<\/span> \
				<\/div> \
			<\/div> \
			<div class="contacts"> \
				<div class="nocontacts"><\/div> \
				<ul> \
				<\/ul> \
			<\/div> \
			<div class="footnotes"> \
				<ul> \
					<li><a target="_blank" class="tos">Terms of service<\/a><\/li> \
					<li><a target="_blank" class="rta">Report Abuse<\/a><\/li> \
					<li><a target="_blank" class="hlp">Help<\/a><\/li> \
				<\/ul> \
			<\/div> \
		<\/div>');

		// Check whether we think the user is signed in or not
		if( document.cookie.match(/msgr-delegation-token=[^;]+/) ){
			// YES the user could be signed in... load the libraries and make further checks
			glow.dom.get('.chat_box').removeClass('signedout').addClass('signingin');
			msgr.loadlib();
		}
		
		/**
		 * Attach Events to this Widget
		 */
		var x,m;
		for( x in msgr.EVENTS ){
			m = x.match(/(.*) ([a-z]+)$/);
			glow.events.addListener(m[1],m[2], msgr.EVENTS[x]);
		}
	},
	/*******************************
	 * EVENTS - SHOUT CONTROLS
	 * Attach events to the Widget
	 *******************************/
	EVENTS : {
		'.chat_box button.sign click'		: function(){
			// IF THE USER IS NOT SIGNED IN
			if(!msgr.user){
				window.open('http://consent.messenger.services.live.com/Delegation.aspx?RU='+
						encodeURIComponent(msgr.cred['tokenUrl']+((msgr.cred['tokenUrl'].indexOf('?') < 0) ? '?' : '&')+ 'callback=msgr.loadlib')+'&ps=Messenger.SignIn&pl='+
						encodeURIComponent(msgr.cred['privacyUrl'])+'&app='+(msgr.cred['applicationVerifierToken'])+'&mkt=EN_GB&ttype=1',
					'auth', 
					'width=520,height=500,status=no,resizable=yes,toolbar=no,menubar=no,scrollbars=yes');
			} else {
				msgr.user.signOut();
			}
		},
		'.chat_box .showhide click'		: function(){
			msgr.display();
		},
		'.chat_box .shout input keydown'	: function(e) {
			e = e || window.event;
			if((e.keyCode || e.which) == 13) glow.events.fire('.chat_box .shout button','click');
		},
		'.chat_box .shout input focus'	: function(e){
			if(this.value===this.title){
				this.value='';
			}
		},
		'.chat_box .shout input blur'		: function(e){
			if(this.value===''){
				this.value=this.title;
			}
		},
		'.chat_box .contacts-control .share click' : function(e){
			// focus on the contact-picker
			$(this).get('div').addClass('focus');
			$(this).get('div').css({'margin-left':-($(this).get('div').width() - $(this).width() - parseInt($(this).css('padding-right')))});
		},
		'.chat_box .contacts-control .share mouseleave' : function(e){
			$(this).get('div').removeClass('focus');
		},
		'.chat_box .shout button click'	: function(){
			$('.chat_box .shout input')[0].focus();
			// IDB_SHOUT_onclick()
			// Broadcast the message
			var val = $('.chat_box .shout input').val();
			if(val.length>0){
				var data = {
					content:val,
					timestamp:(new Date()).getTime(),
					position:(video&&video?video.getCurrentTimecode():null),
					title:	$('h1').html(),
					url:	window.location.pathname,
					cid:	msgr.user.get_address().get_cid()
				};
				// broadcast
				msgr.broadcast('chatBox', data);
			}
			$('.chat_box .shout input').val('');
		}
	},


	/********************************************* 
	 * Load Lib
	 * This is triggered when a consent token is found
	 *********************************************/

	loadlib : function(){
		/**
		 * If the app tag has been created and we have already loaded the libraries, we should define the onauth event
		 * We may at this point want to reinitate function, but for somereason the user is never authenticated when this is called.
		 */
		if(msgr.loaded){
			log('loadinglibraries loaded');
		    var _identity = new Microsoft.Live.Messenger.DelegatedAuthIdentity(document.cookie.match(/msgr-delegation-token=([^;]+)/)[1]);
		    _identity.add_authenticationCompleted(function(sender, e){
				msgr.user = new Microsoft.Live.Messenger.User(_identity);
				msgr.signin();
		    });
			return;
		}

		// Load the Microsoft Loader
		Microsoft.Live.Core.Loader.load([ 'messenger.ui'], function(){ 

			// Build the apptag
			log('Building app tag', msgr.cred);

			glow.dom.get('body').append('<div id="msgrapp" style="display:none;"></div>');

			$create(Microsoft.Live.UI.Messenger.MessengerApplication,
				msgr.cred,
				{authenticated:msgr.auth},
				{},
				glow.dom.get('#msgrapp')[0]);

			msgr.loaded = true;
			
			// Add links to report abuse, toe
			var links = (new Microsoft.Live.Messenger.UI.DelegatedAuthControlLinks(
		         'nonsense',window.navigator.language||window.navigator.browserLanguage));

			// for more settings visit http://msdn.microsoft.com/en-us/library/cc742836.aspx
			$('.chat_box .footnotes .rta').attr('href',links.get_reportAbuseUrl());
			$('.chat_box .footnotes .tos').attr('href',links.get_termsOfUseUrl());
			$('.chat_box .footnotes .hlp').attr('href',links.get_aboutMessengerUrl());

		});
	},

	/**********************************************************
	 * INITIATION
	 * This is defined in the <msgr:app> tag we previously dynamically created
	 * method to call on authentication of a user
	 **********************************************************/
	auth : function(e){ 
	
		log("msgr.auth");

		if(!(msgr.user = e.get_user())){
			return false;
		}

		// save local appid, we use this to check the endpoints of the incoming users.
		msgr.appid = e.get_user().get_localEndpoint().get_applicationId();

		//--------------------------------------------
	    // Set the sign in completed event
	    // 
	    msgr.user.add_signInCompleted(msgr.signin);
	},

	/****************************************************************************
	 * SIGNIN EVENT
	 * Triggered when the userOnSignedIn event is triggered
	 ****************************************************************************/
	signin : function(sender, e) {
		log("On User Signed in",sender,e, msgr.appname);

		if (e.get_resultCode() != Microsoft.Live.Messenger.SignInResultCode.success) {
		    log('an error occured Sign in Result: ' + e.get_resultCode());
		    msgr.signout();
		}
		// Show "Active" Social Bar
		msgr.display(true);
		
		$('.chat_box').addClass('signedin').removeClass('signingin').removeClass('signedout');

		//--------------------------------------------
		// BROADCASTING CONTROL
		// Set presence factory defaults for broadcasting data to other members
		msgr.user.set_presenceFactory(new msgr.PresenceFactory);

		//--------------------------------------------
		// Broadcast player information
		// Set the change handler to broadcasts the users point in the player and whether it is paused or not.
		if(video&&video){
			video.setExternalStateChangeHandler((function(isPlaying, timecode) {
				msgr.broadcast('iWatch',{
					position:	timecode,
					isplaying:	isPlaying,
					title:		$('h1').html(),
					url:		window.location.pathname,
					timestamp:	(new Date()).getTime()
				});
				return arguments.callee;
			})(false,0));
		}

		//--------------------------------------------
		// Event - Signout
		msgr.user.add_signOutCompleted(msgr.signout);
		msgr.user.add_signedOutRemotely(msgr.signout);

		//--------------------------------------------
		// Get online contacts
		// 
		// LISTEN to BROADCASTS
		// For the contacts list
		// Tune in to each contacts broadcasts
		msgr.user.get_onlineContacts().add_collectionChanged(msgr.contactsChanged);

		//--------------------------------------------
		// AUTO INITIATE CONVERSATIONS 
		// Either the conversation begun on another page load
		// Or initiated by a contact
		msgr.user.get_conversations().add_collectionChanged(msgr.conversationsChanged);

	},


	/****************************************************************************
	 * SIGNOUT EVENT
	 * Triggered when a user hits the "Signout from here" link in their 'status' on the top-bar
	 ****************************************************************************/
	signout : function(e) {
	    log('User Signed Out !!', (e&&e.get_reason?e.get_reason():'no reason'));

	    // HideSideBar();
	    // Hide the sidebar, return to original state
		msgr.display(false);
		
		$('.chat_box').addClass('signedout').removeClass('signingin').removeClass('signedin');

		// Remove the user
		msgr.user = null;
	},

	/******************************************************************************
	 * GRAPHIC CONTROLS
	 * 
	 ******************************************************************************/
	display : function(bool){
		// Expanding or collapsing 
		var bool_expand = $('.chat_box .body').height() === 0;

		// drop down the Shout box and contacts
		glow.anim.slideToggle( '.chat_box .body', 1, {
			onStart : function(){
				$('.chat_box .body')[(bool_expand?'add':'remove')+'Class']('show');
				$('.chat_box .showhide')[(bool_expand?'add':'remove')+'Class']('show');
			},
			onComplete : function(){
				
			}
		});
	},
	
	
	/**
	 * Contacts Changed
	 */
	contactsChanged : function(sender,e){
		var that = this;
		// FIND IF THIS CONTACT IS IN THE SAME APPLICATION
		if(!e.get_newItems()) return false;

	    // Loop through new contacts
	    for( var i=0, contacts=e.get_newItems(); i < contacts.length; i++ ){

	    	// Add the user to the list of messenger contacts for the "Share control"
	    	msgr.contactPicker(contacts[i]);

			var endpoints = contacts[i].get_currentAddress().get_endpoints();
			endpoints.add_collectionChanged((function(endpoints, e){
				for (var i = 0, count = endpoints.get_count(); i < count; i++) {
					if ((endpoints.get_item(i)).get_applicationId() === that.appid) {
						// Add user to the list of contacts
						that.contact(contact);
					}
				}
			})(endpoints, null));
	    }
	},

	/**
	 * Conversations Changed
	 */
	conversationChanged : function(sender, e){
	    // Loop through additional conversations
	    for (var i = 0, cid, conv = e.get_newItems(); i < conv.length; i++) {
	    	cid = conv[i].get_creator().get_cid();
			// log('conv',conv[i].get_history().get_lastReceived());
		    // Do not trigger if started by the Session User... otherwise we make redundant requests
	    	if(msgr.user.get_address().get_cid() != cid){
	    		msgr.chat(cid,false);
	    	}
	    }
	},

	/******************************************************************************
	 * ADD TO LIST OF CONTACTS, WHICH CAN BE ADDED TO LIST OF video CONTACTS
	 ******************************************************************************/
	contactPicker : function (contact){
		var cid = contact.get_cid(), 
			$el = (cid?$('.chat_box .contact-picker li.'+cid):null),
			name = Microsoft.Live.Messenger.MessengerUtility.emoticonEncode(contact.get_displayName());
		
		if(!cid)
			return;

		// Does this contact already exist in our contacts list?
		if( $el.length === 0 ){
			$el = glow.dom.create('<li class="'+cid+'"><a class="name" href=""><\/a><\/li>');
		  	$('.chat_box .contact-picker ul').append($el);
		  	glow.events.addListener($el,'click',function(){
				// Start new conversation
				msgr.chat(contact,
					'Hey ' + contact.get_displayName() + "\nI'm currently watching " + $('h1').html() + " and would like to share it with you: " 
					+ window.location.href + (window.location.href.indexOf("?") > -1 ? "&" : "?") +  "_source=windowslivemessenger"		  		
				);
	
				return false;
		  	});
		}
		// ADD name
		$el.get('.name').html('').append(name);
	},

	/******************************************************************************
	 * CONTACTS ADD CONTACT TO THE LIST OF video CONTACTS
	 ******************************************************************************/
	contact : function(contact){

		var cid = contact.get_cid(), 
			$el = (cid?$('.chat_box .contacts li.'+cid):null),
			name = Microsoft.Live.Messenger.MessengerUtility.emoticonEncode(contact.get_displayName());
		
		if(!cid){
			return;
		}	
		
		// Remove the nocontacts div
		$('.chat_box .nocontacts').hide();

		// Does this contact already exist in our contacts list?
		if( $el.length !== 0 ){
			// Update name
			$el.get('.name').html('').append(name);
			return;
		}

		var numFriends  = parseInt($('.num_friends_in_video').html()) || 0;
		// update the number of friends
		$('.chat_box .num_friends_in_video').html((numFriends + 1) + (numFriends?' people':' person') + ' watching');

		// Add contact to the list
		$el = glow.dom.create('<li class="'+cid+'"> \
			<div class="info"> \
				<span class="name"></span> \
				<span class="shout"></span> \
				<button class="btn_sync">Watch together</button> \
				<div class="watching">WATCHING <a>not in video</a></div> \
			</div> \
			<div class="messaging"> \
			</div> \
		</li>');
		
		$el.get('.name').html('').append(name);
		$('.chat_box .contacts ul').append($el);

		// EVENTS
		// Click, SELECT A CONTACT
		glow.events.addListener($el,'click',function(){
			
			// Close all other conversation windows
			$(this.parentNode).children().removeClass('selected');
			// Initiate this one
			$(this).addClass('selected');
			
			// remove hover
			glow.events.fire(this,'mouseleave');

			// Add controls to the chat window and initiate conversation
			msgr.chat(cid);
		});

		// EVENTS
		// Hover
		glow.events.addListener($el,'mouseenter',function(){
			// Add hover event
			// insert li.placeholder after it.
			if($el.hasClass('selected'))
				return;
			$el.width($el.width());
			$el.after('<li class="placeholder" style="height:'+$el.height()+'px;"/>');
			$el.addClass('hover');
		});
		glow.events.addListener($el,'mouseleave',function(){
			// Add hover event
			if($el.next().hasClass('placeholder'))
				$el.next().remove();
			$el.removeClass('hover');
		});
		//--------------------------------------------
		// EVENTS
		// Add events to the controls on the Conversation Box
		//--------------------------------------------
		/*
		glow.events.addListener($el.get('.minimise'), 'click', function(){
			// Trigger the opening of the Contacts list
			glow.events.fire('#IDSSB_FriendSelector', 'click');
		});

		glow.events.addListener($el.get('.close'), 'click', function(){
			// Trigger the opening of the Contacts list

			// remove the elements
			$el.remove();
			
			// Close the actual conversation
			// This prevents the conversation from re-initiating, if the user refreshes the page       			
			try{
				var conv = msgr.user.get_conversations().create(msgr.user.get_onlineContacts().findByCid(cid));
				conv.dispose();
				conv.close();
	        }catch(e){}
		});
		*/
		// Attach sync players event
		// The msgr.user wants to connect to the following CID
		glow.events.addListener($el.get('.btn_sync'), 'click', function(){
			// First determine whether this is a  browser refresh.
			if( window.location.href === this.href ){
				// We are on the right page already... just call the sync function
				msgr.sync(contact);
				// dont redirect page
				return false;
			} else if( this.href == '' ){
				// this link is not defined so lets revist it in a second and see if it is.
				log('Sync rescheduled');
				setTimeout( function(){
					glow.events.fire($el.get('.btn_sync'), 'click');
				}, 1000);
			}
			return true;
		});

		// Attach share conversation
		glow.events.addListener( $el.get('.share'), 'click', function(){
			msgr.chat(cid, 'Hey ' + contact.get_displayName() + "\nI'm currently watching " + $('h1').html() + " and would like to share it with you: " 
				+ window.location.href + (window.location.href.indexOf("?") > -1 ? "&" : "?") +  "_source=windowslivemessenger");
		});

	},
	

	/******************************************************************************
	 * CONVERSATION CONTROL
	 * When a user is clicked to start a new conversation, it passes a click event.
	 * This is also used to automatically send a message to a user
	 *
	 * @param e (Messegner Contact [object] || cid value [scalar] )
	 * @param msg (Message to send to the user || Open conversation window [boolean] )
	 * @return null
	 ******************************************************************************/
	chat : function(e, msg){
	
		//--------------------------------------------
		// e = contact || CID?
		if( typeof(e) !== 'object' ){
			var contact = msgr.user.get_onlineContacts().findByCid(e);
			var cid = e;
		} else {
			// this is triggered by clicking an item in the msgr:contact-list
		    var contact = e;
		    var cid = contact.get_cid();
		}

		// add this to list of contacts
		msgr.contact(contact);

		// trigger event

		// Is this a new conversation?
		if(!$('.chat_box .contacts .'+cid+' .messaging.chat').length){
			// Start conversation
			$create(Microsoft.Live.UI.Messenger.ConversationControl,{
					cid:cid,
					displayPicturesEnabled:false
				},{
					messageReceived:msgr.received
				},
				{},
				glow.dom.get('.chat_box .contacts .'+cid+' .messaging').addClass('chat')[0]
            );
		}

		//--------------------------------------------
		// SEND MESSAGE - `msg`
		// Has the user passed a message to share with the user?
		// e.g. msgr.chat(cid, "Ah-hoy there");
		//--------------------------------------------
		if(typeof(msg) === 'string'){
			try{
				(msgr.user.get_conversations().create(contact)).sendMessage(new Microsoft.Live.Messenger.TextMessage(msg));
			}catch(e){log(e);}
		}
		
		// ELSE if this is BOOLEAN fire the click event
		if( msg === true )
			glow.events.fire($('.chat_box .contacts li.'+cid),'click');

		//--------------------------------------------
		// CHAT INITIATED
		return;
	},
	
	/**
	 * Triggered when an incoming conversation message is recieved
	 * @param 
	 */
	received : function(sender, e){
		var msg = sender.get_message();
		$('.contacts .'+msg.get_sender().get_cid()).addClass("hello");
	},

	/******************************************************************************
	 * PRIVATE UTILITY FUNCTIONS
	 * Misc
	 ******************************************************************************/
	// verify the structure of the CID
	verifyCID : function(value){
	    return  /^(\-{0,1}[0-9]{1,20}|\$user)$/.test(value);
	},
	
	/******************************************************************************
	 * BROADCASTING
	 * @param channel String Title of the channel, this is used to identify the communication
	 * @param data Mixed
	 ******************************************************************************/

	broadcast : function( channel, data ){
		log('BROADCAST',channel,data);
		(((msgr.user.get_endpoints()).get_item(0).get_presence()).get_extensions()).add(new msgr.PresenceExtension(channel, data));
	},

	//--------------------------------------------
	// Listen
	// The trigger defined in the msgr.auth sets this off
	// @param string Channel a shared reference to identify the communication
	// @param Mixed Data mixed JSON
	// @param contact A Messenger Live contact object
	listen : function(channel,data,contact){
		log('HEARD:',channel,data,contact);s
		var cid = contact.get_cid();
		switch(channel){
			case 'chatBox' : 
				// Update relevant shout box
				var $el = $('.chat_box .contacts .'+cid+' .shout');
				$el.html('');
				$el.append(Microsoft.Live.Messenger.MessengerUtility.emoticonEncode(data.content));
				$el.css({opacity:1});
				glow.anim.fadeOut($el,100);
			break;
			case 'iWatch' :
				// Update what your friends are watching
				// Broadcasted information about what your friends are watching.
				// Update contacts stuff about what they are watching
				$('.chat_box .contacts .'+cid+' .watching a').html(data.title);

				$('.chat_box .contacts .'+cid+' .btn_sync').attr({
						title: "Sync your play with " + msgr.user.get_onlineContacts().findByCid(cid).get_displayName() + ', who is watching ' + data.title,
						href:	data.url+'#_mslivesync='+cid
				});
//				$('#conv_'+cid+' .FBTimeStamp, #'+cid+' .FBTimeStamp, .'+cid+' .FBTimeStamp').html('Watching <a href="' + data.url + '" title='+data.title+'>'+data.title+'</a>');
			break;
		}
	},
	// Presence Extension, 
	// A Private extension of Windows Live Messenger
	PresenceExtension : function(name, content) {
	    return {
			name : name,
			content : content,
			// Compulsory functions for an Extension
	    	get_name : function (){return this.name;},
			get_content : function (){return this.content;},
			set_content : function (newcontent){this.content = newcontent;}
	    }
	},
	PresenceFactory	: function () {
		return {
			serialize: function(prop){
				// by default we're gonna put more info in.
				log('serialize',prop);
				return JSON.stringify(prop.get_content());
			},
			deserialize: function(channel,data){
				log('deserialize',channel,data);
				if(data==null||data=='')
					return;
				try{
					data = (/^\{.*\}$/.test(data)?JSON.parse(data):data);
				}catch(e){
					log('Could not parse JSON', data);
				}
				return new msgr.PresenceExtension(channel,data);
			}
		};
	},

	// -----------------------------
	// Sync machine with a particular contact
	// -----------------------------
	sync : function(contact){
		// For the selected contacts cid...
		// we need to determine what they're watching and how far through they are.
		// To do this we look through at the users information which includes their iWatch broadcasts.

		// check is this a CID value being parsed?
		if(typeof(contact)!=='object'){
			contact = msgr.user.get_onlineContacts().findByCid(contact);
		}
		
		// Get the last data sent by the client
		var data = function(contact){
			    var extension = null;
			    var endpointEnum = contact.get_currentAddress().get_endpoints().getEnumerator();
				while (endpointEnum.moveNext()) {
					if ((extension = endpointEnum.get_current().get_presence().get_extensions().get_item('iWatch'))) {
						return extension.get_content()
					}
				}
			    return null;
			}(contact);

		// if there is no data then lets reschedule
		if( data === null || !video || !video.getIsInitialised() ){
			log('Rescheduling sync');
			setTimeout( function(){msgr.sync(contact)}, 1000 );
			return;
		}

		// -------------------------------------------
		// Else we can successfully update the video

		log('Syncing',data);
    	
    	if(data.isplaying){
    		// guess the current position
    		data.position = parseFloat(data.position);
    		data.position += (parseFloat((new Date()).getTime()-data.timestamp)/1000);
    		log("New position",data.position, parseFloat((new Date()).getTime()-data.timestamp));
    	}
		msgr.playerStart(data.position);
	},
	
	/**
	 * Start the player at a particular position
	 */
	playerTimer: null,
	playerStart: function(position){
		console.log("Starting Player at "+ position);

		if(msgr.playerTimer)
			clearTimeout(msgr.playerTimer);

		if( !video || !video.getIsInitialised() ){
			log('Rescheduling sync');
			msgr.playerTimer = setTimeout( function(){msgr.playerStart(position)}, 1000 );
			return;
		}
    	var emp = video.getReference();
    	position = parseFloat(position);
        emp.call('play');
		if(!video.getCurrentTimecode()){
		   	// not playing yet - skip the ident and set the start position
			emp.call('cueItem', [video.getEpisode().versionPid, position]);
		}else{
			// Start from scratch
			emp.call('seekTo', [position]);
		}
		// Initiate
		emp.call('play');
	}
}



function log() {
    if (typeof(console) === 'undefined') return;
	console.log((arguments.length) === 1? arguments[0] : arguments );	
}


/**
 * Default video
 */

var video = {
				getCurrentTimecode : function(){},
				call : function(){},
				getEpisode : function(){return {versionPid:1};},
				setExternalStateChangeHandler : function(){},
				getReference : function(){}
			};


/**
 * Functions available in the global namespace
 * These functions are attached to events triggered from msgr:* tags
 */
OnUserSignedOut = msgr.signout;
	
// Conversation Control
onMessageReceived = msgr.received;

// msgr:contact-picker
ContactSelected = msgr.chat;