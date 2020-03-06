<template>
	<div id="editPanel">
		<FileHandler v-bind:laserSVGScript="laserSVGScript"></FileHandler>
		<div class="panelSection"><h3>Zoom</h3> <button type="button"  @click="zoom('-')" class="zoomButton">-</button><button type="button" @click="zoom('+')" class="zoomButton">+</button><span>{{scalingFactor}}%</span></div>
		
		<div class="panelSection">
			<h3>Global Settings</h3>
			<Slider identifier="materialThickness" title="Material Thickness" min="0.5" max="10"  step="0.5" style="margin-top:6px;" ref="materialThicknessSlider"></Slider>
			Action: 
			<select id="actionSelection" @change="selectionDidChange('GlobalAction', $event.target)" ref="globalActionSelection">
				<option value=""></option>
				<option value="cut">cut</option>
				<option value="engrave">engrave</option>
			</select> 
		</div>
		<div class="panelSection">
			<h3>Helpers</h3>
			<button type="button" @click="highlightSegments();" title="Highlight segments that have the same length as the material thickness defined above">Highlight Segments</button>
			<button type="button" @click="removeSegmentHighlights();">Remove Highlights</button>
		</div>
		<div v-if="currentSelection">
		<div class="panelSection"> 
			<h3>Parameters</h3>
			Action
			<select id="elementActionSelection" ref="elementActionSelection" @change="selectionDidChange('ElementAction', $event.target)">
				<option value=""></option>
				<option value="cut">Cut</option>
				<option value="engrave">Engrave</option>
			</select>
		</div>
		<PrimitiveEditPanel 
			v-if="currentSelection.tagName === 'rect'" 
			v-bind:element="currentSelection"
			v-bind:laserSVGScript="laserSVGScript"></PrimitiveEditPanel>
		<PathEditPanel 
			v-if="currentSelection.tagName === 'path'" 
			v-bind:element="currentSelection"
			v-bind:laserSVGScript="laserSVGScript"></PathEditPanel>
		</div>
	</div>

</template>

<script>
import FileHandler from './FileHandler.vue'
import Slider from './Slider.vue'
import { laserSvg } from './mixins/laserSVGMixin'
import PrimitiveEditPanel from './PrimitiveEditPanel'
import PathEditPanel from './PathEditPanel'

export default {
	name: "EditPanel",
	components: {
		FileHandler,
		Slider,
		PrimitiveEditPanel,
		PathEditPanel
	},
	mixins: [laserSvg],
	props: ['laserSVGScript'],
	data: function() {
		return {
			scalingFactor: 100,
		}
	},
	mounted() {
		window.eventBus.$on('laserSVGScriptLoaded', (script) => {
			this.$refs['materialThicknessSlider'].value = script.materialThickness;
		}),
		window.eventBus.$on('documentLoaded', () => { 
			this.$refs['globalActionSelection'].value = this.laserSVGScript.getProperty(window.laserSvgRoot, "action");
		}),
		//Selectiondetails is an array that contains the selected node as first element and the segment the user clicked on as second.
		window.eventBus.$on('didselectelement', (selectionDetails) => {
			this.currentSelection = selectionDetails[0];

		})
	},
	watch: {
		currentSelection: function (val) {
			// eslint-disable-next-line no-console
			console.log(val);
			//this.$refs['elementActionSelection'].value = "cut";
			//this.$refs['elementActionSelection'].value = "width";
		}
	},
	methods: {
		zoom(direction) {
			if (direction === '+') { this.laserSVGScript.scale(2); this.scalingFactor *= 2; }
			else if (direction === '-') { this.laserSVGScript.scale(0.5); this.scalingFactor /= 2; }
		},
		highlightSegments() {
			this.laserSVGScript.removeSegmentHighlights();
			this.laserSVGScript.highlightElementsWithLength(this.laserSVGScript.materialThickness)
		},
		removeSegmentHighlights() {	this.laserSVGScript.removeSegmentHighlights() },
		selectionDidChange(setting, selection) { 
			switch (setting) {
				case 'GlobalAction': this.laserSVGScript.setProperty(window.laserSvgRoot, "action", selection.value);  break;
				case 'ElementAction': this.laserSVGScript.setProperty(this.currentSelection, "action", selection.value); break;
				case 'ElementAdjustment': this.laserSVGScript.setProperty(this.currentSelection, "thickness-adjust", selection.value); break;
				default: break;
			}
		}
	}
}
</script>

<style scoped>

h3 {
	margin-top: 3px;
	margin-bottom: 3px;
}

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