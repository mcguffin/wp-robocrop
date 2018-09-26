<?php

if ( ! defined('ABSPATH') )
	die();

?>
	<script type="text/html" id="tmpl-robocrop-select-item">
		<input type="radio" name="robocrop-select-ratio" value="{{ data.ratio }}" id="robocrop-select-{{ data.ratiokey }}" />
		<label for="robocrop-select-{{ data.ratiokey }}">
			<strong>{{ data.title }}</strong><br />
			<# if ( !! data.sizenames ) { #>
				<small>{{{ data.sizenames }}}</small>
			<# } #>
		</label>
	</script>
