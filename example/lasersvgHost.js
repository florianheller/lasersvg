/*
 *	laserSVG.js
 * 
 *	This file contains an example implementation to change the material thickness and the size of 
 *	a laserSVG compliant template. 
 *	
 *	Copyright C2017 Florian Heller florian.heller<at>uhasselt.be
 *	
 *	See http://www.heller-web.net/lasersvg
 *	or http://github.io/florianheller/lasersvg for more info
 * 
 * 
 *	TODO: implement the scaling funtion
 *	
 *	TODO: implement the press-fit joint indicators
 *	laser:press-fit should work like the stroke-alignment attribute from SVG2
 *	laser:press-fit="middle | inside | outside" with middle being the default. The other options offset the 
 *	path by _cutWidth_ to make the resulting piece having the exact dimensions as defined by the drawing. 
 */

var laser_NS = 'http://www.heller-web.net/lasersvg';

var laserSvgScript;

var materialThickness = 4.0;
var numberOfFingers = 5;

function updateThickness(materialThickness) {
	// Show the materialThickness 
	var factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = materialThickness;
	//Scale the objects
	
	var drawingObject = document.getElementById('drawingObject');

	// Iterate over all objects in the SVG
	var svgDrawing = drawingObject.contentDocument;
	var elements = svgDrawing.querySelectorAll('*');

	for (var i=0; i<elements.length; i++) {
		var element = elements[i];
		// Check if it has a material thickness attribute
		if (element.hasAttributeNS(laser_NS,'material-thickness')) {
			var thickness = element.getAttributeNS(laser_NS,'material-thickness');
			switch (thickness) {
				case 'width': element.setAttribute("width", materialThickness); break; 
				case 'height': element.setAttribute("height", materialThickness); break; 
				case 'both': element.setAttribute("height", materialThickness); element.setAttribute("width", materialThickness); break;
				default: break; // Results to none
			}
		}
		// Check if the element has a template attribute
		if (element.hasAttributeNS(laser_NS,'template')) {
			// If so, use the template to resize the path correctly
			var template = element.getAttributeNS(laser_NS,'template');
			var newTemplate = template.replace(/[{]thickness[}]/g,materialThickness);
			element.setAttribute("d",newTemplate);
		}
	}
}


function updateScaling(scalingFactor) {
	// Show the scaling factor
	var factorDisplay = document.getElementById('scalingFactor');
 	factorDisplay.innerHTML = scalingFactor

	//Scale the object
	var drawingObject = document.getElementById('drawingObject');
	var svgDrawing = drawingObject.contentDocument;
	
	//TODO: this is not functional as of now.
	var elements = svgDrawing.querySelectorAll('use');
	for (var i=0; i<elements.length; i++) {
		var element = elements[i];
		var attribute = "scale(" + scalingFactor + ")";
		element.setAttribute("transform", attribute);
	}
}





// Callback to redraw after variables have been changed from the outside
function updateDrawing(numberOfFingers) {
	var fingerDisplay = document.getElementById('numberOfFingers');
 	fingerDisplay.innerHTML = numberOfFingers

	laserSvgScript.numberOfFingers = numberOfFingers;
	laserSvgScript.createJoints();

}


function svgDidLoad(script) {
	laserSvgScript = script;
}


// This function exports the SVG with all changes as a new file
function exportSVG() {
	// Get the source
	source = laserSvgScript.getImageForExport();

	var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
	var svgUrl = URL.createObjectURL(svgBlob);
	var downloadLink = document.createElement("a");
	downloadLink.href = svgUrl;
	downloadLink.download = "laserExport.svg";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

// Callbacks for the sliders

document.getElementById("scalingSlider").onchange = function() {
	updateScaling(this.value); 
	}
document.getElementById("materialSlider").onchange = function() {
	updateThickness(this.value); 
	}
document.getElementById("fingerSlider").onchange = function() {
	updateDrawing(this.value); 
	}

