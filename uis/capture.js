//alert(navigator.browser);
if (navigator.browser == "FireFox") {  // FF can paste things in a contenteditable div.

	var pasteCatcher = document.createElement("div");
	pasteCatcher.setAttribute("contenteditable","");
	//pasteCatcher.style.opacity = 0;
	document.head.appendChild(pasteCatcher);
	pasteCatcher.focus();
	document.addEventListener("click", function () {
		//alert("Paste area selected");
		pasteCatcher.focus();
	});
}

document.onpaste = function (event) {
	//alert("paste "+event.clipboardData);
	if (event.clipboardData.items) {  // No items in FF
		var items = event.clipboardData.items;
			
		//alert("pasting "+items.length);
		for (var i=0; i<items.length; i++)
			if (items[i].type.indexOf("image") !== -1) {
				var blob = items[i].getAsFile();
				var read = new FileReader();
				var url = window.URL || window.webkitURL;
				var src = url.createObjectURL(blob);
				createImage(src);
			}
	}
	else { 		// Wait for paste to finish in FF
		//alert("set watchdog");
		setTimeout(function () {
			//alert("FF t/o "+pasteCatcher.childNodes.length);
			var child = pasteCatcher.childNodes[0];
			//pasteCatcher.innerHTML = "";
			
			if (child) {
				if (child.tagName === "IMG")
					createImage(child.src);
			}
			//else
				//alert("Screen capture quasi-supported by FireFox");
		},1e3);
	}
	
	function createImage(src) {
		if (DARKROOM) {
			
			var snapshot = new fabric.Image.fromURL(src, function (img) {

				if (!DARKROOM.canvas) 
					DARKROOM.canvas = new Canvas();
				
				DARKROOM.canvas.clear();
				DARKROOM.canvas.setWidth(img.width);
				DARKROOM.canvas.setHeight(img.height);
				DARKROOM.canvas.add(img);
				DARKROOM.canvas.renderAll();				
				
			},{
				selectable: true,
				evented: true,
				lockMovementX: false,
				lockMovementY: false,
				lockRotation: false,
				lockScalingX: false,
				lockScalingY: false,
				lockUniScaling: false,
				hasControls: true,
				hasBorders: false
			});
		}
		else {
			var pastedImage = new Image();
			pastedImage.onload = function (ev) {
				alert("Screen capture disabled");
			};
			pastedImage.src = src;
		}
	}
}
