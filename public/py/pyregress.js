module.exports = {  // regression
	_addkeys: {
		Samples: "int(11) default 1 comment 'number of training samples taken at random from supplied dataset' ",
		Channels: "int(11) default 1 comment 'number of training channels takens consecutively from supplied dataset' ",
		Method: "varchar(16) default 'ols' comment 'regression technique to USE = lrm | svm | pls | knn	| ols | ...' ",
		Keep: "int(11) default 0 comment 'number of regression pairs to retain after training' ",
		
		hyper_lrm: `json comment '
solver: [libfgs || liblinear || newton-cg || sag || n saga] solver method 
max_iter: int >=1 [1000] maximum iterations to run solver
multi_class: [multinomial || ovr || ultinomial || auto] 
If ovr, then a binary problem is fit for each label. If ultinomial, the loss minimised is the multinomial loss 
fit across the entire probability distribution, even when the data is binary.  multinomial is unavailable when 
solver=liblinear.  If auto, selects ovr if the data is binary (or if solver = liblinear); otherwise selects multinomial
' `,

		hyper_pls: `json comment '
latentVectors: int >= [1] number of pls latenent vectors
tolerance: float >= [0] tolerance
' `,
		
		hyper_ols: `json comment '
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
' `,

		hyper_knn: `json comment '
n_neighbors: int >= [1] Number of nearest neighbors to use in knn majority voting.
' `,
		
		hyper_eln: `json comment '
alpha: float >= 0 [1] Constant that multiplies the penalty terms. See the notes for the exact mathematical meaning of this parameter. alpha = 0 is equivalent to an ordinary least square, solved by the LinearRegression object. For numerical reasons, using alpha = 0 with the Lasso object is not advised.
l1_ratio: 0<= float [0.5] <=1 Mixing parameter.  For l1_ratio = 0 the penalty is an L2 penalty. For l1_ratio = 1 it is an L1 penalty. For 0 < l1_ratio < 1, the penalty is a combination of L1 and L2.
' `,
		
		hyper_las: `json comment '
alpha: float>=0 [1] Constant that multiplies the L1 term. alpha = 0 is equivalent to an ordinary least square, solved by LinearRegression.
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
max_iter: int >= 1[1] Maximum number of iterations.
tol: float >= [0] Optional tolerance for the optimization: if the updates are smaller than tol, the optimization code checks the dual gap for optimality and continues until it is smaller than tol.
' `,
		
		hyper_lascv: `json comment '
n_alphas: int >= [1] Number of alphas along the regularization path.
alphas: alphas list [None] where to compute the models. If None alphas are set automatically.
eps: float >= 0 [1e-3] Length of the path. eps=1e-3 means that alpha_min / alpha_max = 1e-3.
fit_intercept: [True | False]. Whether to calculate the intercept for this model. If set to false, no intercept will be used in calculations (e.g. data is expected to be already centered).
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
max_iter: int >= [1] Maximum number of iterations.
' `,		
		
		hyper_laslars: `json comment '
alphas: alphas list [None] where to compute the models. If None alphas are set automatically.
eps: float >= 0 [1e-3] Length of the path. eps=1e-3 means that alpha_min / alpha_max = 1e-3.
fit_intercept: [True | False]. Whether to calculate the intercept for this model. If set to false, no intercept will be used in calculations (e.g. data is expected to be already centered).
normalize : [False | True].  Ignored when fit_intercept is set to False. If True, the regressors X will be normalized before regression by subtracting the mean and dividing by the l2-norm.
max_iter: int >= [1] Maximum number of iterations.
' `,		

		hyper_brr: `json comment '
n_iter: int >=1 [300] Maximum number of iterations.
alpha_1: float [1e66] shape parameter for the Gamma distribution prior over the alpha parameter.
alpha_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior over the alpha parameter.
lambda_1: float [1e-6] shape parameter for the Gamma distribution prior over the lambda parameter.
lambda_2: float [1e-6] inverse scale parameter (rate parameter) for the Gamma distribution prior.
' `,
		
		hyper_som: `json comment '
iterations: int >=1 [10] Number of iterations over the training set for the training phase. The total number of training steps will be iterations * trainingSet.length.
learningRate: float [0.1] Multiplication coefficient for the learning algorithm.
method: [random || ....] Iteration method of the learning algorithm.
' `,
		
		hyper_dtr: `json comment '' `,
		hyper_svm: `json comment '' `,
		hyper_raf: `json comment '' `,
		
		Save_raf: "json comment 'raf model' ",
		Save_eln: "json comment 'eln model' ",
		Save_brr: "json comment 'brr model' ",
		Save_dtr: "json comment 'dtr model' ",
		Save_lrm: "json comment 'lrm model' ",
		Save_svm: "json comment 'svm model' ",
		Save_plc: "json comment 'plc model' ",
		Save_knn: "json comment 'knn model' ",
		Save_som: "json comment 'som model' ",
		Save_ols: "json comment 'ols model' ",
		Save_las: "json comment 'lasso model' ",
		Save_laslars: "json comment 'lasso lars model' ",
		Save_lascv: "json comment 'las cv model' ",
		Save_jpg:  "json comment 'remainder stash' ",
		
		Save_predict: "json comment 'predictions stash' ",
		Save_train: "json comment 'training stash' ",	

		Pipe: "json",
		Description: "mediumtext"
	},
	
	engine: `
def pyregress(ctx):
	#Train regressor given (x,y) data, or predict from given x data, where:
	#
	#	Method: regression technique to USE = lrm | svm | pls | knn	| ols | ...
	#	Save_USE: trained model saved here
	#	USE_solver: parameter feed to solver
	#
	global LRM,OLS,BRR,ELN,DTR,KNN,SVM,PLS, 	LAS,LASLARS,LASCV,SOM
	#
	from sklearn import linear_model as LMLIB
	from sklearn.svm import SVC as SVM
	from sklearn.ensemble import RandomForestRegressor as RAF
	from sklearn.cross_decomposition import PLSRegression as PLS
	from sklearn import neighbors as KNN
	from sklearn.tree import DecisionTreeRegressor as DTR
	#
	LRM = LMLIB.LogisticRegression
	OLS = LMLIB.LinearRegression
	BRR = LMLIB.BayesianRidge
	ELN = LMLIB.ElasticNet
	LAS = None
	LASLARS = None
	LASCV = None
	SOM = None
	#
	def shuffle(x,y,N): 	# return N random samples of (x,y)
		def sortKey(d):
			return d['val']
		xy = []
		for n in range(0,N):
			xy.append({'idx': n, 'val': NP.random.uniform()})
		xy.sort(key = sortKey)
		x0 = []
		y0 = []
		for n in range(0,N):
			x0.append( x[ xy[n]['idx'] ] )
			y0.append( y[ xy[n]['idx'] ] )
		return (x0,y0)
	#
	def serialize(cls, mod):		# serialize classification class cls into a model dictionary mod
		for key, val in cls.__dict__.items():
			if (type(val) is NP.ndarray) and key[-1:] == "_":
				mod[key] = val.tolist()
			else:
				mod[key] = val
		return mod
	#
	def deserialize(mod, cls):	# deserialize a model dictionary mod into a classification class cls
		for key in mod:
			val = mod[key]
			if type(val) is list:
				setattr(cls, key, NP.array(val))
			else:
				setattr(cls, key, val)
		return cls
	#
	def copy(src, tar):	# copy source hash src to a target hash tar
		for key in src:
			tar[key] = src[key]
		return tar
	#
	print "******************** pyregress ******************"
	#from sklearn.datasets import load_iris
	#x, y = load_iris(return_X_y=True)
	#print "x",x, "y",y
	x = NP.array( ctx['x'] ) if 'x' in ctx else None
	y = NP.reshape( NP.array( ctx['y'] ), (len(x),) ) if 'y' in ctx else None
	keep = int( ctx['Keep'] )
	use = ctx['Method'].lower()
	USE = use.upper()
	hyperUse = 'hyper_' + use
	model = ctx['Save_lrm']
	maker = {
		'lrm': LRM,
		'ols': OLS,
		'eln': ELN,
		'brr': BRR,
		'raf': RAF,
		'knn': KNN,
		'las': LAS,
		'laslars': LASLARS,
		'lascv': LASCV,
		'som': SOM,
		'pls': PLS,
		'svm': SVM
	}
	make = maker[use] if use in maker else None
	solve = ctx[hyperUse] if hyperUse in ctx else None
	if not solve:
		solve = {}
	print hyperUse, solve
	#solve = {}
	#for key in ctx:
	#	if key.find(use+"_") == 0:
	#		solve[ key[len(use)+1:].replace("#","_") ] = ctx[key]
	#print "solve",use,solve,keep
	#
	if make:
		if y != None:		# requesting a training
			print "x",x.shape,"y",y.shape, make
			cls = deserialize( solve, make() )
			(x0,y0) = shuffle(x.tolist(),y.tolist(),keep)
			ctx['Save'] = {
				'Save_'+use: serialize( cls.fit(x,y), {} ),
				'Save_train': {
					'method': use,
					'x': x0,
					'y': y0
				}
			}
		else:		# requesting a prediction
			if model != None:
				cls = deserialize( copy(model, solve), make() )
				ctx['Save'] = {'Save_predict': cls.predict(x).tolist() }
			else:
				ctx['Save'] = {}
				print "model never trained"
		print "saved", ctx['Save']
	else:
		print "invalid method"
`
		
}
