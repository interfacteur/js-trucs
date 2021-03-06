<?php
header("Access-Control-Allow-Origin: equatorium.net"); //et contrôle du referer…

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-cache");

preg_match("/^http:\/\/www\.equatorium\.net/", $_SERVER[HTTP_REFERER], $m); //et header("Access-Control-Allow-Origin: equatorium.net");
if (count($m) == 1) {
	$url = explode("query=", "http://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]");

	if (count($url) > 1) {

		stream_context_set_default(array("http" => array("header" => "User-Agent: Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36")));
		@get_headers($url[1], 1);
		$headers = $http_response_header;

 		if (count($headers) == 0) { //http://stackoverflow.com/questions/2280394/how-can-i-check-if-a-url-exists-via-php
			$headMI = "null";
 			$headCO = "-1 Address not found";
 		}
 		else
			foreach ($headers as $value) {
				if (count(preg_split("/Content-Type\s*:/i", $value)) > 1)
					$headMI = '"'.preg_split("/Content-Type\s*:\s*/i", $value)[1].'"';
				if (count(preg_split("/^HTTP\/\d\.\d\s+/i", $value)) > 1)
					$headCO = preg_split("/^HTTP\/\d\.\d\s+/i", $value)[1];
			}

		print "{\n";
		print "\t\"typeMime\": ".$headMI.",\n";
		print "\t\"code\": \"".$headCO."\"\n";
		print "}";
}	}

/* http://www.equatorium.net/e1/ou--outils/proxy2mime.php :
exemples sur http://www.equatorium.net/e1/ou--outils/proxy2mime-exemples.html
*/

?>