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


var menuItems = ["thickness", "kerf", "scale"]

function toggleItem(item) {
	laserSvgRoot.getElementById(item+"Button").style.opacity = (laserSvgRoot.getElementById(item+"Button").style.opacity == 1) ? 0 : 1;
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


 function createButton(x, y, width, height, title, parent, fontSize, rx, ry, labelXOffset, labelYOffset) {
	
	let buttonGroup = document.createElementNS(svg_NS, "g");

	let buttonRect = document.createElementNS(svg_NS, "rect");
 	buttonRect.setAttribute("x",x);
 	buttonRect.setAttribute("y",y);
 	buttonRect.setAttribute("width",width);
 	buttonRect.setAttribute("height",height);
 	buttonRect.setAttribute("rx",2);
 	buttonRect.setAttribute("ry",2);
 	buttonRect.setAttributeNS(laser_NS,"resizeLock","lock");

 	let buttonText = document.createElementNS(svg_NS, "text");
 	buttonText.textContent = title;
 	buttonText.setAttribute("font-family","Menlo")
 	buttonText.setAttribute("font-size",fontSize)

 	buttonGroup.appendChild(buttonRect);
 	buttonGroup.appendChild(buttonText);

	parent.appendChild(buttonGroup);

	// Align text centered

	textBBox = buttonText.getBBox();

	buttonText.setAttribute("x",x+((width-textBBox.width)/2));
	// FontSize is 5
 	buttonText.setAttribute("y",labelYOffset); 

 	return buttonGroup;

 }

 function createMenuButton(item) {
 	let buttonGroup = createButton(item.x, item.y, item.width, item.height, item.title, this, item.fontSize, 2, 2, item.textXOffset, item.textYOffset);

 	buttonGroup.setAttribute("id",item.id+"Button");
 	buttonGroup.setAttribute("onclick",item.onclick);

 } 
/*
 *********** Add the miniEditor to the SVG-DOM-Tree ************

 <g id="editMenu" >
        <g id="editButton" onclick="showMenu()"> 
            <rect x="0" y="0" width="10" height="10" rx="2" ry="2" laser:resizeLock="lock" />
            <text x="2" y="8" font-family="Menlo" font-size="10">⚙︎</text>
        </g>
        <g id="thicknessButton" onclick="setThicknessClicked()"> 
            <rect x="12" y="0" width="30" height="10" rx="2" ry="2" laser:resizeLock="lock" />
            <text x="13" y="7" font-family="Menlo" font-size="5">Thickness</text>
        </g>
        <g id="kerfButton" onclick="setKerfClicked()">
            <rect x="44" y="0" width="30" height="10" rx="2" ry="2" laser:resizeLock="lock" />
            <text x="52" y="7" font-family="Menlo" font-size="5">Kerf</text>
        </g>
        <g id="scaleButton" onclick="setScaleClicked()">
            <rect x="76" y="0" width="30" height="10" rx="2" ry="2" laser:resizeLock="lock" />
            <text x="83" y="7" font-family="Menlo" font-size="5">Scale</text>
        </g>
    </g>
 */ 
 function addMiniEditMenu() {
 	let buttons = [	{ id:"edit", title:"⚙︎", x:0, y:0, width:10, height:10, textXOffset:2, textYOffset:8, onclick:"showMenu()", fontSize:10},
 					{ id:"thickness", title:"Thickness", x:12, y:0, width:30,  height:10, textXOffset:1, textYOffset:7, onclick:"setThicknessClicked()", fontSize:5},
 					{ id:"kerf", title:"Kerf", x:44, y:0, width:30, textXOffset:8,  height:10, textYOffset:7, onclick:"setKerfClicked()", fontSize:5},
 					{ id:"scale", title:"Scale", x:76, y:0, width:30, textXOffset:7, height:10,  textYOffset:7, onclick:"setScaleClicked()", fontSize:5},
 					{ id:"joints", title:"Joints", x:108, y:0, width:30, textXOffset:7, height:10,  textYOffset:7, onclick:"setJointsClicked()", fontSize:5}
				]

	let menu = document.createElementNS(svg_NS, "g");
 	menu.setAttribute("id","editMenu");
 	laserSvgRoot.appendChild(menu);

 	buttons.map(createMenuButton, menu);

 	// We also need to adjust the viewbox to shift everythin accordingly
 		// Scale the SVG viewbox if defined to avoid clipping
	var vBoxValues = laserSvgRoot.getAttribute("viewBox").replace(/,/g,"").split(" ").map(Number);
	vBoxValues[0] -= 1
	vBoxValues[1] -= 12;	
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
	if (segmentIndex < 0) { return; } //Safety check
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
			highlight.onlick = function() { onLengthHighlightClicked(path.id,i) }
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
				highlight1.onclick = function() { onLengthHighlightClicked(element.id, "width") }

				let highlight2 = createHighlightWithCoordinates(x, y+height, x+length, y+height)
				highlight2.id = "hl-"+element.id+"-1"
				laserSvgRoot.appendChild(highlight2);
				highlight2.onclick = function() { onLengthHighlightClicked(element.id, "width") }

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
				highlight1.id = "hl"+element.id+"0"
				laserSvgRoot.appendChild(highlight1);
				highlight1.onclick = function() { onLengthHighlightClicked(element.id, "height") }

				let highlight2 = createHighlightWithCoordinates(x+width, y, x+width, y+length);
				highlight2.id = "hl-"+element.id+"-1"
				laserSvgRoot.appendChild(highlight2);
				highlight2.onclick = function() { onLengthHighlightClicked(element.id, "height") }
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
function onLengthHighlightClicked(elementID, info) {
	let element = laserSvgRoot.getElementById(elementID);

	if (element == null) return;

	switch(element.tagName) {
		case "rect":
			element.setAttributeNS(laser_NS, "thickness-adjust", info)
			break;
		case "path": break; 
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
	for (var tag of tags) {
		let elements = laserSvgRoot.getElementsByTagName(tag);
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




  
