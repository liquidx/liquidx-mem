<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
@import "node_modules/liquidx-base/base";

* {
  box-sizing: border-box;
}

body {
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

h1,
h2,
h3 {
  font-size: 1rem;
  font-weight: 700;
}
</style>
