/*
 *	laserSVGJoints.js
 * 
 *	This file contains the implementation of the LaserSVG parametric joints. 
 *	
 *	Copyright C2017 Florian Heller florian.heller<at>uhasselt.be
 *	
 *	See http://www.heller-web.net/lasersvg
 *	or http://github.io/florianheller/lasersvg for more info
 */
// Global settings for the parametric tools
var numberOfFingers = 5;


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
	var newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);

 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

	//We are now at the point to add the first finger
	for (var i = 0; i < fingers; i += 1) {
 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
 		newTemplate.push({type: "l", values: ["{" + (Math.cos(alpha+(Math.PI/2)) * inset/materialThickness + "*thickness}"), "{" + (Math.sin(alpha+(Math.PI/2)) * inset/materialThickness + "*thickness}")]});

 		newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 		newTemplate.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});

 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});
 		newTemplate.push({type: "l", values: ["{" +(Math.cos(alpha-(Math.PI/2))* inset/materialThickness + "*thickness}"), "{" + (Math.sin(alpha-(Math.PI/2)) * inset/materialThickness + "*thickness}")]});

		if (i != fingers-1) {
			newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
			newTemplate.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
		}
	}

	// Close the second gap
	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});


	path.setPathData(newPathData);

	//We need to convert the pathSegment list into a string that we can store as template
	let tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	tempPath.setPathData(newTemplate);
	let tempTemplate = tempPath.getAttribute("d")

	path.setAttributeNS(laser_NS, "laser:template", tempPath.getAttribute("d"));

	
}


function createCompactFingerJointPath(path, gap, inset, fingers) {
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
	var newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);

 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

	//We are now at the point to add the first finger
	for (var i = 0; i < fingers; i += 1) {
 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
 		
 		newTemplate.push({type: "l", values: ["{(" + (Math.cos(alpha+(Math.PI/2)) * inset/(2*materialThickness) + "*thickness)-0.5}"), "{(" + (Math.sin(alpha+(Math.PI/2)) * inset/(2*materialThickness) + "*thickness)-0.5}")]});
 		newTemplate.push({type: "a", values: [kerf, kerf, 0, 1, 0, (Math.cos(alpha+(Math.PI/2)))*0.5 , (Math.sin(alpha+(Math.PI/2)))*0.5 ]});
		newTemplate.push({type: "l", values: ["{(" + (Math.cos(alpha+(Math.PI/2)) * inset/(2*materialThickness) + "*thickness)-0.5}"), "{(" + (Math.sin(alpha+(Math.PI/2)) * inset/(2*materialThickness) + "*thickness)-0.5}")]});

 		newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 		newTemplate.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});

 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});
 		newTemplate.push({type: "l", values: ["{" +(Math.cos(alpha-(Math.PI/2))* inset/materialThickness + "*thickness}"), "{" + (Math.sin(alpha-(Math.PI/2)) * inset/materialThickness + "*thickness}")]});

		if (i != fingers-1) {
			newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
			newTemplate.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
		}
	}

	// Close the second gap
	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});


	path.setPathData(newPathData);

	//We need to convert the pathSegment list into a string that we can store as template
	let tempPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
	tempPath.setPathData(newTemplate);
	let tempTemplate = tempPath.getAttribute("d")

	path.setAttributeNS(laser_NS, "laser:template", tempPath.getAttribute("d"));

	updateThickness(materialThickness);
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

	// First transorm all primitives with joints assigned into path segments 
	let elements = laserSvgRoot.querySelectorAll('[*|joint-left],[*|joint-top],[*|joint-bottom],[*|joint-right]');
	elements.forEach((element) => { replacePrimitive(element); } );

	// Now we can work on paths
	let paths = laserSvgRoot.querySelectorAll('[*|joint]');	
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
				case 'finger-compact': createCompactFingerJointPath(path, 5, materialThickness * direction, numberOfFingers); break;
				case 'flap': createFlapJointPath(path, 5, materialThickness, 2); break;
				case 'tslot': createTSlotPath(path, 5, materialThickness * direction, numberOfFingers); break;
				default: break;
			}
		}
		//createFingerJointPath(path, 5, materialThickness * direction, numberOfFingers);
		//createFlapJointPath(path, 5, materialThickness, 1);
	}
}

function replacePrimitive(rect) {
	//Get the origin and dimensions of the rect
	// let x = rect.x.baseVal.valueInSpecifiedUnits;
	// let y = rect.y.baseVal.valueInSpecifiedUnits;
	// let width = rect.width.baseVal.valueInSpecifiedUnits;
	// let height = rect.height.baseVal.valueInSpecifiedUnits;
	let x = rect.x.baseVal.value;
	let y = rect.y.baseVal.value;
	let width = rect.width.baseVal.value;
	let height = rect.height.baseVal.value;

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
	pathRight.setAttributeNS(laser_NS,"template",pathRight.getAttribute("d"));
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
