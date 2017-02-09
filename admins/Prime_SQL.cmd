set app=app1
cd C:\Program Files\MySQL\MySQL Server 5.5\bin
c:
mysql -u root -proot <"C:\NodeDev\apps\%app%\archives\reset.sql"
pause
mysql -u root -proot %app% <"C:\NodeDev\apps\%app%\archives\%app%.sql"
pause
mysql -u root -proot %app%_shadow <"C:\NodeDev\apps\%app%\archives\%app%.sql"
pause