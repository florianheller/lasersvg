function updateThickness(materialThickness) {
	// Show the materialThickness 
	var factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = materialThickness;
	//Scale the objects
	
	var drawingObject = document.getElementById('drawingObject');

	// Iterate over all objects in the SVG
	var svgDrawing = drawingObject.contentDocument;
	var elements = svgDrawing.querySelectorAll('*');
	//var rects = svgDrawing.getElementsByTagName("rect");
	for (var i=0; i<elements.length; i++) {
		var element = elements[i];
		// Check if it has a material thickness attribute
		if (element.hasAttribute('laser:material-thickness')) {
			var thickness = element.getAttribute('laser:material-thickness');
			switch (thickness) {
				case 'width': element.setAttribute("width", materialThickness); break; 
				case 'height': element.setAttribute("height", materialThickness); break; 
				case 'both': element.setAttribute("height", materialThickness); element.setAttribute("width", materialThickness); break;
				default: break; // Results to none
			}
		}
		// Check if the element has a template attribute
		if (element.hasAttribute('laser:template')) {
			var template = element.getAttribute('laser:template');
			var newTemplate = template.replace(/[{]thick[}]/g,materialThickness);
			element.setAttribute("d",newTemplate);

		}
	}
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
