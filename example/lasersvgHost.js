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
	laserSvgScript.updateThickness(materialThickness);
}


function updateScaling(scalingFactor) {
	// Show the scaling factor
	var factorDisplay = document.getElementById('scalingFactor');
 	factorDisplay.innerHTML = scalingFactor

	//Scale the object drawing
	laserSvgScript.updateScaling(scalingFactor);
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

if (slider = document.getElementById("scalingSlider"))
	slider.onchange = function() {
	updateScaling(this.value);  
	}

if (slider = document.getElementById("materialSlider"))
	slider.onchange = function() {
	updateThickness(this.value); 
	}

if (slider = document.getElementById("fingerSlider")) {
	slider.onchange = function() {
	updateDrawing(this.value); 
	}

} 

