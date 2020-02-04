<template>
	<div id="slider">
		<label :for="identifier">{{title}}:</label><br />
		<input type="range" 
			:min="min" 
			:max="max" 
			:step="step" 
			class="slider"
			:id="identifier"
			v-model="value"  
			v-on:input="onChange($event.target.value)">
		<span id="materialThickness">{{value}}</span> mm
	</div>
</template>

<script>

export default {
	name: "Slider",
	data: function () {
		return {
			value: 0
		}
	},
	props: ['identifier', 'title', 'min', 'max', 'step'],
	methods: {
		onChange(newValue) {
			this.$root.$emit(this.identifier, newValue)
		}
	}
}
</script>

<style scoped>
#slider {
	text-align: left;
}

.slider {
	width: 240px;
	vertical-align: text-bottom;
}

</style>