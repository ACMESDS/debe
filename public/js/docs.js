module.exports = {  // regressors
	_keys: {
		Pipe: `json comment '
The following context keys are accepted:

	tbd = [...]

' `,
		_actors: "int(11) default 0 comment 'number of actors over entire doc corpus' ",
		_links: "int(11) default 0 comment 'number of actor links disocvered over entire doc corpus' ",
		_topic: "varchar(64) default 0 comment 'topic/intent having the largest level score over entire doc corpus' ",
		_level: "float default 0 comment 'greated topic score woverithin entire doc corpus' ",
		_relevance: "int(11) default 0 comment 'relevancing score over entire doc corpus' ",
		_sentiment: "float default 0 comment 'sentiment score over entire doc corpus' ",
		_agreement: "float default 0 comment 'topic claffiier agreement over entire doc corpus' ",
		_weight: "float default 0 comment 'topic weight over entire doc corpus' ",		
		
		Override: "float default 0 comment 'Regression prediction override' ",
		Method: "varchar(64) comment 'NLP method' ",
		Description: "mediumtext"
	},
	
	engine: function docs(ctx, res) {  
	/* 
	NLP of docs where:

		Method: regression technique to USE = lrm | svm | pls | knn	| ols | ...
		Save_USE: training model for specified Method 
		hyper_USE: solver parameter for specified Method 
		Save_jpg: jpg generation parameters
		Samples: number of training samples taken at random from supplied dataset
		Channels: number of training channels takens consecutively from supplied dataset
		Keep:  number of regression pairs to retain after training
		
	given x,y data presented as:
	
		x = [...], y = [...]				// training mode
		x = [...]							// predict mode
		xy = { x: [...] , y: [...} } 		// training mode
		multi = { x: [ [...]...], y: [ [...]...], x0: [ [...]...] } 	// training mode multichannel
		unsup = [...] 							// unsupervised training mode
	*/
		var 
			use = ctx.Method || "anlp",
			nlps = {
				anlp: $.READ.anlpDoc,
				snlp: $.READ.snlpDoc
			},
			nlp = nlps[use];
		
		if ( nlp ) 			
			$.thread( sql => {
				nlp(ctx.Doc, metrics => {
					Log(metrics);
					var save = {};
					Each( metrics, (key,val) => save["_"+key] = val );
					sql.query("UPDATE app.docs WHERE ? SET ?", [ {Name: ctx.Name}, save ]);
					res(ctx);
				});
			});
					 
		else
			res( new Error("invalid nlp method") );
	}

}
