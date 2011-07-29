<?php

$clientid = "YOUR CLIENT-ID";
$secret = "YOUR SECRET";

// Is this a response
if( ! empty($_GET["wrap_verification_code"] ) ){
	$cURL = curl_init();
	curl_setopt_array($cURL, array(
		CURLOPT_URL => "https://consent.live.com/AccessToken.aspx",
		CURLOPT_POST => true,
		// CURLOPT_PROXY => "127.0.0.1:8888", // debugging with fiddler
		CURLOPT_POSTFIELDS => ($a = array(
			'wrap_client_id' => $clientid,
			'wrap_client_secret' => $secret,
			'wrap_callback' => "http://".$_SERVER["HTTP_HOST"].$_SERVER["SCRIPT_NAME"], // PHP_SELF
			'wrap_verification_code' => $_GET['wrap_verification_code']
		)),
		CURLOPT_PORT => 443,
		CURLOPT_HEADER => 0, 
		CURLOPT_VERBOSE => false,
		CURLOPT_SSL_VERIFYPEER => false,
		CURLOPT_RETURNTRANSFER => true ));
	$content = curl_exec($cURL);
	
	curl_close($cURL);
	
	// turn the form-encoded response into an array
	parse_str($content, $response);
	
	// Something went wrong?
	if(!array_key_exists('wrap_access_token',$response)){
		print_r(array("Failed",$response,$a));
		exit(1);
	}
	
	// Define Cookies for the Messenger Connect JavaScript library to find them
	foreach( array( 
		'c_accessToken' => $response['wrap_access_token'],
		'c_expiry' => $response['wrap_access_token_expires_in'],
		'c_uid' => $response['uid'],
		'c_clientId'=> $settings['appid'],
		'c_clientState' => @$_GET['wrap_client_state'],
		'c_scope' => $_GET['exp'],
		'lca' => 'done' // this one must be set last - it signals to the JS library that the other cookies are ready
		) as $k => $o )
		setcookie( $k, $o, time()+(int)$response['wrap_access_token_expires_in'], '/' );
}
?>
<html><head></head><body onload="self.close()"></body></html>