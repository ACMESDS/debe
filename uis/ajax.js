// add ajax method to the navigator

navigator.ajax = function ( method, async, url, cb , body, kill ) {
	var req = ((window.XMLHttpRequest)  			// get a request handle
			? new XMLHttpRequest()
			: new ActiveXObject("Microsoft.XMLHTTP"));

	req.onreadystatechange = function() { 				// Set the callback
		if (req.readyState==4 && req.status==200) 	// Service completed 
			if (cb) 			// pass response to callback
				if ( cb( req.responseText ) ) 	// test callback returned status
					if (kill) kill();  // kill the document if cb returns true
	};

	req.open(method, url, async); // start request
	if (body)
		req.send(JSON.stringify(body));  	// end request
	else
		req.send();  // end request
}
