<template>
	<div id="LaserSVGView">
		<ul id="toolbox">
			<li class="button" @click="laserSVGScript.scale(2);">
				<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve">
					<path d="M24,16h-6v-6c0-0.553-0.448-1-1-1c-0.553,0-1,0.447-1,1v6h-6c-0.553,0-1,0.447-1,1c0,0.552,0.447,1,1,1h6v6
			c0,0.552,0.447,1,1,1c0.552,0,1-0.448,1-1v-6h6c0.552,0,1-0.448,1-1C25,16.447,24.552,16,24,16z M43.695,42.295L29.688,28.286
			C32.361,25.283,34,21.337,34,17c0-9.389-7.611-17-17-17C7.61,0,0,7.611,0,17s7.61,17,17,17c4.337,0,8.283-1.639,11.286-4.312
			l14.009,14.008c0.387,0.387,1.014,0.387,1.4,0S44.082,42.682,43.695,42.295z M17,32C8.716,32,2,25.284,2,17S8.716,2,17,2
			s15,6.716,15,15S25.284,32,17,32z" style="fill: #384C6C;"/>
				</svg></li>
			<li class="button" @click="laserSVGScript.scale(0.5);">
				<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve">
					<path d="M24,16H10c-0.553,0-1,0.447-1,1c0,0.552,0.447,1,1,1h14c0.552,0,1-0.448,1-1C25,16.447,24.552,16,24,16z M43.695,42.295 L29.688,28.286C32.361,25.283,34,21.337,34,17c0-9.389-7.611-17-17-17C7.61,0,0,7.611,0,17s7.61,17,17,17
			c4.337,0,8.283-1.639,11.286-4.312l14.009,14.008c0.387,0.387,1.014,0.387,1.4,0S44.082,42.682,43.695,42.295z M17,32 C8.716,32,2,25.284,2,17S8.716,2,17,2s15,6.716,15,15S25.284,32,17,32z" style="fill: #384C6C;" />
				</svg>
			</li>
			<li class="button" @click="toggleTagMode()" v-bind:class="{ active: taggerActive }">
				<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" width="50px" height="50px" viewbox="0 0 50 50" >
					<circle cx="25" cy="25" r="22" class="buttonImage" v-bind:class="{ active: taggerActive }" />
					<line x1="25" y1="3" x2="25" y2="10" class="buttonImage" v-bind:class="{ active: taggerActive }"/>
					<line x1="25" y1="47" x2="25" y2="40" class="buttonImage" v-bind:class="{ active: taggerActive }"/>
					<line x1="40" y1="25" x2="47" y2="25" class="buttonImage" v-bind:class="{ active: taggerActive }"/>
					<line x1="3" y1="25" x2="10" y2="25" class="buttonImage"  v-bind:class="{ active: taggerActive }"/>
			</svg>
			</li>
		</ul>
		<h1>{{fileName}}</h1>
		<object id="drawingObject" v-bind:data="fileURL" type="image/svg+xml" ref="DrawingArea" onLoad="window.eventBus.$emit('documentLoaded', this)" ></object>
    </div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

export default {
	name: "LaserSVGView",
	data: function() {
		return {
			fileName: "Bench.svg",
			fileURL: "./Bench.svg",
			taggerActive: false
		};
	},
	mixins: [laserSvg],
	props: ['laserSVGScript'],
	mounted() {
		this.$root.$on('fileOpened', (file) => { 
			this.fileName = file.name;
			this.fileURL = window.URL.createObjectURL(file);
			// This looks weird, but Firefox only renders a dynamically loaded SVG in an object tag this way. 
			// Otherwise it loads the SVG, but it gets rendered with a zero size. 
			this.$refs['DrawingArea'].parentNode.replaceChild(this.$refs['DrawingArea'], this.$refs['DrawingArea']);
		}),
		this.$root.$on('materialThickness', (thickness) => {
			this.laserSVGScript.updateThickness(thickness);
			//window.laserSvgScript.updateThickness(thickness);
		})
		// eslint-disable-next-line no-unused-vars
		window.eventBus.$on('documentLoaded', (event) => {
			this.checkLaserSVGFeatures(this.$refs['DrawingArea']); //Check if all the LaserSVG details are in there
			this.addEditEventHandlers(); //Add the handlers needed to being able to edit the file.
		})
	},
	methods: {
		toggleTagMode() {
			this.taggerActive = !this.taggerActive;
			if (this.taggerActive == true) {
				this.laserSvgRoot.style.cursor = 'crosshair';
			}
			else {
				this.laserSvgRoot.style.cursor = 'default';
			}
		}
	}
}
</script>

<style scoped>

#LaserSVGView {
	border: 1px solid #E1E4E9;
	padding: 15px;
	top: 20px;
	float:left;
	width:100%;
}

#drawingObject {
	width: 100%;
	margin: 2px;
	padding: 0px;
	z-index:0;
}

.button {
	width: 50px;
	height: 50px;
	background-color: #E1E4E9;
	text-align:center;
	margin: 5px;
	padding: 5px;
	border: 3px solid #384C6C;
	border-radius: 10px;
}

.active {
	background-color: #384C6C;
	stroke:#A9CE38!important;
}

.buttonImage {
	stroke: #384C6C;
	stroke-width:3px;
	fill:none;
}

#toolbox {
	float: right;
	right:0px;
	top: 0px;
	z-index:2;
	list-style-type: none;
	flex-wrap: nowrap;
	display: inline flex;
}
</style>