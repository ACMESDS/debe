#drop function queueinfo;
create function queueinfo(job char(255),lst date,dep int,own char(255),cls char(255),ins int) returns char(255) 
return concat('JOB ',link(job,'/queue.view'),' IN ',own,'-',cls,' QUEUE FOR ',dep,' DAYS INSTATE ',ins);

#drop function userinfo;
create function userinfo(usr char(255),org char(255),loc char(255)) returns char(255) 
return concat(link(usr,concat('mailto:',usr)),' WITH ',org,' AT ',loc);

#drop function engineinfo;
create function engineinfo(nam char(255),eng char(255),up date,clif char(255),cod int,per float,sw int,des text) returns char(255) 
return concat(
	'ENGINE ',link(nam,concat('/',nam,'.db')),' ',
	'IS ',eng,' / ',if(sw,if(per,concat('every ',round(per/3600,1),' hours'),'enabled'),'disabled'),' / ',if(des,'documented','undocumented'),' ',
	'CAN ',link(if(cod,'edit','create'),concat('/engine.view?name=',nam))
);

#drop function link;
create function link(lab char(255),url char(255)) returns char(255) 
return concat('<a href="',url,'">',lab,'</a>');

#drop function run;
create function run(nam char(255),eng char(255)) returns char(255) 
return link('run',concat(nam,'.',if(eng='jade','view','db')));

#drop function cliqueinfo;
create function cliqueinfo(id int,mem int,tar char(255), clq text) returns text 
return concat(link(concat('CLIQUE ',id),concat('mailto:',clq)),' FORMED ON ',tar,' HAS ',mem,' MEMBERS');

#drop function linkquery;
create function linkquery(lab char(255), url char(255), par char(255)) returns text
return link(lab,concat(url,'?',par));

drop function linkdistro;
create function linkdistro(usr char(255)) returns char(255) 
return link(usr,concat("mailto:",usr));

drop function tag;
create function tag(tg char(255),lab char(255)) returns char(255) 
return concat('<',tg,'>',lab,'</',tg,'>');

drop function linkrole;
create function linkrole(role char(255),cnt int(11),lev int(11)) returns char(255) 
return concat(link(role,concat("/moderate.view?role=",role)),concat(tag("sub",cnt),tag("sup",lev)));
