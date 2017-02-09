echo Restoring sigma at $SIGMA
mysql -uroot openv <$SIGMA/db/openv.sql
mysql -uroot app1  <$SIGMA/db/app1.sql

