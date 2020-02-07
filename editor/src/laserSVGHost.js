
function svgDidLoad(script) {
	// eslint-disable-next-line no-console
	//console.log("svgDidLoad in main.js" + script);
	//alert('SVG Did Load from this file');
	window.eventBus.$emit('laserSVGScriptLoaded', script);
}


export {svgDidLoad}

