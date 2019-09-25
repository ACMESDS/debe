module.exports = {  // regressors
	_keys: {
		Pipe: `json comment '
The following context keys are accepted:

	tbd = [...]

' `,
		_actors: "int(11) default 0 comment 'number of actors over entire doc corpus' ",
		_links: "int(11) default 0 comment 'number of actor links disocvered over entire doc corpus' ",
		_topics: "varchar(64) default 0 comment 'number of relevant topics/intents ' ",
		_level: "float default 0 comment 'greated topic score woverithin entire doc corpus' ",
		_relevance: "int(11) default 0 comment 'relevancing score over entire doc corpus' ",
		_sentiment: "float default 0 comment 'sentiment score over entire doc corpus' ",
		_agreement: "float default 0 comment 'topic claffiier agreement over entire doc corpus' ",
		_weight: "float default 0 comment 'topic weight over entire doc corpus' ",		
		_stats: "json comment ' [ [ {term,prob}, ... ]] by topics and terms' ",
		Override: "float default 0 comment 'Regression prediction override' ",
		Method: "varchar(64) comment 'NLP method' ",
		Description: "mediumtext"
	},
	
	engine: function docs(ctx, res) {  
	/* 
	NLP of documents where:

		Topics: number of topics for ld Method
		Terms: number of terms for lda Method
		Method: lda || anlp || snlp for Latent, Homebrew, and Stanford nlp
		Data.Doc document to parse
	*/
		var nlp = ctx.Save_NLP = ctx.$$;
		res(ctx);

		Log("doc nlp=", nlp ? true : false );
		if (nlp)
			$SQL( sql => {
				sql.query("UPDATE app.docs SET ? WHERE ?", [{
					_stats: JSON.stringify(nlp.lda || null),
					_actors: Object.keys(nlp.actors).length,
					//_links: Object.keys(nlp.links.length,
					_topics: Object.keys(nlp.topics).length,
					//_level: nlp.level,
					_relevance: nlp.relevance,
					_sentiment: nlp.sentiment,
					_agreement: nlp.agreement,
					_weight: nlp.weight	
				}, {Name: ctx.Name}], err => Log("doc save", err) );

				sql.release();
			});
		
		/*
		var 
			use = ctx.Method || "anlp",
			nlps = {
				anlp: $READ.anlpDoc,
				snlp: $READ.snlpDoc,
				lda: $READ.ldaDoc
			},
			nlp = nlps[use];
		
		if ( nlp ) 			
			$SQL( sql => {
				if ( use == "lda" ) 
					nlp( ctx.Data.Doc || "", ctx.Topics, ctx.Terms, nlp => {
						sql.query("UPDATE app.docs SET ? WHERE ?", [{
							_stats: JSON.stringify(nlp) 
						}, {Name: ctx.Name}] );
						
						ctx.NLP = null;
						res(ctx);
					});
				
				else
					nlp( ctx.Data.Doc || "", (nlp,raw) => {
						//Log(raw);

						sql.query("UPDATE app.docs SET ? WHERE ?", [{
							_stats: JSON.stringify(raw),
							_actors: nlp.actors.length,
							_links: nlp.links.length,
							_topics: Object.keys(nlp.topics).length,
							_level: nlp.level,
							_relevance: nlp.relevance,
							_sentiment: nlp.sentiment,
							_agreement: nlp.agreement,
							_weight: nlp.weight	
						}, {Name: ctx.Name}], err => Log("nlpdoc", err) );

						ctx.NLP = nlp;
						res(ctx);
					});
					
				sql.release();
			});
					 
		else
			res( new Error("invalid nlp method") );
	}
	*/
	}
}
