# test1
[my link](/junk.txt)

# test2
% {/barplot.view}

# fetch test
As of $ {now} transition status done

potential suitors include % {urls.suitors} thanks

# test urls
urls: $ {JSON.stringify( urls )}

a link: [TEST](test test test)

a code block test:

	test1
	test2

followed by another:

	wow
	way cool !!
	[should be ignored](/nogo.com)

by: $ {by}

# spoofed input
$ {register} $ {input({a:"test",b:"yay"})}

email test: $ {request("click here/some test")}

query a,b,c: $ {a}, $ {b}, $ {c}

# Lets make an interface

Here $ {interface()}
