/*jshint esversion: 6 */
/*
 *	laserSVG.js
 * 
 *	This file contains an example implementation of the LaserSVG features. 
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
 *
 *	TODO: replace use-links to defs in the DOM
 *	TODO: ungroup groups in the working DOM
 *  TODO: handle close-path commands (results in NaN coordinates)
 *  TODO: only convert rects to paths when needed. 
 *	TODO: provide a list of joint types and their parameters as info-dictionaries
 *	TODO: Finish template generation for rects with specified material thickness attributes
 *	TODO: rename press-fit=[Inside|Outside] to kerf-adjust=[grow|shrink]
 *	TODO: allow user to flip direction when using flaps
 *	TODO: create template for parametric joints to be adaptable to material thickness afterwards
 *	TODO: get grip of holes of t-slot joints to be able to remove them if needed (possibly compound path with jumps)
 *	TODO: add handling for ellipses, polygons, and polylines (https://www.w3.org/TR/SVG2/shapes.html#EllipseElement)
 */

const laser_NS = 'http://www.heller-web.net/lasersvg';

// References to the different points in the DOM
var parentDocument;
var laserSvgDocument;
var laserSvgRoot;

//Global settings for the drawing
var materialThickness = 4.0;
var kerf = 0.2;

// Global settings for the parametric tools
var numberOfFingers = 5;

// Global scaling factor
var scalingFactor = 1.0;


/************************* Thickness, Scale, and Kerf ****************************************************/


/* Adjusts the drawing to a new material thickness
 * @param newThickness: the new material thickness
 */

function updateThickness(newThickness) {

	//Update the global material Thickness
	materialThickness = Number(newThickness);

	var thickness = materialThickness;
	// Iterate over all objects in the SVG
	var elements = laserSvgRoot.querySelectorAll('*');

	for (let element of elements) {
		// Check if it has a material thickness attribute
		if (element.hasAttributeNS(laser_NS,'thickness-adjust')) {
			var setting = element.getAttributeNS(laser_NS,'thickness-adjust');
			switch (setting) {
				case 'width': element.setAttribute("width", thickness); break; 
				case 'height': element.setAttribute("height", thickness); break; 
				case 'both': element.setAttribute("height", thickness); element.setAttribute("width", thickness); break;
				default: break; // Results to none
			}
		}
		// Check if the element has a template attribute
		if (element.hasAttributeNS(laser_NS,'template')) {
			// We need to multiply thickness with inverted scalingFactor as the path will be scaled afterwards
			useTemplateWithThickness(element, thickness / scalingFactor);
			scalePath(element);
		}
	}
}

/* Scales the drawing by the factor given as parameter
 * calling it with 0.5 means that the drawing is reduced to half the size while
 * calling it with a scaling factor of 2 will double its size
 * Calling the function twice with factor 2 will result in a 4x magnification
 * @param scalingFactor relative scaling factor 
 */ 
function scale(scalingFactor) {

	//iterate over all objects and scale them accordingly
	//var elements = laserSvgRoot.querySelectorAll('*');
	//

	this.scalingFactor *= scalingFactor;

	let tags = ['path', 'rect'];
	for (let tag of tags) {
		var elements = laserSvgRoot.getElementsByTagName(tag);
		for (let element of elements) {
			if (element.hasAttribute("x")) {
				element.setAttribute("x", Number(element.getAttribute("x"))*scalingFactor);
			}
			if (element.hasAttribute("y")) {
				element.setAttribute("y", Number(element.getAttribute("y"))*scalingFactor);
			}
			// Get potential adjustment setting
			var setting = "";
			if (element.hasAttributeNS(laser_NS,'thickness-adjust')) {
				setting = element.getAttributeNS(laser_NS,'thickness-adjust');
			}

			if (element.hasAttribute("width")) {
				if (setting == "width" || setting == "both") {
					element.setAttribute("width", materialThickness);
				}
				else {
					element.setAttribute("width", Number(element.getAttribute("width"))*scalingFactor);
				}
			}
			if (element.hasAttribute("height")) {
				if (setting == "height" || setting == "both") {
					element.setAttribute("height", materialThickness);
				}
				else {
					element.setAttribute("height", Number(element.getAttribute("height"))*scalingFactor);
				}
			}
			if (element.hasAttributeNS(laser_NS,'template')) {
				useTemplateWithThickness(element, Number(materialThickness) / this.scalingFactor);
			}
			scalePath(element);

		}
	}
}

function useTemplateWithThickness(path, thickness) {
	// If so, use the template to resize the path correctly
	var template = path.getAttributeNS(laser_NS,'template');
	if (path.hasAttributeNS(laser_NS,'thickness')) {
		thickness = path.getAttributeNS(laser_NS,'thickness');
	}

	//var newTemplate = template.replace(/[{](.*?thickness.*?)[}]/g, function (x) { console.log(x); result = eval(x); if (result == undefined) {return "";}  else  {return eval(x);} });
	//var newTemplate = template.replace(/[{](.*?)[}]/g, function (x) { result = eval(x); if (result == undefined) {return "";}  else  {return result;} });
	
	var newTemplate = template.replace(/[{](.*?)[}]/g, function (x) {  
		// First create a function out of x:
		let calc;
		// If there are any variable assignments in the calculation, we can't place the return statement in front of the expression, it needs to be at the end. 
		// In the normal case with thickness calculations, we could just place a return in front of it.
		if (!x.includes("=")) {
			calc = new Function('thickness', "return " + x.slice(1,-1)); 
		}
		else {
			calc = new Function('thickness', x.slice(1,-1)); 
		}
		
		return calc(thickness) });
	
	path.setAttribute("d",newTemplate);
}

function scalePath(pathToScale) {
	if (pathToScale.hasAttribute("d")) {
		var newPathData = [];
		for (let segment of pathToScale.getPathData({normalize: false})) {
			if (segment.values.length>1) {
				segment.values[0] *= this.scalingFactor;
				segment.values[1] *= this.scalingFactor;
			}
			newPathData.push(segment);
		}
		pathToScale.setPathData(newPathData);
	}
}

/* Adjusts the size and position of elements that need to be adapted to compensate for the kerf
 * Takes no parameters as the kerf is set globally
 */
function adjustForKerf() {
	// We only do kerf adjust for paths, rects, and circles
	console.log("Adjust for kerf");
	let tags = ['path', 'rect', 'circle'];
	for (let tag of tags) {
		let elements = laserSvgRoot.getElementsByTagName(tag);
		for (let element of elements) {
			if (element.hasAttributeNS(laser_NS,'kerf-adjust')) {
				let setting = element.getAttributeNS(laser_NS,'kerf-adjust');
				var offset = kerf; //Kerf adjustment should be scaling invariant
						if (setting=="shrink") { 
							offset = -offset;
						} 
				switch(tag) {
					case "rect": 
						if (element.hasAttribute("x")) {
							element.setAttribute("x", Number(element.getAttribute("x")) - offset/2);
						}
						if (element.hasAttribute("y")) {
							element.setAttribute("y", Number(element.getAttribute("y")) - offset/2);
						}
						if (element.hasAttribute("width")) {
							element.setAttribute("width", Number(element.getAttribute("width")) + offset);
						}
						if (element.hasAttribute("height")) {
							element.setAttribute("height", Number(element.getAttribute("height")) + offset);
						}
						break;
					case "circle": // No need to adjust the center coordinates
						if (element.hasAttribute("r")) {
							element.setAttribute("r", Number(element.getAttribute("r")) + offset);
						}
						break;
					default: break;
				}
			}
			else if (element.hasAttributeNS(laser_NS,'kerf-mask') && tag == "path") {
				applyKerfMaskToPath(element);
			}
		} // End elements 
	} // End Tag
}

function applyKerfMaskToPath(path) {
	if (!path.hasAttributeNS(laser_NS, "kerf-mask")) { return; } //If no kerf-mask present, we can't apply it. 
	let kerfMaskArray = path.getAttributeNS(laser_NS, "kerf-mask").split(" "); //Note that there is no marker for the first M command
	let pathData = path.getPathData({normalize: false}); //We work on relative coordinates
	if (kerfMaskArray.length != pathData.length-1) {console.log("Kerf-mask is incomplete"); return; }
	for (let i=0; i<kerfMaskArray.length; i++) {
		let setting = kerfMaskArray[i]
		switch(setting) {
			case 's':  changePathSegmentLength(pathData[i], kerf/2); break;
			case 'g': changePathSegmentLength(pathData[i], -kerf/2); break;
			case 'S':  changePathSegmentLength(pathData[i], kerf); break;
			case 'G': changePathSegmentLength(pathData[i], -kerf); break;
			default: break; //nothing to do
		}
	}
	console.log(pathData);

}

function changePathSegmentLength(pathData, offset) {	
	//Calculate the direction of the relative vector
	let angle = Math.atan2(pathData.values[1], pathData.values[0]);
	pathData.values[0] += (Math.round(Math.cos(angle)*100000)/100000)*offset;
	pathData.values[1] += (Math.round(Math.sin(angle)*100000)/100000)*offset; 
}

/************************* Visualization Helpers  ****************************************************/
/* This function highlights a certain path segment (e.g., to show selection).
 * It takes a path reference and an index of which subpath to highlight. It then creates a new path that overlays the original one
 * @param path: A reference to the path
 * @param segmentIndex: the (non-negative) index of the subpath to highlight. Usually the first instruction in a path is a move-command, so the first line starts at index 1
 * @param type: if multiple selections can occur, specifiy a different type for every selection. This reflects in the CSS selectors .pathHilight-type
 */
function highlightPathSegment(path, segmentIndex, type) {
	if (segmentIndex < 0) { return; } //Safety check
	let pathData = path.getPathData({normalize: true}); // Returns absolute coordinates

	if (segmentIndex >= pathData.length) { return; } //Index out of bounds
	let start = pathData[segmentIndex-1].values;
	let end = pathData[segmentIndex].values;

	let highlight = document.createElementNS("http://www.w3.org/2000/svg", "path");
	let newPathData = [
			{ type: "M", values: start },
			{ type: "L", values: end }
		]; 
	highlight.setPathData(newPathData);
	//Remove all previous highlights
	for (let e of laserSvgRoot.querySelectorAll(".pathHighlight-"+type)) {
		e.parentNode.removeChild(e);
	}

	//highlight.classList.add("selected");
	highlight.classList.add("pathHighlight-"+type); 

	laserSvgRoot.appendChild(highlight);		
}




/************************* Parametric Fabrication ****************************************************/

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

    var newPathData = []; 
	
	if (inset < 0) {

		//The first element of the first path segment list, as this determines the origin

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
				//TODO: how do we remove the stuff? Maybe use arcs in the path instead of circles

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
		if (path.hasAttributeNS(laser_NS,'laser:joint-direction')) {
			if (path.getAttributeNS(laser_NS,'laser:joint-direction') == 'inside') {
				direction = 1;
			}
		}
		//create a new path with the joint pattern
		if (path.hasAttributeNS(laser_NS,'laser:joint-type')) {
			switch(path.getAttributeNS(laser_NS,'laser:joint-type')) {
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
		laserSvgRoot.appendChild(pathTop);	
		pathTop.setAttributeNS(laser_NS,"laser:template",pathTop.getAttribute("d"));
		// Right
		let pathRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x + width , y + height] },
			{ type: "l", values: [0, -height] }
		]; 
		pathRight.setPathData(pathData);
		transferAttributes(rect, pathRight, "right");
		laserSvgRoot.appendChild(pathRight);	
		pathRight.setAttributeNS(laser_NS,"laser:template",pathRight.getAttribute("d"));
		// Bottom
		let pathBottom = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x + width , y + height] },
			{ type: "l", values: [-width, 0] }
		]; 
		pathBottom.setPathData(pathData);
		transferAttributes(rect, pathBottom, "bottom");
		laserSvgRoot.appendChild(pathBottom);
		pathBottom.setAttributeNS(laser_NS,"laser:template",pathBottom.getAttribute("d"));
		// Left
		let pathLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
		var pathData = [
			{ type: "M", values: [x  , y ] },
			{ type: "l", values: [0, height] }
		]; 
		pathLeft.setPathData(pathData);
		transferAttributes(rect, pathLeft, "left");
		laserSvgRoot.appendChild(pathLeft);
		pathLeft.setAttributeNS(laser_NS,"laser:template",pathLeft.getAttribute("d"));

		// Remove the original rect
		rect.parentNode.removeChild(rect);
	}
}

// Transfers the joint-attributes from a rect to a path at the given orientation, 
// for example, if the rect has "joint-left-direction", the path will get the attribute "joint-direction"
function transferAttributes(rect, path, orientation) {
	let attributes = [ "", "-direction", "-type"];
	for (let attribute of attributes) {
		if (rect.hasAttributeNS(laser_NS,'laser:joint-' + orientation + attribute)) {
			path.setAttributeNS(laser_NS,'laser:joint' + attribute, rect.getAttributeNS(laser_NS,'laser:joint-' + orientation + attribute));
		}
	}

}


// Callback to redraw after variables have been changed from the outside
function updateDrawing() {
	createJoints();
}





// This function gets called by the JavaScript embedded into the SVG file. 
// Setting the variable allows us to access the embedded JS to update parameters.
function svgLoaded(event){
	console.log("SVG Loaded");
	if (event.target != null) {laserSvgDocument = event.target.ownerDocument; }
	else {laserSvgDocument = event;}
	//laserSvgScript = event;	// A pointer to this very script in order to allow an embedding document to call functions on this script
	//laserSvgDocument = event.target.ownerDocument;	// A pointer to our own SVG document, to make sure we have the correct pointer even if we are embedded in another document
	laserSvgRoot = laserSvgDocument.documentElement;	// The DOM-Root of our svg document.
	if (laserSvgRoot.hasAttributeNS(laser_NS,"material-thickness")) {
		materialThickness = laserSvgRoot.getAttributeNS(laser_NS,"material-thickness");
	}
	if (laserSvgRoot.hasAttributeNS(laser_NS,"kerf")) {
		kerf = laserSvgRoot.getAttributeNS(laser_NS,"kerf");
	}

	// TODO: remove groups by applying their transforms to the child elements.
	// TODO: how to work with defs? Do we need to replace them in the DOM?
	// Replace Primitives with singles paths
	//replacePrimitives();
	// Create the joints as specified by the parameters
	createJoints();

	// TODO: draw the lines visualizing the connections.
	// Add the event handlers for editing
	addEditEventHandlers();

	// If the embedding document supports it, make our functions available
	if(window.parent.svgDidLoad) { 
		parentDocument = window.parent; //We need this pointer in edit mode
		window.parent.svgDidLoad(this);
	}

}

/* 
 * Functions that provide functionality to be called from the host script. This is not invoked from the drawing itself.
 */

var currentSelection;

function setPropertyForSelection(property, value) {
	console.log("Set Property " + property + " to " + value + " on " + currentSelection + " in namespace " + laser_NS);
	currentSelection.setAttributeNS(laser_NS, "laser:" + property, value);
	console.log(currentSelection.outerHTML);
}

function addEditEventHandlers() {
	let tags = ['path', 'rect', 'circle'];
	for (var tag of tags) {
		let elements = laserSvgRoot.getElementsByTagName(tag);
		for (let element of elements) {
			element.onclick = function () {
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this); //Notify the host script
			}
		}
	}
}

function removeEditEventHandlers() {
	let tags = ['path', 'rect'];
	for (var tag of tags) {
		let elements = laserSvgRoot.getElementsByTagName(tag);
		for (var element of elements) {
			element.onclick = null;
		}
	}
}


function redrawSelection() {
	var elements = laserSvgRoot.querySelectorAll('.selected');
	for (let element in elements) {
		if (element != currentSelection) {
			element.classList.remove("selected");
		}
	}
}


function getImageForSaving() {
	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}

function getImageForExport() {
	// TODO: remove the lines vizualizing the connections
	// TODO: remove the interactivity (onMouseOver etc.)

	//Adjust for Kerf if required
	adjustForKerf();

	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}

// If the file was not yet a LaserSVG File, then the onload statement is missing and the callback never gets called
// therefore, we call it once again here. The callback performs a check wether it was already called or not. 
document.addEventListener("DOMContentLoaded", function(e) {
      svgLoaded(document);
});
