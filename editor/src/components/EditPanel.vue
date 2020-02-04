<template>
	<div id="editPanel">
		<FileHandler></FileHandler>
		<div class="panelSection"><h3>Zoom</h3> <button @click="zoom('-')" class="zoomButton">-</button><button @click="zoom('+')" class="zoomButton">+</button><span>{{scalingFactor}}%</span></div>
		
		<div class="panelSection">
			<h3>Global Settings</h3>
			<Slider identifier="materialThickness" title="Material Thickness" min="0.5" max="10"  step="0.5" value="3.5" style="margin-top:6px;"></Slider>
			Action: 
			<select id="actionSelection" onchange="actionSelectionDidChange(this)">
				<option value=""></option>
				<option value="cut">cut</option>
				<option value="engrave">engrave</option>
			</select> 
		</div>
	</div>
</template>

<script>
import FileHandler from './FileHandler.vue'
import Slider from './Slider.vue'

export default {
	name: "EditPanel",
	components: {
		FileHandler,
		Slider
	},
	data: function() {
		return {
			scalingFactor: 100
		}
	},
	mounted() {
		window.eventBus.$on('laserSVGScriptLoaded', (selection) => {
			// eslint-disable-next-line no-console
			console.log(selection);
		})
	},
	props: ['laserSVGScript'],
	methods: {
		zoom(direction) {
			if (direction === '+') { this.laserSVGScript.scale(2); this.scalingFactor *= 2; }
			else if (direction === '-') { this.laserSVGScript.scale(0.5); this.scalingFactor /= 2; }
		}
	}
}
</script>

<style scoped>
#editPanel {
	border: 0px solid #384C6C;
	padding: 5px;
	width: 320px;
	z-index: 1;
	text-align: left;
}

.panelSection {
	border: 1px solid #A9CE38;
	margin: 5px -5px  ;
	padding: 5px;
}

.zoomButton {
	vertical-align: text-top;
}




</style>