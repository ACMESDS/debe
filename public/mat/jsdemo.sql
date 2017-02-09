var MATH = require('../node_modules/mathjs');
var Case = TAU.p.query.case, M = TAU.p.query.M;

TAU.e[0] = {x:  [1,2,3], y: [4,5], z: 6};

TAU.p.sql.query("SELECT * FROM app1.Htest WHERE least(?)", {Name:Case,Used:1}, function (err,recs) {
	var N = recs.length;
	var X = new Array(N); y = new Array(N);
	
	console.log([Case,M,N]);
	
	for (var n=0;n<N;n++) {
		var data = recs[n];
		var Xn = X[n] = [1];

		y[n] = data.FPR;
		for (var m=1;m<M;m++) Xn[m] = data["p"+(m-1)];
	}
		
	var scope = {X:X, y:y};
	
	MATH.eval("a = inv(X' * X) * X' * y",scope);
	console.log(scope.a);
	
	var reg = {Name:Case,Tests:N,Computed:new Date()}, a=scope.a;
	for (var n=0,N=a.length;n<N;n++) reg['a'+n] = a[n];
	
	TAU.p.sql.query("REPLACE INTO app1.Hreg SET ?",reg);
});
