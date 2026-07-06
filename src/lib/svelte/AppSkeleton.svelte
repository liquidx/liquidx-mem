<!--
  Placeholder shown while Firebase restores the persisted session, so the
  sign-in form never flashes for already-authenticated users. Mirrors the
  MainView layout: omnibar, tab row, then feed rows.
-->
<div class="flex w-full flex-1 animate-pulse flex-col" aria-hidden="true">
  <div class="px-4 pt-[22px] md:px-6">
    <div class="h-[36px] border border-hairline bg-surface"></div>

    <div class="mt-[14px] flex flex-row flex-wrap items-center gap-x-4 gap-y-3">
      <div class="flex flex-1 flex-row border border-white/[.12] md:flex-initial">
        {#each { length: 3 } as _, i (i)}
          <div
            class={`flex-1 px-3 py-[7px] md:flex-initial md:px-[14px] ${i > 0 ? "border-l border-white/[.12]" : ""}`}
          >
            <div class="mx-auto h-[11px] w-12 bg-white/[.08]"></div>
          </div>
        {/each}
      </div>
      <div class="hidden flex-1 md:block"></div>
      <div class="flex flex-row border border-white/[.12]">
        {#each { length: 2 } as _, i (i)}
          <div class={`px-3 py-[7px] md:px-[14px] ${i > 0 ? "border-l border-white/[.12]" : ""}`}>
            <div class="h-[11px] w-10 bg-white/[.08]"></div>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="mt-4 flex-1 border-t border-white/[.06]">
    {#each { length: 6 } as _, i (i)}
      <div class="flex flex-col gap-2 border-b border-white/[.06] px-4 py-4 md:px-6">
        <div class="h-[12px] bg-white/[.08]" style={`width: ${[62, 44, 71, 38, 55, 48][i]}%`}></div>
        <div class="h-[10px] bg-white/[.04]" style={`width: ${[34, 58, 26, 47, 30, 40][i]}%`}></div>
      </div>
    {/each}
  </div>
</div>
