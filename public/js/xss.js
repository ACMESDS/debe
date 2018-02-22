module.exports = {
	usecase: {
		Save: "json"
	},
	
	engine: function xss(ctx,res) {
		res([
			{lat:33.902,lon:70.09,alt:22,t:10},
			{lat:33.902,lon:70.09,alt:12,t:20}
		]);
	}	
}
