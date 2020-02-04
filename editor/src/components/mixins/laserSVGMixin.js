// define a mixin object
export const laserSvg = {
	data() {
		return {
			laser_NS : 'http://www.heller-web.net/lasersvg',
			svg_NS : 'http://www.w3.org/2000/svg',
			xlink_NS : 'http://www.w3.org/1999/xlink'
		}
	},
	methods: {
		checkLaserSVGFeatures(svgContainerObject) {
			let node = svgContainerObject.getSVGDocument();
			if (!node) { return; }

			let svgNode = node.firstElementChild;
			if (!svgNode) { return }

			// Add the LaserSVG Stuff if needed
			if (svgNode.getAttribute("xmlns:laser") == null) {
				// eslint-disable-next-line no-console
				console.log("Not a lasersvg file, adding elements");
				svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:laser",this.laser_NS);

				// We need the xlink namespace to add JS-File references. 
				if (svgNode && svgNode.getAttribute("xmlns:xlink") == null) {	
					svgNode.setAttributeNS("http://www.w3.org/2000/xmlns/","xmlns:xlink","http://www.w3.org/1999/xlink");
				}

				let script = document.createElementNS(this.svg_NS, "script");
				script.setAttribute("type","text/javascript");
				svgNode.appendChild(script);

				script.setAttributeNS(this.xlink_NS, "xlink:href","http://www2.heller-web.net/LaserSVG2/lasersvg.js");
				script.src = "http://www2.heller-web.net/lasersvg/lasersvg.js";

			}
		}
	}
}