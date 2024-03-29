/*jshint esversion: 6 */
/*
 *	laserSVG.js
 * 
 *	This file contains an example implementation of the LaserSVG features. 
 *	
 *	Copyright C2017 Florian Heller florian.heller<at>uhasselt.be
 *	
 *	See http://www.heller-web.net/lasersvg
 *	or https://florianheller.github.io/lasersvg/ for more info
 * 
 * 
 *	
 *	TODO: implement the press-fit joint indicators
 *	laser:press-fit should work like the stroke-alignment attribute from SVG2
 *	laser:press-fit="middle | inside | outside" with middle being the default. The other options offset the 
 *	path by _cutWidth_ to make the resulting piece having the exact dimensions as defined by the drawing. 
 *
 *	TODO: replace use-links to defs in the DOM
 *	TODO: ungroup groups in the working DOM
 *  TODO: only convert rects to paths when needed. 
 *	TODO: provide a list of joint types and their parameters as info-dictionaries
 *	TODO: Finish template generation for rects with specified material thickness attributes
 *	TODO: create template for parametric joints to be adaptable to material thickness afterwards
 *	TODO: get grip of holes of t-slot joints to be able to remove them if needed (possibly compound path with jumps)
 *	TODO: add handling for ellipses, polygons, and polylines (https://www.w3.org/TR/SVG2/shapes.html#EllipseElement)
 */

const laser_NS = 'http://www.heller-web.net/lasersvg/';
const svg_NS = 'http://www.w3.org/2000/svg';
const laserSvgURL = 'https://florianheller.github.io/lasersvg/';
// References to the different points in the DOM
var parentDocument;
var laserSvgDocument;
var laserSvgRoot;

//Global settings for the drawing
var materialThickness = 4.0;
var kerf = 0.2;


// Global scaling factor
var scalingFactor = 1.0;

var laserIsLoaded = false;

/************************* Thickness, Scale, and Kerf ****************************************************/


/* Adjusts the drawing to a new material thickness
 * @param newThickness: the new material thickness
 */

function updateThickness(newThickness) {

	let oldThickness = Number(materialThickness);

	//Update the global material Thickness
	materialThickness = Number(newThickness);

	//Make sure we have a number to run calculations on
	let thickness = materialThickness;

	// Iterate over all objects in the SVG
	let elements = laserSvgRoot.querySelectorAll('*');

	for (let element of elements) {
		// TODO: Remove local thickness declaration? 
			if (element.hasAttributeNS(laser_NS,'thickness')) {
				thickness = element.getAttributeNS(laser_NS,'thickness');
			}
			// If the origin is specified, 
			let origin = ""
			let adjust = ""
			// Check if it has a material thickness attribute
			if (element.hasAttributeNS(laser_NS,'thickness-adjust')) {
				adjust = element.getAttributeNS(laser_NS,'thickness-adjust');
				switch (adjust) {
					case 'width': element.setAttribute("width", thickness); break; 
					case 'height': element.setAttribute("height", thickness); break; 
					case 'both': element.setAttribute("height", thickness); element.setAttribute("width", thickness); break;
					default: break; // Results to none
				}
			}

			if (element.hasAttributeNS(laser_NS,'origin')) {
				// In that case, we also need to adjust the position of the element. 
				// For that purpose we have two options: either we save the original position or we take the previous thickness value and calculate the difference. 
				// The advantage of saving the original values is that errors don't add up if we work with float-thicknesses. 
				let originX, originY, centerX, centerY;
				if (!element.hasAttributeNS(laser_NS,'x')) {
					centerX = Number(element.getAttribute('x')) + (oldThickness/2);
					element.setAttributeNS(laser_NS, 'laser:centerX', centerX);
					element.setAttributeNS(laser_NS, 'laser:x', element.getAttribute('x') );
				}
				
				originX = Number(element.getAttributeNS(laser_NS,'x'));
				centerX = Number(element.getAttributeNS(laser_NS,'centerX'));
				
				if (!element.hasAttributeNS(laser_NS,'y')) {
					centerY = Number(element.getAttribute('y')) + (oldThickness/2);
					element.setAttributeNS(laser_NS, 'laser:centerY', centerY );
					element.setAttributeNS(laser_NS, 'laser:y', element.getAttribute('y'));
				}
				originY = Number(element.getAttributeNS(laser_NS,'y'));
				centerY = Number(element.getAttributeNS(laser_NS,'centerY'));
				

				origin = element.getAttributeNS(laser_NS,'origin');
				switch(origin) {
					// case 'top': break; //Default
					case 'bottom': if (adjust === "height" || adjust === "both") { element.setAttribute("y", Number(element.getAttribute('y')) + oldThickness - newThickness); } break;
					// case 'left': break; //Default
					case 'right': if (adjust === "width" || adjust === "both") { element.setAttribute("x", Number(element.getAttribute('x')) + oldThickness - newThickness); } break;
					// case 'top-left': break; // Default
					case 'top-right': break;
					// case 'bottom-left': break; //Same as bottom
					case 'bottom-right': 
						if (adjust === "height" || adjust === "both") { element.setAttribute("y", originY + oldThickness - newThickness); }
						if (adjust === "width" || adjust === "both") { element.setAttribute("x", originX + oldThickness - newThickness); } 
						break;
					case 'center':  
						if (adjust === "height" || adjust === "both") { element.setAttribute("y", centerY - (newThickness/2)); }
						if (adjust === "width" || adjust === "both") { element.setAttribute("x", centerX - (newThickness/2)); }
						break;
				}

			}


		// Check if the element has a template attribute
		if (element.hasAttributeNS(laser_NS,'template')) {
			// We need to multiply thickness with inverted scalingFactor as the path will be scaled afterwards
			useTemplateWithThickness(element, thickness / this.scalingFactor);
			scalePath(element, this.scalingFactor);
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

	this.scalingFactor *= scalingFactor;
	let tags = ['path', 'rect', 'circle', 'ellipse'];
	for (let tag of tags) {
		var elements = laserSvgRoot.getElementsByTagName(tag);
		for (let element of elements) {
			if (element.hasAttributeNS(laser_NS,'resizeLock')) {
				if (element.getAttributeNS(laser_NS,'resizeLock') == "lock") {
					continue;
				}
			}
			if (element.hasAttribute("x")) {
				element.setAttribute("x", Number(element.getAttribute("x"))*scalingFactor);
			}
			if (element.hasAttribute("y")) {
				element.setAttribute("y", Number(element.getAttribute("y"))*scalingFactor);
			}
			// Circles and ellipses
			if (element.hasAttribute("cx")) {
				element.setAttribute("cx", Number(element.getAttribute("cx"))*scalingFactor);
			}
			if (element.hasAttribute("cy")) {
				element.setAttribute("cy", Number(element.getAttribute("cy"))*scalingFactor);
			}
			if (element.hasAttribute("r")) {
				element.setAttribute("r", Number(element.getAttribute("r"))*scalingFactor);
			}
			if (element.hasAttribute("rx")) {
				element.setAttribute("rx", Number(element.getAttribute("rx"))*scalingFactor);
			}
			if (element.hasAttribute("ry")) {
				element.setAttribute("ry", Number(element.getAttribute("ry"))*scalingFactor);
			}
			// Change the coordinates that might have been saved along with the 'origin' parameter
			if (element.hasAttributeNS(laser_NS,"x")) {
				element.setAttributeNS(laser_NS, 'laser:x', Number(element.getAttributeNS(laser_NS,"x"))*scalingFactor);
			}
			if (element.hasAttributeNS(laser_NS,"y")) {
				element.setAttributeNS(laser_NS, 'laser:y', Number(element.getAttributeNS(laser_NS,"y"))*scalingFactor);
			}
			if (element.hasAttributeNS(laser_NS,"centerX")) {
				element.setAttributeNS(laser_NS, 'laser:centerX', Number(element.getAttributeNS(laser_NS,"centerX"))*scalingFactor);
			}
			if (element.hasAttributeNS(laser_NS,"centerY")) {
				element.setAttributeNS(laser_NS, 'laser:centerY', Number(element.getAttributeNS(laser_NS,"centerY"))*scalingFactor);
			}
			if (element.hasAttributeNS(laser_NS,"r")) {
				element.setAttributeNS(laser_NS, 'laser:r', Number(element.getAttributeNS(laser_NS,"r"))*scalingFactor);
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
			// Paths that are based on a template can be generated from that template directly
			// all others need to be scaled
			
			// Scale paths
			if (element.tagName == "path") {
				if (element.hasAttributeNS(laser_NS,'template')) {
					useTemplateWithThickness(element, Number(materialThickness) / this.scalingFactor);
					scalePath(element, this.scalingFactor);
				}
				else {
					scalePath(element, scalingFactor);
				}
			}
		}
	}

	// Check wether groups have transforms that need to be scaled
	var elements = laserSvgRoot.getElementsByTagName('g');
	for (let element of elements) {
		let transforms = element.transform.baseVal; // An SVGTransformList
		for (let t=0; t<transforms.numberOfItems; t++) {
			let transform = transforms.getItem(t);       // An SVGTransform
			if (transform.type == SVGTransform.SVG_TRANSFORM_TRANSLATE){
				var firstX = transform.matrix.e,
					firstY = transform.matrix.f;

				transform.setTranslate(firstX * scalingFactor, firstY * scalingFactor);
			}

		}
	}

	// Scale the SVG viewbox if defined to avoid clipping
	var vBoxValues = laserSvgRoot.getAttribute("viewBox").replace(/,/g,"").split(" ").map(Number);
	vBoxValues[2] *= scalingFactor;
	vBoxValues[3] *= scalingFactor;
	laserSvgRoot.setAttribute("viewBox", vBoxValues.join(" "));
	//scale the document size
	// Assume it defined in mm
	// TODO: make this unit agnostic, i.e., check wether the last to chars are chars or numbers, and reuse them after scaling
	svgHeight = Number(laserSvgRoot.getAttribute("height").replace("mm",""))*scalingFactor;
	laserSvgRoot.setAttribute("height",svgHeight+"mm");

	svgWidth = Number(laserSvgRoot.getAttribute("width").replace("mm",""))*scalingFactor;
	laserSvgRoot.setAttribute("width",svgWidth+"mm");

}

function useTemplateWithThickness(path, thickness) {
	// If so, use the template to resize the path correctly
	var template = path.getAttributeNS(laser_NS,'template');
	if (path.hasAttributeNS(laser_NS,'thickness')) {
		thickness = path.getAttributeNS(laser_NS,'thickness');
	}

	
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

function scalePath(pathToScale, factor) {
	if (pathToScale.hasAttribute("d")) {
		var newPathData = [];
		// Some commands, such as arcs have parameters that do not scale (angle of opening for example)
		for (let segment of pathToScale.getPathData({normalize: false})) {
			switch(segment.type) {
				case 'a': 
					if (segment.values.length == 7) {
						segment.values[0] *= factor;
						segment.values[1] *= factor;
						segment.values[5] *= factor;
						segment.values[6] *= factor;
					}
				break;

				default: for (let s=0; s<segment.values.length; s++) {
					segment.values[s] *= factor;
					}
					break;
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
			case 's':  changePathSegmentLength(pathData[i], -kerf/2); break;
			case 'g': changePathSegmentLength(pathData[i], kerf/2); break;
			case 'S':  changePathSegmentLength(pathData[i], -kerf); break;
			case 'G': changePathSegmentLength(pathData[i], kerf); break;
			default: break; //nothing to do
		}
	}
	console.log(pathData);
	path.setPathData(pathData);

}

function changePathSegmentLength(pathData, offset) {	
	//Calculate the direction of the relative vector
	let angle = Math.atan2(pathData.values[1], pathData.values[0]);
	pathData.values[0] += (Math.round(Math.cos(angle)*100000)/100000)*offset;
	pathData.values[1] += (Math.round(Math.sin(angle)*100000)/100000)*offset; 
}



function isInWhichSegment(pathElement, x, y) {
 	if (pathElement.tagName != "path") { return; }

 	// The problem is that (except for firefox, the click coordinates are returned in pixels, not in svg coordinate space)
 	// So we first need to determine the scaling factor for x an y
 	// And make the coordinates relative to the bounding box
	let bBox = pathElement.getBBox();
	let pixelBBox = pathElement.getBoundingClientRect();

	x -= pixelBBox.x;
	y -= pixelBBox.y;

	let scaleX = pixelBBox.width / bBox.width;
	let scaleY = pixelBBox.height / bBox.height;

 	x /= scaleX;
 	y /= scaleY;

	// And since pointAtLength() includes the coordinates from the first move-command, add it back to the click coordinates
	x += bBox.x;
 	y += bBox.y;

 	// Make x integers
	x = x | 0;
	y = y | 0;

   var seg = -1;
   var len = pathElement.getTotalLength();
   // You get get the coordinates at the length of the path, so you
   // check at all length point to see if it matches
   // the coordinates of the click
   // Basically look for a local minimum. The hit-test of the browser should already help us here. 
   let tolerance = 0;
   let minimumDistance = Number.MAX_VALUE;
   let currentDistance = 0;
   let lengthAtMinimum = -1;
   for (var i = 0; i < len; i++) {
     var pt = pathElement.getPointAtLength(i);

     // We don't need to calculate square roots here, since we only compare
     currentDistance = ((x - pt.x) ** 2) + ((y - pt.y) ** 2);
     if (currentDistance <= minimumDistance) { minimumDistance = currentDistance; lengthAtMinimum = i; }

   }

   seg = pathElement.getPathSegAtLength(lengthAtMinimum); 
   return seg;
 }






function redrawSelection() {
	var elements = laserSvgRoot.querySelectorAll('.selected');
	for (let element in elements) {
		if (element != currentSelection) {
			element.classList.remove("selected");
		}
	}
}

// Save a LaserSVG File
function getImageForSaving() {

	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}

//Export an SVG file 
function getImageForExport() {
	// TODO: remove the lines vizualizing the connections
	//removeEditUtilities();
	//Adjust for Kerf if required
	adjustForKerf();

	laserSvgRoot.setAttributeNS(laser_NS, "laser:material-thickness", materialThickness);
	laserSvgRoot.setAttributeNS(laser_NS, "laser:kerf", kerf);
	
	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}

/************* Onload Functionality *****************
 *	These functions make sure that once the document is loaded, all the necessary info is loaded. 
 *	It also checks wether the lasersvg.css stylesheet is present, or otherwise, adds it. 
 *  It checks wether any infos have been set using URL-parameters and adjusts the drawing accordingly
 *  It checks wether the document has been loaded as plain document or using an editor
 */


// This function gets called by the JavaScript embedded into the SVG file. 
// Setting the variable allows us to access the embedded JS to update parameters.
function svgLoaded(event) {
	// check wether this has been called already
	// this can happen when the SVG-File has some part of the LaserSVG components set
	// and gets loaded into the editor. 
	if (laserIsLoaded == true) { return; }
	laserIsLoaded = true;
	console.log("Laser SVG Loaded");
	// Setting up pointers to the document root itself.
	if (event.tagName == "svg") {
		laserSvgRoot = event;
	}
	else {
		laserSvgRoot = event.documentElement; // This is the case if the svg is loaded directly
	}

	

	// Check if we have the lasersvg.css stylesheet loaded by looking wether we find one that has lasersvg.css in the href field.
	if ([].slice.call(document.styleSheets).filter(styleSheet => styleSheet.href.includes(laserSvgURL+"lasersvg.css")).length == 0) {
		console.log("No LaserSVG Stylesheet found, adding one")
		let styleSheet = document.createProcessingInstruction('xml-stylesheet', 'href="'+laserSvgURL+'lasersvg.css" type="text/css"');
		event.insertBefore(styleSheet, document.firstChild);
	}

	if ((!checkURLParameters()) && laserSvgRoot.hasAttributeNS(laser_NS,"material-thickness")) {
		materialThickness = Number(laserSvgRoot.getAttributeNS(laser_NS,"material-thickness"));
	}
	if (laserSvgRoot.hasAttributeNS(laser_NS,"kerf")) {
		kerf = Number(laserSvgRoot.getAttributeNS(laser_NS,"kerf"));
	}

	// Create the joints as specified by the parameters
	createJoints();

	// TODO: draw the lines visualizing the connections.
	
	// If the embedding document supports it, make our functions available
	if(typeof window.parent.svgDidLoad === "function") { 
		parentDocument = window.parent; //We need this pointer in edit mode
		window.parent.svgDidLoad(this);
		// Add the event handlers for editing
	}
	else {
		addMiniEditMenu();
	}


}

// This function checks wether parameters have been specified through the URL and will adjust the template accordingly;
function checkURLParameters() {
	var result = false
	var url = new URL(window.location.href);
	var urlThickness = url.searchParams.get("thickness");
	if (urlThickness != null) {
		materialThickness = Number(urlThickness)
		updateThickness(materialThickness)
		result = true
	}
	
	var urlKerf = url.searchParams.get("kerf");
	if (urlKerf != null) {
		kerf = Number(urlKerf);
		result = true;
	}

	var urlScale = url.searchParams.get("scale");
	if (urlScale != null) {
		scale(Number(urlScale)/100);
		result = true;

	}

	return result;
}


// If the file is loaded directly (without editor), this function gets called once the file and all dependencies are loaded, which 
// means it's safe to run the script.
document.addEventListener("DOMContentLoaded", function(e) {
      svgLoaded(document);
});

// If we get loaded in an editor, it's a bit more tricky. 
// If the <script> statement is at the beginning of the file, it might run before the entire DOM of the SVG is loaded, meaning we'll run into a series of 
// issues of elements which we rely on not being there (like the SVG root node).
// So we need to delay this somehow until the DOM is loaded completely. 
// The problem is, that the onload triggers do not work inside the SVG, as we are embedded in an HTML page. 
// 


// If the script gets added dynamically to an SVG, the eventListener above will not get fired. 
if(typeof window.parent.svgDidLoad === "function") { 
	window.parent.laserSvgScript = this;

	svgLoaded(document);
}


// This is to test the connection between the host script and the SVG script
function hello() {
	console.log('Hello, this is your LaserSVG script speaking!');
	return "Hello!";
}
