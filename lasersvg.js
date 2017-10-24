function updateThickness(scalingFactor) {
	// Show the materialThickness 
	var factorDisplay = document.getElementById('materialThickness');
  factorDisplay.innerHTML = scalingFactor;
	//Scale the objects
	
	//var benchPlank = document.getElementById("benchPlank")
	var draw = SVG.get("drawing");
	var defs = draw.defs();
	var plank = defs.first();
	window.alert(plank)
	//var benchPlank = defs.get("benchPlank");

	//benchPlank.setProperty("--matWidth", scalingFactor);
	// Iterate over all objects in the SVG
	var drawing = document.getElementById("drawing");
	// First the rectangles
	var rects = drawing.getElementsByTagName("rect") ;
	for (var i=0; i<rects.length; i++) {
		var element = rects[i];
		if (element.classList.contains('material-width')) {
			//only scale heigth
			// TODO: this shouldn't be 1, but the existing scaling factor
			var attribute = "scale(1 , " + scalingFactor + ")";
			element.setAttribute("transform", attribute);		
		}
		else if (element.classList.contains('material-height')) {
			//only scale heigth
			element.setAttribute("transform","scale(" + scalingFactor +", 1)");
		}
	}
	//if ( element.classList.contains('materialWidth') )

}
function updateScaling(scalingFactor) {
	// Show the scaling factor
	var factorDisplay = document.getElementById('scalingFactor');
  factorDisplay.innerHTML = scalingFactor
	//Scale the object
	var element = document.getElementById('drawing');
	var attribute = "scale(" + scalingFactor + ")";
	element.setAttribute("transform", attribute);
}

function zoom() {
        var circle = document.getElementById('inner');
    }
// Will be called onLoad


document.getElementById("scalingSlider").onchange = function() {
	updateScaling(this.value); 
	}
document.getElementById("materialSlider").onchange = function() {
	updateThickness(this.value); 
	}
