<template>
	<div class="panelSection">
			Path Template: 
			<div id="pathTemplate" title="Replace the dimensions that are dependent on material thickness with {thickness}. Calculations such as {0.5*thickness} are possible." contenteditable>
				<table id="commandTable">
					<colgroup>
						<col class="w">
					</colgroup>
					<tbody>
						<tr v-for="(item, index) in commandTable" :key="index">
							<td>{{item.marker}}</td>
							<td v-for="(i, subIndex) in item.values" :key="subIndex">{{i}}</td>
						</tr>
					</tbody>
				</table>
			</div>

			<button type="button" id="tagToolToggle" onclick="toggleTagTool(this)">Tag</button>
			<button type="button" id="convertToThickness" onclick="convertButtonClicked(this)">Convert</button>
			<button type="button" id="pathTemplateSave" onclick="setPathTemplate(this)">Apply</button>
	</div>
</template>

<script>
import { laserSvg } from './mixins/laserSVGMixin'

let commandRegEx = RegExp('(([mvlhz] *([-0-9.]|[{].*?thickness.*?[}])* *([-0-9.]|[{].*?thickness.*?[}])*))','gi');
let markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
let digitRegEx = /-?[0-9]*\.?\d+/g;

export default {
	name: "PathEditPanel",
	mixins: [laserSvg],
	props: ['element','laserSVGScript'],
	computed: {
		adjustment: {
			get: function () { return this.laserSVGScript.getProperty(this.element,"thickness-adjust"); },
			set: function(newValue) { this.laserSVGScript.setProperty(this.element,"thickness-adjust", newValue); }
		}, 
		commandTable: {
			get: function () { 
					let t = this.laserSVGScript.getProperty(this.element,"template");  // Try to get the template if present
					if (t != undefined)  {
						return this.svgTemplateToCommands(t); }
					else { //Otherwise just load the path description
						let d = this.svgPathToCommands(this.element.getAttribute("d"));
						// eslint-disable-next-line no-console
						console.log(d);
					return this.svgPathToCommands(this.element.getAttribute("d")); }
				}
		}
	},
	methods: {
		svgTemplateToCommands(str) {
			let results = [];
			let match;
			while ((match = commandRegEx.exec(str)) !== null) { results.push(match[0]); }
			return results
				.map(function(entry) { 
					return {	'marker':entry.substring(0,1), 
								'values': entry.substring(1).trim().split(' ') } 
					});
		},
		svgPathToCommands(str) { //https://gist.github.com/shamansir/0ba30dc262d54d04cd7f79e03b281505
			let results = []; 
			let match; 
			while ((match = markerRegEx.exec(str)) !== null) { results.push(match); }
			return results
				.map(function(match) {
					return { 	marker: str[match.index], 
								index: match.index };
				})
				.reduceRight(function(all, cur) {
					var chunk = str.substring(cur.index, all.length ? all[all.length - 1].index : str.length);
					return all.concat([
						{	marker: cur.marker, 
							index: cur.index, 
							chunk: (chunk.length > 0) ? chunk.substr(1, chunk.length - 1) : chunk }
					]);
				}, [])
				.reverse()
				.map(function(command) {
					var values = command.chunk.match(digitRegEx);
					return { marker: command.marker, values: values ? values.map(parseFloat) : []};
				})
		},
		commandsToSvgPath(commands) {
			return commands.map(function(command) { return command.marker + ' ' + command.values.join(','); }).join(' ').trim();
		}
	}
}

</script>

<style scoped>
.w {width: 12pt;}
/*Make a zebra-style table */
#commandTable tr:nth-child(even) {
  background-color: #E1E4E9;
}
/* Make the command-column smaller than the rest */
#commandTable {
	width: 100%;
}
#commandTable td {	overflow: hidden; text-overflow: ellipsis; }
</style>