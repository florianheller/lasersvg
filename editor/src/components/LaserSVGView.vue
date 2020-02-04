<template>
	<div id="LaserSVGView">
		<h1>{{fileName}}</h1>
		<object id="drawingObject" v-bind:data="fileURL" type="image/svg+xml" ref="DrawingArea" onLoad="window.eventBus.$emit('documentLoaded', this)"></object>
    </div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

export default {
	name: "LaserSVGView",
	data: function() {
		return {
			fileName: "Bench.svg",
			fileURL: "./Bench.svg"
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
			this.checkLaserSVGFeatures(this.$refs['DrawingArea']);
		})
	},
	methods: {
		
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
}
</style>