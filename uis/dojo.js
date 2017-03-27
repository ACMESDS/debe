require([
    'dojo/dom',
    'dojo/domReady!'
], function (dom) {
	alert("tada!");
	alert(dom);
    var greeting = dom.byId('greeting');
    greeting.innerHTML += ' from Dojo!';
});

