/**
 * Windows Live Client ID helps us identify your app and subdomains.
 * Obtain yours by registering your main and developement domains at http://manage.dev.live.com
 * Then update the object-literal below with these domains and ID's
 * @author Andrew Dodson
 */
var CLIENT_ID = {
	'sandbox.knarly.local'	:'000000004403AD10',
	'sandbox.knarly.com'	:'000000004803E258',
	'liveexperiments.com'	:'000000004C03D93B'
}[window.location.hostname];