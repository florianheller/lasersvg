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


var laserSvgDocument;
var laserSvgRoot;

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



// @param path: the path to replace. Only the connection between the first two points is considered.
// @param gap:  the gap between the origin of the path and the first finger
// @param inset: the height of the fingers
// @param fingers: the number of fingers to create on that path

// Right now either width or height needs to be zero, i.e., only works for horizontal and vertical lines

function createFingerJointPath(path, gap, inset, fingers) {
	var pathData = path.getPathData({normalize: true});

	if (pathData.length < 2) {
		return;
	}
	// Working with pathData.length allows us to replace entire paths that, e.g., already contain a finger-joint pattern.
	let width = pathData[pathData.length-1].values[0] - pathData[0].values[0];
	let height = pathData[pathData.length-1].values[1] - pathData[0].values[1];
	let alpha = Math.atan2(height, width);
	let cos = Math.cos(alpha);
	let sin = Math.sin(alpha);

	// Calculate the length of the fingers and gaps
	var edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (2 * fingers - 1);

	//The first element of the first path segment list, as this determines the origin
	// 
	var newPathData = []; 
	newPathData.push(pathData[0]);
 	
 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	
	//We are now at the point to add the first finger
	for (var i = 0; i < fingers; i += 1) {
 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
 		newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});

		if (i != fingers-1) {
			newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
		}
	}

	// Close the second gap
	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});

	path.setPathData(newPathData);
	
}


function createFlapJointPath(path, gap, inset, flaps) {
	var pathData = path.getPathData({normalize: true});

	if (pathData.length < 2) {
		return;
	}

	// There's no inside for a flap
	if (inset < 0) { inset = -inset; }
	

	// Working with pathData.length allows us to replace entire paths that, e.g., already contain a finger-joint pattern.
	let width = pathData[pathData.length-1].values[0] - pathData[0].values[0];
	let height = pathData[pathData.length-1].values[1] - pathData[0].values[1];
	let alpha = Math.atan2(height, width);
	let cos = Math.cos(alpha);
	let sin = Math.sin(alpha);

	// Calculate the length of the fingers and gaps
	var edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (flaps);

	//The first element of the first path segment list, as this determines the origin
	// 
	var newPathData = []; 
	newPathData.push(pathData[0]);
 	
 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	
	//We are now at the point to add the first finger
	for (var i = 0; i < flaps; i += 1) {
		//newPathData.push({type: "l", values: [inset, inset]});
		let stepX = (cos * inset) + (Math.cos(alpha+(Math.PI/2)) * inset);
		let stepY = (sin * inset) + (Math.sin(alpha+(Math.PI/2)) * inset);

		let stepX2 = (cos * inset) + (Math.cos(alpha-(Math.PI/2)) * inset);
		let stepY2 = (sin * inset) + (Math.sin(alpha-(Math.PI/2)) * inset);

 		newPathData.push({type: "l", values: [stepX, stepY]});
 		newPathData.push({type: "l", values: [(cos * (fingerSize-2*inset)) , (sin * (fingerSize - 2*inset))]});
 		//newPathData.push({type: "l", values: [inset, -inset]});
 		newPathData.push({type: "l", values: [stepX2, stepY2]});

		//if (i != flaps-1) {
		//	newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
		//}
	}

	// Close the second gap
	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});

	path.setPathData(newPathData);
	
}

function createTSlotPath(path, gap, inset, fingers) {
	var pathData = path.getPathData({normalize: true});

	if (pathData.length < 2) {
		return;
	}
	// Working with pathData.length allows us to replace entire paths that, e.g., already contain a finger-joint pattern.
	let width = pathData[pathData.length-1].values[0] - pathData[0].values[0];
	let height = pathData[pathData.length-1].values[1] - pathData[0].values[1];
	let alpha = Math.atan2(height, width);
	let cos = Math.cos(alpha);
	let sin = Math.sin(alpha);

	// Calculate the length of the fingers and gaps
	var edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (2 * fingers - 1);

	
	if (inset < 0) {

		//The first element of the first path segment list, as this determines the origin
		// 
		var newPathData = []; 
		newPathData.push(pathData[0]);
	 	
	 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
	 	
	 	//We are now at the point to add the first finger
		for (var i = 0; i < fingers; i += 1) {

			// Check wether we need to make the t-slots or holes for the screws depending on the direction
			if (i%2 != 0) {
			 	newPathData.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});

				newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * -inset/2), (Math.sin(alpha+(Math.PI/2)) * -inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * 2), (Math.sin(alpha+(Math.PI/2)) * 2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * -inset/2), (Math.sin(alpha+(Math.PI/2)) * -inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: bolt diameter
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * -inset/2), (Math.sin(alpha-(Math.PI/2)) * -inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * 2), (Math.sin(alpha-(Math.PI/2)) * 2)]});
				newPathData.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * -inset/2), (Math.sin(alpha-(Math.PI/2)) * -inset/2)]});
				newPathData.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});
		 		//newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * -inset/2), (Math.sin(alpha-(Math.PI/2)) * -inset/2)]});
		 		if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
				}

			}
			else {
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
		 		newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});

				if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
				}
			}
		}

		// Close the second gap
		newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});

		path.setPathData(newPathData);
	
	}
	else {

		var newPathData = []; 
		newPathData.push(pathData[0]);
	 	
	 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});

		for (var i = 0; i < fingers; i += 1) {

			if (i%2 == 0) {
				newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
 				newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 				newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});

				if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * 3 * fingerSize, sin * 3 * fingerSize]});
				}
			}

			else {

				//The circles take absolute coordinates, so ew have to calculate them
					var x = pathData[0].values[0];
					var y = pathData[0].values[1];

				let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
				//circle.setAttribute("cx", x+(2*i *fingerSize)+gap+0.5*fingerSize+(Math.cos(alpha+(Math.PI/2)) * inset));
				circle.setAttribute("cx", x + Math.cos(alpha) * ((2* i *fingerSize)+gap+0.5*fingerSize) + (Math.cos(alpha+(Math.PI/2)) * inset));
				circle.setAttribute("cy", y + Math.sin(alpha) * ((2* i *fingerSize)+gap+0.5*fingerSize) + (Math.sin(alpha+(Math.PI/2)) * inset));
				circle.setAttribute("r",  2);
				laserSvgRoot.appendChild(circle);	

			}
		}
		newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});

	}

	path.setPathData(newPathData);
}

function createJoints() {
	// TODO: replace all rects by 4 equivalent paths
	// TODO: replace composed paths by equivalent 1-stop paths

	// Look for paths that have a connection assigned
	var paths = laserSvgRoot.querySelectorAll('[*|joint]');
	for (let path of paths) {
		// Get the direction of the joint
		var direction = -1;
		if (path.hasAttributeNS(laser_NS,'joint-direction')) {
			if (path.getAttributeNS(laser_NS,'joint-direction') == 'inside') {
				direction = 1;
			}
		}
		//create a new path with the joint pattern
		if (path.hasAttributeNS(laser_NS,'joint-type')) {
			switch(path.getAttributeNS(laser_NS,'joint-type')) {
				case 'finger': createFingerJointPath(path, 5, materialThickness * direction, numberOfFingers); break;
				case 'flap': createFlapJointPath(path, 5, materialThickness, 2); break;
				case 'tslot': createTSlotPath(path, 5, materialThickness * direction, numberOfFingers); break;
				default: break;
			}
		}
		//createFingerJointPath(path, 5, materialThickness * direction, numberOfFingers);
		//createFlapJointPath(path, 5, materialThickness, 1);
	}
}

function replacePrimitives() {
	// iterate over all rects and replace them with single paths
	// TODO: make sure transforms are applied accordingly
	let rects = laserSvgRoot.getElementsByTagName('rect');
	
	while (rects[0]) { //rects is a NodeList and gets updated when we remove stuff

		rect = rects[0];

		//Get the origin and dimensions of the rect
		let x = Number(rect.getAttribute("x"));
		let y = Number(rect.getAttribute("y"));
		let width = Number(rect.getAttribute("width"));
		let height = Number(rect.getAttribute("height"));

		// Top
		let pathTop = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x  , y] },
			{ type: "l", values: [width, 0] }
		]; 
		pathTop.setPathData(pathData);
		transferAttributes(rect, pathTop, "top");
		laserSvgRoot.appendChild(pathTop)	
		// Right
		let pathRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x + width , y + height] },
			{ type: "l", values: [0, -height] }
		]; 
		pathRight.setPathData(pathData);
		transferAttributes(rect, pathRight, "right");
		laserSvgRoot.appendChild(pathRight);	
		// Bottom
		let pathBottom = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x + width , y + height] },
			{ type: "l", values: [-width, 0] }
		]; 
		pathBottom.setPathData(pathData);
		transferAttributes(rect, pathBottom, "bottom");
		laserSvgRoot.appendChild(pathBottom);
		// Left
		let pathLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x  , y ] },
			{ type: "l", values: [0, height] }
		]; 
		pathLeft.setPathData(pathData);
		transferAttributes(rect, pathLeft, "left");
		laserSvgRoot.appendChild(pathLeft);

		// Remove the original rect
		laserSvgRoot.removeChild(rect);
	}
}

// Transfers the joint-attributes from a rect to a path at the given orientation, 
// for example, if the rect has "joint-left-direction", the path will get the attribute "joint-direction"
function transferAttributes(rect, path, orientation) {
	let attributes = [ "", "-direction", "-type"];
	for (let attribute of attributes) {
		if (rect.hasAttributeNS(laser_NS,'joint-' + orientation + attribute)) {
			path.setAttributeNS(laser_NS,'joint' + attribute, rect.getAttributeNS(laser_NS,'joint-' + orientation + attribute));
		}
	}

}


// Callback to redraw after variables have been changed from the outside
function updateDrawing(numberOfFingers) {
	var fingerDisplay = document.getElementById('numberOfFingers');
 	fingerDisplay.innerHTML = numberOfFingers
 	console.log(numberOfFingers);
	laserSvgScript.numberOfFingers = numberOfFingers;

	laserSvgScript.createJoints();
}




// This function gets called by the JavaScript embedded into the SVG file. 
// Setting the variable allows us to access the embedded JS to update parameters.
function svgLoaded(event){
	// If the embedding document supports it, make our functions available
	if(window.parent.svgDidLoad) window.parent.svgDidLoad(this);
	//laserSvgScript = event;	// A pointer to this very script in order to allow an embedding document to call functions on this script
	laserSvgDocument = event.target.ownerDocument;	// A pointer to our own SVG document, to make sure we have the correct pointer even if we are embedded in another document
	laserSvgRoot = laserSvgDocument.documentElement;	// The DOM-Root of our svg document.
		// TODO: remove groups by applying their transforms to the child elements.
		// TODO: how to work with defs? Do we need to replace them in the DOM?
		// Replace Primitives with singles paths
		replacePrimitives();
		// Create the joints as specified by the parameters
		createJoints();
		// TODO: draw the lines visualizing the connections.
}

function getImageForExport() {
	// TODO: remove the lines vizualizing the connections
	// TODO: remove the interactivity (onMouseOver etc.)

	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}