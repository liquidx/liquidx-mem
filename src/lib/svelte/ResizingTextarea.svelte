<script lang="ts">
	import { cn } from '$lib/utils';

	let className: string | undefined = undefined;

	export let value = '';
	export let minRows = 1;
	export let maxRows;
	export { className as class };

	$: minHeight = `${1 + minRows * 1.2}em`;
	$: maxHeight = maxRows ? `${1 + maxRows * 1.2}em` : `auto`;
</script>

<div class="relative">
	<pre
		aria-hidden="true"
		style="min-height: {minHeight}; max-height: {maxHeight}"
		class={className}>{value + '\n'}</pre>

	<textarea bind:value class={cn('absolute w-full h-full top-0 resize-none', className)} on:blur
	></textarea>
</div>

<style>
	pre,
	textarea {
		font-family: inherit;
		padding: 0.5em;
		box-sizing: border-box;
		line-height: 1.2;
		overflow: hidden;
	}
</style>
