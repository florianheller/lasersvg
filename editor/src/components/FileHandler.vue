<template>
	<div id="FileHandler">
		<input type="file" @change="openFile" accept="image/svg" id="fileInput" style="display:none;" ref="FileInput" />
		<button id="loadButton" @click="open">Open File</button>
		<button id="saveButton" @click="save" title="Save as a LaserSVG file">Save File</button>
		<button id="exportButton" @click="exportFile" title="Export for laser cutting by applying all transformations.">Export File</button>
    </div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

export default {
	name: "FileHandler",
	props: ['laserSVGScript'],
	mixins: [laserSvg],
	methods: {
		open() {
			this.$refs['FileInput'].click();
		},
		save() {
			this.removeEditEventHandlers();
			let source = this.laserSVGScript.getImageForSaving();
			var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
			var svgUrl = URL.createObjectURL(svgBlob);
			var downloadLink = document.createElement("a");
			downloadLink.href = svgUrl;
			downloadLink.download = "laserSVG.svg";
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
			this.addEditEventHandlers(); //Re-Enable editing
		},
		exportFile() {
			this.removeEditEventHandlers();
			let source = this.laserSVGScript.getImageForExport();

			var svgBlob = new Blob([source], {type:"image/svg+xml;charset=utf-8"});
			var svgUrl = URL.createObjectURL(svgBlob);
			var downloadLink = document.createElement("a");
			downloadLink.href = svgUrl;
			downloadLink.download = "laserExport.svg";
			document.body.appendChild(downloadLink);
			downloadLink.click();
			document.body.removeChild(downloadLink);
			this.addEditEventHandlers(); //Re-Enable editing
		},
		openFile(event) {
			this.$root.$emit('fileOpened',event.target.files[0]);
		},
	}
}
</script>

<style scoped>

#FileHandler {
	width: 300px;
	height: 20px;	
	border: 1px solid #A9CE38;
	padding: 5px;
	margin: -5px;
	display:flex;
	justify-content:space-between;
;
}
</style>