<template>
	<div class="panelSection">
			Material Thickness: 
			<!--<div id="pathTemplate" title="Replace the dimensions that are dependent on material thickness with {thickness}. Calculations such as {0.5*thickness} are possible." contenteditable onmouseup="updatePathSelection(this,0)" onkeyup="updatePathSelection(this,0)"></div>-->
			<div id="pathTemplate" title="Replace the dimensions that are dependent on material thickness with {thickness}. Calculations such as {0.5*thickness} are possible." contenteditable>
				<table id="commandTable">
					<tbody></tbody>
				</table>
			</div>

			<button type="button" id="tagToolToggle" onclick="toggleTagTool(this)">Tag</button>
			<button type="button" id="convertToThickness" onclick="convertButtonClicked(this)">Convert</button>
			<button type="button" id="pathTemplateSave" onclick="setPathTemplate(this)">Apply</button>
	</div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

export default {
	name: "PathEditPanel",
	mixins: [laserSvg],
	props: ['element','laserSVGScript'],
	computed: {
		adjustment: {
			get: function () {
				return this.laserSVGScript.getProperty(this.element,"thickness-adjust");
			},
			set: function(newValue) {
				this.laserSVGScript.setProperty(this.element,"thickness-adjust", newValue);
			}
		}
	}
}

</script>

<style scoped>

</style>