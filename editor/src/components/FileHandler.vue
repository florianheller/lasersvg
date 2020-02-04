<template>
	<div id="FileHandler">
		<input type="file" @change="openFile" accept="image/svg" id="fileInput" style="display:none;" ref="FileInput" />
		<button id="loadButton" @click="open">Open File</button>
		<button id="saveButton" @click="save" title="Save as a LaserSVG file">Save File</button>
		<button id="exportButton" @click="exportFile" title="Export for laser cutting by applying all transformations.">Export File</button>
    </div>
</template>

<script>
export default {
	name: "FileHandler",
	methods: {
		open() {
			this.$refs['FileInput'].click();
		},
		save() {

		},
		exportFile() {

		},
		openFile(event) {
			this.$root.$emit('fileOpened',event.target.files[0]);
		},
	},
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