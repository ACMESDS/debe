module.exports = {  
	keys: {		// plugin context ctx keys are defined here
		years: "float default 10 comment 'number of years to amortise the loan' ",
		vms: "int(11) default 1 comment 'number of VMs in operational mode' ",
		ups: "float default 24 comment 'yearly upsamplng sampling' ",
		lag: "float default 0 comment 'lag before research mode starts' ",
		
		Save: "json", 		
		Pipe: "json",		// ctx.Pipe contains path to plugin data source		
		Description: "mediumtext"	// ctx.Description documents usecase 		
	},
	
	engine: function costs(ctx, res) {  // Return cost profile given years, vms, ups, and lag ctx parameters.

		const {years, lag, vms, ups} = ctx;
		const { floor } = Math;
		
		var 
			docRate = 140e3/30 + 110*4,	// docs/yr chome+pulse 
			$vm = 5e3, 		// $/yr vm cost
			nre$ = 2*(2*100e3+4*$vm), 		// nre costs assuming 2 yrs dev by 2 in-sourced FTEs (x3 if outsourced) + 4 VMs at 100%
			doc$ = 100e3*(10/2e3), // $/doc assuming 10 hrs/doc reporters time (conservative - could include mission costs)
			minYr = 60*24*365, // mins/yr
			cycleT = 5, // mins
			boostT = 1,  // mins per boost cycle
			batch = 5e3, 	// docs/cycle 
			queue = floor(docRate * lag), 	// total docs initially queued
			Rcycles = queue / batch,	// cycles/yr in R state
			Ocycles = docRate / batch,	// cycles/yr in Oper state
			vm$ = n => $vm * vms * (cycleT + boostT*n) / minYr,		// $/cycle assuming dockerized vms
			labU = 0.1,		// % docs labelled
			$nre = nre$ / years, 	//	$/yr simple amort
			$lab = docRate * labU * 100e3 * (0.25/2e3),	// $/yr assuming analyst spends 1/4 hr to label
			$acq = doc$*docRate, 	// $/yr doc acquistion
			samples = ups * years,
			dt = 1/ups,
			cycles = 0,
			t = 0,
			docs = 0,
			cost = 0,
			acq$ = 0,
			lab$ = 0,
			proc$ = 0;

		// http://localhost:8080/plot.view?debug=0&w=500&h=500&line=red,blue,green,black,orange,yellow&min=-2,-0.1&max=22,1.1&ds=/costs?lag=30&vms=10&years=20&ups=24&_calc={BKLOG:[yr,queue/150e3],PROC:[yr,proc/100e3],LAB:[yr,lab/150e3],ACQ:[yr,acq/50e6],CY:[yr,cycles/50],NRE:[yr-2,nre/450e3]}
		console.log(docRate, lag, queue);

		try {
			ctx.Save = $(samples, (k,rtn) => {
				rtn[ k ] = {ID:k, yr: t, lambda: docRate, cycles: cycles, queue: queue, proc: proc$, lab: lab$, nre: nre$, acq: acq$};
				t += dt;
				queue += floor(docRate * dt);
				acq$ += $acq * dt;
				lab$ += $lab * dt;
				nre$ -= (nre$>0) ? $nre * dt : 0;

				if ( queue >= batch ) {
					cycles++;
					queue -= batch;
					proc$ += (t<2) ? 4 * $vm * dt : vm$(cycles);	// assuming 4 vms at 100% util during research phase
				}
				//Log(k,floor(t), cycles,queue);
			});
			res(ctx);
		}
		
		catch (err) {
			res( null );
		}
	}
}