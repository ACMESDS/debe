mysqldump -u$SECRETS_DB_USER -p$SECRETS_DB_PASS openv >db/openv.sql
mysqldump -u$SECRETS_DB_USER -p$SECRETS_DB_PASS app1 >db/app1.sql
mysqldump -u$SECRETS_DB_USER -p$SECRETS_DB_PASS --events mysql >db/mysql.sql
mysqldump -u$SECRETS_DB_USER -p$SECRETS_DB_PASS jou >db/jou.sql
