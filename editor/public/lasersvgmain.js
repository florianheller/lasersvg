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

const laser_NS = 'http://www.heller-web.net/lasersvg';
const svg_NS = 'http://www.w3.org/2000/svg';
const laserSvgURL = 'http://www2.heller-web.net/lasersvg/';
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
	var elements = laserSvgRoot.querySelectorAll('*');

	for (let element of elements) {
			if (element.hasAttributeNS(laser_NS,'thickness')) {
				thickness = element.getAttributeNS(laser_NS,'thickness');
			}
			// If the origin is specified, 
			if (element.hasAttributeNS(laser_NS,'origin')) {
				// In that case, we also need to adjust the position of the element. 
				// For that purpose we have two options: either we save the original position or we take the previous thickness value and calculate the difference. 
				// The advantage of saving the original values is that errors don't add up if we work with float-thicknesses. 
				var originX, originY;
				if (!element.hasAttributeNS(laser_NS,'originX')) {
					originX = Number(element.getAttribute('x')) + oldThickness;
					element.setAttributeNS(laser_NS, 'laser:originX', originX );
				}
				else {
					originX = Number(element.getAttributeNS(laser_NS,'originX'));
				}
				if (!element.hasAttributeNS(laser_NS,'originY')) {
					originY = Number(element.getAttribute('y')) + oldThickness;
					element.setAttributeNS(laser_NS, 'laser:originY', originY);
				}
				else {
					originY = Number(element.getAttributeNS(laser_NS,'originY'));
				}

				var origin = element.getAttributeNS(laser_NS,'origin');
				switch(origin) {
					// case 'top': break; //Default
					case 'bottom': element.setAttribute("y", originY - thickness); break;
					// case 'left': break; //Default
					case 'right': element.setAttribute("x", originX - thickness); break;
					// case 'top-left': break; // Default
					case 'top-right': break;
					// case 'bottom-left': break; //Same as bottom
					case 'bottom-right': element.setAttribute("y", originY - thickness);  element.setAttribute("x", originX + thickness); break;
					case 'center':  element.setAttribute("y", (originalY - thickness)/2);  element.setAttribute("x", (originX + thickness)/2); break;
				}

			}

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
			if (element.hasAttributeNS(laser_NS,"originX")) {
				element.setAttributeNS(laser_NS, 'laser:originX', Number(element.getAttributeNS(laser_NS,"originX"))*scalingFactor);
			}
			if (element.hasAttributeNS(laser_NS,"originY")) {
				element.setAttributeNS(laser_NS, 'laser:originY', Number(element.getAttributeNS(laser_NS,"originY"))*scalingFactor);
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

	
   var seg = -1;
   var len = pathElement.getTotalLength();
   // You get get the coordinates at the length of the path, so you
   // check at all length point to see if it matches
   // the coordinates of the click
   let tolerance = 2;
   for (var i = 0; i < len; i++) {
     var pt = pathElement.getPointAtLength(i);
     // you need to take into account the stroke width, hence the +- 2
     //if ((pt.x < (x + tolerance) && pt.x > (x - tolerance)) && (pt.y > (y - tolerance) && pt.y < (y + tolerance))) {
     if ((x < (pt.x + tolerance) && x > (pt.x - tolerance)) && (y > (pt.y - tolerance) && y < (pt.y + tolerance))) {
       seg = pathElement.getPathSegAtLength(i);
       break;
     }
   }
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
	removeEditUtilities();

	let serializer = new XMLSerializer();
	return serializer.serializeToString(laserSvgRoot);
}

//Export an SVG file 
function getImageForExport() {
	// TODO: remove the lines vizualizing the connections
	removeEditUtilities();
	//Adjust for Kerf if required
	adjustForKerf();

	laserSvgRoot = laserSvgDocument.documentElement;	// The DOM-Root of our svg document.
	laserSvgRoot.setAttributeNS(laser_NS, "laser:material-thickness", materialThickness);
	laserSvgRoot.setAttributeNS(laser_NS, "laser:kerf", kerf);
	
	let serializer = new XMLSerializer();
	let document = serializer.serializeToString(laserSvgRoot);

	
	return document;
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
      		addEditEventHandlers(laserSvgRoot);

});

// If we get loaded in an editor, it's a bit more tricky. 
// If the <script> statement is at the beginning of the file, it might run before the entire DOM of the SVG is loaded, meaning we'll run into a series of 
// issues of elements which we rely on not being there (like the SVG root node).
// So we need to delay this somehow until the DOM is loaded completely. 
// The problem is, that the onload triggers do not work inside the SVG, as we are embedded in an HTML page. 
// 


// If the script gets added dynamically to an SVG, the eventListener above will not get fired. 
if(typeof window.parent.svgDidLoad === "function") { 
	svgLoaded(document);
}

/*
 *	laserSVGedit.js
 * 
 *	This file contains the implementation of the LaserSVG inline edit functionality. 
 *	
 *	Copyright C2017 Florian Heller florian.heller<at>uhasselt.be
 *	
 *	See http://www.heller-web.net/lasersvg
 *	or http://github.io/florianheller/lasersvg for more info
 */


var menuItems = ["thicknessButton", "kerfButton", "scaleButton"]

function toggleItem(item) {
	laserSvgRoot.getElementById(item).style.opacity = (laserSvgRoot.getElementById(item).style.opacity == 1) ? 0 : 1;
}

function showMenu() {
 	menuItems.map(toggleItem);
}

function setThicknessClicked() {
 	var newThickness = prompt("Please enter the new material thickness:", materialThickness);
  	if (newThickness != null && newThickness != "") {
    	updateThickness(newThickness)
  	} 
}

function setKerfClicked() {
 	var newKerf = prompt("Please enter the new kerf value:", kerf);
  	if (newKerf != null && newKerf != "") {
  		kerf = newKerf;
  		adjustForKerf()
  	} 
}

function setScaleClicked() {
 	var newScale = prompt("Please enter the new scaling factor:", scalingFactor * 100);
  	if (newScale != null && newScale != "") {
  		scale(Number(newScale)/100)
  	}
}

function setJointsChanged() {

}

function createJointSelection(parent) {
 	let selection = document.createElementNS("http://www.w3.org/1999/xhtml", "select");
 	selection.id = "jointSelection";
 	
 	let optGroup = document.createElementNS("http://www.w3.org/1999/xhtml", "optgroup");
 	optGroup.style.fontSize = "14px";

 	let options = ["none", "flap", "finger", "finger-compact", "tslot"];
 	
 	options.map(function(option) { 
		let o = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
		o.value = option;
		o.text = option;
		o.style.opacity = 1;
		this.appendChild(o); }, optGroup);
 	selection.add(optGroup, null);

 	parent.appendChild(selection);

 	selection.onchange = function (event) {
 		let elements = laserSvgRoot.querySelectorAll('[*|joint]');
 		for (let element of elements) {
 			element.setAttributeNS(laser_NS,"joint-type",event.target.value);
 		}
 		updateDrawing();
 	}

}


function createMenuButton(item, index, array) {

 	let button = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
 	button.innerHTML = item.title;

 	button.setAttribute("id",item.id+"Button");
 	button.setAttribute("onclick",item.onclick);
 	this.appendChild(button);

} 
/*
 *********** Add the miniEditor to the SVG-DOM-Tree ************

 	<foreignObject width="270" height="20" id="editMenu" >
        <button type="button" id="edit" xmlns="http://www.w3.org/1999/xhtml" onclick="showMenu()">⚙︎</button>
        <button type="button" id="thickness" xmlns="http://www.w3.org/1999/xhtml" onclick="setThicknessClicked()">Thickness</button>
        <button type="button" id="kerf" xmlns="http://www.w3.org/1999/xhtml" onclick="setKerfClicked()">Kerf</button>
        <button type="button" id="scale" xmlns="http://www.w3.org/1999/xhtml" onclick="setScaleClicked()">Scale</button>
        <button type="button" id="joints" xmlns="http://www.w3.org/1999/xhtml" onclick="setJointsClicked()">Joint</button>
        <select xmlns="http://www.w3.org/1999/xhtml" id="selection" style="opacity: 1;"><option value="none">none</option><option value="flap">flap</option><option value="finger">finger</option><option value="finger-compact">finger-compact</option><option value="tslot">tslot</option></select>
   	</foreignObject>
 */ 
 function addMiniEditMenu() {
 	let buttons = [	{ id:"edit", title:"⚙︎", x:0, y:0, width:10, height:10, textXOffset:2, textYOffset:8, onclick:"showMenu()", fontSize:10},
 					{ id:"thickness", title:"Thickness", x:12, y:0, width:30,  height:10, textXOffset:1, textYOffset:7, onclick:"setThicknessClicked()", fontSize:5},
 					{ id:"kerf", title:"Kerf", x:44, y:0, width:30, textXOffset:8,  height:10, textYOffset:7, onclick:"setKerfClicked()", fontSize:5},
 					{ id:"scale", title:"Scale", x:76, y:0, width:30, textXOffset:7, height:10,  textYOffset:7, onclick:"setScaleClicked()", fontSize:5}
				]

	let menu = document.createElementNS(svg_NS,"foreignObject");
 	menu.setAttribute("id","editMenu");
 	menu.setAttribute("width","250");
 	menu.setAttribute("height","20");

 	laserSvgRoot.appendChild(menu);
 	buttons.map(createMenuButton, menu);

	// Only make a joints button if there are any parametric joints in the template
	//let elements = laserSvgRoot.querySelectorAll('[*|joint-left],[*|joint-top],[*|joint-bottom],[*|joint-right],[*|joint]');
	let elements = laserSvgRoot.querySelectorAll('[*|joint]');
	if (elements.length > 0) {
		menuItems.push("jointSelection");
		createJointSelection(document.getElementById("editMenu"));
		// Select the joint type of the first element in the list
		if (elements[0].hasAttributeNS(laser_NS,"joint-type")) {
			let type = elements[0].getAttributeNS(laser_NS,"joint-type");
			laserSvgRoot.getElementById("jointSelection").value = type;
		}
	}

 	// We also need to adjust the viewbox to shift everythin accordingly
 	// Scale the SVG viewbox if defined to avoid clipping
	var vBoxValues = laserSvgRoot.getAttribute("viewBox").replace(/,/g,"").split(" ").map(Number);
	//vBoxValues[0] -= 0;
	vBoxValues[1] -= 15;	
	laserSvgRoot.setAttribute("viewBox", vBoxValues.join(" "));
	
 	
}

/************************* Visualization Helpers  ****************************************************/
/* This function highlights a certain path segment (e.g., to show selection).
 * It takes a path reference and an index of which subpath to highlight. It then creates a new path that overlays the original one
 * @param path: A reference to the path
 * @param segmentIndex: the (non-negative) index of the subpath to highlight. Usually the first instruction in a path is a move-command, so the first line starts at index 1
 * @param type: if multiple selections can occur, specifiy a different type for every selection. This reflects in the CSS selectors .pathHilight-type
 */
function highlightPathSegment(path, segmentIndex, type) {
	if (segmentIndex < 1) { return; } //Safety check
	if (path.tagName != "path") { return; }
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

function highlightSegmentsWithLengthInPath(path, length) {
	let pathData = path.getPathData({normalize: true}); // Returns absolute coordinates

	for (let i=1; i<pathData.length; i++) {
		//calculate the segment length
		let start = pathData[i-1].values;
		let end = pathData[i].values;
		let segmentLength = Math.sqrt((end[0] - start[0])*(end[0] - start[0]) + (end[1] - start[1])*(end[1] - start[1]))
		// Give it some tolerance as it's a float calculation that might end up in long decimals. 
		if (Math.abs(segmentLength - length) < 0.5) {
			// Create a highlight path
			let highlight = createHighlightWithCoordinates(start[0], start[1], end[0], end[1]);
			highlight.setAttribute("id","hl-"+path.id+"-"+i);
			highlight.onclick = function(event) { onLengthHighlightClicked(this, path.id, i, null) }
			laserSvgRoot.appendChild(highlight);
		}
	}
}


function createHighlightWithCoordinates(startX, startY, endX, endY) {
	let highlight = document.createElementNS("http://www.w3.org/2000/svg", "path");
	let newPathData = [
		{ type: "M", values: [startX, startY] },
		{ type: "L", values: [endX, endY] }
		]; 
	highlight.setPathData(newPathData);
	highlight.classList.add("lengthHighlight"); 
	
	let deltaX = endX-startX;
	let deltaY = endY-startY;
	let snippet = "";

	if (deltaX == 0) { snippet = " 0 "; }
	else if (deltaX == 1) { snippet = " {thickness} " }
	else if (deltaX == -1) { snippet = " -{thickness} " } 
	else { snippet = " {" + deltaX/materialThickness + "*thickness} " }

	if (deltaY == 0) { snippet += " 0 "; }
	else if (deltaY == 1) { snippet += " {thickness} "; }
	else if (deltaY == -1) { snippet += " -{thickness} "; } 
	else { snippet += " {" + deltaY/materialThickness + "*thickness} "; }

	highlight.setAttributeNS(laser_NS, "template", "M " + startX + " " + startY + " l " +  snippet)
	return highlight;
}

/***************** Edit Functionality *******************/
/* Highlight all path segments that have a specific length
 * @param length: the length that the segments should have to be highlighted
 * We have to check two types of elements: primitives and paths
 */
function highlightElementsWithLength(length) {

	// Iterate over all objects in the SVG
	var elements = laserSvgRoot.querySelectorAll('*');

	for (let element of elements) {
		// Rects
		if (element.hasAttribute("width")) {
			if (Number(element.getAttribute("width")) == length) {
				let x = Number(element.getAttribute("x"));
				let y = Number(element.getAttribute("y"));
				let height = Number(element.getAttribute("height"));

				// Add an ID to the original element in order to be able to link the two
				if (element.id == "") {
					element.id = element.tagName + Array.prototype.indexOf.call(elements, element);
				}
				let highlight1 = createHighlightWithCoordinates(x, y, x+length, y)
				highlight1.id = "hl-"+element.id+"-0"
				laserSvgRoot.appendChild(highlight1);
				highlight1.onclick = function(event) { onLengthHighlightClicked(this, element.id, "width", highlight2) }

				let highlight2 = createHighlightWithCoordinates(x, y+height, x+length, y+height)
				highlight2.id = "hl-"+element.id+"-1"
				laserSvgRoot.appendChild(highlight2);
				highlight2.onclick = function(event) { onLengthHighlightClicked(this, element.id, "width", highlight1) }
			}
		}
		if (element.hasAttribute("height")) {
			if (Number(element.getAttribute("height")) == length) {
				let x = Number(element.getAttribute("x"));
				let y = Number(element.getAttribute("y"));
				let width = Number(element.getAttribute("width"));

				// Add an ID to the original element in order to be able to link the two
				if (element.id == "") {
					element.id = element.tagName + Array.prototype.indexOf.call(elements, element);
				}
				let highlight1 = createHighlightWithCoordinates(x, y, x, y+length);
				highlight1.id = "hl-"+element.id+"-0"
				laserSvgRoot.appendChild(highlight1);
				highlight1.onclick = function(event) { onLengthHighlightClicked(this, element.id, "height", highlight2) }

				let highlight2 = createHighlightWithCoordinates(x+width, y, x+width, y+length);
				highlight2.id = "hl-"+element.id+"-1"
				laserSvgRoot.appendChild(highlight2);
				highlight2.onclick = function(event) { onLengthHighlightClicked(this, element.id, "height", highlight1) }
			}
		}
		// Circles and ellipses
		//if (element.hasAttribute("height")) {
		//	if (Number(element.getAttribute("height")) == length) {
				
		//	}
		//}

		if (element.hasAttribute("d")) {
			highlightSegmentsWithLengthInPath(element,length);
		}
	}


}

/* Callback for a click on a lengthHighlight. 
 * @param elementID: the element to which the highlight belongs
 * @param info: either "width, "height", or the index of the path segment that was higlighted. 
 */
function onLengthHighlightClicked(event, elementID, info, otherHighlight) {
	let element = laserSvgRoot.getElementById(elementID);

	if (element == null) return;
	currentSelection = element; //Set the pointer to the object that belongs to these highlights.
	switch(element.tagName) {
		case "rect":
			element.setAttributeNS(laser_NS, "laser:thickness-adjust", info)
			event.parentNode.removeChild(event);
			if (otherHighlight) { otherHighlight.parentNode.removeChild(otherHighlight); }
			parentDocument.loadParameters(element);

			break;
		case "path": 
			parentDocument.convertSubelementToThickness(element, info);
			event.parentNode.removeChild(event);
			break; 
	}
	
}


/* 
 * Functions that provide functionality to be called from the host script. This is not invoked from the drawing itself.
 */

var currentSelection;

function setPropertyForSelection(property, value) {
	currentSelection.setAttributeNS(laser_NS, "laser:" + property, value);
}

function addEditEventHandlers() {
	let tags = ['path', 'rect', 'circle'];
	for (let tag of tags) {
		let elements = laserSvgRoot.getElementsByTagName(tag);
		console.log(elements);
		console.log(elements.length);
		for (let element of elements) {
			element.onclick = function (event) {
				let segmentIndex = isInWhichSegment(this, event.clientX, event.clientY);
				highlightPathSegment(this, segmentIndex, "pathTemplate");
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this, segmentIndex); //Notify the host script
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

function removeSegmentHighlights() {
	//Remove all the highlights that might still be here 
	let highlights = laserSvgRoot.querySelectorAll('.lengthHighlight');
	for (let h of highlights) {
		h.parentNode.removeChild(h)
	}
}


function removeEditUtilities() {
	removeEditEventHandlers();

	//Remove the mini-edit menu
	let menu = laserSvgRoot.getElementById("editMenu");
	if (menu) { menu.parentNode.removeChild(menu) }

	removeSegmentHighlights();
}

// Callback to redraw after variables have been changed from the outside
function updateDrawing() {
	createJoints();
}




  
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


function createNoJointPath(path, gap, inset, fingers) {
	let pathData = path.getPathData({normalize: true});

	if (pathData.length < 2) {
		return;
	}

	let width = pathData[pathData.length-1].values[0] - pathData[0].values[0];
	let height = pathData[pathData.length-1].values[1] - pathData[0].values[1];

	let newPathData = []; 
	newPathData.push(pathData[0]);
 	
 	newPathData.push({type: "l", values: [width, height]});
 	
	path.setPathData(newPathData);

	path.removeAttributeNS(laser_NS, "template");

}


/************************* Parametric Fabrication ****************************************************/

// @param path: the path to replace. Only the connection between the first two points is considered.
// @param gap:  the gap between the origin of the path and the first finger
// @param inset: the height of the fingers
// @param fingers: the number of fingers to create on that path

// Right now either width or height needs to be zero, i.e., only works for horizontal and vertical lines

function createFingerJointPath(path, gap, inset, fingers) {
	let pathData = path.getPathData({normalize: true});

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
	let edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (2 * fingers - 1);

	//The first element of the first path segment list, as this determines the origin
	// 
	let newPathData = []; 
	let newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);

 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

	//We are now at the point to add the first finger
	for (let i = 0; i < fingers; i += 1) {
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
	let tempTemplate = newTemplate.map(function (object) {return object.type + object.values.join(" ") }).join(" ");
	path.setAttributeNS(laser_NS, "laser:template", tempTemplate);

	
}


function createCompactFingerJointPath(path, gap, inset, fingers) {
	let pathData = path.getPathData({normalize: true});

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
	let edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (2 * fingers - 1);

	//The first element of the first path segment list, as this determines the origin
	// 
	let newPathData = []; 
	let newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);

 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

	//We are now at the point to add the first finger
	for (let i = 0; i < fingers; i += 1) {
 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * (inset-0.5)/2), (Math.sin(alpha+(Math.PI/2)) * (inset-0.5)/2)]});
 		newTemplate.push({type: "l", values: ["{" + (Math.cos(alpha+(Math.PI/2)) * (inset-0.5)/(2*materialThickness) + "*thickness}"), "{" + (Math.sin(alpha+(Math.PI/2)) * (inset-0.5)/(2*materialThickness) + "*thickness}")]});

 		newPathData.push({type: "a", values: [kerf, kerf, 0, 1, 0, (Math.cos(alpha+(Math.PI/2)))*0.5 , (Math.sin(alpha+(Math.PI/2)))*0.5 ]});
 		newTemplate.push({type: "a", values: [kerf, kerf, 0, 1, 0, (Math.cos(alpha+(Math.PI/2)))*0.5 , (Math.sin(alpha+(Math.PI/2)))*0.5 ]});

 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * (inset-0.5)/2), (Math.sin(alpha+(Math.PI/2)) * (inset-0.5)/2)]});
		newTemplate.push({type: "l", values: ["{" + (Math.cos(alpha+(Math.PI/2)) * (inset-0.5)/(2*materialThickness) + "*thickness}"), "{" + (Math.sin(alpha+(Math.PI/2)) * (inset-0.5)/(2*materialThickness) + "*thickness}")]});

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
	let tempTemplate = newTemplate.map(function (object) {return object.type + object.values.join(" ") }).join(" ");
	path.setAttributeNS(laser_NS, "laser:template", tempTemplate);

	updateThickness(materialThickness);
}

function createFlapJointPath(path, gap, inset, flaps) {
	let pathData = path.getPathData({normalize: true});

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
	let edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (flaps);

	//The first element of the first path segment list, as this determines the origin
	let newPathData = []; 
	let newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);

	// There's no inside for a flap
	// The inside is just a straight line between the endpoints

	if (inset < 0) { 

		newPathData.push({type: "l", values: [width, height]});
		newTemplate.push({type: "l", values: [width, height]});
	}
	else {
	 	
	 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
	 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

		//We are now at the point to add the first flap
		for (let i = 0; i < flaps; i += 1) {

			let stepX = (cos * inset) + (Math.cos(alpha+(Math.PI/2)) * inset);
			let stepY = (sin * inset) + (Math.sin(alpha+(Math.PI/2)) * inset);
		
			let stepXTemplate = "{" + (cos+Math.cos(alpha+(Math.PI/2))) + "*thickness}";
			let stepYTemplate = "{" + (sin+Math.sin(alpha+(Math.PI/2))) + "*thickness}";  

			let stepX2 = (cos * inset) + (Math.cos(alpha-(Math.PI/2)) * inset);
			let stepY2 = (sin * inset) + (Math.sin(alpha-(Math.PI/2)) * inset);

			let stepX2Template = "{" + (cos+Math.cos(alpha-(Math.PI/2))) + "*thickness}";
			let stepY2Template = "{" + (sin+Math.sin(alpha-(Math.PI/2))) + "*thickness}";  

	 		newPathData.push({type: "l", values: [stepX, stepY]});
	 		newPathData.push({type: "l", values: [(cos * (fingerSize-2*inset)) , (sin * (fingerSize - 2*inset))]});
	 		newPathData.push({type: "l", values: [stepX2, stepY2]});

			newTemplate.push({type: "l", values: [stepXTemplate, stepYTemplate]});
	 		newTemplate.push({type: "l", values: ["{" + cos +" * (" + fingerSize + "-2*thickness)}" , "{" + sin +" * (" + fingerSize + "-2*thickness)}"]});
	 		newTemplate.push({type: "l", values: [stepX2Template, stepY2Template]});

		}

		// Close the second gap
		newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
		newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

		}

	path.setPathData(newPathData);

	//We need to convert the pathSegment list into a string that we can store as template
	let tempTemplate = newTemplate.map(function (object) {return object.type + object.values.join(" ") }).join(" ");
	path.setAttributeNS(laser_NS, "laser:template", tempTemplate);

	updateThickness(materialThickness);
	
}

function createTSlotPath(path, gap, inset, fingers) {
	let pathData = path.getPathData({normalize: true});

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
	let edgeLength = Math.sqrt(height * height + width * width);

	// Subtract the gaps on each side
	edgeLength -=  2 * gap; 

	//This length has to be divided into /fingers/ fingers and fingers-1 gaps
	let fingerSize = edgeLength / (2 * fingers - 1);

    let newPathData = []; 
	let newTemplate = [];
	newPathData.push(pathData[0]);
 	newTemplate.push(pathData[0]);
 	newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
 	newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

	if (inset < 0) {
		for (let i = 0; i < fingers; i += 1) {

			if (i%2 == 0) {
				newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});
 				newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 				newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});

 				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha-(Math.PI/2)) + "* thickness}", "{" + Math.sin(alpha-(Math.PI/2)) + "* thickness}"]});
 				newTemplate.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha+(Math.PI/2)) + "* thickness}", "{" + Math.sin(alpha+(Math.PI/2)) + "* thickness}"]});

 				// This draws the segments which spans 3 fingers and creates the holes for the screws. 
 				// Since adding circles makes it more complicated to remove the elements from the DOM if we want to change the joint-type,
 				// we will jump back and forth in a single path and create a circle using two arcs
 				// The pattern is a follows: jump to (1.5*fingersize) - hole radius, create two arcs, jump back the same distance
 				// We could do the jumps in between the fingers, but that would interrupt the finger joints, potentially leading to a weird jumping 
 				// back and forth of the lasercutter. We, therefore, collect all places where a circle should be, and append these at the end of 
 				// the path.
 				// The problem is that we only have relative coordinates, so we need to keep track of more than just the 
				if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * 3 * fingerSize, sin * 3 * fingerSize]});
					newTemplate.push({type: "l", values: [cos * 3 * fingerSize, sin * 3 * fingerSize]});
				}
			}
		}
		newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
		newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});

		let moveBackDistance = [[0,0]]; //We need to make sure the endpoint of the path matches
		for (let i = 0; i<Math.floor(fingers/2); i++) {
			if (i != 0) {
				newPathData.push({type: "m", values: [-(cos * 4 * fingerSize), -(sin * 4 * fingerSize)]});
				newTemplate.push({type: "m", values: [-(cos * 4 * fingerSize), -(sin * 4 * fingerSize)]});
				moveBackDistance.push([-(cos * 4 * fingerSize),-(sin * 4 * fingerSize)])
			}
			// Only the first one is complicated to align
			// First, we need to compensate for the gap at the end of the command
			// the first hole is 1+1.5 = 2.5 fingerSizes away from the beginning of the gap
			// We need to shift everything by inset/2 because we work with arcs and therefore need the starting point on the outline of the circle
			// finally, we need to shift everything by inset perpendicular to the path such that the holes are not centered on the path itself
			else {
				let x = -cos * (gap + 2.5 * fingerSize - inset/2)+(Math.cos(alpha+(Math.PI/2)) * -0.75 * inset);
				let y = -sin * (gap + 2.5 * fingerSize - inset/2)+(Math.sin(alpha+(Math.PI/2)) * -0.75 * inset);
				// In the template, inset has to be replaced with thickness
				let templateX = "{ (" + (-(cos * gap)-(cos * 2.5 * fingerSize))+") + " + (-cos/2 + (Math.cos(alpha+(Math.PI/2)) * -0.75))  + "* thickness}";
				let templateY = "{ (" + (-(sin * gap)-(sin * 2.5 * fingerSize))+") + " + (-sin/2 + (Math.sin(alpha+(Math.PI/2)) * -0.75))  + "* thickness}";
				newPathData.push({type: "m", values: [x, y]});
				newTemplate.push({type: "m", values: [templateX, templateY]});
				moveBackDistance.push([x, y])

			}
			newPathData.push({type: "a", values: [-inset/2, -inset/2, 0, 0, 0, -cos * -inset, -sin * -inset]});
			newTemplate.push({type: "a", values: ["-{thickness/2}", "-{thickness/2}", 0, 0, 0, "{" + cos + " * thickness}", "{" + sin + " * thickness}"]});

			newPathData.push({type: "a", values: [-inset/2, -inset/2, 0, 0, 0, cos * -inset, sin * -inset]});
			newTemplate.push({type: "a", values: ["-{thickness/2}", "-{thickness/2}", 0, 0, 0, "{" + (-cos) + " * thickness}", "{" + (-sin) + " * thickness}"]});

		}
		newPathData.push({type: "m", values: moveBackDistance.reduce((total, amount) => [total[0]-amount[0] , total[1]-amount[1]]) });
		newTemplate.push({type: "m", values:["{" + (cos*((6.5 * fingerSize) + gap)) + "+" + (Math.cos(alpha-(Math.PI/2)) * -0.75 + cos/2) + " * thickness}" , "{" + (sin * ((6.5 * fingerSize) + gap)) + "+" + (Math.sin(alpha-(Math.PI/2)) * -0.75 + sin/2) + " * thickness}"] });
	}

	else { //The inside direction of the t-slot joint
 	
	 	//We are now at the point to add the first finger
		for (let i = 0; i < fingers; i += 1) {

			// Check wether we need to make the t-slots or holes for the screws depending on the direction
			if (i%2 != 0) {
			 	newPathData.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});
			 	newTemplate.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});


				newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset/2), (Math.sin(alpha-(Math.PI/2)) * inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * 2), (Math.sin(alpha-(Math.PI/2)) * 2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset/2), (Math.sin(alpha-(Math.PI/2)) * inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: bolt diameter
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset/2), (Math.sin(alpha+(Math.PI/2)) * inset/2)]});
		 		newPathData.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * 2), (Math.sin(alpha+(Math.PI/2)) * 2)]});
				newPathData.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
		 		newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset/2), (Math.sin(alpha+(Math.PI/2)) * inset/2)]});
				newPathData.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});

				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha-(Math.PI/2)) + "* thickness/2}", "{" + Math.sin(alpha-(Math.PI/2)) + "* thickness/2}"]});
		 		newTemplate.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
		 		newTemplate.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * 2), (Math.sin(alpha-(Math.PI/2)) * 2)]});
		 		newTemplate.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
 				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha-(Math.PI/2)) + "* thickness/2}", "{" + Math.sin(alpha-(Math.PI/2)) + "* thickness/2}"]});
		 		newTemplate.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: bolt diameter
 				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha+(Math.PI/2)) + "* thickness/2}", "{" + Math.sin(alpha+(Math.PI/2)) + "* thickness/2}"]});
		 		newTemplate.push({type: "l", values: [(cos * 2), (sin * 2)]}); //Todo: nut size
		 		newTemplate.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * 2), (Math.sin(alpha+(Math.PI/2)) * 2)]});
				newTemplate.push({type: "l", values: [(cos * -2), (sin * -2)]}); //Todo: nut size
				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha+(Math.PI/2)) + "* thickness/2}", "{" + Math.sin(alpha+(Math.PI/2)) + "* thickness/2}"]});
				newTemplate.push({type: "l", values: [(cos * (fingerSize-2)/2), (sin * (fingerSize-2)/2)]});

		 		if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
					newTemplate.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
				}

			}
			else {
 				newPathData.push({type: "l", values: [(Math.cos(alpha+(Math.PI/2)) * inset), (Math.sin(alpha+(Math.PI/2)) * inset)]});
		 		newPathData.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
		 		newPathData.push({type: "l", values: [(Math.cos(alpha-(Math.PI/2)) * inset), (Math.sin(alpha-(Math.PI/2)) * inset)]});

		 		newTemplate.push({type: "l", values: ["{" + Math.cos(alpha+(Math.PI/2)) + "* thickness}", "{" + Math.sin(alpha+(Math.PI/2)) + "* thickness}"]});
 				newTemplate.push({type: "l", values: [(cos * fingerSize), (sin * fingerSize)]});
 				newTemplate.push({type: "l", values: ["{" + Math.cos(alpha-(Math.PI/2)) + "* thickness}", "{" + Math.sin(alpha-(Math.PI/2)) + "* thickness}"]});

				if (i != fingers-1) {
					newPathData.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});
					newTemplate.push({type: "l", values: [cos * fingerSize, sin * fingerSize]});

				}
			}
		}

		// Close the second gap
		newPathData.push({type: "l", values: [(cos * gap), (sin * gap)]});
		newTemplate.push({type: "l", values: [(cos * gap), (sin * gap)]});
	}

	path.setPathData(newPathData);

	//We need to convert the pathSegment list into a string that we can store as template
	let tempTemplate = newTemplate.map(function (object) {return object.type + object.values.join(" ") }).join(" ");
	path.setAttributeNS(laser_NS, "laser:template", tempTemplate);

	updateThickness(materialThickness);
}

function createJoints() {
	// TODO: replace composed paths by equivalent 1-stop paths

	// First transorm all primitives with joints assigned into path segments 
	let elements = laserSvgRoot.querySelectorAll('[*|joint-left],[*|joint-top],[*|joint-bottom],[*|joint-right]');
	elements.forEach((element) => { replacePrimitive(element); } );

	// Now we can work on paths
	let paths = laserSvgRoot.querySelectorAll('[*|joint]');	
	for (let path of paths) {
		// Get the direction of the joint
		let direction = -1;
		if (path.hasAttributeNS(laser_NS,'joint-direction')) {
			if (path.getAttributeNS(laser_NS,'joint-direction') == 'inside') {
				direction = 1;
			}
		}
		//create a new path with the joint pattern
		if (path.hasAttributeNS(laser_NS,'joint-type')) {
			switch(path.getAttributeNS(laser_NS,'joint-type')) {
				case 'none' : createNoJointPath(path, 0, 0, numberOfFingers); break;
				case 'finger': createFingerJointPath(path, 5, materialThickness * direction, numberOfFingers); break;
				case 'finger-compact': createCompactFingerJointPath(path, 5, materialThickness * direction, numberOfFingers); break;
				case 'flap': createFlapJointPath(path, 5, materialThickness * direction, 2); break;
				case 'tslot': createTSlotPath(path, 5, materialThickness * direction, numberOfFingers); break;
				default: break;
			}
		}
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
	let pathData = [
		{ type: "M", values: [x+width  , y] },
		{ type: "l", values: [-width, 0] }
	]; 
	pathTop.setPathData(pathData);
	transferAttributes(rect, pathTop, "top");
	laserSvgRoot.appendChild(pathTop);	
	pathTop.setAttributeNS(laser_NS,"laser:template",pathTop.getAttribute("d"));
	pathTop.onclick = function (event) {
				let segmentIndex = isInWhichSegment(this, event.clientX, event.clientY);
				highlightPathSegment(this, segmentIndex, "pathTemplate");
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this, segmentIndex); //Notify the host script
			}
	// Right
	let pathRight = document.createElementNS("http://www.w3.org/2000/svg", "path");
	pathData = [
		{ type: "M", values: [x + width , y + height] },
		{ type: "l", values: [0, -height] }
	]; 
	pathRight.setPathData(pathData);
	transferAttributes(rect, pathRight, "right");
	laserSvgRoot.appendChild(pathRight);	
	pathRight.setAttributeNS(laser_NS,"template",pathRight.getAttribute("d"));
	pathRight.onclick = function (event) {
				let segmentIndex = isInWhichSegment(this, event.clientX, event.clientY);
				highlightPathSegment(this, segmentIndex, "pathTemplate");
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this, segmentIndex); //Notify the host script
			}
	// Bottom
	let pathBottom = document.createElementNS("http://www.w3.org/2000/svg", "path");
	pathData = [
		{ type: "M", values: [x , y + height] },
		{ type: "l", values: [width, 0] }
	]; 
	pathBottom.setPathData(pathData);
	transferAttributes(rect, pathBottom, "bottom");
	laserSvgRoot.appendChild(pathBottom);
	pathBottom.setAttributeNS(laser_NS,"laser:template",pathBottom.getAttribute("d"));
	pathBottom.onclick = function (event) {
				let segmentIndex = isInWhichSegment(this, event.clientX, event.clientY);
				highlightPathSegment(this, segmentIndex, "pathTemplate");
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this, segmentIndex); //Notify the host script
			}
	// Left
	let pathLeft = document.createElementNS("http://www.w3.org/2000/svg", "path");
	pathData = [
		{ type: "M", values: [x  , y ] },
		{ type: "l", values: [0, height] }
	]; 
	pathLeft.setPathData(pathData);
	transferAttributes(rect, pathLeft, "left");
	laserSvgRoot.appendChild(pathLeft);
	pathLeft.setAttributeNS(laser_NS,"laser:template",pathLeft.getAttribute("d"));
	pathLeft.onclick = function (event) {
				let segmentIndex = isInWhichSegment(this, event.clientX, event.clientY);
				highlightPathSegment(this, segmentIndex, "pathTemplate");
				// clear selection by removing the selected class from all other tags
				for (let e of laserSvgRoot.querySelectorAll('.selected')) {
					e.classList.remove("selected");
					if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
				}
				currentSelection = this;
				this.classList.add("selected");
				parentDocument.didSelectElement(this, segmentIndex); //Notify the host script
			}

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


// @info
//   Polyfill for SVG getPathData() and setPathData() methods. Based on:
//   - SVGPathSeg polyfill by Philip Rogers (MIT License)
//     https://github.com/progers/pathseg
//   - SVGPathNormalizer by Tadahisa Motooka (MIT License)
//     https://github.com/motooka/SVGPathNormalizer/tree/master/src
//   - arcToCubicCurves() by Dmitry Baranovskiy (MIT License)
//     https://github.com/DmitryBaranovskiy/raphael/blob/v2.1.1/raphael.core.js#L1837
// @author
//   Jarosław Foksa
// @license
//   MIT License
if (!SVGPathElement.prototype.getPathData || !SVGPathElement.prototype.setPathData) {
  (function() {
    var commandsMap = {
      "Z":"Z", "M":"M", "L":"L", "C":"C", "Q":"Q", "A":"A", "H":"H", "V":"V", "S":"S", "T":"T",
      "z":"Z", "m":"m", "l":"l", "c":"c", "q":"q", "a":"a", "h":"h", "v":"v", "s":"s", "t":"t"
    };

    var Source = function(string) {
      this._string = string;
      this._currentIndex = 0;
      this._endIndex = this._string.length;
      this._prevCommand = null;
      this._skipOptionalSpaces();
    };

    var isIE = window.navigator.userAgent.indexOf("MSIE ") !== -1;

    Source.prototype = {
      parseSegment: function() {
        var char = this._string[this._currentIndex];
        var command = commandsMap[char] ? commandsMap[char] : null;

        if (command === null) {
          // Possibly an implicit command. Not allowed if this is the first command.
          if (this._prevCommand === null) {
            return null;
          }

          // Check for remaining coordinates in the current command.
          if (
            (char === "+" || char === "-" || char === "." || (char >= "0" && char <= "9")) && this._prevCommand !== "Z"
          ) {
            if (this._prevCommand === "M") {
              command = "L";
            }
            else if (this._prevCommand === "m") {
              command = "l";
            }
            else {
              command = this._prevCommand;
            }
          }
          else {
            command = null;
          }

          if (command === null) {
            return null;
          }
        }
        else {
          this._currentIndex += 1;
        }

        this._prevCommand = command;

        var values = null;
        var cmd = command.toUpperCase();

        if (cmd === "H" || cmd === "V") {
          values = [this._parseNumber()];
        }
        else if (cmd === "M" || cmd === "L" || cmd === "T") {
          values = [this._parseNumber(), this._parseNumber()];
        }
        else if (cmd === "S" || cmd === "Q") {
          values = [this._parseNumber(), this._parseNumber(), this._parseNumber(), this._parseNumber()];
        }
        else if (cmd === "C") {
          values = [
            this._parseNumber(),
            this._parseNumber(),
            this._parseNumber(),
            this._parseNumber(),
            this._parseNumber(),
            this._parseNumber()
          ];
        }
        else if (cmd === "A") {
          values = [
            this._parseNumber(),
            this._parseNumber(),
            this._parseNumber(),
            this._parseArcFlag(),
            this._parseArcFlag(),
            this._parseNumber(),
            this._parseNumber()
          ];
        }
        else if (cmd === "Z") {
          this._skipOptionalSpaces();
          values = [];
        }

        if (values === null || values.indexOf(null) >= 0) {
          // Unknown command or known command with invalid values
          return null;
        }
        else {
          return {type: command, values: values};
        }
      },

      hasMoreData: function() {
        return this._currentIndex < this._endIndex;
      },

      peekSegmentType: function() {
        var char = this._string[this._currentIndex];
        return commandsMap[char] ? commandsMap[char] : null;
      },

      initialCommandIsMoveTo: function() {
        // If the path is empty it is still valid, so return true.
        if (!this.hasMoreData()) {
          return true;
        }

        var command = this.peekSegmentType();
        // Path must start with moveTo.
        return command === "M" || command === "m";
      },

      _isCurrentSpace: function() {
        var char = this._string[this._currentIndex];
        return char <= " " && (char === " " || char === "\n" || char === "\t" || char === "\r" || char === "\f");
      },

      _skipOptionalSpaces: function() {
        while (this._currentIndex < this._endIndex && this._isCurrentSpace()) {
          this._currentIndex += 1;
        }

        return this._currentIndex < this._endIndex;
      },

      _skipOptionalSpacesOrDelimiter: function() {
        if (
          this._currentIndex < this._endIndex &&
          !this._isCurrentSpace() &&
          this._string[this._currentIndex] !== ","
        ) {
          return false;
        }

        if (this._skipOptionalSpaces()) {
          if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === ",") {
            this._currentIndex += 1;
            this._skipOptionalSpaces();
          }
        }
        return this._currentIndex < this._endIndex;
      },

      // Parse a number from an SVG path. This very closely follows genericParseNumber(...) from
      // Source/core/svg/SVGParserUtilities.cpp.
      // Spec: http://www.w3.org/TR/SVG11/single-page.html#paths-PathDataBNF
      _parseNumber: function() {
        var exponent = 0;
        var integer = 0;
        var frac = 1;
        var decimal = 0;
        var sign = 1;
        var expsign = 1;
        var startIndex = this._currentIndex;

        this._skipOptionalSpaces();

        // Read the sign.
        if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === "+") {
          this._currentIndex += 1;
        }
        else if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === "-") {
          this._currentIndex += 1;
          sign = -1;
        }

        if (
          this._currentIndex === this._endIndex ||
          (
            (this._string[this._currentIndex] < "0" || this._string[this._currentIndex] > "9") &&
            this._string[this._currentIndex] !== "."
          )
        ) {
          // The first character of a number must be one of [0-9+-.].
          return null;
        }

        // Read the integer part, build right-to-left.
        var startIntPartIndex = this._currentIndex;

        while (
          this._currentIndex < this._endIndex &&
          this._string[this._currentIndex] >= "0" &&
          this._string[this._currentIndex] <= "9"
        ) {
          this._currentIndex += 1; // Advance to first non-digit.
        }

        if (this._currentIndex !== startIntPartIndex) {
          var scanIntPartIndex = this._currentIndex - 1;
          var multiplier = 1;

          while (scanIntPartIndex >= startIntPartIndex) {
            integer += multiplier * (this._string[scanIntPartIndex] - "0");
            scanIntPartIndex -= 1;
            multiplier *= 10;
          }
        }

        // Read the decimals.
        if (this._currentIndex < this._endIndex && this._string[this._currentIndex] === ".") {
          this._currentIndex += 1;

          // There must be a least one digit following the .
          if (
            this._currentIndex >= this._endIndex ||
            this._string[this._currentIndex] < "0" ||
            this._string[this._currentIndex] > "9"
          ) {
            return null;
          }

          while (
            this._currentIndex < this._endIndex &&
            this._string[this._currentIndex] >= "0" &&
            this._string[this._currentIndex] <= "9"
          ) {
            frac *= 10;
            decimal += (this._string.charAt(this._currentIndex) - "0") / frac;
            this._currentIndex += 1;
          }
        }

        // Read the exponent part.
        if (
          this._currentIndex !== startIndex &&
          this._currentIndex + 1 < this._endIndex &&
          (this._string[this._currentIndex] === "e" || this._string[this._currentIndex] === "E") &&
          (this._string[this._currentIndex + 1] !== "x" && this._string[this._currentIndex + 1] !== "m")
        ) {
          this._currentIndex += 1;

          // Read the sign of the exponent.
          if (this._string[this._currentIndex] === "+") {
            this._currentIndex += 1;
          }
          else if (this._string[this._currentIndex] === "-") {
            this._currentIndex += 1;
            expsign = -1;
          }

          // There must be an exponent.
          if (
            this._currentIndex >= this._endIndex ||
            this._string[this._currentIndex] < "0" ||
            this._string[this._currentIndex] > "9"
          ) {
            return null;
          }

          while (
            this._currentIndex < this._endIndex &&
            this._string[this._currentIndex] >= "0" &&
            this._string[this._currentIndex] <= "9"
          ) {
            exponent *= 10;
            exponent += (this._string[this._currentIndex] - "0");
            this._currentIndex += 1;
          }
        }

        var number = integer + decimal;
        number *= sign;

        if (exponent) {
          number *= Math.pow(10, expsign * exponent);
        }

        if (startIndex === this._currentIndex) {
          return null;
        }

        this._skipOptionalSpacesOrDelimiter();

        return number;
      },

      _parseArcFlag: function() {
        if (this._currentIndex >= this._endIndex) {
          return null;
        }

        var flag = null;
        var flagChar = this._string[this._currentIndex];

        this._currentIndex += 1;

        if (flagChar === "0") {
          flag = 0;
        }
        else if (flagChar === "1") {
          flag = 1;
        }
        else {
          return null;
        }

        this._skipOptionalSpacesOrDelimiter();
        return flag;
      }
    };

    var parsePathDataString = function(string) {
      if (!string || string.length === 0) return [];

      var source = new Source(string);
      var pathData = [];

      if (source.initialCommandIsMoveTo()) {
        while (source.hasMoreData()) {
          var pathSeg = source.parseSegment();

          if (pathSeg === null) {
            break;
          }
          else {
            pathData.push(pathSeg);
          }
        }
      }

      return pathData;
    }

    var setAttribute = SVGPathElement.prototype.setAttribute;
    var removeAttribute = SVGPathElement.prototype.removeAttribute;

    var $cachedPathData = window.Symbol ? Symbol() : "__cachedPathData";
    var $cachedNormalizedPathData = window.Symbol ? Symbol() : "__cachedNormalizedPathData";

    // @info
    //   Get an array of corresponding cubic bezier curve parameters for given arc curve paramters.
    var arcToCubicCurves = function(x1, y1, x2, y2, r1, r2, angle, largeArcFlag, sweepFlag, _recursive) {
      var degToRad = function(degrees) {
        return (Math.PI * degrees) / 180;
      };

      var rotate = function(x, y, angleRad) {
        var X = x * Math.cos(angleRad) - y * Math.sin(angleRad);
        var Y = x * Math.sin(angleRad) + y * Math.cos(angleRad);
        return {x: X, y: Y};
      };

      var angleRad = degToRad(angle);
      var params = [];
      var f1, f2, cx, cy;

      if (_recursive) {
        f1 = _recursive[0];
        f2 = _recursive[1];
        cx = _recursive[2];
        cy = _recursive[3];
      }
      else {
        var p1 = rotate(x1, y1, -angleRad);
        x1 = p1.x;
        y1 = p1.y;

        var p2 = rotate(x2, y2, -angleRad);
        x2 = p2.x;
        y2 = p2.y;

        var x = (x1 - x2) / 2;
        var y = (y1 - y2) / 2;
        var h = (x * x) / (r1 * r1) + (y * y) / (r2 * r2);

        if (h > 1) {
          h = Math.sqrt(h);
          r1 = h * r1;
          r2 = h * r2;
        }

        var sign;

        if (largeArcFlag === sweepFlag) {
          sign = -1;
        }
        else {
          sign = 1;
        }

        var r1Pow = r1 * r1;
        var r2Pow = r2 * r2;

        var left = r1Pow * r2Pow - r1Pow * y * y - r2Pow * x * x;
        var right = r1Pow * y * y + r2Pow * x * x;

        var k = sign * Math.sqrt(Math.abs(left/right));

        cx = k * r1 * y / r2 + (x1 + x2) / 2;
        cy = k * -r2 * x / r1 + (y1 + y2) / 2;

        f1 = Math.asin(parseFloat(((y1 - cy) / r2).toFixed(9)));
        f2 = Math.asin(parseFloat(((y2 - cy) / r2).toFixed(9)));

        if (x1 < cx) {
          f1 = Math.PI - f1;
        }
        if (x2 < cx) {
          f2 = Math.PI - f2;
        }

        if (f1 < 0) {
          f1 = Math.PI * 2 + f1;
        }
        if (f2 < 0) {
          f2 = Math.PI * 2 + f2;
        }

        if (sweepFlag && f1 > f2) {
          f1 = f1 - Math.PI * 2;
        }
        if (!sweepFlag && f2 > f1) {
          f2 = f2 - Math.PI * 2;
        }
      }

      var df = f2 - f1;

      if (Math.abs(df) > (Math.PI * 120 / 180)) {
        var f2old = f2;
        var x2old = x2;
        var y2old = y2;

        if (sweepFlag && f2 > f1) {
          f2 = f1 + (Math.PI * 120 / 180) * (1);
        }
        else {
          f2 = f1 + (Math.PI * 120 / 180) * (-1);
        }

        x2 = cx + r1 * Math.cos(f2);
        y2 = cy + r2 * Math.sin(f2);
        params = arcToCubicCurves(x2, y2, x2old, y2old, r1, r2, angle, 0, sweepFlag, [f2, f2old, cx, cy]);
      }

      df = f2 - f1;

      var c1 = Math.cos(f1);
      var s1 = Math.sin(f1);
      var c2 = Math.cos(f2);
      var s2 = Math.sin(f2);
      var t = Math.tan(df / 4);
      var hx = 4 / 3 * r1 * t;
      var hy = 4 / 3 * r2 * t;

      var m1 = [x1, y1];
      var m2 = [x1 + hx * s1, y1 - hy * c1];
      var m3 = [x2 + hx * s2, y2 - hy * c2];
      var m4 = [x2, y2];

      m2[0] = 2 * m1[0] - m2[0];
      m2[1] = 2 * m1[1] - m2[1];

      if (_recursive) {
        return [m2, m3, m4].concat(params);
      }
      else {
        params = [m2, m3, m4].concat(params);

        var curves = [];

        for (var i = 0; i < params.length; i+=3) {
          var r1 = rotate(params[i][0], params[i][1], angleRad);
          var r2 = rotate(params[i+1][0], params[i+1][1], angleRad);
          var r3 = rotate(params[i+2][0], params[i+2][1], angleRad);
          curves.push([r1.x, r1.y, r2.x, r2.y, r3.x, r3.y]);
        }

        return curves;
      }
    };

    var clonePathData = function(pathData) {
      return pathData.map( function(seg) {
        return {type: seg.type, values: Array.prototype.slice.call(seg.values)}
      });
    };

    // @info
    //   Takes any path data, returns path data that consists only from absolute commands.
    var absolutizePathData = function(pathData) {
      var absolutizedPathData = [];

      var currentX = null;
      var currentY = null;

      var subpathX = null;
      var subpathY = null;

      pathData.forEach( function(seg) {
        var type = seg.type;

        if (type === "M") {
          var x = seg.values[0];
          var y = seg.values[1];

          absolutizedPathData.push({type: "M", values: [x, y]});

          subpathX = x;
          subpathY = y;

          currentX = x;
          currentY = y;
        }

        else if (type === "m") {
          var x = currentX + seg.values[0];
          var y = currentY + seg.values[1];

          absolutizedPathData.push({type: "M", values: [x, y]});

          subpathX = x;
          subpathY = y;

          currentX = x;
          currentY = y;
        }

        else if (type === "L") {
          var x = seg.values[0];
          var y = seg.values[1];

          absolutizedPathData.push({type: "L", values: [x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "l") {
          var x = currentX + seg.values[0];
          var y = currentY + seg.values[1];

          absolutizedPathData.push({type: "L", values: [x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "C") {
          var x1 = seg.values[0];
          var y1 = seg.values[1];
          var x2 = seg.values[2];
          var y2 = seg.values[3];
          var x = seg.values[4];
          var y = seg.values[5];

          absolutizedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "c") {
          var x1 = currentX + seg.values[0];
          var y1 = currentY + seg.values[1];
          var x2 = currentX + seg.values[2];
          var y2 = currentY + seg.values[3];
          var x = currentX + seg.values[4];
          var y = currentY + seg.values[5];

          absolutizedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "Q") {
          var x1 = seg.values[0];
          var y1 = seg.values[1];
          var x = seg.values[2];
          var y = seg.values[3];

          absolutizedPathData.push({type: "Q", values: [x1, y1, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "q") {
          var x1 = currentX + seg.values[0];
          var y1 = currentY + seg.values[1];
          var x = currentX + seg.values[2];
          var y = currentY + seg.values[3];

          absolutizedPathData.push({type: "Q", values: [x1, y1, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "A") {
          var x = seg.values[5];
          var y = seg.values[6];

          absolutizedPathData.push({
            type: "A",
            values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
          });

          currentX = x;
          currentY = y;
        }

        else if (type === "a") {
          var x = currentX + seg.values[5];
          var y = currentY + seg.values[6];

          absolutizedPathData.push({
            type: "A",
            values: [seg.values[0], seg.values[1], seg.values[2], seg.values[3], seg.values[4], x, y]
          });

          currentX = x;
          currentY = y;
        }

        else if (type === "H") {
          var x = seg.values[0];
          absolutizedPathData.push({type: "H", values: [x]});
          currentX = x;
        }

        else if (type === "h") {
          var x = currentX + seg.values[0];
          absolutizedPathData.push({type: "H", values: [x]});
          currentX = x;
        }

        else if (type === "V") {
          var y = seg.values[0];
          absolutizedPathData.push({type: "V", values: [y]});
          currentY = y;
        }

        else if (type === "v") {
          var y = currentY + seg.values[0];
          absolutizedPathData.push({type: "V", values: [y]});
          currentY = y;
        }

        else if (type === "S") {
          var x2 = seg.values[0];
          var y2 = seg.values[1];
          var x = seg.values[2];
          var y = seg.values[3];

          absolutizedPathData.push({type: "S", values: [x2, y2, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "s") {
          var x2 = currentX + seg.values[0];
          var y2 = currentY + seg.values[1];
          var x = currentX + seg.values[2];
          var y = currentY + seg.values[3];

          absolutizedPathData.push({type: "S", values: [x2, y2, x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "T") {
          var x = seg.values[0];
          var y = seg.values[1]

          absolutizedPathData.push({type: "T", values: [x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "t") {
          var x = currentX + seg.values[0];
          var y = currentY + seg.values[1]

          absolutizedPathData.push({type: "T", values: [x, y]});

          currentX = x;
          currentY = y;
        }

        else if (type === "Z" || type === "z") {
          absolutizedPathData.push({type: "Z", values: []});

          currentX = subpathX;
          currentY = subpathY;
        }
      });

      return absolutizedPathData;
    };

    // @info
    //   Takes path data that consists only from absolute commands, returns path data that consists only from
    //   "M", "L", "C" and "Z" commands.
    var reducePathData = function(pathData) {
      var reducedPathData = [];
      var lastType = null;

      var lastControlX = null;
      var lastControlY = null;

      var currentX = null;
      var currentY = null;

      var subpathX = null;
      var subpathY = null;

      pathData.forEach( function(seg) {
        if (seg.type === "M") {
          var x = seg.values[0];
          var y = seg.values[1];

          reducedPathData.push({type: "M", values: [x, y]});

          subpathX = x;
          subpathY = y;

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "C") {
          var x1 = seg.values[0];
          var y1 = seg.values[1];
          var x2 = seg.values[2];
          var y2 = seg.values[3];
          var x = seg.values[4];
          var y = seg.values[5];

          reducedPathData.push({type: "C", values: [x1, y1, x2, y2, x, y]});

          lastControlX = x2;
          lastControlY = y2;

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "L") {
          var x = seg.values[0];
          var y = seg.values[1];

          reducedPathData.push({type: "L", values: [x, y]});

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "H") {
          var x = seg.values[0];

          reducedPathData.push({type: "L", values: [x, currentY]});

          currentX = x;
        }

        else if (seg.type === "V") {
          var y = seg.values[0];

          reducedPathData.push({type: "L", values: [currentX, y]});

          currentY = y;
        }

        else if (seg.type === "S") {
          var x2 = seg.values[0];
          var y2 = seg.values[1];
          var x = seg.values[2];
          var y = seg.values[3];

          var cx1, cy1;

          if (lastType === "C" || lastType === "S") {
            cx1 = currentX + (currentX - lastControlX);
            cy1 = currentY + (currentY - lastControlY);
          }
          else {
            cx1 = currentX;
            cy1 = currentY;
          }

          reducedPathData.push({type: "C", values: [cx1, cy1, x2, y2, x, y]});

          lastControlX = x2;
          lastControlY = y2;

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "T") {
          var x = seg.values[0];
          var y = seg.values[1];

          var x1, y1;

          if (lastType === "Q" || lastType === "T") {
            x1 = currentX + (currentX - lastControlX);
            y1 = currentY + (currentY - lastControlY);
          }
          else {
            x1 = currentX;
            y1 = currentY;
          }

          var cx1 = currentX + 2 * (x1 - currentX) / 3;
          var cy1 = currentY + 2 * (y1 - currentY) / 3;
          var cx2 = x + 2 * (x1 - x) / 3;
          var cy2 = y + 2 * (y1 - y) / 3;

          reducedPathData.push({type: "C", values: [cx1, cy1, cx2, cy2, x, y]});

          lastControlX = x1;
          lastControlY = y1;

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "Q") {
          var x1 = seg.values[0];
          var y1 = seg.values[1];
          var x = seg.values[2];
          var y = seg.values[3];

          var cx1 = currentX + 2 * (x1 - currentX) / 3;
          var cy1 = currentY + 2 * (y1 - currentY) / 3;
          var cx2 = x + 2 * (x1 - x) / 3;
          var cy2 = y + 2 * (y1 - y) / 3;

          reducedPathData.push({type: "C", values: [cx1, cy1, cx2, cy2, x, y]});

          lastControlX = x1;
          lastControlY = y1;

          currentX = x;
          currentY = y;
        }

        else if (seg.type === "A") {
          var r1 = Math.abs(seg.values[0]);
          var r2 = Math.abs(seg.values[1]);
          var angle = seg.values[2];
          var largeArcFlag = seg.values[3];
          var sweepFlag = seg.values[4];
          var x = seg.values[5];
          var y = seg.values[6];

          if (r1 === 0 || r2 === 0) {
            reducedPathData.push({type: "C", values: [currentX, currentY, x, y, x, y]});

            currentX = x;
            currentY = y;
          }
          else {
            if (currentX !== x || currentY !== y) {
              var curves = arcToCubicCurves(currentX, currentY, x, y, r1, r2, angle, largeArcFlag, sweepFlag);

              curves.forEach( function(curve) {
                reducedPathData.push({type: "C", values: curve});
              });

              currentX = x;
              currentY = y;
            }
          }
        }

        else if (seg.type === "Z") {
          reducedPathData.push(seg);

          currentX = subpathX;
          currentY = subpathY;
        }

        lastType = seg.type;
      });

      return reducedPathData;
    };

    SVGPathElement.prototype.setAttribute = function(name, value) {
      if (name === "d") {
        this[$cachedPathData] = null;
        this[$cachedNormalizedPathData] = null;
      }

      setAttribute.call(this, name, value);
    };

    SVGPathElement.prototype.removeAttribute = function(name, value) {
      if (name === "d") {
        this[$cachedPathData] = null;
        this[$cachedNormalizedPathData] = null;
      }

      removeAttribute.call(this, name);
    };

    SVGPathElement.prototype.getPathData = function(options) {
      if (options && options.normalize) {
        if (this[$cachedNormalizedPathData]) {
          return clonePathData(this[$cachedNormalizedPathData]);
        }
        else {
          var pathData;

          if (this[$cachedPathData]) {
            pathData = clonePathData(this[$cachedPathData]);
          }
          else {
            pathData = parsePathDataString(this.getAttribute("d") || "");
            this[$cachedPathData] = clonePathData(pathData);
          }

          var normalizedPathData = reducePathData(absolutizePathData(pathData));
          this[$cachedNormalizedPathData] = clonePathData(normalizedPathData);
          return normalizedPathData;
        }
      }
      else {
        if (this[$cachedPathData]) {
          return clonePathData(this[$cachedPathData]);
        }
        else {
          var pathData = parsePathDataString(this.getAttribute("d") || "");
          this[$cachedPathData] = clonePathData(pathData);
          return pathData;
        }
      }
    };

    SVGPathElement.prototype.setPathData = function(pathData) {
      if (pathData.length === 0) {
        if (isIE) {
          // @bugfix https://github.com/mbostock/d3/issues/1737
          this.setAttribute("d", "");
        }
        else {
          this.removeAttribute("d");
        }
      }
      else {
        var d = "";

        for (var i = 0, l = pathData.length; i < l; i += 1) {
          var seg = pathData[i];

          if (i > 0) {
            d += " ";
          }

          d += seg.type;

          if (seg.values && seg.values.length > 0) {
            d += " " + seg.values.join(" ");
          }
        }

        this.setAttribute("d", d);
      }
    };

    SVGRectElement.prototype.getPathData = function(options) {
      var x = this.x.baseVal.value;
      var y = this.y.baseVal.value;
      var width = this.width.baseVal.value;
      var height = this.height.baseVal.value;
      var rx = this.hasAttribute("rx") ? this.rx.baseVal.value : this.ry.baseVal.value;
      var ry = this.hasAttribute("ry") ? this.ry.baseVal.value : this.rx.baseVal.value;

      if (rx > width / 2) {
        rx = width / 2;
      }

      if (ry > height / 2) {
        ry = height / 2;
      }

      var pathData = [
        {type: "M", values: [x+rx, y]},
        {type: "H", values: [x+width-rx]},
        {type: "A", values: [rx, ry, 0, 0, 1, x+width, y+ry]},
        {type: "V", values: [y+height-ry]},
        {type: "A", values: [rx, ry, 0, 0, 1, x+width-rx, y+height]},
        {type: "H", values: [x+rx]},
        {type: "A", values: [rx, ry, 0, 0, 1, x, y+height-ry]},
        {type: "V", values: [y+ry]},
        {type: "A", values: [rx, ry, 0, 0, 1, x+rx, y]},
        {type: "Z", values: []}
      ];

      // Get rid of redundant "A" segs when either rx or ry is 0
      pathData = pathData.filter(function(s) {
        return s.type === "A" && (s.values[0] === 0 || s.values[1] === 0) ? false : true;
      });

      if (options && options.normalize === true) {
        pathData = reducePathData(pathData);
      }

      return pathData;
    };

    SVGCircleElement.prototype.getPathData = function(options) {
      var cx = this.cx.baseVal.value;
      var cy = this.cy.baseVal.value;
      var r = this.r.baseVal.value;

      var pathData = [
        { type: "M",  values: [cx + r, cy] },
        { type: "A",  values: [r, r, 0, 0, 1, cx, cy+r] },
        { type: "A",  values: [r, r, 0, 0, 1, cx-r, cy] },
        { type: "A",  values: [r, r, 0, 0, 1, cx, cy-r] },
        { type: "A",  values: [r, r, 0, 0, 1, cx+r, cy] },
        { type: "Z",  values: [] }
      ];

      if (options && options.normalize === true) {
        pathData = reducePathData(pathData);
      }

      return pathData;
    };

    SVGEllipseElement.prototype.getPathData = function(options) {
      var cx = this.cx.baseVal.value;
      var cy = this.cy.baseVal.value;
      var rx = this.rx.baseVal.value;
      var ry = this.ry.baseVal.value;

      var pathData = [
        { type: "M",  values: [cx + rx, cy] },
        { type: "A",  values: [rx, ry, 0, 0, 1, cx, cy+ry] },
        { type: "A",  values: [rx, ry, 0, 0, 1, cx-rx, cy] },
        { type: "A",  values: [rx, ry, 0, 0, 1, cx, cy-ry] },
        { type: "A",  values: [rx, ry, 0, 0, 1, cx+rx, cy] },
        { type: "Z",  values: [] }
      ];

      if (options && options.normalize === true) {
        pathData = reducePathData(pathData);
      }

      return pathData;
    };

    SVGLineElement.prototype.getPathData = function() {
      return [
        { type: "M", values: [this.x1.baseVal.value, this.y1.baseVal.value] },
        { type: "L", values: [this.x2.baseVal.value, this.y2.baseVal.value] }
      ];
    };

    SVGPolylineElement.prototype.getPathData = function() {
      var pathData = [];

      for (var i = 0; i < this.points.numberOfItems; i += 1) {
        var point = this.points.getItem(i);

        pathData.push({
          type: (i === 0 ? "M" : "L"),
          values: [point.x, point.y]
        });
      }

      return pathData;
    };

    SVGPolygonElement.prototype.getPathData = function() {
      var pathData = [];

      for (var i = 0; i < this.points.numberOfItems; i += 1) {
        var point = this.points.getItem(i);

        pathData.push({
          type: (i === 0 ? "M" : "L"),
          values: [point.x, point.y]
        });
      }

      pathData.push({
        type: "Z",
        values: []
      });

      return pathData;
    };
  })();
}
