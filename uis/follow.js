// add link follower to the navigator
navigator.follow = function (href,client,view) {
	//alert("following "+href);
	window.open(href);
	navigator.ajax( "GET", true, `/follow?goto=${href}&client=${client}&view=${view}`);
}
