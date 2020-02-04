import Vue from 'vue'
import App from './App.vue'	
// eslint-disable-next-line no-unused-vars
import {svgDidLoad} from './laserSVGHost.js'

Vue.config.productionTip = false

window.eventBus = new Vue();
//window.eventBus.$emit('dataLoaded', data);
//window.eventBus.$on('dataLoaded', function(data) {   // react on the event somehow });

var wm = new Vue({
	render: h => h(App),
}).$mount('#app');

window.app = wm;
// Route the callbacks from vanilla JS into Vue
window.svgDidLoad = svgDidLoad;

