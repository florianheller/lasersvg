
const laser_NS = 'http://www.heller-web.net/lasersvg';
const svg_NS = 'http://www.w3.org/2000/svg';
const xlink_NS = 'http://www.w3.org/1999/xlink';

function svgDidLoad(script) {
	// eslint-disable-next-line no-console
	//console.log("svgDidLoad in main.js" + script);
	//alert('SVG Did Load from this file');
	window.eventBus.$emit('laserSVGScriptLoaded', script);
}

function checkLaserSVGFeatures(origin, node) {
	let svgNode = node.firstChild;

	// Add the LaserSVG Stuff if needed
	if (!svgNode) { return }

	if (svgNode.getAttribute("xmlns:laser") == null) {
		// eslint-disable-next-line no-console
		console.log("Not a lasersvg file, adding elements");
		svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:laser",laser_NS);


		// We need the xlink namespace to add JS-File references. 
		if (svgNode && svgNode.getAttribute("xmlns:xlink") == null) {	
			svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink");
		}

		let script = document.createElementNS(svg_NS, "script");
		script.setAttribute("type","text/javascript");
		svgNode.appendChild(script);

		
		script.setAttributeNS(xlink_NS, "xlink:href","http://www2.heller-web.net/LaserSVG2/lasersvg.js");
		script.src = "http://www2.heller-web.net/LaserSVG2/lasersvg.js";
	}
}

export {svgDidLoad, checkLaserSVGFeatures}

