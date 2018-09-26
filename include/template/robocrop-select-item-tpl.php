<?php

if ( ! defined('ABSPATH') )
	die();

?>
	<script type="text/html" id="tmpl-robocrop-select-item">
		<input type="radio" name="robocrop-select-ratio" value="{{ data.ratiokey }}" id="robocrop-select-{{ data.ratiokey }}" />
		<label for="robocrop-select-{{ data.ratiokey }}">
			<strong>{{ data.title }}
				<# if ( data.ratiokey !== 'focuspoint' ) { #>
					<span class="format-indicator"></span>
				<# } #>
			</strong>
			<# if ( !! data.sizenames ) { #>
				<small>{{{ data.sizenames }}}</small>
			<# } #>
		</label>
	</script>
