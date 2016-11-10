/**
 * This sample demonstrates a simple driver  built against the Alexa Lighting Api.
 * For additional details, please refer to the Alexa Lighting API developer documentation 
 * https://developer.amazon.com/public/binaries/content/assets/html/alexa-lighting-api.html
 */
var http = require('http');
var xml2js = require('xml2js');
var htmlparser2 = require('htmlparser2');
var STATUS_PATH = '/status/serviceStatus.txt';
var STATUS_URL = 'http://www.web.mta.info';

/**
 * Main entry point.
 * Incoming events from Alexa Lighting APIs are processed via this method.
 */
exports.handler = function(event, context) {

    log('Input', event);

    switch (event.request.type) {
        case 'IntentRequest':
            handleIntent(event.request.intent, context);
            break;

        default:
            log('Err', 'No supported namespace: ' + event);
            context.fail('Something went wrong');
            break;
    }
};


function handleIntent(intent, context) {

    /**
     * Fail the invocation if the header is unexpected. This example only demonstrates
     * turn on / turn off, hence we are filtering on anything that is not SwitchOnOffRequest.
     */
        var lineToFind = intent.slots.Subway.value.toUpperCase();
         var options = {
            hostname: "web.mta.info",
            path: STATUS_URL + STATUS_PATH,
            headers: {
                accept: '*/*'
            }
        };

        var serverError = function (e) {
            log('Error', e.message);
            /**
             * Craft an error response back to Alexa Smart Home Skill
             */
            context.fail(generateControlError('GetStatus', 'DEPENDENT_SERVICE_UNAVAILABLE', 'Unable to connect to server'));
        };

        var callback = function(response) {
            var str = '';

            response.on('data', function(chunk) {
                str += chunk.toString('utf-8');
            });

            response.on('end', function() {
                /**
                 * Test the response from remote endpoint (not shown) and craft a response message
                 * back to Alexa Smart Home Skill
                 */
                log('done with result');
                var parser = new xml2js.Parser();
                var line;
                parser.parseString(str, function (err, result) {
                    result.service.subway[0].line.filter(function(el){
                        if (el.name[0].indexOf(lineToFind) != -1){
                            line = el
                            return true;
                        }
                        return false;
                    });
                });
                log('Got Line',JSON.stringify(line));
                var statusText = "";
                if (line.status[0] !== "GOOD SERVICE"){
                     var htmlparser = new htmlparser2.Parser({
                        ontext: function(text){
                            statusText += text;
                        }
    
                    }, {decodeEntities: true});
                    htmlparser.write(line.text[0]);
                    htmlparser.end();
                }else{
                    statusText = "The " + line.name[0] + " is in good service.";
                }
               
                var response = {
                  "version": "1.0",
                  "sessionAttributes": {},
                  "response": {
                    "outputSpeech": {
                        "type": "SSML",
                        "ssml": "<speak>" + statusText.replace(/\\n|\\r/gm,'') +"</speak>"
                    },
                    "shouldEndSession": true
                  }
                }
                
                log('Done with result', response);
                context.succeed(response);
            });

            response.on('error', serverError);
        };

        /**
         * Make an HTTP call to remote endpoint.
         */
        http.get(options, callback)
            .on('error', serverError).end();
}

/**
 * Utility functions.
 */
function log(title, msg) {
    console.log('*************** ' + title + ' *************');
    console.log(msg);
    console.log('*************** ' + title + ' End*************');
}

function generateControlError(name, code, description) {
    var headers = {
        namespace: 'Control',
        name: name,
        payloadVersion: '1'
    };

    var payload = {
        exception: {
            code: code,
            description: description
        }
    };

    var result = {
        header: headers,
        payload: payload
    };

    return result;
}
