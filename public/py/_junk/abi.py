import json

def obj(itau,otau,state):
	port = state['index']
	job = itau[port]['job'] + ".json"
	print "ABI in:"+job
	
def tracks(itau,otau,state):
	for stream in range(0,len(otau)):
		job = otau[stream]['job'] + ".json"
		print "ABI out:" + job
		json.dump({"speed":123.456},open(job,"w"))

def tau(itau,otau,state):
	
	#print state
	print "python sample i=0:"  + str(len(itau)-1) + " o=0" + str(len(otau)-1)

# mysql odbc 
# http://dev.mysql.com/doc/connector-python/en/
#import mysql.connector
#cnx = mysql.connector.connect(user='scott', password='tiger',host='127.0.0.1',database='employees')
#cursor = cnx.cursor()
#cursor.execute(query, (hire_start, hire_end))
#for (first_name, last_name, hire_date) in cursor:
#  print("{}, {} was hired on {:%d %b %Y}".format(
#    last_name, first_name, hire_date))
#cursor.close()
#cnx.close()
