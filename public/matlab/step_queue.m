
ex = select(odbc, 'SELECT * FROM openv.matlab WHERE queue="step_queue"');
exec(odbc, 'DELETE * FROM openv.matlab WHERE queue="step_queue"');
for n=1:height(ex)
	eval(ex.script{n});
end
