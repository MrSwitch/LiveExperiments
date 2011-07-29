<%@ Page Language="C#" ClassName="Callback" AutoEventWireup="true" Debug="true" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.IO" %>
<script runat="server">
/**
 * This token script allows us to create cookies on the client.
 */

    protected void Page_Load(object sender, EventArgs e)
    {
    	/**
    	 * Get the right credentials
    	 */
	    string[] settings = new String[2];
		settings[0] = "your app id here";
		settings[1] = "your app secret here";

        // if we got back a verification code
        if (Request.QueryString["wrap_verification_code"] != null)
        {
            // construct a request for an access token
            WebRequest tokenRequest = WebRequest.Create("https://consent.live.com/AccessToken.aspx");
            tokenRequest.ContentType = "application/x-www-form-urlencoded";
            tokenRequest.Method = "POST";
            using (StreamWriter writer = new StreamWriter(tokenRequest.GetRequestStream()))
            {
                writer.Write(
                    string.Format("wrap_client_id={0}&wrap_client_secret={1}&wrap_callback={2}&wrap_verification_code={3}",
                        HttpUtility.UrlEncode(settings[0]),
                        HttpUtility.UrlEncode(settings[1]),
                        HttpUtility.UrlEncode("http://"+Request.ServerVariables["SERVER_NAME"]+Request.ServerVariables["SCRIPT_NAME"]),
                        HttpUtility.UrlEncode(Request.QueryString["wrap_verification_code"])
                ));
            }

            // sent the request and get the response
            WebResponse tokenResponse = tokenRequest.GetResponse();

            // read the first line of the response body
            string tokenResponseText = new StreamReader(tokenResponse.GetResponseStream()).ReadLine();

            // parse the response body as being in the format of 'x-www-form-urlencoded'
            NameValueCollection tokenResponseData = HttpUtility.ParseQueryString(tokenResponseText);
           
            // store response data in session state
            Session["wl_wrap_access_token"] = tokenResponseData["wrap_access_token"];

            // store data in cookies where the JS library will pick them up
            Response.Cookies["c_clientId"].Value = settings[0];
            Response.Cookies["c_clientState"].Value = Request.QueryString["wrap_client_state"];
            Response.Cookies["c_scope"].Value = Request.QueryString["exp"];
            Response.Cookies["c_accessToken"].Value = tokenResponseData["wrap_access_token"];
            Response.Cookies["c_expiry"].Value = tokenResponseData["wrap_access_token_expires_in"];
            Response.Cookies["c_uid"].Value = tokenResponseData["uid"];
            Response.Cookies["lca"].Value = "done";
        }
    }
</script>
<!DOCTYPE html>
<html><body onload="self.close();"></body></html>