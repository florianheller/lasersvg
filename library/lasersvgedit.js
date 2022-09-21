/*
 *	laserSVGedit.js
 * 
 *	This file contains the implementation of the LaserSVG inline edit functionality. 
 *	
 *	Copyright C2017 Florian Heller florian.heller<at>uhasselt.be
 *	
 *	See http://www.heller-web.net/lasersvg
 *	or https://florianheller.github.io/lasersvg/ for more info
 */


var menuItems = ["thicknessButton", "kerfButton", "scaleButton", "exportButton"]

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

function exportClicked() {
	exportSVG();
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
 					{ id:"scale", title:"Scale", x:76, y:0, width:30, textXOffset:7, height:10,  textYOffset:7, onclick:"setScaleClicked()", fontSize:5},
					 { id:"export", title:"Save", x:76, y:0, width:30, textXOffset:7, height:10,  textYOffset:7, onclick:"exportClicked()", fontSize:5}
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

/* This function exports the SVG with all changes as a new file
 * So the DOM as it is right now. 
 * @return the current DOM with all changes applied
 * @see saveSVG()
 */
function exportSVG() {
	// Get the source
	let source = getImageForExport();

	let svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
	let svgUrl = URL.createObjectURL(svgBlob);
	let downloadLink = document.createElement("a");
	let downloadText = document.createElement("text");
	downloadText.innerText = "Download";
	downloadLink.appendChild(downloadText);
	const xlink_NS = "http://www.w3.org/1999/xlink";
	downloadLink.setAttributeNS(xlink_NS, "xlink:href", svgUrl);
	downloadLink.setAttribute("download","laserExport.svg");
	document.documentElement.appendChild(downloadLink);
	let event =  new MouseEvent("click");
	downloadLink.dispatchEvent(event);
	document.documentElement.removeChild(downloadLink);
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

// Set a property on a certain node to a given value
// If value is an empty string, the attribute is removed from the node. 
function setProperty(element, property, value) {
	if (value != "") {
		element.setAttributeNS(laser_NS, "laser:" + property, value);
	}
	else {
		element.removeAttributeNS(laser_NS, property);
	}
}

function getProperty(element, property) {
	console.log("LaserSVG getProperty" + element + " property:" + property);
	if (element.hasAttributeNS(laser_NS,property)) {
		return element.getAttributeNS(laser_NS,property);
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




  
