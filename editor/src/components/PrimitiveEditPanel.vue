<template>
	<div class="panelSection">
			<p>Thickness adjustment:<br />
			<select ref="thicknessSelection" v-model="adjustment">
				<option value=""></option>
				<option value="width">Width</option>
				<option value="height">Height</option>
				<option value="both">Width & Height</option>
			</select></p>

			<p>Thickness adjustment origin:
			<select ref="originSelection" v-model="origin">
				<option value="">Top Left</option>
				<option value="right">Top Right</option>
				<option value="right">Right</option>
				<option value="bottom-right">Bottom Right</option>
				<option value="bottom">Bottom Left</option>
				<option value="center">Center</option>
			</select></p>
			<p>Kerf adjustment: <br />
			<select ref="kerfSelection" v-model="kerf">
				<option value=""></option>
				<option value="shrink">Shrink</option>
				<option value="grow">Grow</option>
			</select></p>
		</div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

export default {
	name: "PrimitiveEditPanel",
	mixins: [laserSvg],
	props: ['element','laserSVGScript'],
	computed: {
		adjustment: {
			get: function () { return this.laserSVGScript.getProperty(this.element,"thickness-adjust"); },
			set: function(newValue) { this.laserSVGScript.setProperty(this.element,"thickness-adjust", newValue); }
		},
		origin: {
			get: function () { return this.laserSVGScript.getProperty(this.element,"origin"); },
			set: function(newValue) { this.laserSVGScript.setProperty(this.element,"origin", newValue); }
		},
		kerf: {
			get: function () { return this.laserSVGScript.getProperty(this.element,"kerf-adjust"); },
			set: function(newValue) { this.laserSVGScript.setProperty(this.element,"kerf-adjust", newValue); }
		}
	}
}

</script>

<style scoped>

</style>