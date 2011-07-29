/**
 * Get the expiry date of the access token
 * You can store the access token expiry in anyway but this function helps when working with the existing API
 */	
function getAccessTokenExpiry(){
	// Our connect script returns a c_expiry cookie, so on initial load we must use this.
	if(document.cookie.match(/c_expiry=([0-9]+)/)){
		document.cookie="wl_accessTokenExpireTime="+((new Date).getTime()+(parseInt(document.cookie.match(/c_expiry=([0-9]+)/)[1]))*1000)+"; path=/";
		document.cookie="c_expiry=; path=/";
	}
	var exp = document.cookie.match(/wl_accessTokenExpireTime=([0-9]+)/);
	return (exp?(parseInt(exp[1])/1e3):0);
}

/**
 * Get Access Token
 * You can store the access token in anyway but this function helps when working with the existing API
 */
function getAccessToken(){
	// c_accessToken
	var tok = document.cookie.match(/c_accessToken=([^;]+);/);
	if(!tok){
		tok = document.cookie.match(/wl_accessToken%22%3A%22([^;]+?)%22/);
	}
	// Our connect script returns a c_expiry cookie, so on initial load we must use this.
	return (tok?tok[1]:false);
}
	
/**
 * Checks some cookies, to see if the user is signed in
 * wl_accessTokenExpireTime is the cookie created in the script (this is the same as the Messenger Connect JS API)
 * c_expiry is created by the connect authentication script.
 */
function getState(){
	
	// If signed in we'll have a valid wl_accessTokenExpireTime cookie, we'll have to check the time of that
	var signedIn = ((((new Date).getTime()/1000) - getAccessTokenExpiry())<0);
	
	document.getElementById("signin").innerHTML = signedIn ? "Sign Out" : "Connect";
	
	return signedIn;
}
	


/**
 * Listens for a change in state indicated by the cookies.
 */
function cookie_listener(){
	if( !getState() ){
		setTimeout(cookie_listener, 300);
	}
}



/**
 * Action to trigger when the user hits the connect/signout button
 */
function signInOut(){
	if(!getState()){
		// sign the user in
		window.open('https://consent.live.com/connect.aspx?wrap_client_id=' + connect.clientId + '&wrap_callback=' + connect.url + '&wrap_scope=WL_Photos.View',
					'Signin',
					'width=465,height=420');
		
		// Set listener to listen for cookies being changed
		cookie_listener();
	}
	else{
		// signout
		document.cookie="wl_accessTokenExpireTime=; path=/";

		// Update the button;
		getState();
	}
}

/**
 * Window onload event
 */
window.onload = getState;