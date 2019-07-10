module.exports = {  // regressors
	modkeys: {
		Samples: "int(11) default 1 comment 'number of training samples taken at random from supplied dataset' ",
		Channels: "int(11) default 1 comment 'number of training channels takens consecutively from supplied dataset' ",
		Method: "varchar(16) default 'ols' comment 'regression technique to USE = lrm | svm | pls | knn	| ols | ...' ",
		Keep: "int(11) default 0 comment 'number of regression pairs to retain after training' ",

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

		hyper_svm: `json comment '' `,
		hyper_raf: `json comment '' `,
				
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

		Save_predict: "json comment 'predictions stash' ",
		Save_train: "json comment 'training stash' ",
		Save_jpg:  "json comment 'remainder stash' ",
		
		Pipe: `json comment '
The following context keys are accepted:

	x = [...], y = [...]				// training mode
	x = [...]							// predict mode
	xy = { x: [...] , y: [...} } 		// training mode
	multi = { x: [ [...]...], y: [ [...]...], x0: [ [...]...] } 	// multichannel training mode 
	unsup = [...] 							// unsupervised training mode

' `,
		
		Description: "mediumtext"
	},
	
	engine: function regress(ctx, res) {  
	/* 
	Train regressor where:

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
		function train(x, y, cb) {  
			
			/*
			Log({
				train: use, 
				xy_dims: [x.length, y ? y.length : 0],
				solve: solve
			});  */

			if ( !y || (x.length == y.length) ) {
				$( 
					`cls = ${use}_train( x, y, solve ); `, 

					Copy(ctx, {
						x: x,
						y: y,
						solve: solve
					}), 
					
				  	ctx => {  // regressor trained
						cb( ctx.cls );
					}
				);
			}
			
			else 
				cb( null );
		}

		function trainer(x,y,x0,cb) {
			
			function saver( cls, x, y, x0, cb ) {
				if ( x0 && keep ) {
					var 
						idx = x.shuffle(keep, true),
						x = x.indexor(idx),
						y = y.indexor(idx);

					//Log("reg keep", keep, idx.length, x.length, y.length, x0.length);
					
					if (x0) 
						$( `y0 = ${use}_predict(cls, x0)`, {
							x0: x0, 
							cls: cls
						}, ctx => 	cb({		// return sampled and predicted data
							sample: {
								x: x,
								y: y,
								x0: x0,
								y0: ctx.y0
							},
							cls: cls
						}));
						  
					else
						cb({		// return sampled and predicted data
							sample: {
								x: x,
								y: y,
								x0: [],
								y0: []
							},
							cls: cls
						})
					
					/*
					$( 
						`u = shuffle(x,y,keep);  y0 = isDefined(x0) ? ${use}_predict(cls, x0) : null; `,

						Copy( ctx, {	// revise $ context
							x: x,
							y: y,
							x0: x0,
							cls: cls,
							keep: keep
						}),

						ctx => cb({		// return $ results
							sample: {
								x: ctx.u.x._data,
								y: ctx.u.y._data,
								x0: ctx.x0,
								y0: ctx.y0
							},
							cls: cls
						})
					); */
				}

				else 
					cb({
						sample: {},
						cls: cls
					});
			}
			
			train( x, y, cls => {
				if ( cls )
					saver( cls, x, y, x0, cb );

				else
					res( new Error("bad x/y training dims") );
			});
		}

		function trainers(x,y,x0,cb) {
			var 
				chans = x.length,
				done = 0;

			//Log("channels", chans, y.length, x0.length);
			for ( var chan = 0; chan<chans; chan++ ) 
				trainer( x[chan], y[chan], x0[chan], info => {
					saver(info,chan);
					if ( ++done == chans ) cb();
				});
		}
		
		function predict(x, cls, cb) {
			Log({
				predict: use, 
				dims: x.length
			});

			$(
				`y = ${use}_predict( cls, x );`, 
				
				Copy(ctx, {
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
			save.push({ at: "train", chan: idx, x: info.sample.x, y: info.sample.y });
			save.push({ at: use, chan: idx, cls: info.cls });
			saveValues.push( info.sample.y0 );
		}

		function sender(info) {
			if (info) saver(info,0);
			if (multi) save.push({ 
				at: "jpg", 
				input: multi.input, 
				save: savePath,
				index: n0,
				values: saveValues
			});
			res(ctx);
		}
		
		var
			stats = ctx.Stats,
			x = ctx.x || null,
			y = ctx.y || null,
			xy = ctx.xy || null,
			multi = ctx.multi || null,
			x0 = ctx.x0 || null,
			n0 = ctx.n0 || null,
			unsup = ctx.unsup || null,
			keep = ctx.Keep,
			save = ctx.Save = [],
			savePath = `/shares/${ctx.Host}_${ctx.Name}.jpg`,
			saveValues = [],
			use = ctx.Method.toLowerCase(),
			solveKey = use + "_",
			loaders = {
				svm: $.SVM.load, //$.SVM.restore,
				lrm: $.LRM.load,
				knn: $.KNN.load,
				pls: $.PLS.load,
				som: $.SOM.load,
				nab: $.NAB.load,
				raf: (model) => model,
				dtr: (model) => model,
				lda: (model) => model,
				qda: (model) => model,
				ols: ctx.ols_degree ? $.SPR.load : $.MLR.load
			},
			loader = loaders[use],
			model = ctx[ `Save_${use}` ], 
			solve = ctx[`hyper_${use}` ] || {};
		
		Log({
			solve: solve,
			keep: keep,
			use: use,
			canTrain: ((x && y) || xy || multi || unsup) ? true : false,
			canPredict: x ? true : false,
			loader: loader ? true : false,
			model: model ? true : false
		});
		
		if ( loader)
			if ( x && y ) // in x,y single channel training mode 
				trainer( x, y, x0, info => sender(info) );
			
			else
			if ( xy )  // in xy singe channel training mode
				trainer( xy.x, xy.y, x0, info => sender(info) );

			else
			if ( multi ) { // in xy multichannel training mode
				n0 = multi.n0 || null;
				trainers( multi.x, multi.y, multi.x0, () => sender() );
			}

			else
			if (unsup) // in unsupervised training mode
				trainer( unsup, null, x0, info => sender(info) );

			else
			if ( x ) // in prediction mode
				if ( model ) 
					if ( model.length )	{	// multichannel predictions
					}
		
					else	// single channel predictions
						predicter( x, loader(model) );
										
				else
					res( new Error("regressor never trained") );
					
			else
				res( new Error("missing x||y||xy||multi||unsup to regressor") );
		
		else
			res( new Error("invalid regression method") );
		
	}

}
