
ex = select(odbc, 'SELECT * FROM openv.matlab WHERE queue="init_queue"');
exec(odbc, 'DELETE * FROM openv.matlab WHERE queue="init_queue"');
for n=1:height(ex)
	eval(ex.script{n});
end
