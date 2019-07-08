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
 *	TODO: check why the onload event for laserSVG Files is important (it should be enough to have the last line be called)
 */

const laser_NS = 'http://www.heller-web.net/lasersvg';
const svg_NS = 'http://www.w3.org/2000/svg';
const xlink_NS = 'http://www.w3.org/1999/xlink';

var laserSvgScript;
var svgRootNode;

var numberOfFingers = 5;

var taggerActive = false;
var currentCommandRow = 0;
var currentKerfCell = 0;
var currentElement;

const {SVGPathData, SVGPathDataTransformer, SVGPathDataEncoder, SVGPathDataParser} = svgpathdata;

function updateThickness(materialThickness) {
	// Show the materialThickness 
	let thicknessDisplay = document.getElementById('materialThickness');
  	thicknessDisplay.innerHTML = materialThickness;
	
	//Scale the objects
	laserSvgScript.updateThickness(materialThickness);
}


function updateScaling(scalingFactor) {
	//Scale the object drawing
	laserSvgScript.scale(scalingFactor);

	// Show the scaling factor
	let factorDisplay = document.getElementById('scalingFactor');
 	factorDisplay.innerHTML = laserSvgScript.scalingFactor;


}


function highlightSegments() {
	//Remove all previous highlights
	for (let e of svgRootNode.querySelectorAll(".lengthHighlight")) {
		e.parentNode.removeChild(e);
	}
	laserSvgScript.highlightElementsWithLength(laserSvgScript.materialThickness)
}

function removeSegmentHighlights() {
	laserSvgScript.removeSegmentHighlights()
}

function actionSelectionDidChange(event) {
	if (event.value == "") {
		svgRootNode.removeAttributeNS(laser_NS, "action");
	}
	else {
		svgRootNode.setAttributeNS(laser_NS, "laser:action", event.value)
	}

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
	svgRootNode = document.getElementById("drawingObject").contentDocument.firstElementChild;

	let factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = script.materialThickness;

  	let slider = document.getElementById('materialSlider');
  	slider.value = script.materialThickness;

  	if (svgRootNode.hasAttributeNS(laser_NS,"action")) {
  		document.getElementById("actionSelection").value = svgRootNode.getAttributeNS(laser_NS, "action");
  	}
}

function openFile(files) {
	var file = files[0];
	if(file.type === 'image/svg+xml'){
		newObj = document.createElement("object");
		newObj.setAttribute("id","drawingObject");
		newObj.setAttribute("type","image/svg+xml");
		newObj.data = window.URL.createObjectURL(file);
		var obj = document.getElementById('drawingObject');
		obj.data = window.URL.createObjectURL(file);
		newObj.onload = function() {
			console.log("loaded" + this);
			checkLaserSVGFeatures(this, newObj.contentDocument);
			//newObj.contentDocument.location.reload(true);
	        //window.URL.revokeObjectURL(this.src);
      	} 
		obj.parentNode.replaceChild(newObj, obj);
    }
}

function checkLaserSVGFeatures(origin, node) {
	var svgNode = node.getElementsByTagName('svg')[0];

	// We need the xlink namespace to add JS-File references. 
	if (svgNode && svgNode.getAttribute("xmlns:xlink") == null) {	
	  	svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink");
	}

	// Add the LaserSVG Stuff is needed
    if (svgNode && svgNode.getAttribute("xmlns:laser") == null) {
	  	console.log("Not a lasersvg file, adding elements");
	  	svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:laser",laser_NS);


	  	let script = document.createElementNS(svg_NS, "script");
		script.src = "http://www2.heller-web.net/LaserSVG2/lasersvg.js";
	  	script.setAttribute("type","text/javascript");
	  	script.setAttributeNS(xlink_NS, "xlink:href","http://www2.heller-web.net/LaserSVG2/lasersvg.js");
		svgNode.appendChild(script);
	}
}

function saveSVG() {
	// Get the source
	source = laserSvgScript.getImageForSaving();

	var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
	var svgUrl = URL.createObjectURL(svgBlob);
	var downloadLink = document.createElement("a");
	downloadLink.href = svgUrl;
	downloadLink.download = "laserExport.svg";
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

/* This function exports the SVG with all changes as a new file
 * So the DOM as it is right now. 
 * @return the current DOM with all changes applied
 * @see saveSVG()
 */
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

//https://gist.github.com/shamansir/0ba30dc262d54d04cd7f79e03b281505
var markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
var digitRegEx = /-?[0-9]*\.?\d+/g;

function svgPathToCommands(str) {
    var results = []; 
    var match; while ((match = markerRegEx.exec(str)) !== null) { results.push(match); };
    return results
        .map(function(match) {
            return { marker: str[match.index], 
                     index: match.index };
        })
        .reduceRight(function(all, cur) {
            var chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
            return all.concat([
               { marker: cur.marker, 
                 index: cur.index, 
                 chunk: (chunk.length > 0) ? chunk.substr(1, chunk.length - 1) : chunk }
            ]);
        }, [])
        .reverse()
        .map(function(command) {
            var values = command.chunk.match(digitRegEx);
            return { marker: command.marker, values: values ? values.map(parseFloat) : []};
        })
}

function getCommands(str) {
	//let commandRegEx = /(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])+ [-0-9.]*))/gi;
	let commandRegEx = RegExp('(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])* *([-0-9.]|[{].*?thickness.*?[}])*))','gi');
	var results = [];
	var match;
	while ((match = commandRegEx.exec(str)) !== null) { results.push(match[0]); };
	return results;
}

/* pathDescriptionToTable(pathDesccription, table)
 * @param path: the path whose description should be parsed.
 * @param table: the table whose tbody will contain the commands and parameters
 */
function pathDescriptionToTable(path, table) {
	// clear any existing content in the table
	table.innerHTML = "";
	let commands = []; // An array for the commands
	// If we have a template, we need to parse it ourselves, but then, at least the format is (hopefully) clear
	if (path.hasAttributeNS(laser_NS, "template")) {	
		commands = getCommands(path.getAttributeNS(laser_NS, "template")); //Transform the template string into an array of commands
		for (let command of commands) {
			let commandParts = command.split(" "); //Split the commands into its subparts
			if (commandParts) {
				let newRow = table.insertRow(-1); //Add a new row at the end of the table
				for (let i=0; i<commandParts.length; i++) {	//Add command and parameters to the table
					let newCell = newRow.insertCell(i);
					newCell.appendChild(document.createTextNode(commandParts[i]));
				}
			}
		}

	}
	// Otherwise, we let the browser do the interpretation of the initial path description with all its possible formats and shorthand notations
	else { 
		commands = path.getPathData({normalize: false});
		for (let command of commands) {
			let newRow = table.insertRow(-1); //Add a new row at the end of the table
			let newCell = newRow.insertCell(0);
			newCell.appendChild(document.createTextNode(command.type));
			for (let i=0; i<command.values.length; i++) {	//Add command and parameters to the table
					newCell = newRow.insertCell(i+1);
					newCell.appendChild(document.createTextNode(command.values[i]));
				}
		}
	}
}

function convertSubelementToThickness(element, subelement) {
	// Make sure the info is loaded into the editor
	didSelectElement(element, subelement);

	// Highlight the according command in the commandTable
	let commandTable = document.getElementById("commandTable");
	// clear selection in the commandTable
	for (let row of commandTable.rows) {
		row.classList.remove("selected");
	}
	commandTable.rows[subelement].classList.add("selected");
	currentCommandRow = subelement; 
	if (subelement !== undefined) {
		convertParametersToThickness(commandTable.rows[subelement])
	}

}


/* Converts all the parameters to a command in the tableRow to thickness-related versions
 * @param tableRow: the tableRow element in which the command is stored
 */

function convertParametersToThickness(tableRow) {
	// Some commands may have more than two parameters
	for (let i=1; i<tableRow.cells.length; i++) {
		tableRow.cells[i].innerHTML = convertToThickness(tableRow.cells[i].innerText);
	}
}


/* Converts the numberical value below the cursor to a thickness-marker with the appropriate calculation
 * @param size: the size to be transformed into a thickness-related parameter
 * @return the thickness marker as string
 */

function convertToThickness(size) {
	let number = Number(size)/laserSvgScript.materialThickness;
	if (isNaN(number)) { return size} //If anything goes wrong, just leave everything unchanged (e.g. already converted to thickness)
	let snippet = ""
	// Clean the output a bit
	if (number == 0) { snippet = "0"; }
	else if (number == 1) { snippet = "{thickness}"; }
	else if (number == -1) { snippet = "-{thickness}"; } 
	else { snippet = "{" + number + "*thickness}"; }

	return(snippet);
}

function convertButtonClicked(event) {
	convertParametersToThickness(document.getElementById("commandTable").rows[currentCommandRow]);
}




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
				break;

		case 'rect': break;
		default: break;
	}
}

/* Loads all relevant parameters from the selected element and updates the UI accordingly
 * @param element: the element from which the parameters should be loaded
 */
function loadParameters(element) {

	
	if (element.tagName == "path") { 
		pathDescriptionToTable(element, document.getElementById("commandTable"));

		let s = document.getElementById("kerfTable");
		s.innerHTML = ""; //Clear existing content
		let newRow = s.insertRow(-1); //Add a new row at the end of the table
		if (element.hasAttributeNS(laser_NS, "kerf-mask")) {
			let parts = element.getAttributeNS(laser_NS, "kerf-mask").split(" ");
			for (let part of parts) {
				let newCell = newRow.insertCell(-1);
				newCell.appendChild(document.createTextNode(part));
			}
		}
		else { //If no kerf mask has been specified, create an ignore-all one
			// Empty any existing content
			let pathDataLength = element.getPathData().length;
			for (let i = 0; i < pathDataLength-1; i++) {
				let newCell = newRow.insertCell(i);
				newCell.appendChild(document.createTextNode("i"));
			}
		}
	}

	if (element.hasAttributeNS(laser_NS, "thickness-adjust")) {
		document.getElementById("thicknessSelection").value = element.getAttributeNS(laser_NS, "thickness-adjust");
	}
	else {
		document.getElementById("thicknessSelection").value = "none";
	}

	if (element.hasAttributeNS(laser_NS,"action")) {
		document.getElementById("elementActionSelection").value = element.getAttributeNS(laser_NS, "action");	
	}
	else  {
		document.getElementById("elementActionSelection").value = ""
	}
	//Joint parameters if present
	let s = document.getElementById("jointTypeSelection");
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

function setPathTemplate() {
	// Build a path description template from the command table
	let rows = document.getElementById("commandTable").rows;
	let template = Array.prototype.map.call(rows, (row => Array.prototype.map.call(row.cells, cell => cell.innerText).join(" "))).join (" ");
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:template", template);
}

function setJointType() {
	if (laserSvgScript.currentSelection.tagName == "rect") {
		let s = document.getElementById("jointTypeSelection");
		let rectangleSides = ['top', 'right', 'bottom', 'left'];
		let selectionRectangle = document.getElementById("rectangleSelection");
		console.log(selectionRectangle);
		let selectedSide =  selectionRectangle.querySelector('.selected');
		let sideIndex = Array.prototype.indexOf.call(selectionRectangle.childNodes, selectedSide);
		console.log(selectedSide);
		console.log(sideIndex);
		let side = rectangleSides[sideIndex];
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-" + side, 0);
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-" + side + "-type", s.options[s.selectedIndex].value);
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-" + side + "-direction", "inside");
	}
	else { 
		let s = document.getElementById("jointTypeSelection");
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint", 0);
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-type", s.options[s.selectedIndex].value);
		laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:joint-direction", "inside");
	} 
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

function setKerfMask() {
	let s = document.getElementById("kerfMask");
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:kerf-mask", document.getElementById("kerfMask").innerText);
	laserSvgScript.updateDrawing();
}

function setThicknessAdjustment(event) {
	let s = document.getElementById("thicknessSelection");
	laserSvgScript.setPropertyForSelection("thickness-adjust", s.options[s.selectedIndex].value);
	//laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:thickness-adjust", s.options[s.selectedIndex].value);
	laserSvgScript.updateDrawing();
}


function elementActionSelectionDidChange(event) {
	laserSvgScript.setPropertyForSelection("action", event.value);
}

function toggleTagTool(event) {
	taggerActive = !taggerActive;
	event.style.backgroundColor = (event.style.backgroundColor == "") ? "#384C6C":"";
	event.style.color = (event.style.color == "") ? "white":"";
	let svgRoot = document.getElementById("drawingObject").contentDocument;
	if (taggerActive == true) {
		svgRoot.firstElementChild.style.cursor = 'crosshair';
	}
	else {
		svgRoot.firstElementChild.style.cursor = 'default';
	}

}


/******* Onclick callbacks for elements of the drawing **********/


// Delegate function for the selection of a path. 
function didSelectElement(element, subelement) {
	if (currentElement !== element) {
		currentElement = element;
		loadParameters(element);
	}
	document.getElementById("parameters").classList.remove("hidden");
	if (element.tagName == "path") {
		document.getElementById("pathThickness").classList.remove("hidden");
		document.getElementById("primitiveThickness").classList.add("hidden");
		document.getElementById("kerfMaskEditing").classList.remove("hidden");
		document.getElementById("kerfSelection").classList.add("hidden");
		document.getElementById("rectangleSideSelection").classList.add("hidden");
		// Highlight the according command in the commandTable
		let commandTable = document.getElementById("commandTable");
		// clear selection in the commandTable
		for (let row of commandTable.rows) {
			row.classList.remove("selected");
		}
		if (subelement >= 0) { // The command table includes the first move command
			commandTable.rows[subelement].classList.add("selected");
			currentCommandRow = subelement; 
			if (taggerActive == true) { // If we are currently tagging edges
				if (subelement !== undefined) {
					convertParametersToThickness(commandTable.rows[subelement])
				}
			}
		}
		let kerfTable = document.getElementById("kerfTable");
		for (let cell of kerfTable.rows[0].cells) {
			cell.classList.remove("selected");
		}
		if (subelement > 0) {
			kerfTable.rows[0].cells[subelement-1].classList.add("selected");
		}

	}
	else {
		document.getElementById("pathThickness").classList.add("hidden");
		document.getElementById("primitiveThickness").classList.remove("hidden");
		document.getElementById("kerfMaskEditing").classList.add("hidden");
		document.getElementById("kerfSelection").classList.remove("hidden");
		document.getElementById("rectangleSideSelection").classList.remove("hidden")
	}

}

function didSelectRectSide(side) {
	//var rectangleSides = ['top', 'right', 'bottom', 'left'];
	// The paths are arranged in the following order top, right, bottom, left
	//Remove the selected attribute from all paths
	let svgRect = document.getElementById("rectangleSelection");
	for (let child of svgRect.childNodes) {
		child.classList.remove("selected");
	} 
	//Set the selected attribute on the one that was just clicked
	svgRect.childNodes[side].classList.add("selected");
}



/********* Callbacks for the UI Elements ***********/

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
// Onclick for the commands in the path command table
let table = document.getElementById("commandTable")
if (table) {
	table.onclick = function(event) {
		for (let row of table.rows) {
			row.classList.remove("selected");
		}
		currentCommandRow = event.originalTarget.parentNode.rowIndex; 
		table.rows[currentCommandRow].classList.add("selected");

		laserSvgScript.highlightPathSegment(currentElement, currentCommandRow,"pathTemplate");
	}
}

// Onclick for the Kerf-Table
let kTable = document.getElementById("kerfTable")
if (kTable) {
	kTable.onclick = function(event) {
		if (kTable.rows.length == 0) return; 
		for (let cell of kTable.rows[0].cells) {
			cell.classList.remove("selected");
		}
		currentKerfCell = event.originalTarget.cellIndex;
		kTable.rows[0].cells[currentKerfCell].classList.add("selected");
		laserSvgScript.highlightPathSegment(currentElement, currentKerfCell+1,"kerfTemplate");
	}
}

if (loadButton = document.getElementById("loadButton")) {
	loadButton.addEventListener("click", function (e) {
  		if (fileInput = document.getElementById("fileInput")) {
    		fileInput.click();
  		}
	}, false);
}


