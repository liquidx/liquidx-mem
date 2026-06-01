<script lang="ts">
  import { onDestroy } from "svelte";
  import type { HTMLTextareaAttributes } from "svelte/elements";

  import ProxyTextareaElement from "./core";

  interface Props extends HTMLTextareaAttributes {
    value?: string;
    minRows?: number;
    maxRows?: number;
  }

  let {
    value = $bindable(""),
    minRows = undefined,
    maxRows = undefined,
    ...restProps
  }: Props = $props();

  let element: HTMLTextAreaElement | null = $state(null);

  const instance = new ProxyTextareaElement();

  $effect(() => {
    if (element !== null && !instance.hasStarted) instance.start(element, minRows, maxRows);
    if (instance.hasStarted) instance.onUpdateText((value || "").toString());
  });

  onDestroy(() => {
    instance.cleanUp();
  });
</script>

<textarea bind:this={element} bind:value {...restProps}></textarea>
