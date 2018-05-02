
function ws = guest_mademo1_1( )
	ws.set = @set;
	ws.get = @get;
	ws.step = @step;
	ws.save = @save;
	ws.load = @load;

	if true
		ws.db = database('totem-app', 'ileuser', 'junk');
	else
		ws.db = 0;
	end

	function set(key,val)
		ws.(key) = val;
	end

	function val = get(key)
		val = ws.(key);
	end

	
	function load(ctx, cb)
		try
			if length(ctx.Events)>1
				ctx.Data = select(ws.db, ctx.Events);
			end
		
		catch 
				ctx.Data = []
		end

		res = cb(ctx);
		disp({ 'cbres', res });

		if ws.db
			update(ws.db, 'mademo1', {'Save'}, res, 'where Name="1"');

		else
			fid = fopen('guest_mademo1_1.out', 'wt');
			fprintf(fid, '%s', jsonencode(res) );
			fclose(fid);
			webread( 'http://totem.west.ile.nga.ic.gov:8080/matlab?save=guest_mademo1_1' );
		end
	end 
	
	function step(ctx)
		load(ctx, @mademo1);

		% engine logic and ports
		
function rtn = mademo1(ctx)
	rtn = ctx.a + ctx.b;
end
	
	end 

end