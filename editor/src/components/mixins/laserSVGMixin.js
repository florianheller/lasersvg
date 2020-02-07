// define a mixin object
export const laserSvg = {
	data() {
		return {
			laser_NS : 'http://www.heller-web.net/lasersvg',
			svg_NS : 'http://www.w3.org/2000/svg',
			xlink_NS : 'http://www.w3.org/1999/xlink',
			currentSelection: null,
			laserSvgRoot: null
		}
	},
	methods: {
		checkLaserSVGFeatures(svgContainerObject) {
			let node = svgContainerObject.getSVGDocument();
			if (!node) { return; }

			let svgNode = node.firstElementChild;
			if (!svgNode) { return }

			this.laserSvgRoot = svgNode;
			// eslint-disable-next-line no-console
			console.log(this.laserSvgRoot);
			this.currentSelection = svgNode;
			window.laserSvgRoot = svgNode;
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
		},
		addEditEventHandlers() {
			let tags = ['path', 'rect', 'circle'];
			for (let tag of tags) {
				let elements = window.laserSvgRoot.getElementsByTagName(tag);
				for (let element of elements) {
					// eslint-disable-next-line no-unused-vars
					element.onclick = function (event) {
						let segmentIndex = window.laserSvgScript.isInWhichSegment(this, event.clientX, event.clientY);
						window.laserSvgScript.highlightPathSegment(this, segmentIndex, "pathTemplate"); 
					
						// clear selection by removing the selected class from all other tags
						for (let e of window.laserSvgRoot.querySelectorAll('.selected')) {
							e.classList.remove("selected");
							if (e.getAttribute("class") == "" ) { e.removeAttribute("class"); } // Leave a clean DOM
						}
						this.currentSelection = this;
						this.classList.add("selected");
						window.eventBus.$emit('didselectelement', [this, segmentIndex]); //Notify the host script
					}
				}
			}
		}
	}
}

