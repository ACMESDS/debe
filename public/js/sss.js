module.exports = {
	usecase: {
		Save: "json"
	},
	
	view: `extends site
append site_parms
	- view = "Min"
append site_body
	#grid.mySSSview(path="/sss.db", cols="Save")
`,

	engine: function sss(ctx,res) {
	/*
	Use the FLEX randpr plugin to send spoofed streaming data.
	*/
		//LOG(ctx);

		FLEX.randpr( ctx, function (evs) {
			res( evs );
		});
	}
}