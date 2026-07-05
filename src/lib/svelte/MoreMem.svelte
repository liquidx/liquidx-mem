<script lang="ts">
  interface Props {
    moreAvailable?: boolean;
    onloadMore?: () => void;
  }

  let { moreAvailable = false, onloadMore }: Props = $props();
</script>

<div class="border-t border-white/[.05] px-4 py-4 md:px-6">
  {#if moreAvailable}
    <button
      class="border border-hairline px-[14px] py-[7px] text-[11px] text-ui hover:bg-white/[.03]"
      onclick={() => onloadMore?.()}
    >
      more ▾
    </button>
  {:else}
    <div class="text-[10px] tracking-[.1em] text-faint">· end ·</div>
  {/if}
</div>
