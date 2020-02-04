<template>
  <div id="app">
    <LaserSVGView v-bind:laserSVGScript="laserSVGScript"></LaserSVGView>
    <EditPanel v-bind:laserSVGScript="laserSVGScript"></EditPanel>
  </div>
</template>

<script>
//eslint-disable-next-line no-unused-vars
import laserSVG from './laserSVGHost.js'
import LaserSVGView from './components/LaserSVGView.vue'
import EditPanel from './components/EditPanel.vue'


export default {
  name: 'LaserSVGEditor',
  components: {
    LaserSVGView,
    EditPanel
  },
  data: function () {
    return {
      someValue: "Hello",
      laserSVGScript: null
    }
  },
  created() {
    window.eventBus.$on('laserSVGScriptLoaded', (script) => {
      this.laserSVGScript = script;
    });
  },
  methods: {
  }
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
  display: flex;
}
</style>
