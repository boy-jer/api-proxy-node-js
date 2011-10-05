#!/usr/bin/php -q
<?

$app_id = 'mobile-app-v1.0';
$secret = 'secretsuper';
$signature_protocol = 'sha1';

$receipt = 'ABCDEFG';
$guid = '123456';


// Get captcha url

$url_base = "http://localhost:9000/captcha?app_id=$app_id&receipt=$receipt&guid=$guid";
$url_base_sign = $url_base . gmdate( 'Ymd' );
$signature = urlencode(base64_encode(hash_hmac( $signature_protocol, $url_base_sign, $secret, true )));
$url = $url_base . '&signature=' . $signature . '&signature_protocol=' . $signature_protocol;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($ch);
curl_close($ch);
echo "request: $url\n"; 



// Get Token

$url_base = "http://localhost:9000/ws/1.1/token.get?app_id=$app_id&receipt=$receipt&guid=$guid";
$url_base_sign = $url_base . gmdate( 'Ymd' );
$signature = urlencode(base64_encode(hash_hmac( $signature_protocol, $url_base_sign, $secret, true )));
$url = $url_base . '&signature=' . $signature . '&signature_protocol=' . $signature_protocol;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($ch);
curl_close($ch);
echo "request: $url\n"; 
echo "usertoken.get response: ".indent($response)."\n";
$decoded_response = json_decode($response, true);
if ( $decoded_response['message']['header']['status_code'] != 200 )
	exit( "error getting usertoken." );
$usertoken = $decoded_response['message']['body']['user_token'];

// Do Da Call
$method = stripos( $argv[1] , "?" ) === false ?  $argv[1] . "?"  : $argv[1] . "&" ;
$url_base = "http://localhost:9000/ws/1.1/" . $method . "app_id=$app_id&usertoken=$usertoken";
if ($argv[2]) $url_base.= '&' . $argv[2];
$url_base_sign = $url_base . gmdate( 'Ymd' );
$signature_base64 = base64_encode(hash_hmac( $signature_protocol, $url_base_sign, $secret, true ));
$signature = urlencode( $signature_base64 );
$url = $url_base . '&signature=' . $signature . '&signature_protocol=' . $signature_protocol;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($ch);
curl_close($ch);
echo "request: $url\n"; 
echo "call response: ".indent($response)."\n";


function indent($json) {

    $result      = '';
    $pos         = 0;
    $strLen      = strlen($json);
    $indentStr   = '  ';
    $newLine     = "\n";
    $prevChar    = '';
    $outOfQuotes = true;
    $json        = stripcslashes($json);

    for ($i=0; $i<=$strLen; $i++) {

        // Grab the next character in the string.
        $char = substr($json, $i, 1);

        // Are we inside a quoted string?
        if ($char == '"' && $prevChar != '\\') {
            $outOfQuotes = !$outOfQuotes;
        
        // If this character is the end of an element, 
        // output a new line and indent the next line.
        } else if(($char == '}' || $char == ']') && $outOfQuotes) {
            $result .= $newLine;
            $pos --;
            for ($j=0; $j<$pos; $j++) {
                $result .= $indentStr;
            }
        }
        
        // Add the character to the result string.
        $result .= $char;

        // If the last character was the beginning of an element, 
        // output a new line and indent the next line.
        if (($char == ',' || $char == '{' || $char == '[') && $outOfQuotes) {
            $result .= $newLine;
            if ($char == '{' || $char == '[') {
                $pos ++;
            }
            
            for ($j = 0; $j < $pos; $j++) {
                $result .= $indentStr;
            }
        }
        
        $prevChar = $char;
    }

    return $result;
}

?>
