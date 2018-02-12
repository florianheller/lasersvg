/*
 *	laserSVG.js
 * 
 *	This file contains an example implementation of a host that wants to take advantage of LaserSVG features.
 *	IT contains mostly glue code to attach UI elements to functions of the client script included in the LaserSVG file itself.	
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
	let factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = materialThickness;
	
	//Scale the objects
	laserSvgScript.updateThickness(materialThickness);
}


function updateScaling(scalingFactor) {
	//Scale the object drawing
	laserSvgScript.updateScaling(scalingFactor);

	// Show the scaling factor
	let factorDisplay = document.getElementById('scalingFactor');
 	factorDisplay.innerHTML = laserSvgScript.scalingFactor;


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

	let factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = script.materialThickness;

  	let slider = document.getElementById('materialSlider');
  	slider.value = script.materialThickness;
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


// MARK: Editing functions 
// ------------------------------


function toggleMaterialThickness(checkBox) {
	let element = laserSvgScript.currentSelection;
	switch (element.tagName) {
		// Path and rect are the only interesting ones
		case 'path': 
				// We need to turn the current description into a new template by replacing the right number with {thickness}
				var description;
				if (element.hasAttributeNS(laser_NS, "laser:template") == true ) {
					description = element.getAttributeNS(laser_NS, "laser:template");
				}
				else { 
					description = element.getAttribute("d");
				}
				document.getElementById("pathTemplate").innerHTML = description;
				// Get a list of all 
				console.log(description);
				console.log(element.getTotalLength());
				break;

		case 'rect': break;
		default: break;
	}
}

/* Loads all relevant parameters from the selected element and updates the UI accordingly
 * @param element: the element from which the parameters should be loaded
 */
function loadParameters(element) {

	//Path description or template
	var description;
	if (element.hasAttributeNS(laser_NS, "laser:template")) {
				description = element.getAttributeNS(laser_NS, "laser:template");
	}
	else { 
		description = element.getAttribute("d");
	}
	document.getElementById("pathTemplate").innerHTML = description;

	if (element.hasAttributeNS(laser_NS, "thickness-adjust")) {
		document.getElementById("thicknessSelection").value = element.getAttributeNS(laser_NS, "thickness-adjust");
	}
	else {
		document.getElementById("thicknessSelection").value = "none";
	}

	//Joint parameters if present
	var s = document.getElementById("jointTypeSelection");
	if (element.hasAttributeNS(laser_NS, "joint-type")) {
		s.value = element.getAttributeNS(laser_NS, "joint-type");
	}
	else {
		s.value = "none";
	}

	s = document.getElementById("jointDirectionSelection");
	if (element.hasAttributeNS(laser_NS, "joint-direction")) {
		s.value  = element.getAttributeNS(laser_NS, "joint-direction");
	}
	else {
		s.value = "none";
	}

	s = document.getElementById("kerfSelection");
	if (element.hasAttributeNS(laser_NS, "kerf-adjust")) {
		s.value  = element.getAttributeNS(laser_NS, "kerf-adjust");
	}
	else {
		s.value = "none";
	}
}

function savePathTemplate() {
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:template", document.getElementById("pathTemplate").innerHTML)
}

function setJointType() {
	let s = document.getElementById("jointTypeSelection");
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint", 0);
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-type", s.options[s.selectedIndex].value);
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-direction", "inside");
	laserSvgScript.updateDrawing();

}

function setJointDirection() {
	let s = document.getElementById("jointDirectionSelection");
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-direction", s.options[s.selectedIndex].value);
	laserSvgScript.updateDrawing();

}

function setKerfAdjustment() {
	let s = document.getElementById("kerfSelection");
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:kerf-adjust", s.options[s.selectedIndex].value);
	laserSvgScript.updateDrawing();
}

function setThicknessAdjustment() {
	let s = document.getElementById("thicknessSelection");
	console.log("set thickness-adjust to " + s.options[s.selectedIndex].value);
	laserSvgScript.setPropertyForSelection("thickness-adjust", s.options[s.selectedIndex].value);
	//laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:thickness-adjust", s.options[s.selectedIndex].value);
	laserSvgScript.updateDrawing();
}

// Delegate function for the selection of a path. 
function didSelectElement(element) {
	if (element.tagName == "path") {
		document.getElementById("pathThickness").classList.remove("hidden");
		document.getElementById("primitiveThickness").classList.add("hidden");
	}
	else {
		document.getElementById("pathThickness").classList.add("hidden");
		document.getElementById("primitiveThickness").classList.remove("hidden");
	}
	loadParameters(element);
}

// Callbacks for the sliders

if (button = document.getElementById("zoomIn")) {
	button.onclick = function() {
	updateScaling(2);  
	}
}
if (button = document.getElementById("zoomOut")) {
	button.onclick = function() {
	updateScaling(0.5); 
	}
}
if (slider = document.getElementById("materialSlider")) {
	slider.onchange = function() {
	updateThickness(this.value); 
	}
}
if (slider = document.getElementById("fingerSlider")) {
	slider.onchange = function() {
	updateDrawing(this.value); 
	}
}


