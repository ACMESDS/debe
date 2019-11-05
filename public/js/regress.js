// note no funding in JIRA.  note negative west support.

module.exports = {  // regressors
	xmodkeys: {
		
		Cycle: `int(11) default 0 comment '
Boosting level: 0 disables, 1 starts (ingest x-y points, initialize and boost), >1 continues boosting
'`,
		Hyper: `json comment '
Hyper parameters for specific Methods:

	{ METHOD: { solve keys ... }, ... }

`,
		_Boost: `json`,
		
		Samples: "int(11) default 1 comment 'number of training samples taken at random from supplied dataset' ",
		Channels: "int(11) default 1 comment 'number of training channels takens consecutively from supplied dataset' ",
		Method: "varchar(16) default 'ols' comment 'regression technique to USE = lrm | svm | pls | knn	| ols | ...' ",

		/*
		hyper_lrm: `json comment '
numSteps: int>=[1] number of steps in LRM solver
learningRate: float >= [0] LRM learning rate
' `,

		hyper_pls: `json comment '
latentVectors: int >= [1] number of pls latenent vectors
tolerance: float >= [0] tolerance
' `,
		
		hyper_ols: `json comment '
degree: int >= [0] Maximum degree of the polynomial (0=linear ols)
' `,

		hyper_knn: `json comment '
k: int >= [1] Number of nearest neighbors to use in knn majority voting.
' `,
		
		hyper_eln: `json comment '
alpha: float >= 0 [1] Constant that multiplies the penalty terms. See the notes for the exact mathematical meaning of this parameter. alpha = 0 is equivalent to an ordinary least square, solved by the LinearRegression object. For numerical reasons, using alpha = 0 with the Lasso object is not advised.
l1_ratio: 0<= float [0.5] <=1 Mixing parameter.  For l1_ratio = 0 the penalty is an L2 penalty. For l1_ratio = 1 it is an L1 penalty. For 0 < l1_ratio < 1, the penalty is a combination of L1 and L2.
' `,
		
		hyper_las: `json comment '
alpha: float>=0 [1] Constant that multiplies the L1 term. alpha = 0 is equivalent to an ordinary least square, solved by LinearRegression.
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
max_iter: int >= 1[1] Maximum number of it Regressionerations.
tol: float >= [0] Optional tolerance for the optimization: if the updates are smaller than tol, the optimization code checks the dual gap for optimality and continues until it is smaller than tol.
' `,
		
		hyper_brr: `json comment '
n_iter: int >=1 [300] Maximum number of iterations.
alpha_1: float [1e66] shape parameter for the Gamma distribution prior over the alpha parameter.
alpha_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior over the alpha parameter.
lambda_1: float [1e-6] shape parameter for the Gamma distribution prior over the lambda parameter.
lambda_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior.
' `,
		
		hyper_som: `json comment '
iterations: int >= 1 [10] Number of iterations over the training set for the training phase. The total number of training steps will be iterations x trainingSet.length.
learningRate: float>=0 [0.1] Multiplication coefficient for the learning algorithm.
method: [random | ...] Iteration method of the learning algorithm (default: random)
' `,
		
		hyper_dtr: `json comment '
latentVectors: int >=[1] Number of latent vectors
tolerance: float>= [0] tolerance
' `,

		hyper_qda: `json comment '
mixes: int >=[1] Number of gaussian mixes
nsigma: radius of labelling sphere in units of standard deviations
solver: MATHJS script (mu,sigma) => keys.B, keys.b, SNR
' `,
		
		hyper_svm: `json comment '' `,
		hyper_raf: `json comment '' `,
		*/
		
		Save_raf: "json comment 'raf model' ",
		Save_eln: "json comment 'eln model' ",
		Save_brr: "json comment 'brr model' ",
		Save_dtr: "json comment 'dtr model' ",
		Save_lrm: "json comment 'lrm model' ",
		Save_svm: "json comment 'svm model' ",
		Save_pls: "json comment 'pls model' ",
		Save_knn: "json comment 'knn model' ",
		Save_som: "json comment 'som model' ",
		Save_ols: "json comment 'ols model' ",
		Save_las: "json comment 'lasso model' ",
		Save_qda: "json comment 'gaussian mixing model' ",

		Save_predict: "json comment 'predictions stash' ",
		Save_train: "json comment 'training stash' ",
		Save_jpg:  "json comment 'remainder stash' ",
		
		Pipe: `json comment '
The regression mode is determined by the following context keys:

	x = LIST				// unsupervised training mode
	y = LIST				// supervised training mode
	x0 = LIST				// predicting / roc mode
	xy0 || multi = { x: [ LIST, ...], y: [ LIST, ...], x0: [ LIST, ...], n0: LIST } 	// multichannel training mode 
	Cycle = int			// boosting level

' `,
		
		Description: "mediumtext"
	},
	
	engine: function regress(ctx, res) {   //< Train regressor or make predictions with a trained regressor.
		function train(x, y, cb) { 
			if ( x.length )
				$( `cls = ${use}_train( x, y, solve ); `,  {  // train regressor
						x: x || null,
						y: y || null,
						solve: solve
					}, ctx => cb( ctx.cls ) );
			
			else
				cb( null );
		}

		function trainer(x,y,x0,cb) {
			
			function saver( cls, x, y, x0, cb ) {
				if ( x0 ) 
					$( `y0 = ${use}_predict(cls, x0, solve)`, {
						solve: solve,
						x0: x0, 
						cls: cls
					}, ctx => cb({		// return sampled and predicted data
						sample: {
							//x: x,
							//y: y,
							x0: ctx.x0,
							y0: ctx.y0
						},
						cls: cls
					}));
				
				else
					cb({		// return sampled and predicted data
						sample: {
							//x: x,
							//y: y,
							x0: [],
							y0: []
						},
						cls: cls
					}); 
			}
			
			train( x, y, cls => {
				if ( cls )
					saver( cls, x, y, x0, cb );

				else
					cb( null );
			});
		}

		function trainers(x,y,x0,cb) {
			var 
				chans = x.length,
				done = 0;

			//Log("channels", chans, y.length, x0.length);
			for ( var chan = 0; chan<chans; chan++ ) 
				trainer( x[chan], y[chan], x0[chan], info => {
					if ( info ) {
						saver(info,chan);
						if ( ++done == chans ) cb();
					}
				});
		}
		
		function predict(x, cls, cb) {
			//Log({	predict: use, dims: x.length });

			$(
				`y = ${use}_predict( cls, x, solve );`, 
				
				Copy(ctx, {
					solve: solve,
					x: x,
					cls: cls
				}), 
			  	
				ctx => cb( ctx.y ) 
			 );
		}
		
		function predicter(x, cls) {
			function saver(y) {
				ctx.Save = {Save_predict: y};
				res(ctx);
			}

			if (cls)
				predict( x, cls, saver );
			
			else
				res( new Error("invalid model") );
		}
		
		function predicters(x, cls) {
			function saver(y) {
				ctx.Save = {Save_predict: y};
				res(ctx);
			}
			
			if (cls)
				for (var chan=0, chans=cls.length; chan<chans; chan++)
					predict( x[chan], cls[chan], saver );
			
			else
				res( new Error("invalid model") );
		}
		
		function saver(info,idx) {
			save.push({ at: "train", chan: idx, x: info.sample.x0, y: info.sample.y0 });
			//Log("reg save", use, idx, "canExport?", info.cls.export ? true : false);
			save.push({ at: use, chan: idx, cls: info.cls.export ? info.cls.export() : info.cls });
			saveValues.push( info.sample.y0 );
		}

		function respond(info) {
			//Log("reg send", info);
			if ( info ) {
				saver(info,0);
				if (chans) save.push({ 
					at: "jpg", 
					input: chans.input, 
					save: savePath,
					//index: n0,
					index: chans.n0,
					values: saveValues
				});
				res(ctx);
			}
			
			else
				res( new Error("training failed") );
		}
		
		const { xy0, multi, x,y,x0,Method,Stats,Host,Name,Trace} = ctx;
		
		var
			chans = xy0 || multi,
			save = ctx.Save = [],
			savePath = `/shares/${Host}_${Name}.jpg`,
			saveValues = [],
			use = Method.toLowerCase(),
			solveKey = use + "_",
			loaders = {
				svm: $.SVM.load, //$.SVM.restore,
				lrm: $.LRM.load,
				knn: $.KNN.load,
				pls: $.PLS.load,
				som: $.SOM.load,
				nab: $.NAB.load,
				raf: model => model,
				dtr: model => model,
				lda: model => model,
				qda: model => model,
				qda: model => model,
				ols: ctx.ols_degree ? $.SPR.load : $.MLR.load
			},
			loader = loaders[use],
			model = ctx[ `Save_${use}` ], 
			solve = ctx.Hyper[use] || {},
			cycle = ctx.Cycle || 0,
			boost = ctx._Boost;
		
		Log({
			cycle: cycle,
			boost: boost,
			solve: solve,
			trainingset: x ? x.length : "none",
			labelset: y ? y.length : "none",
			using: use,
			predicting: x0 ? x0.length : "none",
			learning: ( x && y ) ? "supervised" : x ? "unsupervised" : chans ? "multichan train" : "off",
			loader: loader ? true : false,
			model: model ? true : false
		});

		if ( loader )
			if ( chans )	// multichannel learning mode
				trainers( chans.x, chans.y, chans.x0, () => respond() );

			else	
			if ( cycle ) { // in boosting mode
				res("boosting");

				$SQL( sql => {
					function booster( sql, boost ) {
						const { mixes, alpha, h, xroc } = boost;
						const { nsigma } = solve;
						const { sign } = Math;

						$.boost( cycle, sql, boost, Trace, (x,keys) => {  // predict/learn hypothesis

							function hypo(x,keys) {	// return K-vector of hypo tests
								return $( keys.length, (k, H) => {		// enumerate thru all keys
									H[ k ] = 0;		// default if invalid key
									if ( key = keys[k] ) {
										const { r } = $( "y = B*x + b; r = sqrt( y' * y ); ", {B: key.B, b: key.b, x: x} );		// bring sample into decision sphere
										H[ k ] = ( r < nsigma ) ? +1 : -1;		// test positive/negative hypo 
									}
								});
							}
							
							if ( keys )
								Trace( "boost test", {t: cycle, keys: keys.length, nsigma:nsigma});
							else
							if ( x )
								Trace( "boost learn", {t: cycle, points: x.length});
							else
								Trace( "boost save", {t: cycle, alpha: boost.alpha} );

							if ( keys ) 	// test hypo 
								return hypo(x,keys);

							else
							if ( x ) { 	// learn keys
								var keys = boost.h[cycle] = [];

								trainer( x, null, null, info => {
									if ( info ) 	// labelled data provided so stack keys
										if ( cls = info.cls )
											cls.em.forEach( (mix,k) => {
												//Log("mix", k , mix.key);

												if ( key = mix.key )	// valid key provided
													keys.push({ 
														B: $.clone(key.B), 
														b: $.clone(key.b)
													});
												
												else	// invalid key
													keys.push( null );
											});
								});

								return keys;
							}

							else { // save
								if ( xroc ) { // gen effective roc
									var 
										F = $( mixes, (k,F) => F[k] = 0 ),		// reserve for boosted hypo
										t = cycle,
										hits = 0,
										cols = 0,
										N = xroc.length,
										maxHits = N,
										maxCols = N * mixes;

									xroc.forEach( (x,m) => {		// enumerate x samples to build roc
										for ( var n=1; n<=t; n++ ) {
											if ( h_n = h[n] ) // valid keys provided
												var ctx = $( "F = F + alpha * H", { 
													F: F,
													alpha: alpha[n],
													H: hypo( x, h_n )
												});
											
											else
												var ctx = null;
										}

										//Log("F=", ctx.F);
										if ( ctx )
											F.$( k => F[k] = sign( ctx.F[k] ) );

										var I = 0;	// indicator = #agreements
										F.$( k => I += (F[k] > 0) ? 1 : 0 );

										//Log(m, F, I);
										if ( I == 1 )
											hits++;
										
										else
										if ( I > 1 )
											cols += I - 1;
									});

									boost.hitRate = hits / maxHits;
									boost.colRate = cols / maxCols;
									Log(">>>>>rates", boost.hitRate, boost.colRate, [hits, cols], [maxHits, maxCols] );
								}
											
								sql.query(
									"UPDATE app.regress SET ? WHERE ?", 
									[{
										_Boost: JSON.stringify(boost), 
										Cycle: cycle+1, 
										Pipe: JSON.stringify( ( cycle == 1 ) ? "#" + ctx.Pipe : ctx.Pipe )
									}, {Name: ctx.Name} ] , err => Log(err) );

								return null;								
							}
						});
					}

					if ( x && y ) {	// prime the points dataset then boost at cycle=1
						var N = x.length, D = 1/N, added = 0, labels = "HMLNABCDEFG";
						// "/genpr_test4D4M.export?[x,y]=$.get(['x','n'])"
						// "/genpr_test4D4M.export?[x,y]=$.get(['x','n'])&x0=$.draw(Channels).get('x')"
						
						sql.query( "DELETE FROM app.points" );
						sql.beginBulk();
						x.forEach( (x,n) => {  // prime points dataset with samples and labels
							sql.query( "INSERT INTO app.points SET ?", {	// prime with this sample point
								x: JSON.stringify( x ),
								y: labels.charAt( y[n] ),
								D: D,
								idx: n+1,
								docID: "tbd",
								src: "tbd"
							}, err => {		// check if primed

								if ( ++added == N ) 	// dataset primed so good to boost
									booster( sql, {	// provide initial boost state (index 0 unused)
										xroc: x0,
										points: N,
										samples: ctx.Samples,
										mixes: solve.mixes || 0,
										labels: labels,
										thresh: D * 0.9,
										eps: [null],
										alpha: [null], 
										h: [null]
									});

							});
						});
						sql.endBulk();
					}

					else
					if ( boost )	// boost this cycle
						booster( sql, boost );

					else
						Trace("boost halt", "need x,y data to prime booster");
				});
			}

			else	//  sup/unsup learning mode
			if ( x ) 
				trainer( x, y, x0, info => respond(info) );
		
			else
			if ( x0 ) 	// predicting/roc generating
				predicter( x0, loader(model) );
		
			else
				res( new Error("invalid regression mode") );

		else
			res( new Error("invalid regression method") );
	}

}
