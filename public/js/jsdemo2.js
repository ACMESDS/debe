module.exports = {
	usecase: {
		Save: "json",
		y: "json",
		X: "json",
		B: "json",
		N: "int(11)"
	},
	
	engine: function jsdemo2(ctx,res) {
		ME.exec("a = inv(X' * X) * X' * y", ctx, (vmctx) => {
			Log(vmctx);

			var 
				a = vmctx.a,
				N = ctx.N = a.length,
				b = $(N, (n,B) => B[n] = a[n]);
			
			res(ctx);							
		});
	}

}