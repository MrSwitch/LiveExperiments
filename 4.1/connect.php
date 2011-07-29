<?php
/**
 * This script handles the OAUTH_WRAP verification with the live servers. 
 * If no paramebers are given and it is loaded in as a <script> into a web page it defines an object "token" which contains the enviroment settings to your application.
 *
 * ?wrap_verification_code	-	Will make an OAUTH_WRAP handshake and create access token
 * no parameters			-	Return domain specific attributes
 *
 * @author Andrew Dodson
 *
 * SETUP
 * ------------
 * 1. Obtain an application ID from http://manage.dev.live.com/
 * 2. Place Application ID (appid) and Secret in $settings below
 */

$wrap_token_url = 'https://consent.live.com/AccessToken.aspx';

switch($_SERVER['HTTP_HOST']){
	case 'sandbox.knarly.com':
		$settings = array(
			'appid'				=> '000000004803E258',
			'secret'			=> 'rGr55XLYobkXvPl8sqxzVV5lhy4GPZ95'
		);
	break;
	case 'sandbox.knarly.local':
		$settings = array(
			'appid'				=> '000000004403AD10',
			'secret'			=> 'gvApbehUKXygLsZRIPyitjdrlrqo7ksJ',
		);
	break;
	case 'liveexperiments.com':
		$settings = array(
			'appid'				=> '000000004C03D93B',
			'secret'			=> 'zgGkIlwfdlgWZ2zIeO1rGrYvyisBHLYA'
		);
	break;
	
}


/**
 * Initiate Session
 */
session_start();

$path = "http://".$_SERVER['HTTP_HOST'].$_SERVER['SCRIPT_NAME']; // PHP_SELF

/**
 * Is this a call to the Auth Handler
 * If so this script is run in a popup and needs to set some cookies and process the request.
 */
if( ! empty($_GET['wrap_verification_code'] ) ){

	// make a secure request to get an access token
	// this uses variables configured in oauthwrapconfig.php

	$cURL = curl_init();
	curl_setopt_array($cURL, array(
		CURLOPT_URL => $wrap_token_url,
		CURLOPT_POST => true,
//		CURLOPT_PROXY => "127.0.0.1:8888", 
		CURLOPT_POSTFIELDS => ($a = array(
			// this is the unique ID for your application
			'wrap_client_id' => $settings['appid'],
			// this is the secure secret for your application.  DO NOT expose this to users
			'wrap_client_secret' => $settings['secret'],
			// when the user clicks 'ok' in the auth popup, the popup window will be redirected to this URL.  
			// this page needs to then request a token and store the response in session state (for REST calls) and/or cookies (for JS calls)
			'wrap_callback' => $path . (!empty($_GET['callback'])?'?callback='.$_GET['callback']:null),
			
			'wrap_verification_code' => ($_GET['wrap_verification_code'])
		)),
		CURLOPT_PORT => 443,
		CURLOPT_HEADER  => 0, 
		CURLOPT_VERBOSE => false,
		CURLOPT_SSL_VERIFYPEER => false, // TODO: enable SSL verification
		CURLOPT_RETURNTRANSFER => true ));
	$content = curl_exec($cURL);

	curl_close($cURL);

	// the response comes back as series of form-encoded values in the body
	// split this string into an array of name-value pairs
	parse_str($content, $response);

	// store values retrieved from the access token request into session state
	$_SESSION = $response + $_SESSION;

	if(!array_key_exists('wrap_access_token',$response)){
		print_r(array("Failed",$response,$a));
		exit(1);
	}
	
	// store values retrieved from the access token request into cookies
	// cookies must use these names so that the Messenger Connect JavaScript library can find them
	foreach( array( 
		'c_accessToken' => $response['wrap_access_token'],
		'c_expiry'	=> $response['wrap_access_token_expires_in'], // TODO: get this in the right format
		'c_uid'		=> $response['uid'],
		'c_clientId'=> $settings['appid'],
		'c_clientState' => @$_GET['wrap_client_state'],
		'c_scope'	=> $_GET['exp'],
		'lca'		=> 'done' // this one must be set last - it signals to the JS library that the other cookies are ready
	) as $k => $o )
		setcookie( $k, $o, time()+(int)$response['wrap_access_token_expires_in'], '/' );
	
	echo '<html><head><script>function callback(){'.(!empty($_GET['callback'])?'window.opener.'.$_GET['callback'].'(\''.$response['wrap_access_token'].'\','.$response['wrap_access_token_expires_in'].')':null).';self.close();}setTimeout(callback,1000)</script></head><body onload="callback()"></body></html>';
	
	exit;
} else {
// print the credentials as a json object
print "var connect = " . 
		json_encode((object)array(
			'url' => $path,
			'clientId'	=> $settings['appid']
		));

}
?>