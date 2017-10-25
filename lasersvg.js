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
	
	// Only apply this to 
	var elements = svgDrawing.querySelectorAll('*, :not(svg) :not(defs) :not(desc) :not(title)');
	for (var i=0; i<elements.length; i++) {
		var element = elements[i];
		var attribute = "scale(" + scalingFactor + ")";
		element.setAttribute("transform", attribute);
	}
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
