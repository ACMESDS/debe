module.exports = {
	usecase: {
	},
	
	engine: function jsdemo4(ctx, res) {
		LOG("jsdemo4 ctx", ctx);
		TASK({  
			keys: "i,j,k",  	// e.g. array indecies
			i: [0,1,2,3],  		// domain of index i
			j: [4,8],				// domain of index j
			k: [0],					// domain of index k
			qos: 0,				// regulation time in ms if not zero
			workers: 4, 		// number of workers (aka cores) per node
			nodes: 3 			// number of nodes (ala locales) in the cluster
		}, 
			// here, a simple task that returns a message 
			($) => "my result is " + (i + j*k) + " from " + $.worker + " on "  + $.node,

			// here, a simple callback that displays the task results
			(msg) => console.log(msg) 
		);	
	}
}