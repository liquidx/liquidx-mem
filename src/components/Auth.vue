<template>
  <div>
    <div v-show="!user" class="signin">
      <input
        v-model="signInEmail"
        type="email"
        class="email"
        name="email"
        placeholder="email"
      />
      <input
        v-model="signInPassword"
        type="password"
        class="password"
        name="password"
      />
      <button class="signin-button" @click="signIn">Sign In</button>
    </div>
  </div>
</template>

<script></script>
