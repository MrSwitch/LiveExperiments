<?php
/**
 * This script it a dynamic tool used for communicating with a static page.
 * It enables us to take the creation of the application-verifier-token to a URL to be interacted with via a REST method.
 * 
 * ?token	-	Sets the DELEGATION TOKEN cookie
 * ?attr	-	Return attributes of <msgr:app> tag in JSON
 *
 *
 *
 * @author: Andrew.Dodson@live.com, i-andods@microsoft.com
 * @copyright Microsoft
 *
 * SETUP
 * ------------
 *	1.	Obtain an application ID from https://live.azure.com/Cloud/Provisioning/Services.aspx?ProjectId=0
 * 		(More info about App ID at - http://msdn.microsoft.com/en-us/library/bb676626.aspx)
 *	2.	Place Application ID (appid) and Secret in $settings below
 *
 *
 * DEPENDENCIES
 * ------------
 *	1.	mcrypt (See http://www.php.net/manual/en/book.mcrypt.php)
 *	2.	PHP >= 5.1.2 (because of the hash() function)
 *
 */

$self = 'http://'.$_SERVER['HTTP_HOST'].$_SERVER['SCRIPT_NAME'];

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

$appVerifier = urlencode(( $token = ( 'appid=' . $settings['appid'] . '&ts=' . time() ) ) 
			. '&sig=' . urlencode(base64_encode(hash_hmac("sha256",$token, 
							substr(
								hash('sha256', 'SIGNATURE' . $settings['secret'], true),
								0, 
								16),
							true)
						)));

/**
 * If ?token exists. We set the DELEGATION TOKEN cookie?
 */
if(isset($_REQUEST['token'])){

	/**
	 * Process Consent Token which has been defined by the embeded script
	 * To create the Delegation token to ... (missing description)
	 */
	if(!empty($_POST['ConsentToken'])){
		setrawcookie('msgr-consent-token',( $_COOKIE['msgr-consent-token'] = urldecode($_POST['ConsentToken']) ),0, '/');
	}

	/**
	 * Process token
	 * This is in a WHILE loop because we might want to run it a second time if the Consent-Token has expired,
	 */
	$i=0;
	while( $i++ < 2 ){

		print $i;
		if(!$_COOKIE['msgr-consent-token']){
			print "Whoops! we haven't got a cookie called msgr-consent-token defined! - fail!";
			exit;
		}

		parse_str($_COOKIE['msgr-consent-token'],$parsedToken);
		print_r($parsedToken);
		// Process this token... this is the confusing part
		$token = base64_decode($parsedToken['eact']);
		$cryptkey = substr( hash('sha256', 'ENCRYPTION' . $settings['secret'], true), 0, 16);
		parse_str(mcrypt_decrypt(MCRYPT_RIJNDAEL_128, $cryptkey, substr($token, 16), MCRYPT_MODE_CBC, substr($token, 0, 16)),$parsedToken);
	
		// Has the token expired?
		if(!array_key_exists('exp', $parsedToken)
			|| !array_key_exists('offer', $parsedToken)){
			print "Can't get exp or offers from msgr-consent-token! - fail!";
			foreach($parsedToken as $k)
				print_r($k);
			exit;
		}

		if($parsedToken['exp']>0&&(time()-300) < $parsedToken['exp']){
			// we already have a valid token
			// So no more processing
			break;
		}
	
		// Refresh the consent token
		// Our refresh Token is $parsedToken['reft'], we also need to pass the offers which are  ;
		// Our offers are needed too... $parsedToken['offer']
		$offers = array();
		$off = explode(';',urldecode($parsedToken['offer']));
		foreach($off as $o){
			$o = explode(':', $o);
			$offers[] = $o[0];
		}

        $body = file_get_contents($s = 'https://consent.live.com/RefreshToken.aspx?' . implode('&', array(
        	'ps=' . urlencode(implode(',',$offers)),
        	'reft=' . urlencode($parsedToken['reft']),
        	"ru=" . urlencode($self . '?token'),
        	'app='. ($appVerifier)
        )));

 		preg_match('/\{"ConsentToken":"(.*)"\}/', $body, $matches);
        if(count($matches) !== 2) {
        	print "Unrecognised response from \n" .$s. "\n". $body;
            exit();
		}
		//setrawcookie('msgr-consent-token',( $_COOKIE['msgr-consent-token'] = ($matches[1]) ),0, '/');
		// run a second time
	}

	/**
	 * Set delegation token
	 */
	setrawcookie('msgr-delegation-token', $parsedToken['delt'], 0, '/');
	
	if( !empty($_GET['callback']) ){
		echo '<html><head></head><body onload="window.opener.'.$_GET['callback'].'();self.close();"></body></html>';
	} else {
		// Return the delegation token
		print 'appVerifier='.$appVerifier;
	}

/**
 * Return a JSON string of all the attributes we want to create the <msgr:app> tag with
 */
} else if(isset($_REQUEST['attr']) ){
	print json_encode((object)array(
		// REQUIRED
		// ---------------------
		'privacyUrl'	=> $self.'?privacy', // e.g. "Privacy.html"
		'tokenUrl'		=> $self.'?token', // "refreshMesengerToken.php"
		'channelUrl'	=> $self.'?channel', // e.g. "Channel.html"
	
		// Encrypt's the secret key
		'applicationVerifierToken'	=> $appVerifier,
		
		// OPTIONAL
		// ------------------------
//		'applicationLogo'	=> dirname($self)."/logo.png",
		'applicationName'	=> "chatBox",
		'signInEnabled'		=> true
	));


} else {
	print 'appVerifier='.$appVerifier;
}

?>