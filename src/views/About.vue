<template>
  <div class="home">
    <header>
      <h1><a href="/">#mem</a></h1>
    </header>

    <main>
      <p>
        #mem is a memory service that allows you to store text, photos and urls.
      </p>
      <p>
        It is designed to be very simple to get data into your account.
      </p>

      <p>
        Save mems from an iPhone by using this
        <a
          href="https://www.icloud.com/shortcuts/780e5199083447e1ac5257131a995369"
        >Add to Mem Shortcut</a>
        or images using this
        <a
          href="https://www.icloud.com/shortcuts/780e5199083447e1ac5257131a995369"
        >Add Photo to Mem Shortcut</a>
      </p>
      <p>
        Save mems from an Android device by using HTTP Shortcuts app and
      </p>
    </main>
  </div>
</template>

<style lang="scss" scoped>
@import "src/layout";
@import "src/colors";

.functions {
  margin: 1rem 0;
}

header {
  flex-grow: 0;
  width: 200px;
  min-width: 200px;
  max-height: 100vh;
  font-size: 0.9rem;

  padding: 5rem 1rem 1rem 2rem;

  display: flex;
  flex-direction: column;

  h1 {
    font-size: 1.2rem;
    a {
      text-decoration: none;
    }
  }

  .signin-button {
    color: white;
    background: black;
  }
}

main {
  flex-grow: 1;
  padding: 2rem 1rem;
}

.home {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
  width: 100vw;
}

@media (max-width: $layout-mobile-width) {
  .home {
    flex-direction: column;
    width: 100vw;
    overflow-x: hidden;
  }

  header {
    margin-top: 0;
    padding: 1rem 2rem;
    min-width: 100vw;
    max-width: 100vw;
    width: 100vw;
  }

  main {
    padding: 1rem 1rem;
    max-width: 100vw;
  }

  .add {
    padding: 0 1rem;
    width: 100%;
  }
}
</style>
