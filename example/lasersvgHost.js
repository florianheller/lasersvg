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

var numberOfFingers = 5;

const {SVGPathData, SVGPathDataTransformer, SVGPathDataEncoder, SVGPathDataParser} = svgpathdata;

function updateThickness(materialThickness) {
	// Show the materialThickness 
	let factorDisplay = document.getElementById('materialThickness');
  	factorDisplay.innerHTML = materialThickness;
	
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
    if (svgNode && svgNode.getAttribute("xmlns:laser") == null) {
	  	console.log("Not a lasersvg file, adding elements");
	  	svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:laser",laser_NS);
	  	svgNode.setAttribute("onload", "svgLoaded(event)");
	  	
	  	// That doesn't work as the script is still loaded. 
	  	let script = document.createElementNS(svg_NS, "script");
	  	script.setAttribute("type","text/javascript");
	  	script.setAttributeNS(xlink_NS, "xlink:href","http://www2.heller-web.net/LaserSVG2/lasersvg.js");
		svgNode.appendChild(script);
		let script2 = document.createElementNS(svg_NS, "script");
	  	script2.setAttribute("type","text/javascript");
		script2.setAttributeNS(xlink_NS, "xlink:href","http://www2.heller-web.net/LaserSVG2/path-data-polyfill.js");
		svgNode.appendChild(script2);

		var style = document.createElementNS(svg_NS, "style");
		style.textContent = '@import url("http://www2.heller-web.net/LaserSVG2/lasersvg.css");';
		svgNode.insertBefore(style, svgNode.firstChild);

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
	let commandRegEx = RegExp('(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])+ [-0-9.]*))','gi');
	var results = [];
	var match;
	while ((match = commandRegEx.exec(str)) !== null) { results.push(match); };
	return results;
}

function getCommandAtIndex(str,index) {
	//let commandRegEx = /(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])+ [-0-9.]*))/gi;
	let commandRegEx = RegExp('(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])+ [-0-9.]*))','gi');
	var results = [];
	var match;
	while ((match = commandRegEx.exec(str)) !== null) { if (match.index <= index && index <= commandRegEx.lastIndex ) return match; };
}

// http://jsfiddle.net/cpatik/3QAeC/
//TODO: make this ignore multiple spaces, newlines in the path description
function getPosition(element) {
	let caretOffset = 0;
	var range = window.getSelection().getRangeAt(0);
        var preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
        return(caretOffset);
}

//Converts the numberical value below the cursor to a thickness-marker with the appropriate calculation
function convertToThickness() {
	let descriptionDiv = document.getElementById("pathTemplate");
	let position = getPosition(descriptionDiv);
	let command = getCommandAtIndex(descriptionDiv.innerText, position);

	// We need the two numerical values in that command, the first letter is the command that can be ignored
	let numbers = command[0].substring(1).trim().split(' '); 

	// find the cursor position within the command
	let diff = position - command.index;
	console.log(command[0]);
	console.log(diff);

	// Rebuilding the string is rather tricky

	let newCommand;
	//Figure out in which number the click was
	// At least the first char is the command
	if (diff > 1 && diff <= numbers[0].length+1) { 
		let number = Number(numbers[0])/laserSvgScript.materialThickness;
		console.log(Number(numbers[0]) + " " + laserSvgScript.materialThickness);
		let snippet = ""
		if (number == 0) { snippet = " 0 "; }
		else if (number == 1) { snippet = " {thickness} "; }
		else if (number == -1) { snippet = " -{thickness} "; } 
		else { snippet = " {" + number + "*thickness} "; }
		newCommand = command[0].substring(0,1) + snippet + numbers[1] + " ";
	}
	else { 
		let number = Number(numbers[1])/laserSvgScript.materialThickness;
		let snippet = ""
		if (number == 0) { snippet = " 0 "; }
		else if (number == 1) { snippet = " {thickness} "; }
		else if (number == -1) { snippet = " -{thickness} "; } 
		else { snippet = " {" + number + "*thickness} "; }
		newCommand = command[0].substring(0,1) +" " + + numbers[0] + snippet ;
	}

	let newDescription = descriptionDiv.innerText.substring(0, command.index) + newCommand + descriptionDiv.innerText.substring(command.index + command[0].length);

	descriptionDiv.innerHTML = highlightMarkers(newDescription);
}

function updatePathSelection(event,id) {
	//This is the path description. We need to separate it into its subelements and count where in the path the marked section is
	if (id==0) {
		var index = getPosition(event);
		let commands = getCommands(event.innerText);
		//let command = getCommandAtIndex(event.innerText, index)[0];
		//We have all the commands, now find the one that is at the location that was clicked
		let resultIndex = 0;
		for (let i=1; i<commands.length-1; i++) {
			if (commands[i].index <= index && index <= commands[i+1].index ) {
				resultIndex = i;
			}
		}
		if (resultIndex == 0) {
			resultIndex = commands.length;
		}
		if (resultIndex != 0) {
			laserSvgScript.highlightPathSegment(laserSvgScript.currentSelection, resultIndex, event.getAttribute("id"));
		}

		//var test = svgPathToCommands(event.innerText);
		

	}
	//([l0-9]?)$
	// This is the kerf mask, which is easy as every two characters (marker + space) is a new subpath
	if (id==1) {
		laserSvgScript.highlightPathSegment(laserSvgScript.currentSelection, Math.floor(getPosition(event)/2)+1,event.getAttribute("id"));
	}
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
	if (element.hasAttributeNS(laser_NS, "template")) {	
				description = highlightMarkers(element.getAttributeNS(laser_NS, "template"));
	}
	else { 
		description = element.getAttribute("d");
	}
	document.getElementById("pathTemplate").innerHTML = description;

	//var pathSegmentPattern = /[m,l,z][^m,l,z]*/ig;
	//var pathSegments = element.getAttributeNS(laser_NS, "template").match(pathSegmentPattern);
	//console.log(pathSegments);

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

	s = document.getElementById("kerfMask");
	if (element.hasAttributeNS(laser_NS, "kerf-mask")) {
		s.innerText = element.getAttributeNS(laser_NS, "kerf-mask");
	}
	else if (element.tagName == "path") {
		let s = document.getElementById("kerfMask");
		// Empty any existing content
		s.innerText = "";
		let pathDataLength = element.getPathData().length;
		for (let i = pathDataLength-1; i > 0 ; i--) {
			s.innerText += " i ";
		}
	}
}

function setPathTemplate() {
	laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:template", document.getElementById("pathTemplate").innerText)
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

function setThicknessAdjustment() {
	let s = document.getElementById("thicknessSelection");
	console.log("set thickness-adjust to " + s.options[s.selectedIndex].value);
	laserSvgScript.setPropertyForSelection("thickness-adjust", s.options[s.selectedIndex].value);
	//laserSvgScript.currentSelection.setAttributeNS(laser_NS, "laser:thickness-adjust", s.options[s.selectedIndex].value);
	laserSvgScript.updateDrawing();
}


// If we ever need to strip the markers again https://stackoverflow.com/questions/822452/strip-html-from-text-javascript
function highlightMarkers(template) {
	return template.replace(/[{](.*?thickness.*?)[}]/g, function (x) { return "<span class=\"marker\">" + x + "</span>" } );
}


// Delegate function for the selection of a path. 
function didSelectElement(element) {
	document.getElementById("parameters").classList.remove("hidden");
	if (element.tagName == "path") {
		document.getElementById("pathThickness").classList.remove("hidden");
		document.getElementById("primitiveThickness").classList.add("hidden");
		document.getElementById("kerfMaskEditing").classList.remove("hidden");
		document.getElementById("kerfSelection").classList.add("hidden");
	}
	else {
		document.getElementById("pathThickness").classList.add("hidden");
		document.getElementById("primitiveThickness").classList.remove("hidden");
		document.getElementById("kerfMaskEditing").classList.add("hidden");
		document.getElementById("kerfSelection").classList.remove("hidden");
	}
	loadParameters(element);
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



// Add Callbacks for the UI Elements

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

if (loadButton = document.getElementById("loadButton")) {
	loadButton.addEventListener("click", function (e) {
  		if (fileInput = document.getElementById("fileInput")) {
    		fileInput.click();
  		}
	}, false);
}


