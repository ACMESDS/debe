
ex = select(odbc, 'SELECT * FROM openv.agents WHERE queue="init_queue"');
close(exec(odbc, 'DELETE FROM openv.agents WHERE queue="init_queue"'));
for n=1:height(ex)
	disp(ex.script{n});
	eval(ex.script{n});
end
